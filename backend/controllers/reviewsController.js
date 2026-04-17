const { db } = require('../firebase/config');
const { isNonEmptyString, isValidRating, runValidations } = require('../utils/validators');

// GET /api/reviews
async function getAll(req, res) {
  try {
    let query = db.collection('reviews');
    if (req.query.product_id) {
      query = query.where('product_id', '==', req.query.product_id);
    }

    const snapshot = await query.get();
    const reviews = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      // Resolve product name
      if (data.product_id) {
        const prodDoc = await db.collection('products').doc(data.product_id).get();
        data.product_name = prodDoc.exists ? prodDoc.data().name : 'Deleted Product';
      }
      reviews.push({ id: doc.id, ...data });
    }
    res.json({ count: reviews.length, reviews });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// GET /api/reviews/:id
async function getById(req, res) {
  try {
    const doc = await db.collection('reviews').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'Review not found.' });
    res.json({ review: { id: doc.id, ...doc.data() } });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// POST /api/reviews
async function create(req, res) {
  try {
    const { product_id, rating, comment } = req.body;
    const validation = runValidations([
      isNonEmptyString(product_id, 'Product ID'),
      isValidRating(rating),
      isNonEmptyString(comment, 'Comment'),
    ]);
    if (!validation.valid) return res.status(400).json({ error: 'Validation Error', message: validation.message });

    // Verify product exists
    const prodDoc = await db.collection('products').doc(product_id).get();
    if (!prodDoc.exists) {
      return res.status(400).json({ error: 'Validation Error', message: `Product '${product_id}' does not exist.` });
    }

    const review = {
      product_id,
      product_name: prodDoc.data().name,
      rating: Number(rating),
      comment: comment.trim(),
      created_at: new Date().toISOString(),
    };

    const docRef = await db.collection('reviews').add(review);
    res.status(201).json({ message: 'Review created.', review: { id: docRef.id, ...review } });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// PUT /api/reviews/:id
async function update(req, res) {
  try {
    const doc = await db.collection('reviews').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'Review not found.' });

    const updates = {};
    if (req.body.rating !== undefined) {
      const v = isValidRating(req.body.rating);
      if (!v.valid) return res.status(400).json({ error: 'Validation Error', message: v.message });
      updates.rating = Number(req.body.rating);
    }
    if (req.body.comment !== undefined) {
      const v = isNonEmptyString(req.body.comment, 'Comment');
      if (!v.valid) return res.status(400).json({ error: 'Validation Error', message: v.message });
      updates.comment = req.body.comment.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Validation Error', message: 'No valid fields to update.' });
    }

    await db.collection('reviews').doc(req.params.id).update(updates);
    const updated = await db.collection('reviews').doc(req.params.id).get();
    res.json({ message: 'Review updated.', review: { id: updated.id, ...updated.data() } });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// DELETE /api/reviews/:id
async function remove(req, res) {
  try {
    const doc = await db.collection('reviews').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'Review not found.' });
    await db.collection('reviews').doc(req.params.id).delete();
    res.json({ message: 'Review deleted.', deletedId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

module.exports = { getAll, getById, create, update, remove };
