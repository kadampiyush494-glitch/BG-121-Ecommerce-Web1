const { db } = require('../firebase/config');
const { isNonEmptyString } = require('../utils/validators');

// GET /api/categories
async function getAll(req, res) {
  try {
    const snapshot = await db.collection('categories').get();
    const categories = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      // Count products in this category
      const productsSnap = await db.collection('products').where('category_id', '==', doc.id).get();
      categories.push({ id: doc.id, ...data, product_count: productsSnap.size });
    }
    res.json({ count: categories.length, categories });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// GET /api/categories/:id
async function getById(req, res) {
  try {
    const doc = await db.collection('categories').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'Category not found.' });
    const productsSnap = await db.collection('products').where('category_id', '==', doc.id).get();
    res.json({ category: { id: doc.id, ...doc.data(), product_count: productsSnap.size } });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// POST /api/categories
async function create(req, res) {
  try {
    const { name } = req.body;
    const v = isNonEmptyString(name, 'Category name');
    if (!v.valid) return res.status(400).json({ error: 'Validation Error', message: v.message });

    // Check duplicate name
    const existing = await db.collection('categories').where('name', '==', name.trim()).get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'Conflict', message: 'A category with this name already exists.' });
    }

    const docRef = await db.collection('categories').add({ name: name.trim() });
    res.status(201).json({ message: 'Category created.', category: { id: docRef.id, name: name.trim() } });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// PUT /api/categories/:id
async function update(req, res) {
  try {
    const { name } = req.body;
    const doc = await db.collection('categories').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'Category not found.' });

    const v = isNonEmptyString(name, 'Category name');
    if (!v.valid) return res.status(400).json({ error: 'Validation Error', message: v.message });

    await db.collection('categories').doc(req.params.id).update({ name: name.trim() });
    res.json({ message: 'Category updated.', category: { id: req.params.id, name: name.trim() } });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// DELETE /api/categories/:id
async function remove(req, res) {
  try {
    const doc = await db.collection('categories').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'Category not found.' });

    // Check if products exist under this category
    const productsSnap = await db.collection('products').where('category_id', '==', req.params.id).get();
    if (!productsSnap.empty) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Cannot delete: ${productsSnap.size} product(s) are linked to this category. Reassign them first.`,
      });
    }

    await db.collection('categories').doc(req.params.id).delete();
    res.json({ message: 'Category deleted.', deletedId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

module.exports = { getAll, getById, create, update, remove };
