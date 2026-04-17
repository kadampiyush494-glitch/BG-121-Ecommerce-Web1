const { db } = require('../firebase/config');
const { isNonEmptyString, isValidEmail, isValidRole, runValidations } = require('../utils/validators');

// GET /api/users
async function getAll(req, res) {
  try {
    const snapshot = await db.collection('users').orderBy('created_at', 'desc').get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ count: users.length, users });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// GET /api/users/:id
async function getById(req, res) {
  try {
    const doc = await db.collection('users').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'User not found.' });
    res.json({ user: { id: doc.id, ...doc.data() } });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// PUT /api/users/:id
async function update(req, res) {
  try {
    const { name, role } = req.body;
    const doc = await db.collection('users').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'User not found.' });

    const updates = {};
    if (name) {
      const v = isNonEmptyString(name, 'Name');
      if (!v.valid) return res.status(400).json({ error: 'Validation Error', message: v.message });
      updates.name = name.trim();
    }
    if (role) {
      const v = isValidRole(role);
      if (!v.valid) return res.status(400).json({ error: 'Validation Error', message: v.message });
      updates.role = role;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Validation Error', message: 'No valid fields to update.' });
    }

    await db.collection('users').doc(req.params.id).update(updates);
    const updated = await db.collection('users').doc(req.params.id).get();
    res.json({ message: 'User updated successfully.', user: { id: updated.id, ...updated.data() } });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// DELETE /api/users/:id
async function remove(req, res) {
  try {
    const doc = await db.collection('users').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'User not found.' });

    // Prevent self-deletion
    if (req.user && req.user.uid === req.params.id) {
      return res.status(400).json({ error: 'Bad Request', message: 'You cannot delete your own account.' });
    }

    await db.collection('users').doc(req.params.id).delete();
    res.json({ message: 'User deleted successfully.', deletedId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

module.exports = { getAll, getById, update, remove };
