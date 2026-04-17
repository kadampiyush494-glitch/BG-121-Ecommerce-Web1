const { db } = require('../firebase/config');

/**
 * GET /api/stats
 * Analytics endpoint - returns:
 *  - total_orders, total_revenue, total_products, total_customers
 *  - orders_by_status breakdown
 *  - top_selling_products (by quantity sold)
 *  - revenue_by_category
 */
async function getStats(req, res) {
  try {
    // Fetch all orders
    const ordersSnap = await db.collection('orders').get();
    let totalRevenue = 0;
    let pendingOrders = 0;
    let completedOrders = 0;
    let cancelledOrders = 0;
    const productSales = {}; // product_id -> { name, quantity, revenue }

    ordersSnap.docs.forEach(doc => {
      const order = doc.data();
      if (order.status !== 'cancelled') {
        totalRevenue += order.total_amount || 0;
      }
      if (order.status === 'pending') pendingOrders++;
      else if (order.status === 'completed') completedOrders++;
      else if (order.status === 'cancelled') cancelledOrders++;

      // Aggregate product sales (exclude cancelled)
      if (order.status !== 'cancelled' && order.items) {
        order.items.forEach(item => {
          if (!productSales[item.product_id]) {
            productSales[item.product_id] = {
              product_id: item.product_id,
              name: item.product_name || 'Unknown',
              total_quantity: 0,
              total_revenue: 0,
            };
          }
          productSales[item.product_id].total_quantity += item.quantity;
          productSales[item.product_id].total_revenue += item.line_total || (item.unit_price * item.quantity);
        });
      }
    });

    // Top selling products (by quantity)
    const topSelling = Object.values(productSales)
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, 5);

    // Total products
    const productsSnap = await db.collection('products').get();
    const totalProducts = productsSnap.size;

    // Total customers
    const customersSnap = await db.collection('customers').get();
    const totalCustomers = customersSnap.size;

    // Revenue by category
    const categoryRevenue = {};
    for (const product of productsSnap.docs) {
      const pData = product.data();
      if (pData.category_id) {
        const catDoc = await db.collection('categories').doc(pData.category_id).get();
        const catName = catDoc.exists ? catDoc.data().name : 'Unknown';
        if (!categoryRevenue[catName]) categoryRevenue[catName] = 0;
        // Find this product's sales
        if (productSales[product.id]) {
          categoryRevenue[catName] += productSales[product.id].total_revenue;
        }
      }
    }

    // Low stock count
    let lowStockCount = 0;
    productsSnap.docs.forEach(doc => {
      if (doc.data().stock <= 10) lowStockCount++;
    });

    // Active promotions count
    const promosSnap = await db.collection('promotions').where('active', '==', true).get();

    res.json({
      total_orders: ordersSnap.size,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      total_products: totalProducts,
      total_customers: totalCustomers,
      orders_by_status: {
        pending: pendingOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
      },
      top_selling_products: topSelling,
      revenue_by_category: categoryRevenue,
      low_stock_items: lowStockCount,
      active_promotions: promosSnap.size,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

async function wipeDummyData(req, res) {
  try {
    const collections = ['categories', 'products', 'inventory_logs', 'promotions', 'orders', 'customers'];
    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).get();
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }
    res.json({ message: 'Dummy data successfully wiped from all collections.' });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

module.exports = { getStats, wipeDummyData };
