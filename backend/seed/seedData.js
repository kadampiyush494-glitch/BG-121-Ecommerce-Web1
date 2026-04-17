/**
 * ForgeAdmin Database Seeder
 * Populates Firestore with realistic sample data.
 * 
 * Usage: cd backend && node seed/seedData.js
 * Requires .env with Firebase credentials.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { db, auth } = require('../firebase/config');

async function clearCollection(name) {
  const snap = await db.collection(name).get();
  const batch = db.batch();
  snap.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`  Cleared ${name} (${snap.size} docs)`);
}

async function seed() {
  console.log('\n🌱 ForgeAdmin Database Seeder\n');
  console.log('─── Clearing existing data ───');

  const collections = ['users', 'categories', 'products', 'customers', 'orders', 'reviews', 'promotions', 'inventory_logs'];
  for (const c of collections) {
    await clearCollection(c);
  }

  console.log('\n─── Seeding categories ───');
  const categories = [
    { name: 'Electronics' },
    { name: 'Audio' },
    { name: 'Accessories' },
    { name: 'Apparel' },
    { name: 'Home & Living' },
    { name: 'Sports' },
  ];
  const catIds = {};
  for (const cat of categories) {
    const ref = await db.collection('categories').add(cat);
    catIds[cat.name] = ref.id;
    console.log(`  + ${cat.name} -> ${ref.id}`);
  }

  console.log('\n─── Seeding products ───');
  const products = [
    { name: 'ForgeBook Pro 15"', price: 1499.00, category_id: catIds['Electronics'], stock: 45, created_at: '2025-09-15T10:00:00Z' },
    { name: 'Noise Cancelling Pods', price: 249.00, category_id: catIds['Audio'], stock: 120, created_at: '2025-09-20T10:00:00Z' },
    { name: 'Mechanical Keyboard', price: 129.00, category_id: catIds['Accessories'], stock: 0, created_at: '2025-10-01T10:00:00Z' },
    { name: 'ForgeWatch Series 7', price: 399.00, category_id: catIds['Electronics'], stock: 124, created_at: '2025-10-05T10:00:00Z' },
    { name: 'Ergonomic Mouse Pad', price: 29.99, category_id: catIds['Accessories'], stock: 0, created_at: '2025-10-10T10:00:00Z' },
    { name: 'Wireless Charging Dock', price: 59.99, category_id: catIds['Electronics'], stock: 78, created_at: '2025-10-12T10:00:00Z' },
    { name: 'ForgeFit Pro Tracker', price: 199.00, category_id: catIds['Sports'], stock: 65, created_at: '2025-10-14T10:00:00Z' },
    { name: 'Canvas Sneakers', price: 79.99, category_id: catIds['Apparel'], stock: 200, created_at: '2025-10-15T10:00:00Z' },
    { name: 'Smart LED Desk Lamp', price: 49.99, category_id: catIds['Home & Living'], stock: 42, created_at: '2025-10-18T10:00:00Z' },
    { name: 'Bluetooth Speaker Mini', price: 89.00, category_id: catIds['Audio'], stock: 8, created_at: '2025-10-20T10:00:00Z' },
  ];
  const prodIds = {};
  for (const p of products) {
    const ref = await db.collection('products').add(p);
    prodIds[p.name] = ref.id;
    console.log(`  + ${p.name} ($${p.price}) -> ${ref.id}`);
  }

  console.log('\n─── Seeding customers ───');
  const customers = [
    { name: 'Sarah Jenkins', email: 'sarah@example.com' },
    { name: 'Marcus Wright', email: 'm.wright@example.com' },
    { name: 'Elena Gomez', email: 'elena.g@example.com' },
    { name: 'James Chen', email: 'j.chen@example.com' },
    { name: 'Lisa Park', email: 'lisa.park@example.com' },
  ];
  const custIds = {};
  for (const c of customers) {
    const ref = await db.collection('customers').add(c);
    custIds[c.name] = ref.id;
    console.log(`  + ${c.name} -> ${ref.id}`);
  }

  console.log('\n─── Seeding orders ───');
  const orders = [
    {
      customer_id: custIds['Sarah Jenkins'],
      customer_name: 'Sarah Jenkins',
      items: [
        { product_id: prodIds['Noise Cancelling Pods'], product_name: 'Noise Cancelling Pods', quantity: 1, unit_price: 249.00, line_total: 249.00 },
      ],
      total_amount: 249.00,
      status: 'pending',
      created_at: '2025-10-24T14:32:00Z',
    },
    {
      customer_id: custIds['Marcus Wright'],
      customer_name: 'Marcus Wright',
      items: [
        { product_id: prodIds['ForgeBook Pro 15"'], product_name: 'ForgeBook Pro 15"', quantity: 1, unit_price: 1499.00, line_total: 1499.00 },
      ],
      total_amount: 1499.00,
      status: 'completed',
      created_at: '2025-10-24T11:15:00Z',
    },
    {
      customer_id: custIds['Elena Gomez'],
      customer_name: 'Elena Gomez',
      items: [
        { product_id: prodIds['Ergonomic Mouse Pad'], product_name: 'Ergonomic Mouse Pad', quantity: 1, unit_price: 29.99, line_total: 29.99 },
        { product_id: prodIds['Smart LED Desk Lamp'], product_name: 'Smart LED Desk Lamp', quantity: 1, unit_price: 49.99, line_total: 49.99 },
      ],
      total_amount: 79.98,
      status: 'cancelled',
      created_at: '2025-10-23T09:45:00Z',
    },
    {
      customer_id: custIds['James Chen'],
      customer_name: 'James Chen',
      items: [
        { product_id: prodIds['ForgeWatch Series 7'], product_name: 'ForgeWatch Series 7', quantity: 2, unit_price: 399.00, line_total: 798.00 },
        { product_id: prodIds['Wireless Charging Dock'], product_name: 'Wireless Charging Dock', quantity: 1, unit_price: 59.99, line_total: 59.99 },
      ],
      total_amount: 857.99,
      status: 'completed',
      created_at: '2025-10-22T16:20:00Z',
    },
    {
      customer_id: custIds['Lisa Park'],
      customer_name: 'Lisa Park',
      items: [
        { product_id: prodIds['Canvas Sneakers'], product_name: 'Canvas Sneakers', quantity: 3, unit_price: 79.99, line_total: 239.97 },
      ],
      total_amount: 239.97,
      status: 'pending',
      created_at: '2025-10-25T08:00:00Z',
    },
  ];
  for (const o of orders) {
    const ref = await db.collection('orders').add(o);
    console.log(`  + Order for ${o.customer_name} ($${o.total_amount}) [${o.status}] -> ${ref.id}`);
  }

  console.log('\n─── Seeding reviews ───');
  const reviews = [
    { product_id: prodIds['ForgeBook Pro 15"'], product_name: 'ForgeBook Pro 15"', rating: 5, comment: 'This laptop is absolutely incredible. The screen is gorgeous and it handles all my development tasks with ease. Highly recommend!', created_at: '2025-10-24T00:00:00Z' },
    { product_id: prodIds['Noise Cancelling Pods'], product_name: 'Noise Cancelling Pods', rating: 3, comment: 'The sound quality is great but they keep slipping out of my ears while running. Shipping was fast though.', created_at: '2025-10-22T00:00:00Z' },
    { product_id: prodIds['ForgeWatch Series 7'], product_name: 'ForgeWatch Series 7', rating: 4, comment: 'Great smartwatch with excellent battery life. The fitness tracking is very accurate.', created_at: '2025-10-21T00:00:00Z' },
    { product_id: prodIds['Canvas Sneakers'], product_name: 'Canvas Sneakers', rating: 5, comment: 'Super comfortable and stylish. Got compliments on day one!', created_at: '2025-10-20T00:00:00Z' },
  ];
  for (const r of reviews) {
    const ref = await db.collection('reviews').add(r);
    console.log(`  + Review for ${r.product_name} (${r.rating}★) -> ${ref.id}`);
  }

  console.log('\n─── Seeding promotions ───');
  const promotions = [
    { title: 'FORGE25', discount_percentage: 25, active: true, created_at: '2025-10-01T00:00:00Z' },
    { title: 'WELCOME10', discount_percentage: 10, active: true, created_at: '2025-09-01T00:00:00Z' },
    { title: 'SUMMER50', discount_percentage: 50, active: false, created_at: '2025-06-01T00:00:00Z' },
  ];
  for (const p of promotions) {
    const ref = await db.collection('promotions').add(p);
    console.log(`  + ${p.title} (${p.discount_percentage}% off, ${p.active ? 'active' : 'inactive'}) -> ${ref.id}`);
  }

  console.log('\n─── Seeding inventory logs ───');
  const logs = [
    { product_id: prodIds['ForgeBook Pro 15"'], change: -1, reason: 'order', timestamp: '2025-10-24T11:15:00Z' },
    { product_id: prodIds['Noise Cancelling Pods'], change: -1, reason: 'order', timestamp: '2025-10-24T14:32:00Z' },
    { product_id: prodIds['ForgeWatch Series 7'], change: -2, reason: 'order', timestamp: '2025-10-22T16:20:00Z' },
    { product_id: prodIds['Wireless Charging Dock'], change: -1, reason: 'order', timestamp: '2025-10-22T16:20:00Z' },
    { product_id: prodIds['Canvas Sneakers'], change: -3, reason: 'order', timestamp: '2025-10-25T08:00:00Z' },
    { product_id: prodIds['Bluetooth Speaker Mini'], change: 50, reason: 'manual', timestamp: '2025-10-19T10:00:00Z' },
  ];
  for (const l of logs) {
    await db.collection('inventory_logs').add(l);
    console.log(`  + Log for product ${l.product_id} (${l.change >= 0 ? '+' : ''}${l.change}, ${l.reason})`);
  }

  console.log('\n─── Seeding admin user ───');
  // Create admin user document (the actual Firebase Auth user must be created via signup)
  const adminId = 'seed-admin-001';
  await db.collection('users').doc(adminId).set({
    name: 'John Doe',
    email: 'admin@forgecart.com',
    role: 'admin',
    created_at: '2024-10-01T00:00:00Z',
  });
  console.log('  + Admin user: admin@forgecart.com (role: admin)');

  const staffId = 'seed-staff-001';
  await db.collection('users').doc(staffId).set({
    name: 'Alice Smith',
    email: 'alice@forgecart.com',
    role: 'staff',
    created_at: '2024-11-01T00:00:00Z',
  });
  console.log('  + Staff user: alice@forgecart.com (role: staff)');

  console.log('\n✅ Seeding complete! All collections populated.\n');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
