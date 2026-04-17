const { db } = require('../firebase/config');
const { isNonEmptyString, isPositiveNumber, isNonNegativeInteger, runValidations } = require('../utils/validators');

// GET /api/products  (supports filtering, search, sorting, pagination)
async function getAll(req, res) {
  try {
    let query = db.collection('products');

    // Filter by category
    if (req.query.category) {
      query = query.where('category_id', '==', req.query.category);
    }

    const snapshot = await query.get();
    let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Price range filtering (done in memory since Firestore can't combine range on different fields easily)
    if (req.query.price_min) {
      const min = Number(req.query.price_min);
      if (!isNaN(min)) products = products.filter(p => p.price >= min);
    }
    if (req.query.price_max) {
      const max = Number(req.query.price_max);
      if (!isNaN(max)) products = products.filter(p => p.price <= max);
    }

    // Search by name (case-insensitive substring match)
    if (req.query.search) {
      const term = req.query.search.toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(term));
    }

    // Sorting
    if (req.query.sort) {
      const sortField = req.query.sort;
      const order = req.query.order === 'desc' ? -1 : 1;
      products.sort((a, b) => {
        if (a[sortField] < b[sortField]) return -1 * order;
        if (a[sortField] > b[sortField]) return 1 * order;
        return 0;
      });
    } else {
      // Default sort by created_at desc
      products.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    }

    // Resolve category names
    const catCache = {};
    for (const p of products) {
      if (p.category_id && !catCache[p.category_id]) {
        const catDoc = await db.collection('categories').doc(p.category_id).get();
        catCache[p.category_id] = catDoc.exists ? catDoc.data().name : 'Unknown';
      }
      p.category_name = catCache[p.category_id] || 'Uncategorized';
    }

    // Pagination
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const startIdx = (page - 1) * limit;
    const paginated = products.slice(startIdx, startIdx + limit);

    res.json({
      total: products.length,
      page,
      limit,
      total_pages: Math.ceil(products.length / limit),
      products: paginated,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// GET /api/products/:id
async function getById(req, res) {
  try {
    const doc = await db.collection('products').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'Product not found.' });

    const data = doc.data();
    // Resolve category name
    if (data.category_id) {
      const catDoc = await db.collection('categories').doc(data.category_id).get();
      data.category_name = catDoc.exists ? catDoc.data().name : 'Unknown';
    }

    res.json({ product: { id: doc.id, ...data } });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// POST /api/products
async function create(req, res) {
  try {
    const { name, price, category_id, stock } = req.body;

    const validation = runValidations([
      isNonEmptyString(name, 'Product name'),
      isPositiveNumber(price, 'Price'),
      isNonEmptyString(category_id, 'Category ID'),
      isNonNegativeInteger(stock !== undefined ? stock : 0, 'Stock'),
    ]);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation Error', message: validation.message });
    }

    // Verify category exists (referential integrity)
    const catDoc = await db.collection('categories').doc(category_id).get();
    if (!catDoc.exists) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Category with ID '${category_id}' does not exist. Create the category first.`,
      });
    }

    const product = {
      name: name.trim(),
      price: Number(price),
      category_id,
      stock: Number(stock) || 0,
      created_at: new Date().toISOString(),
    };

    const docRef = await db.collection('products').add(product);
    res.status(201).json({
      message: 'Product created successfully.',
      product: { id: docRef.id, ...product, category_name: catDoc.data().name },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// PUT /api/products/:id
async function update(req, res) {
  try {
    const doc = await db.collection('products').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'Product not found.' });

    const { name, price, category_id, stock } = req.body;
    const updates = {};

    if (name !== undefined) {
      const v = isNonEmptyString(name, 'Product name');
      if (!v.valid) return res.status(400).json({ error: 'Validation Error', message: v.message });
      updates.name = name.trim();
    }
    if (price !== undefined) {
      const v = isPositiveNumber(price, 'Price');
      if (!v.valid) return res.status(400).json({ error: 'Validation Error', message: v.message });
      updates.price = Number(price);
    }
    if (category_id !== undefined) {
      const catDoc = await db.collection('categories').doc(category_id).get();
      if (!catDoc.exists) {
        return res.status(400).json({ error: 'Validation Error', message: `Category '${category_id}' does not exist.` });
      }
      updates.category_id = category_id;
    }
    if (stock !== undefined) {
      const v = isNonNegativeInteger(stock, 'Stock');
      if (!v.valid) return res.status(400).json({ error: 'Validation Error', message: v.message });
      updates.stock = Number(stock);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Validation Error', message: 'No valid fields to update.' });
    }

    await db.collection('products').doc(req.params.id).update(updates);
    const updated = await db.collection('products').doc(req.params.id).get();
    res.json({
      message: 'Product updated successfully.',
      product: { id: updated.id, ...updated.data() },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// DELETE /api/products/:id
async function remove(req, res) {
  try {
    const doc = await db.collection('products').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'Product not found.' });

    // Check if product is referenced in any pending orders
    const ordersSnap = await db.collection('orders').where('status', '==', 'pending').get();
    for (const orderDoc of ordersSnap.docs) {
      const items = orderDoc.data().items || [];
      if (items.some(item => item.product_id === req.params.id)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Cannot delete: this product is in a pending order.',
        });
      }
    }

    await db.collection('products').doc(req.params.id).delete();
    res.json({ message: 'Product deleted successfully.', deletedId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

module.exports = { getAll, getById, create, update, remove };
