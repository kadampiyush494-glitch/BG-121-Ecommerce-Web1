/**
 * ForgeAdmin - Inventory Page Integration
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;
  updateUserUI(user);

  const tbody = document.getElementById('inventory-tbody');
  const lowStockBadge = document.querySelector('.bg-red-50.text-red-600');
  const restockBtn = document.querySelector('button .fa-plus')?.closest('button');

  async function loadInventory() {
    try {
      const data = await api.get('/inventory');
      renderInventory(data.inventory || []);

      // Update low stock badge
      if (lowStockBadge) {
        const icon = lowStockBadge.querySelector('i') ? '<i class="fa-solid fa-circle-exclamation"></i> ' : '';
        lowStockBadge.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${data.low_stock_count || 0} Low Stock Items`;
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-gray-400">
          <i class="fa-solid fa-triangle-exclamation text-3xl mb-2 block"></i>
          <p class="text-sm font-medium">Failed to load inventory</p>
          <p class="text-xs mt-1 text-red-500">${err.message}</p>
        </td></tr>`;
      }
    }
  }

  function renderInventory(items) {
    if (!tbody) return;
    
    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-gray-400">No products found in inventory.</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(item => {
      const maxStock = 200;
      const pct = Math.min(100, (item.stock / maxStock) * 100);
      let barColor = 'bg-emerald-500';
      let statusColor = 'text-emerald-500';
      if (item.stock === 0) { barColor = 'bg-red-500'; statusColor = 'text-red-500'; }
      else if (item.stock <= 10) { barColor = 'bg-amber-500'; statusColor = 'text-amber-500'; }

      return `<tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors data-loaded">
        <td class="px-6 py-4 font-mono text-gray-500">${item.id.slice(0, 10).toUpperCase()}</td>
        <td class="px-6 py-4 font-bold text-gray-900">${item.name}</td>
        <td class="px-6 py-4">
          <div class="flex items-center gap-3">
            <div class="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full ${barColor} rounded-full" style="width: ${Math.max(2, pct)}%"></div>
            </div>
            <span class="font-medium">${item.stock}</span>
          </div>
        </td>
        <td class="px-6 py-4"><span class="${statusColor} font-bold">${item.availability}</span></td>
        <td class="px-6 py-4 text-right">
          <button class="text-brand-500 font-bold hover:underline update-stock" data-id="${item.id}" data-name="${item.name}" data-stock="${item.stock}">Update</button>
        </td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.update-stock').forEach(btn => {
      btn.addEventListener('click', async () => {
        const data = await showFormModal(`Update Stock: ${btn.dataset.name}`, [
          { name: 'stock', label: 'New Stock Level', type: 'number', value: btn.dataset.stock, required: true, min: '0' },
          { name: 'reason', label: 'Reason', type: 'select', options: [
            { value: 'manual', label: 'Manual Adjustment' },
            { value: 'restock', label: 'Restock / Shipment' },
            { value: 'damaged', label: 'Damaged / Write-off' },
            { value: 'audit', label: 'Inventory Audit' },
          ]},
        ], 'Update Stock');

        if (data) {
          try {
            await api.put(`/inventory/${btn.dataset.id}`, data);
            showToast('Stock updated!', 'success');
            loadInventory();
          } catch (err) { showToast(err.message, 'error'); }
        }
      });
    });
  }

  if (restockBtn) {
    restockBtn.addEventListener('click', async () => {
      // Show inventory with low stock highlighted
      showToast('Click "Update" on any product to adjust its stock.', 'info');
    });
  }

  loadInventory();
});
