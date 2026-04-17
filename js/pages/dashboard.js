/**
 * ForgeAdmin - Dashboard Page (Real-Time)
 * Fetches live data from /api/stats and /api/orders.
 * Updates every 5s with smooth transitions.
 * NO dummy data — only what exists in Firestore.
 */

// ─── Chart instances (reusable for updates) ───────────────────────
let revenueChart = null;
let categoryPieChart = null;

// Previous snapshot for trend comparison
let prevStats = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;
  updateUserUI(user);

  // Initial load
  await loadAllDashboard();

  // Auto-refresh every 5 seconds
  setInterval(loadAllDashboard, 5000);
});

// ─── Master loader ─────────────────────────────────────────────────
async function loadAllDashboard() {
  try {
    const [stats, ordersData] = await Promise.all([
      api.get('/stats'),
      api.get('/orders'),
    ]);

    updateStatCards(stats);
    updateSecondaryMetrics(stats);
    updateRevenueChart(stats);
    updateCategoryPie(stats);
    updateRecentOrders(ordersData);
    updateTopProducts(stats);
    updateLiveStatus(true);

    // Store for next trend comparison
    prevStats = { ...stats };
  } catch (err) {
    console.error('Dashboard load error:', err);
    updateLiveStatus(false);

    // Show user-friendly error on first failure
    const msg = err?.message || String(err);
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota')) {
      updateLiveStatus(false, 'Firebase quota exceeded — data will load when quota resets');
    } else if (!prevStats) {
      // Only toast on first load failure
      if (typeof showToast === 'function') {
        showToast('Could not load dashboard data. Retrying…', 'warning');
      }
    }
  }
}

// ─── 1. Stat Cards ──────────────────────────────────────────────────
function updateStatCards(stats) {
  animateValue('stat-revenue', `$${stats.total_revenue.toLocaleString()}`);
  animateValue('stat-orders', stats.total_orders.toLocaleString());
  animateValue('stat-customers', stats.total_customers.toLocaleString());
  animateValue('stat-products', stats.total_products.toLocaleString());

  // Trends (compare against previous snapshot)
  if (prevStats) {
    setTrend('revenue-trend', stats.total_revenue, prevStats.total_revenue);
    setTrend('orders-trend', stats.total_orders, prevStats.total_orders);
    setTrend('customers-trend', stats.total_customers, prevStats.total_customers);
    setTrend('products-trend', stats.total_products, prevStats.total_products);
  } else {
    // First load — show counts, no trend yet
    setTrendStatic('revenue-trend', stats.total_orders > 0);
    setTrendStatic('orders-trend', stats.total_orders > 0);
    setTrendStatic('customers-trend', stats.total_customers > 0);
    setTrendStatic('products-trend', stats.total_products > 0);
  }

  // Sidebar product count
  const badge = document.getElementById('sidebar-product-count');
  if (badge) badge.textContent = stats.total_products;
}

// ─── 2. Secondary Metrics ───────────────────────────────────────────
function updateSecondaryMetrics(stats) {
  animateValue('stat-pending', stats.orders_by_status.pending.toLocaleString());
  animateValue('stat-completed', stats.orders_by_status.completed.toLocaleString());
  animateValue('stat-lowstock', stats.low_stock_items.toLocaleString());
  animateValue('stat-promos', stats.active_promotions.toLocaleString());
}

