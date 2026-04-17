const { db } = require('../firebase/config');
const { isNonEmptyString, isNonNegativeInteger } = require('../utils/validators');

/**
 * GET /api/inventory
 * Returns all products with their stock levels and recent inventory logs.
 */
async function getAll(req, res) {
  try {
    const productsSnap = await db.collection('products').get();
    const inventory = [];

    for (const doc of productsSnap.docs) {
      const data = doc.data();
      // Get recent logs for this product
      const logsSnap = await db.collection('inventory_logs')
        .where('product_id', '==', doc.id)
        .orderBy('timestamp', 'desc')
        .limit(5)
        .get();

      const logs = logsSnap.docs.map(l => ({ id: l.id, ...l.data() }));

      let availability = 'In Stock';
      if (data.stock === 0) availability = 'Out of Stock';
      else if (data.stock <= 10) availability = 'Low Stock';

      inventory.push({
        id: doc.id,
        name: data.name,
        stock: data.stock,
        price: data.price,
        availability,
        recent_logs: logs,
      });
    }

    const lowStockCount = inventory.filter(i => i.availability === 'Low Stock' || i.availability === 'Out of Stock').length;

    res.json({
      count: inventory.length,
      low_stock_count: lowStockCount,
      inventory,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

/**
 * GET /api/inventory/logs
 * Returns all inventory logs, optionally filtered by product_id.
 */
async function getLogs(req, res) {
  try {
    let query = db.collection('inventory_logs').orderBy('timestamp', 'desc');
    if (req.query.product_id) {
      query = db.collection('inventory_logs')
        .where('product_id', '==', req.query.product_id)
        .orderBy('timestamp', 'desc');
    }
    const snapshot = await query.limit(100).get();
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

/**
 * PUT /api/inventory/:productId
 * Manual stock update. Creates an inventory_log entry.
 */
async function updateStock(req, res) {
  try {
    const { stock, reason } = req.body;
    const productId = req.params.productId;

    const prodDoc = await db.collection('products').doc(productId).get();
    if (!prodDoc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Product not found.' });
    }

    const v = isNonNegativeInteger(stock, 'Stock');
    if (!v.valid) return res.status(400).json({ error: 'Validation Error', message: v.message });

    const currentStock = prodDoc.data().stock;
    const newStock = Number(stock);
    const change = newStock - currentStock;

    const batch = db.batch();

    // Update product stock
    batch.update(db.collection('products').doc(productId), { stock: newStock });

    // Create inventory log
    const logRef = db.collection('inventory_logs').doc();
    batch.set(logRef, {
      product_id: productId,
      change,
      reason: reason || 'manual',
      timestamp: new Date().toISOString(),
    });

    await batch.commit();

    res.json({
      message: `Stock updated from ${currentStock} to ${newStock} (${change >= 0 ? '+' : ''}${change}).`,
      product_id: productId,
      previous_stock: currentStock,
      new_stock: newStock,
      change,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

module.exports = { getAll, getLogs, updateStock };
