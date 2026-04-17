const { db } = require('../firebase/config');
const { isNonEmptyString, isPositiveNumber, runValidations } = require('../utils/validators');

// GET /api/promotions
async function getAll(req, res) {
  try {
    const snapshot = await db.collection('promotions').get();
    const promotions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ count: promotions.length, promotions });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// GET /api/promotions/:id
async function getById(req, res) {
  try {
    const doc = await db.collection('promotions').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'Promotion not found.' });
    res.json({ promotion: { id: doc.id, ...doc.data() } });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// POST /api/promotions
async function create(req, res) {
  try {
    const { title, discount_percentage, active } = req.body;
    const validation = runValidations([
      isNonEmptyString(title, 'Title'),
    ]);
    if (!validation.valid) return res.status(400).json({ error: 'Validation Error', message: validation.message });

    const disc = Number(discount_percentage);
    if (isNaN(disc) || disc <= 0 || disc > 100) {
      return res.status(400).json({ error: 'Validation Error', message: 'Discount percentage must be between 1 and 100.' });
    }

    const promotion = {
      title: title.trim(),
      discount_percentage: disc,
      active: active !== undefined ? Boolean(active) : true,
      created_at: new Date().toISOString(),
    };

    const docRef = await db.collection('promotions').add(promotion);
    res.status(201).json({ message: 'Promotion created.', promotion: { id: docRef.id, ...promotion } });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// PUT /api/promotions/:id
async function update(req, res) {
  try {
    const doc = await db.collection('promotions').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'Promotion not found.' });

    const updates = {};
    if (req.body.title !== undefined) {
      const v = isNonEmptyString(req.body.title, 'Title');
      if (!v.valid) return res.status(400).json({ error: 'Validation Error', message: v.message });
      updates.title = req.body.title.trim();
    }
    if (req.body.discount_percentage !== undefined) {
      const disc = Number(req.body.discount_percentage);
      if (isNaN(disc) || disc <= 0 || disc > 100) {
        return res.status(400).json({ error: 'Validation Error', message: 'Discount percentage must be between 1 and 100.' });
      }
      updates.discount_percentage = disc;
    }
    if (req.body.active !== undefined) {
      updates.active = Boolean(req.body.active);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Validation Error', message: 'No valid fields to update.' });
    }

    await db.collection('promotions').doc(req.params.id).update(updates);
    const updated = await db.collection('promotions').doc(req.params.id).get();
    res.json({ message: 'Promotion updated.', promotion: { id: updated.id, ...updated.data() } });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// DELETE /api/promotions/:id
async function remove(req, res) {
  try {
    const doc = await db.collection('promotions').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'Promotion not found.' });
    await db.collection('promotions').doc(req.params.id).delete();
    res.json({ message: 'Promotion deleted.', deletedId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

module.exports = { getAll, getById, create, update, remove };
