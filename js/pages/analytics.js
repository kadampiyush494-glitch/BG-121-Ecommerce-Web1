/**
 * ForgeAdmin - Analytics Page (Real-Time)
 * Fetches live data from multiple API endpoints:
 *   /api/stats     → KPIs, revenue by category, top products
 *   /api/orders    → orders timeline, order details
 *   /api/customers → top customers by spending
 *   /api/reviews   → review rating distribution
 *
 * NO dummy data — everything is computed from Firestore.
 * Auto-refreshes every 8 seconds.
 */

let revenueCatChart = null;
let orderStatusChart = null;
let ordersTimelineChart = null;
let topProductsChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;
  updateUserUI(user);

  await loadAnalytics();
  setInterval(loadAnalytics, 8000);
});

// ─── Master Loader ────────────────────────────────────────────────
async function loadAnalytics() {
  try {
    const [stats, ordersData, customersData, reviewsData] = await Promise.all([
      api.get('/stats'),
      api.get('/orders'),
      api.get('/customers'),
      api.get('/reviews'),
    ]);

    updateKPIs(stats);
    updateRevenueByCategoryChart(stats);
    updateOrderStatusChart(stats);
    updateOrdersTimeline(ordersData);
    updateTopProductsChart(stats);
    updateTopCustomers(customersData);
    updateReviewSummary(reviewsData);
    updateLiveStatus(true);

    // Update sidebar product count
    const badge = document.getElementById('sidebar-product-count');
    if (badge) badge.textContent = stats.total_products;
  } catch (err) {
    console.error('Analytics load error:', err);
    updateLiveStatus(false);
  }
}

// ─── 1. KPI Cards ──────────────────────────────────────────────────
function updateKPIs(stats) {
  const totalOrders = stats.total_orders || 0;
  const totalRevenue = stats.total_revenue || 0;
  const totalCustomers = stats.total_customers || 0;
  const completed = stats.orders_by_status?.completed || 0;
  const cancelled = stats.orders_by_status?.cancelled || 0;

  // Average Order Value
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  setKPI('kpi-aov', `$${aov.toFixed(2)}`);
  setBar('bar-aov', Math.min((aov / 500) * 100, 100)); // scale to $500 max

  // Completion Rate
  const completionRate = totalOrders > 0 ? (completed / totalOrders) * 100 : 0;
  setKPI('kpi-completion', `${completionRate.toFixed(1)}%`);
  setBar('bar-completion', completionRate);

  // Cancellation Rate
  const cancelRate = totalOrders > 0 ? (cancelled / totalOrders) * 100 : 0;
  setKPI('kpi-cancel', `${cancelRate.toFixed(1)}%`);
  setBar('bar-cancel', cancelRate);

  // Revenue per Customer
  const rpc = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
  setKPI('kpi-rpc', `$${rpc.toFixed(2)}`);
  setBar('bar-rpc', Math.min((rpc / 1000) * 100, 100)); // scale to $1000 max
}

function setKPI(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('skeleton');
  el.style.minWidth = '';
  if (el.textContent !== value) {
    el.textContent = value;
    el.classList.remove('data-loaded');
    void el.offsetWidth;
    el.classList.add('data-loaded');
  }
}

