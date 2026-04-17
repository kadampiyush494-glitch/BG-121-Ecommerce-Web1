const { db, admin } = require('../firebase/config');
const { isNonEmptyString, isValidOrderStatus, runValidations } = require('../utils/validators');

/**
 * POST /api/orders
 * BUSINESS LOGIC:
 *  1. Validate customer_id exists
 *  2. Validate all product_ids exist and have sufficient stock
 *  3. Calculate total_amount dynamically from product prices × quantities
 *  4. Deduct stock from each product
 *  5. Create inventory_logs entries for each stock change
 *  6. Create the order document
 */
async function create(req, res) {
  try {
    const { customer_id, items } = req.body;

    // Validate customer
    const v1 = isNonEmptyString(customer_id, 'Customer ID');
    if (!v1.valid) return res.status(400).json({ error: 'Validation Error', message: v1.message });

    const customerDoc = await db.collection('customers').doc(customer_id).get();
    if (!customerDoc.exists) {
      return res.status(400).json({ error: 'Validation Error', message: `Customer '${customer_id}' does not exist.` });
    }

    // Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Validation Error', message: 'Order must contain at least one item with { product_id, quantity }.' });
    }

    // Validate each item, check stock, calculate totals
    let totalAmount = 0;
    const resolvedItems = [];
    const stockUpdates = []; // { productId, newStock, deduction }
    const inventoryLogs = [];

    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity < 1) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Each item must have a valid product_id and quantity >= 1.',
        });
      }

      const productDoc = await db.collection('products').doc(item.product_id).get();
      if (!productDoc.exists) {
        return res.status(400).json({
          error: 'Validation Error',
          message: `Product '${item.product_id}' does not exist.`,
        });
      }

      const product = productDoc.data();
      const qty = Math.floor(Number(item.quantity));

      if (product.stock < qty) {
        return res.status(400).json({
          error: 'Insufficient Stock',
          message: `Product '${product.name}' has only ${product.stock} units in stock, but ${qty} were requested.`,
        });
      }

      const lineTotal = product.price * qty;
      totalAmount += lineTotal;

      resolvedItems.push({
        product_id: item.product_id,
        product_name: product.name,
        quantity: qty,
        unit_price: product.price,
        line_total: lineTotal,
      });

      stockUpdates.push({
        productId: item.product_id,
        newStock: product.stock - qty,
        deduction: qty,
      });

      inventoryLogs.push({
        product_id: item.product_id,
        change: -qty,
        reason: 'order',
        timestamp: new Date().toISOString(),
      });
    }

    // Use a batch write for atomicity
    const batch = db.batch();

    // Create the order
    const orderRef = db.collection('orders').doc();
    batch.set(orderRef, {
      customer_id,
      customer_name: customerDoc.data().name,
      items: resolvedItems,
      total_amount: Math.round(totalAmount * 100) / 100,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    // Deduct stock from products
    for (const su of stockUpdates) {
      const prodRef = db.collection('products').doc(su.productId);
      batch.update(prodRef, { stock: su.newStock });
    }

    // Create inventory log entries
    for (const log of inventoryLogs) {
      const logRef = db.collection('inventory_logs').doc();
      batch.set(logRef, { ...log, order_id: orderRef.id });
    }

    await batch.commit();

    res.status(201).json({
      message: 'Order created successfully. Stock has been deducted.',
      order: {
        id: orderRef.id,
        customer_id,
        customer_name: customerDoc.data().name,
        items: resolvedItems,
        total_amount: Math.round(totalAmount * 100) / 100,
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// GET /api/orders
async function getAll(req, res) {
  try {
    let query = db.collection('orders');

    // Filter by status
    if (req.query.status) {
      query = query.where('status', '==', req.query.status);
    }

    const snapshot = await query.orderBy('created_at', 'desc').get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// GET /api/orders/:id
async function getById(req, res) {
  try {
    const doc = await db.collection('orders').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'Order not found.' });
    res.json({ order: { id: doc.id, ...doc.data() } });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

/**
 * PUT /api/orders/:id
 * Only allows status updates.
 * If cancelling: restores stock and creates inventory_logs.
 */
async function update(req, res) {
  try {
    const { status } = req.body;
    const v = isValidOrderStatus(status);
    if (!v.valid) return res.status(400).json({ error: 'Validation Error', message: v.message });

    const doc = await db.collection('orders').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'Order not found.' });

    const order = doc.data();

    // Prevent invalid transitions
    if (order.status === 'cancelled') {
      return res.status(400).json({ error: 'Bad Request', message: 'Cannot modify a cancelled order.' });
    }
    if (order.status === 'completed' && status !== 'cancelled') {
      return res.status(400).json({ error: 'Bad Request', message: 'Completed orders can only be cancelled (refunded).' });
    }

    const batch = db.batch();

    // If cancelling, restore stock
    if (status === 'cancelled' && order.status !== 'cancelled') {
      for (const item of order.items) {
        const prodDoc = await db.collection('products').doc(item.product_id).get();
        if (prodDoc.exists) {
          const currentStock = prodDoc.data().stock;
          batch.update(db.collection('products').doc(item.product_id), {
            stock: currentStock + item.quantity,
          });

          // Create inventory log for stock restoration
          const logRef = db.collection('inventory_logs').doc();
          batch.set(logRef, {
            product_id: item.product_id,
            change: item.quantity,
            reason: 'order_cancelled',
            order_id: req.params.id,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    batch.update(db.collection('orders').doc(req.params.id), { status });
    await batch.commit();

    const updated = await db.collection('orders').doc(req.params.id).get();
    res.json({
      message: `Order status updated to '${status}'.${status === 'cancelled' ? ' Stock has been restored.' : ''}`,
      order: { id: updated.id, ...updated.data() },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// DELETE /api/orders/:id
async function remove(req, res) {
  try {
    const doc = await db.collection('orders').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'Order not found.' });

    if (doc.data().status === 'pending') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot delete a pending order. Cancel it first to restore stock.',
      });
    }

    await db.collection('orders').doc(req.params.id).delete();
    res.json({ message: 'Order deleted.', deletedId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

module.exports = { getAll, getById, create, update, remove };