// ─── 3. Revenue by Category — Bar Chart ─────────────────────────────
function updateRevenueChart(stats) {
  const ctx = document.getElementById('revenueChart');
  const emptyDiv = document.getElementById('revenue-chart-empty');
  const categories = Object.entries(stats.revenue_by_category || {});

  if (categories.length === 0) {
    ctx.style.display = 'none';
    if (emptyDiv) emptyDiv.style.display = 'flex';
    return;
  }
  ctx.style.display = 'block';
  if (emptyDiv) emptyDiv.style.display = 'none';

  const labels = categories.map(([name]) => name);
  const data = categories.map(([, rev]) => Math.round(rev * 100) / 100);
  const colors = [
    'rgba(249,115,22,0.85)', 'rgba(59,130,246,0.85)',
    'rgba(16,185,129,0.85)', 'rgba(139,92,246,0.85)',
    'rgba(245,158,11,0.85)', 'rgba(236,72,153,0.85)',
    'rgba(20,184,166,0.85)', 'rgba(99,102,241,0.85)',
  ];
  const borderColors = colors.map(c => c.replace('0.85', '1'));

  if (revenueChart) {
    revenueChart.data.labels = labels;
    revenueChart.data.datasets[0].data = data;
    revenueChart.data.datasets[0].backgroundColor = colors.slice(0, labels.length);
    revenueChart.data.datasets[0].borderColor = borderColors.slice(0, labels.length);
    revenueChart.update('active');
  } else {
    revenueChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Revenue ($)',
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: borderColors.slice(0, labels.length),
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1f2937',
            titleColor: '#f9fafb',
            bodyColor: '#d1d5db',
            cornerRadius: 10,
            padding: 12,
            callbacks: {
              label: (ctx) => `Revenue: $${ctx.parsed.y.toLocaleString()}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 12, weight: '500' }, color: '#6b7280' },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f3f4f6' },
            ticks: {
              font: { family: 'Inter', size: 11 },
              color: '#9ca3af',
              callback: (v) => `$${v.toLocaleString()}`,
            },
          },
        },
      },
    });
  }
}

// ─── 4. Category Pie ─────────────────────────────────────────────────
function updateCategoryPie(stats) {
  const ctx = document.getElementById('categoryPieChart');
  const emptyDiv = document.getElementById('pie-chart-empty');
  const legendEl = document.getElementById('category-legend');
  const categories = Object.entries(stats.revenue_by_category || {});

  if (categories.length === 0) {
    ctx.style.display = 'none';
    if (emptyDiv) emptyDiv.style.display = 'flex';
    if (legendEl) legendEl.innerHTML = '<p class="text-xs text-gray-400 col-span-2">No data yet</p>';
    return;
  }
  ctx.style.display = 'block';
  if (emptyDiv) emptyDiv.style.display = 'none';

  const labels = categories.map(([name]) => name);
  const data = categories.map(([, rev]) => Math.round(rev * 100) / 100);
  const total = data.reduce((s, v) => s + v, 0) || 1;
  const bgColors = [
    '#f97316', '#3b82f6', '#10b981', '#8b5cf6',
    '#f59e0b', '#ec4899', '#14b8a6', '#6366f1',
  ];
  const colorClasses = [
    'bg-brand-500', 'bg-blue-500', 'bg-emerald-500', 'bg-violet-500',
    'bg-amber-500', 'bg-pink-500', 'bg-teal-500', 'bg-indigo-500',
  ];

  if (categoryPieChart) {
    categoryPieChart.data.labels = labels;
    categoryPieChart.data.datasets[0].data = data;
    categoryPieChart.data.datasets[0].backgroundColor = bgColors.slice(0, labels.length);
    categoryPieChart.update('active');
  } else {
    categoryPieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: bgColors.slice(0, labels.length),
          borderWidth: 3,
          borderColor: '#ffffff',
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1f2937',
            cornerRadius: 10,
            padding: 12,
            callbacks: {
              label: (ctx) => {
                const pct = Math.round((ctx.parsed / total) * 100);
                return `${ctx.label}: $${ctx.parsed.toLocaleString()} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }

  // Update legend
  if (legendEl) {
    legendEl.innerHTML = categories.map(([name, rev], i) => {
      const pct = Math.round((rev / total) * 100);
      return `<div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full ${colorClasses[i % colorClasses.length]}"></span><span class="text-xs text-gray-600">${name} ${pct}%</span></div>`;
    }).join('');
  }
}

// ─── 5. Recent Orders Table ──────────────────────────────────────────
function updateRecentOrders(ordersData) {
  const tbody = document.getElementById('recent-orders-body');
  if (!tbody) return;

  const orders = (ordersData.orders || []).slice(0, 7);

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="5" class="px-6 py-12 text-center text-gray-400">
        <i class="fa-solid fa-inbox text-3xl mb-2 block"></i>
        <p class="text-sm">No orders yet. Data will appear here in real time.</p>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(order => {
    const date = order.created_at
      ? new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—';
    const shortId = order.id ? order.id.slice(0, 8) + '…' : '—';
    const statusClass = `status-${order.status || 'pending'}`;

    return `
      <tr class="hover:bg-gray-50/50 transition-colors data-loaded">
        <td class="px-6 py-3.5">
          <span class="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md">#${shortId}</span>
        </td>
        <td class="px-6 py-3.5 text-sm font-medium text-gray-800">${order.customer_name || '—'}</td>
        <td class="px-6 py-3.5 text-sm font-semibold text-gray-900">$${(order.total_amount || 0).toLocaleString()}</td>
        <td class="px-6 py-3.5"><span class="status-badge ${statusClass}">${order.status || 'pending'}</span></td>
        <td class="px-6 py-3.5 text-sm text-gray-500">${date}</td>
      </tr>`;
  }).join('');
}

// ─── 6. Top Selling Products ─────────────────────────────────────────
function updateTopProducts(stats) {
  const container = document.getElementById('top-products-list');
  if (!container) return;

  const products = stats.top_selling_products || [];

  if (products.length === 0) {
    container.innerHTML = `
      <div class="px-6 py-12 text-center text-gray-400">
        <i class="fa-solid fa-box-open text-3xl mb-2"></i>
        <p class="text-sm">No sales data yet</p>
      </div>`;
    return;
  }

  const maxQty = products[0]?.total_quantity || 1;
  const accentColors = ['bg-brand-500', 'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500'];

  container.innerHTML = products.map((p, i) => {
    const pct = Math.round((p.total_quantity / maxQty) * 100);
    return `
      <div class="px-6 py-4 hover:bg-gray-50 transition-colors data-loaded">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <span class="w-7 h-7 rounded-lg ${accentColors[i % accentColors.length]} bg-opacity-10 flex items-center justify-center text-xs font-bold" style="color: var(--tw-bg-opacity)">
              ${i + 1}
            </span>
            <span class="text-sm font-medium text-gray-800 truncate max-w-[160px]">${p.name}</span>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold text-gray-900">$${(p.total_revenue || 0).toLocaleString()}</p>
            <p class="text-[11px] text-gray-400">${p.total_quantity} sold</p>
          </div>
        </div>
        <div class="w-full bg-gray-100 rounded-full h-1.5">
          <div class="${accentColors[i % accentColors.length]} h-1.5 rounded-full transition-all duration-700" style="width: ${pct}%"></div>
        </div>
      </div>`;
  }).join('');
}

// ─── Helpers ──────────────────────────────────────────────────────────

/** Smoothly update a value element */
function animateValue(elementId, newValue) {
  const el = document.getElementById(elementId);
  if (!el) return;

  // Remove skeleton on first load
  el.classList.remove('skeleton');
  el.style.minWidth = '';

  if (el.textContent !== newValue) {
    el.textContent = newValue;
    el.classList.remove('data-loaded');
    void el.offsetWidth; // force reflow
    el.classList.add('data-loaded');
  }
}

/** Set trend badge based on current vs previous value */
function setTrend(elementId, current, previous) {
  const el = document.getElementById(elementId);
  if (!el) return;

  if (current === previous) {
    el.className = 'flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-500';
    el.innerHTML = '<i class="fa-solid fa-minus text-xs"></i> No change';
  } else if (current > previous) {
    const diff = previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : 100;
    el.className = 'flex items-center gap-1 text-emerald-600 text-sm font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg';
    el.innerHTML = `<i class="fa-solid fa-arrow-trend-up text-xs"></i> +${diff}%`;
  } else {
    const diff = previous > 0 ? Math.round(((previous - current) / previous) * 1000) / 10 : 0;
    el.className = 'flex items-center gap-1 text-red-500 text-sm font-semibold bg-red-50 px-2.5 py-1 rounded-lg';
    el.innerHTML = `<i class="fa-solid fa-arrow-trend-down text-xs"></i> -${diff}%`;
  }
}

/** On first load, just show a static indicator */
function setTrendStatic(elementId, hasData) {
  const el = document.getElementById(elementId);
  if (!el) return;

  if (hasData) {
    el.className = 'flex items-center gap-1 text-emerald-600 text-sm font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg';
    el.innerHTML = '<i class="fa-solid fa-circle-check text-xs"></i> Active';
  } else {
    el.className = 'flex items-center gap-1 text-gray-400 text-sm font-semibold bg-gray-100 px-2.5 py-1 rounded-lg';
    el.innerHTML = '<i class="fa-solid fa-minus text-xs"></i> Empty';
  }
}

/** Update live connection status */
function updateLiveStatus(connected, message) {
  const statusEl = document.getElementById('live-status');
  const timeEl = document.getElementById('last-updated');

  if (connected) {
    statusEl.textContent = 'Live';
    statusEl.className = 'text-xs font-medium text-emerald-600';
    timeEl.textContent = 'Updated ' + new Date().toLocaleTimeString();
  } else {
    statusEl.textContent = message || 'Reconnecting…';
    statusEl.className = 'text-xs font-medium text-amber-600';
  }
}