function setBar(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${Math.max(0, Math.min(pct, 100))}%`;
}

// ─── 2. Revenue by Category — Bar Chart ─────────────────────────
function updateRevenueByCategoryChart(stats) {
  const ctx = document.getElementById('revenueByCategoryChart');
  const emptyDiv = document.getElementById('rev-cat-empty');
  const categories = Object.entries(stats.revenue_by_category || {});

  if (categories.length === 0) {
    ctx.style.display = 'none';
    if (emptyDiv) emptyDiv.style.display = 'flex';
    return;
  }
  ctx.style.display = 'block';
  if (emptyDiv) emptyDiv.style.display = 'none';

  const labels = categories.map(([n]) => n);
  const data = categories.map(([, v]) => Math.round(v * 100) / 100);
  const colors = [
    'rgba(249,115,22,0.85)', 'rgba(59,130,246,0.85)',
    'rgba(16,185,129,0.85)', 'rgba(139,92,246,0.85)',
    'rgba(245,158,11,0.85)', 'rgba(236,72,153,0.85)',
    'rgba(20,184,166,0.85)', 'rgba(99,102,241,0.85)',
  ];

  if (revenueCatChart) {
    revenueCatChart.data.labels = labels;
    revenueCatChart.data.datasets[0].data = data;
    revenueCatChart.data.datasets[0].backgroundColor = colors.slice(0, labels.length);
    revenueCatChart.update('active');
  } else {
    revenueCatChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Revenue ($)',
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1f2937', cornerRadius: 10, padding: 12,
            callbacks: { label: (c) => `Revenue: $${c.parsed.y.toLocaleString()}` },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 12 }, color: '#6b7280' } },
          y: {
            beginAtZero: true,
            grid: { color: '#f3f4f6' },
            ticks: { font: { family: 'Inter', size: 11 }, color: '#9ca3af', callback: v => `$${v.toLocaleString()}` },
          },
        },
      },
    });
  }
}

// ─── 3. Order Status — Doughnut ──────────────────────────────────
function updateOrderStatusChart(stats) {
  const ctx = document.getElementById('orderStatusChart');
  const emptyDiv = document.getElementById('status-empty');
  const legendEl = document.getElementById('status-legend');
  const statusData = stats.orders_by_status || {};
  const total = (statusData.pending || 0) + (statusData.completed || 0) + (statusData.cancelled || 0);

  if (total === 0) {
    ctx.style.display = 'none';
    if (emptyDiv) emptyDiv.style.display = 'flex';
    if (legendEl) legendEl.innerHTML = '';
    return;
  }
  ctx.style.display = 'block';
  if (emptyDiv) emptyDiv.style.display = 'none';

  const labels = ['Pending', 'Completed', 'Cancelled'];
  const data = [statusData.pending || 0, statusData.completed || 0, statusData.cancelled || 0];
  const bgColors = ['#f59e0b', '#10b981', '#ef4444'];
  const bgClasses = ['bg-amber-500', 'bg-emerald-500', 'bg-red-500'];

  if (orderStatusChart) {
    orderStatusChart.data.datasets[0].data = data;
    orderStatusChart.update('active');
  } else {
    orderStatusChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: bgColors,
          borderWidth: 3, borderColor: '#ffffff', hoverOffset: 8,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1f2937', cornerRadius: 10, padding: 12,
            callbacks: {
              label: (c) => {
                const pct = total > 0 ? Math.round((c.parsed / total) * 100) : 0;
                return `${c.label}: ${c.parsed} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }

  // Legend
  if (legendEl) {
    legendEl.innerHTML = labels.map((l, i) => {
      const pct = total > 0 ? Math.round((data[i] / total) * 100) : 0;
      return `<div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full ${bgClasses[i]}"></span><span class="text-xs text-gray-600">${l} ${data[i]} (${pct}%)</span></div>`;
    }).join('');
  }
}

