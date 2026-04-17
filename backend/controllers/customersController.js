const { db } = require('../firebase/config');
const { isNonEmptyString, isValidEmail, runValidations } = require('../utils/validators');

// GET /api/customers
async function getAll(req, res) {
  try {
    const snapshot = await db.collection('customers').get();
    const customers = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      // Compute total spent & order count
      const ordersSnap = await db.collection('orders').where('customer_id', '==', doc.id).get();
      let totalSpent = 0;
      let orderCount = 0;
      ordersSnap.docs.forEach(o => {
        const od = o.data();
        if (od.status !== 'cancelled') {
          totalSpent += od.total_amount || 0;
        }
        orderCount++;
      });
      customers.push({ id: doc.id, ...data, total_spent: totalSpent, order_count: orderCount });
    }
    res.json({ count: customers.length, customers });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// GET /api/customers/:id
async function getById(req, res) {
  try {
    const doc = await db.collection('customers').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'Customer not found.' });

    const data = doc.data();
    const ordersSnap = await db.collection('orders').where('customer_id', '==', doc.id).get();
    let totalSpent = 0;
    const orders = ordersSnap.docs.map(o => {
      const od = o.data();
      if (od.status !== 'cancelled') totalSpent += od.total_amount || 0;
      return { id: o.id, ...od };
    });

    res.json({ customer: { id: doc.id, ...data, total_spent: totalSpent, order_count: orders.length, orders } });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// POST /api/customers
async function create(req, res) {
  try {
    const { name, email } = req.body;
    const validation = runValidations([
      isNonEmptyString(name, 'Customer name'),
      isValidEmail(email),
    ]);
    if (!validation.valid) return res.status(400).json({ error: 'Validation Error', message: validation.message });

    // Check email uniqueness
    const existing = await db.collection('customers').where('email', '==', email.trim().toLowerCase()).get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'Conflict', message: 'A customer with this email already exists.' });
    }

    const customer = { name: name.trim(), email: email.trim().toLowerCase() };
    const docRef = await db.collection('customers').add(customer);
    res.status(201).json({ message: 'Customer created.', customer: { id: docRef.id, ...customer } });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// PUT /api/customers/:id
async function update(req, res) {
  try {
    const doc = await db.collection('customers').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'Customer not found.' });

    const { name, email } = req.body;
    const updates = {};
    if (name) { updates.name = name.trim(); }
    if (email) {
      const v = isValidEmail(email);
      if (!v.valid) return res.status(400).json({ error: 'Validation Error', message: v.message });
      // Check uniqueness
      const existing = await db.collection('customers').where('email', '==', email.trim().toLowerCase()).get();
      const othersWithEmail = existing.docs.filter(d => d.id !== req.params.id);
      if (othersWithEmail.length > 0) {
        return res.status(409).json({ error: 'Conflict', message: 'Another customer already uses this email.' });
      }
      updates.email = email.trim().toLowerCase();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Validation Error', message: 'No valid fields to update.' });
    }

    await db.collection('customers').doc(req.params.id).update(updates);
    const updated = await db.collection('customers').doc(req.params.id).get();
    res.json({ message: 'Customer updated.', customer: { id: updated.id, ...updated.data() } });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

// DELETE /api/customers/:id
async function remove(req, res) {
  try {
    const doc = await db.collection('customers').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'Customer not found.' });

    await db.collection('customers').doc(req.params.id).delete();
    res.json({ message: 'Customer deleted.', deletedId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

module.exports = { getAll, getById, create, update, remove };
