/**
 * ForgeAdmin - Customers Page Integration
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;
  updateUserUI(user);

  const grid = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.xl\\:grid-cols-3');
  const addBtn = document.querySelector('button .fa-user-plus')?.closest('button');

  const gradients = [
    'from-blue-400 to-blue-600', 'from-emerald-400 to-emerald-600',
    'from-purple-400 to-purple-600', 'from-rose-400 to-rose-600',
    'from-amber-400 to-amber-600', 'from-cyan-400 to-cyan-600',
  ];

  async function loadCustomers() {
    try {
      const data = await api.get('/customers');
      renderCustomers(data.customers || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  }

  function renderCustomers(customers) {
    if (!grid) return;
    grid.innerHTML = customers.map((c, i) => {
      const initials = c.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      const grad = gradients[i % gradients.length];

      return `<div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow" data-id="${c.id}">
        <div class="flex justify-between items-start mb-4">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-full bg-gradient-to-br ${grad} text-white flex items-center justify-center text-xl font-bold shadow-md">${initials}</div>
            <div>
              <h3 class="font-bold text-gray-900">${c.name}</h3>
              <p class="text-sm text-gray-500">${c.email}</p>
            </div>
          </div>
          <div class="flex gap-1">
            <button class="text-gray-400 hover:text-brand-500 edit-cust" data-id="${c.id}"><i class="fa-solid fa-pen text-xs"></i></button>
            <button class="text-gray-400 hover:text-red-500 delete-cust" data-id="${c.id}"><i class="fa-solid fa-trash text-xs"></i></button>
          </div>
        </div>
        <div class="flex items-center justify-between pt-4 border-t border-gray-100">
          <div>
            <p class="text-xs text-gray-500 mb-1">Total Spent</p>
            <p class="font-semibold text-gray-900">$${(c.total_spent || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          </div>
          <div class="w-px h-8 bg-gray-100"></div>
          <div>
            <p class="text-xs text-gray-500 mb-1">Orders</p>
            <p class="font-semibold text-gray-900">${c.order_count || 0}</p>
          </div>
        </div>
      </div>`;
    }).join('') || '<p class="text-gray-400 col-span-full text-center py-12">No customers found.</p>';

    grid.querySelectorAll('.edit-cust').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cust = customers.find(c => c.id === btn.dataset.id);
        const data = await showFormModal('Edit Customer', [
          { name: 'name', label: 'Name', value: cust?.name, required: true },
          { name: 'email', label: 'Email', value: cust?.email, required: true },
        ], 'Save');
        if (data) {
          try {
            await api.put(`/customers/${btn.dataset.id}`, data);
            showToast('Customer updated!', 'success');
            loadCustomers();
          } catch (err) { showToast(err.message, 'error'); }
        }
      });
    });

    grid.querySelectorAll('.delete-cust').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (await showConfirmModal('Delete Customer', 'This will permanently remove the customer record.')) {
          try {
            await api.delete(`/customers/${btn.dataset.id}`);
            showToast('Customer deleted.', 'success');
            loadCustomers();
          } catch (err) { showToast(err.message, 'error'); }
        }
      });
    });
  }

  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      const data = await showFormModal('Add Customer', [
        { name: 'name', label: 'Full Name', required: true, placeholder: 'John Smith' },
        { name: 'email', label: 'Email Address', required: true, placeholder: 'john@example.com' },
      ], 'Add Customer');
      if (data) {
        try {
          await api.post('/customers', data);
          showToast('Customer added!', 'success');
          loadCustomers();
        } catch (err) { showToast(err.message, 'error'); }
      }
    });
  }

  loadCustomers();
});