// ─── 4. Orders Timeline — Line Chart ─────────────────────────────
function updateOrdersTimeline(ordersData) {
  const ctx = document.getElementById('ordersTimelineChart');
  const emptyDiv = document.getElementById('timeline-empty');
  const orders = ordersData.orders || [];

  if (orders.length === 0) {
    ctx.style.display = 'none';
    if (emptyDiv) emptyDiv.style.display = 'flex';
    return;
  }
  ctx.style.display = 'block';
  if (emptyDiv) emptyDiv.style.display = 'none';

  // Group orders by date
  const dateMap = {};
  const revMap = {};
  orders.forEach(o => {
    if (!o.created_at) return;
    const date = o.created_at.split('T')[0]; // YYYY-MM-DD
    dateMap[date] = (dateMap[date] || 0) + 1;
    if (o.status !== 'cancelled') {
      revMap[date] = (revMap[date] || 0) + (o.total_amount || 0);
    }
  });

  const sortedDates = Object.keys(dateMap).sort();
  const labels = sortedDates.map(d => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const orderCounts = sortedDates.map(d => dateMap[d]);
  const revenues = sortedDates.map(d => Math.round((revMap[d] || 0) * 100) / 100);

  if (ordersTimelineChart) {
    ordersTimelineChart.data.labels = labels;
    ordersTimelineChart.data.datasets[0].data = orderCounts;
    ordersTimelineChart.data.datasets[1].data = revenues;
    ordersTimelineChart.update('active');
  } else {
    ordersTimelineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Orders',
            data: orderCounts,
            borderColor: '#f97316',
            backgroundColor: 'rgba(249,115,22,0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#f97316',
            yAxisID: 'y',
          },
          {
            label: 'Revenue ($)',
            data: revenues,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.08)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: '#3b82f6',
            borderDash: [5, 5],
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'top', labels: { font: { family: 'Inter', size: 11 }, usePointStyle: true, pointStyle: 'circle' } },
          tooltip: {
            backgroundColor: '#1f2937', cornerRadius: 10, padding: 12,
            callbacks: {
              label: (c) => c.dataset.label === 'Revenue ($)' ? `Revenue: $${c.parsed.y.toLocaleString()}` : `Orders: ${c.parsed.y}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 }, color: '#9ca3af' } },
          y: {
            beginAtZero: true, position: 'left',
            grid: { color: '#f3f4f6' },
            ticks: { font: { family: 'Inter', size: 11 }, color: '#9ca3af', stepSize: 1 },
            title: { display: true, text: 'Orders', font: { family: 'Inter', size: 11 }, color: '#9ca3af' },
          },
          y1: {
            beginAtZero: true, position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { font: { family: 'Inter', size: 11 }, color: '#9ca3af', callback: v => `$${v}` },
            title: { display: true, text: 'Revenue', font: { family: 'Inter', size: 11 }, color: '#9ca3af' },
          },
        },
      },
    });
  }
}

// ─── 5. Top Products — Horizontal Bar ────────────────────────────
function updateTopProductsChart(stats) {
  const ctx = document.getElementById('topProductsChart');
  const emptyDiv = document.getElementById('products-empty');
  const products = stats.top_selling_products || [];

  if (products.length === 0) {
    ctx.style.display = 'none';
    if (emptyDiv) emptyDiv.style.display = 'flex';
    return;
  }
  ctx.style.display = 'block';
  if (emptyDiv) emptyDiv.style.display = 'none';

  const labels = products.map(p => p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name);
  const data = products.map(p => p.total_quantity);
  const revData = products.map(p => Math.round((p.total_revenue || 0) * 100) / 100);
  const colors = ['rgba(249,115,22,0.8)', 'rgba(59,130,246,0.8)', 'rgba(16,185,129,0.8)', 'rgba(139,92,246,0.8)', 'rgba(245,158,11,0.8)'];

  if (topProductsChart) {
    topProductsChart.data.labels = labels;
    topProductsChart.data.datasets[0].data = data;
    topProductsChart.data.datasets[0].backgroundColor = colors.slice(0, labels.length);
    topProductsChart.update('active');
  } else {
    topProductsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Units Sold',
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1f2937', cornerRadius: 10, padding: 12,
            callbacks: {
              label: (c) => {
                const rev = revData[c.dataIndex] || 0;
                return [`Units sold: ${c.parsed.x}`, `Revenue: $${rev.toLocaleString()}`];
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: '#f3f4f6' },
            ticks: { font: { family: 'Inter', size: 11 }, color: '#9ca3af', stepSize: 1 },
          },
          y: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 12, weight: '500' }, color: '#374151' },
          },
        },
      },
    });
  }
}

// ─── 6. Top Customers ────────────────────────────────────────────
function updateTopCustomers(customersData) {
  const container = document.getElementById('top-customers-list');
  if (!container) return;

  const customers = (customersData.customers || [])
    .sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0))
    .slice(0, 5);

  if (customers.length === 0) {
    container.innerHTML = `
      <div class="px-6 py-12 text-center text-gray-400">
        <i class="fa-solid fa-users text-3xl mb-2"></i>
        <p class="text-sm">No customer data yet</p>
      </div>`;
    return;
  }

  const maxSpent = customers[0]?.total_spent || 1;
  const colors = ['bg-brand-500', 'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500'];

  container.innerHTML = customers.map((c, i) => {
    const initials = (c.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const pct = Math.round(((c.total_spent || 0) / maxSpent) * 100);
    return `
      <div class="px-6 py-4 hover:bg-gray-50 transition-colors data-loaded">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg ${colors[i % colors.length]} bg-opacity-15 flex items-center justify-center text-xs font-bold text-gray-700">
              ${initials}
            </div>
            <div>
              <p class="text-sm font-medium text-gray-800">${c.name || 'Unknown'}</p>
              <p class="text-[11px] text-gray-400">${c.email || ''} · ${c.order_count || 0} orders</p>
            </div>
          </div>
          <p class="text-sm font-semibold text-gray-900">$${(c.total_spent || 0).toLocaleString()}</p>
        </div>
        <div class="w-full bg-gray-100 rounded-full h-1.5">
          <div class="${colors[i % colors.length]} h-1.5 rounded-full transition-all duration-700" style="width: ${pct}%"></div>
        </div>
      </div>`;
  }).join('');
}

// ─── 7. Review Summary ───────────────────────────────────────────
function updateReviewSummary(reviewsData) {
  const reviews = reviewsData.reviews || [];
  const total = reviews.length;

  // Rating distribution
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  reviews.forEach(r => {
    const rating = Math.round(r.rating || 0);
    if (rating >= 1 && rating <= 5) {
      dist[rating]++;
      sum += rating;
    }
  });

  const avg = total > 0 ? (sum / total) : 0;

  // Update avg rating
  const avgEl = document.getElementById('avg-rating');
  if (avgEl) {
    avgEl.classList.remove('skeleton');
    avgEl.style.minWidth = '';
    avgEl.textContent = avg.toFixed(1);
  }

  // Stars
  const starsEl = document.getElementById('avg-stars');
  if (starsEl) {
    const stars = starsEl.querySelectorAll('i');
    stars.forEach((star, i) => {
      star.className = i < Math.round(avg)
        ? 'fa-solid fa-star text-sm text-amber-400'
        : 'fa-solid fa-star text-sm text-gray-200';
    });
  }

  // Review count
  const countEl = document.getElementById('review-count');
  if (countEl) countEl.textContent = `${total} review${total !== 1 ? 's' : ''}`;

  // Rating bars
  const maxCount = Math.max(...Object.values(dist), 1);
  for (let i = 1; i <= 5; i++) {
    const bar = document.getElementById(`bar-${i}`);
    const ct = document.getElementById(`count-${i}`);
    if (bar) bar.style.width = `${(dist[i] / maxCount) * 100}%`;
    if (ct) ct.textContent = dist[i];
  }
}

// ─── Live Status ──────────────────────────────────────────────────
function updateLiveStatus(connected) {
  const statusEl = document.getElementById('live-status');
  const timeEl = document.getElementById('last-updated');
  if (!statusEl) return;

  if (connected) {
    statusEl.textContent = 'Live';
    statusEl.className = 'text-xs font-medium text-emerald-600';
    if (timeEl) timeEl.textContent = 'Updated ' + new Date().toLocaleTimeString();
  } else {
    statusEl.textContent = 'Reconnecting…';
    statusEl.className = 'text-xs font-medium text-amber-600';
  }
}
