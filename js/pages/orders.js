/**
 * ForgeAdmin - Orders Page Integration
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;
  updateUserUI(user);

  const tbody = document.getElementById('orders-tbody');
  const filterBtns = document.querySelectorAll('.flex.gap-2 button');
  const searchInput = document.querySelector('.forge-input[placeholder*="Search order"]');

  let currentFilter = '';

  async function loadOrders(status = '', search = '') {
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      const data = await api.get(`/orders?${params.toString()}`);
      let orders = data.orders || [];

      if (search) {
        orders = orders.filter(o => o.id.toLowerCase().includes(search.toLowerCase()));
      }

      renderOrders(orders);
      updateSummaryCards(data.orders || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-gray-400">
          <i class="fa-solid fa-triangle-exclamation text-3xl mb-2 block"></i>
          <p class="text-sm font-medium">Failed to load orders</p>
          <p class="text-xs mt-1 text-red-500">${err.message}</p>
        </td></tr>`;
      }
    }
  }

  function renderOrders(orders) {
    if (!tbody) return;
    tbody.innerHTML = orders.map(o => {
      const statusColors = {
        pending: 'bg-blue-50 text-blue-600 border-blue-100',
        completed: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        cancelled: 'bg-red-50 text-red-600 border-red-100',
      };
      const statusLabels = { pending: 'Processing', completed: 'Completed', cancelled: 'Refunded' };
      const date = new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const time = new Date(o.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      return `<tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors data-loaded" data-id="${o.id}">
        <td class="px-6 py-4 font-medium text-brand-600">#${o.id.slice(0, 8).toUpperCase()}</td>
        <td class="px-6 py-4 text-gray-500">${date} · ${time}</td>
        <td class="px-6 py-4">
          <div>
            <p class="font-medium text-gray-900">${o.customer_name || 'Unknown'}</p>
            <p class="text-xs text-gray-500">${o.items?.length || 0} item(s)</p>
          </div>
        </td>
        <td class="px-6 py-4">
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[o.status]} border">
            ${statusLabels[o.status] || o.status}
          </span>
        </td>
        <td class="px-6 py-4 font-semibold text-gray-900">$${o.total_amount.toFixed(2)}</td>
        <td class="px-6 py-4 text-right">
          <button class="text-brand-600 hover:text-brand-700 font-medium text-sm view-order" data-id="${o.id}">View details</button>
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-400">No orders found.</td></tr>';

    // Attach view handlers
    tbody.querySelectorAll('.view-order').forEach(btn => {
      btn.addEventListener('click', () => viewOrder(btn.dataset.id));
    });
  }

  function updateSummaryCards(allOrders) {
    const pending = allOrders.filter(o => o.status === 'pending').length;
    const processing = allOrders.filter(o => o.status === 'pending').length; // same as pending for this UI
    const completed = allOrders.filter(o => o.status === 'completed').length;

    const pCard = document.getElementById('pending-count');
    const prCard = document.getElementById('processing-count');
    const cCard = document.getElementById('completed-count');
    
    if (pCard) pCard.textContent = pending;
    if (prCard) prCard.textContent = processing;
    if (cCard) cCard.textContent = completed;
  }

  async function viewOrder(id) {
    try {
      const { order } = await api.get(`/orders/${id}`);
      const itemsList = order.items.map(i => `• ${i.product_name} × ${i.quantity} = $${i.line_total.toFixed(2)}`).join('\n');

      // Build a status update dropdown
      const statusOptions = ['pending', 'completed', 'cancelled'].filter(s => s !== order.status);
      const statusBtns = statusOptions.map(s => 
        `<button class="px-3 py-1.5 ${s === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'} rounded-lg text-xs font-bold hover:opacity-80 transition-opacity update-status" data-status="${s}">${s === 'completed' ? 'Mark Completed' : 'Cancel / Refund'}</button>`
      ).join(' ');

      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4';
      overlay.innerHTML = `
        <div class="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <h3 class="text-lg font-bold text-gray-900 mb-1">Order #${id.slice(0, 8).toUpperCase()}</h3>
          <p class="text-sm text-gray-500 mb-4">${new Date(order.created_at).toLocaleString()}</p>
          <div class="bg-gray-50 rounded-xl p-4 mb-4 text-sm text-gray-700 whitespace-pre-line">${itemsList}</div>
          <div class="flex justify-between items-center mb-4">
            <span class="text-gray-500 text-sm">Total</span>
            <span class="text-xl font-bold text-gray-900">$${order.total_amount.toFixed(2)}</span>
          </div>
          <div class="flex gap-2 mb-4">${statusBtns}</div>
          <button id="close-order-modal" class="w-full py-2 bg-gray-100 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors">Close</button>
        </div>`;
      document.body.appendChild(overlay);

      overlay.querySelector('#close-order-modal').onclick = () => overlay.remove();
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

      overlay.querySelectorAll('.update-status').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await api.put(`/orders/${id}`, { status: btn.dataset.status });
            showToast(`Order ${btn.dataset.status}!`, 'success');
            overlay.remove();
            loadOrders(currentFilter);
          } catch (err) {
            showToast(err.message || 'Failed to update order.', 'error');
          }
        });
      });
    } catch (err) {
      showToast('Failed to load order details.', 'error');
    }
  }

  // Filter buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.className = 'px-4 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 whitespace-nowrap';
      });
      btn.className = 'px-4 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium whitespace-nowrap';

      const text = btn.textContent.trim().toLowerCase();
      const filterMap = { 'all orders': '', 'pending': 'pending', 'completed': 'completed', 'refunded': 'cancelled' };
      currentFilter = filterMap[text] || '';
      loadOrders(currentFilter);
    });
  });

  // Search
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      loadOrders(currentFilter, searchInput.value);
    });
  }

  loadOrders();
  
  // Real-Time Auto Refresh every 10s
  setInterval(() => loadOrders(currentFilter, searchInput ? searchInput.value : ''), 10000);
});
