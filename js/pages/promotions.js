/**
 * ForgeAdmin - Promotions Page Integration
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;
  updateUserUI(user);

  const tbody = document.getElementById('promotions-tbody');
  const addBtn = document.querySelector('button .fa-plus')?.closest('button');

  async function loadPromotions() {
    try {
      const data = await api.get('/promotions');
      renderPromotions(data.promotions || []);
      updateSummary(data.promotions || []);
    } catch (err) {
      console.error('Failed to load promotions:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-gray-400">
          <i class="fa-solid fa-triangle-exclamation text-3xl mb-2 block"></i>
          <p class="text-sm font-medium">Failed to load promotions</p>
          <p class="text-xs mt-1 text-red-500">${err.message}</p>
        </td></tr>`;
      }
    }
  }

  function updateSummary(promos) {
    const active = promos.filter(p => p.active).length;
    const activeCard = document.getElementById('active-coupons-count');
    if (activeCard) activeCard.textContent = active;
  }

  function renderPromotions(promos) {
    if (!tbody) return;
    tbody.innerHTML = promos.map(p => {
      const statusClass = p.active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400';
      const codeClass = p.active ? 'bg-brand-50 text-brand-700 border-brand-100' : 'bg-gray-50 text-gray-700 border-gray-200';

      return `<tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors data-loaded">
        <td class="px-6 py-4"><span class="px-3 py-1.5 ${codeClass} font-bold border rounded-lg">${p.title}</span></td>
        <td class="px-6 py-4 font-bold text-gray-900">${p.discount_percentage}% OFF</td>
        <td class="px-6 py-4 text-gray-500">${p.active ? 'Active' : 'Expired'}</td>
        <td class="px-6 py-4 font-medium text-gray-900">—</td>
        <td class="px-6 py-4"><span class="px-2.5 py-1 ${statusClass} text-xs font-bold rounded-full">${p.active ? 'Active' : 'Inactive'}</span></td>
        <td class="px-6 py-4 text-right">
          <button class="text-gray-400 hover:text-brand-500 edit-promo" data-id="${p.id}"><i class="fa-solid fa-pen"></i></button>
          <button class="text-gray-400 hover:text-red-500 ml-2 delete-promo" data-id="${p.id}"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.edit-promo').forEach(btn => {
      btn.addEventListener('click', async () => {
        const promo = promos.find(p => p.id === btn.dataset.id);
        const data = await showFormModal('Edit Promotion', [
          { name: 'title', label: 'Coupon Code', value: promo?.title, required: true },
          { name: 'discount_percentage', label: 'Discount %', type: 'number', value: promo?.discount_percentage, required: true, min: '1' },
          { name: 'active', label: 'Status', type: 'select', value: promo?.active ? 'true' : 'false', options: [
            { value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' },
          ]},
        ], 'Save');
        if (data) {
          data.active = data.active === 'true';
          try {
            await api.put(`/promotions/${btn.dataset.id}`, data);
            showToast('Promotion updated!', 'success');
            loadPromotions();
          } catch (err) { showToast(err.message, 'error'); }
        }
      });
    });

    tbody.querySelectorAll('.delete-promo').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (await showConfirmModal('Delete Promotion', 'Remove this coupon permanently?')) {
          try {
            await api.delete(`/promotions/${btn.dataset.id}`);
            showToast('Promotion deleted.', 'success');
            loadPromotions();
          } catch (err) { showToast(err.message, 'error'); }
        }
      });
    });
  }

  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      const data = await showFormModal('Create Coupon', [
        { name: 'title', label: 'Coupon Code', required: true, placeholder: 'SUMMER2025' },
        { name: 'discount_percentage', label: 'Discount %', type: 'number', required: true, min: '1', placeholder: '25' },
        { name: 'active', label: 'Status', type: 'select', options: [
          { value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' },
        ]},
      ], 'Create Coupon');
      if (data) {
        data.active = data.active === 'true';
        try {
          await api.post('/promotions', data);
          showToast('Coupon created!', 'success');
          loadPromotions();
        } catch (err) { showToast(err.message, 'error'); }
      }
    });
  }

  loadPromotions();
});
