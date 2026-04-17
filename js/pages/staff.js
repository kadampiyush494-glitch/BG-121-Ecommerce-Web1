/**
 * ForgeAdmin - Staff Page Integration
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;
  updateUserUI(user);

  const grid = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.xl\\:grid-cols-3');
  const addBtn = document.querySelector('button .fa-plus')?.closest('button');

  async function loadStaff() {
    try {
      const data = await api.get('/users');
      renderStaff(data.users || []);
    } catch (err) {
      console.error('Failed to load staff:', err);
    }
  }

  function renderStaff(staff) {
    if (!grid) return;
    grid.innerHTML = staff.map(s => {
      const initials = s.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      const isAdmin = s.role === 'admin';
      const bgClass = isAdmin ? 'bg-gradient-to-br from-brand-400 to-brand-600' : 'bg-blue-100';
      const textClass = isAdmin ? 'text-white' : 'text-blue-600';
      const roleColor = isAdmin ? 'text-brand-600' : 'text-blue-600';
      const date = s.created_at ? new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown';

      return `<div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div class="flex items-center gap-4 mb-6">
          <div class="w-16 h-16 rounded-2xl ${bgClass} flex items-center justify-center ${textClass} font-bold text-xl">${initials}</div>
          <div>
            <h3 class="font-bold text-gray-900">${s.name}</h3>
            <p class="text-xs ${roleColor} font-bold uppercase tracking-wider">${s.role === 'admin' ? 'Super Admin' : 'Staff'}</p>
          </div>
        </div>
        <div class="space-y-3 mb-6">
          <div class="flex items-center gap-3 text-sm text-gray-500">
            <i class="fa-solid fa-envelope w-5"></i> ${s.email}
          </div>
          <div class="flex items-center gap-3 text-sm text-gray-500">
            <i class="fa-solid fa-calendar w-5"></i> Joined ${date}
          </div>
        </div>
        <div class="flex items-center justify-between pt-4 border-t border-gray-50">
          <span class="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full">Active</span>
          ${user.role === 'admin' ? `<button class="text-gray-400 hover:text-brand-500 manage-staff" data-id="${s.id}" data-name="${s.name}" data-role="${s.role}"><i class="fa-solid fa-gear"></i> Manage</button>` : ''}
        </div>
      </div>`;
    }).join('') || '<p class="text-gray-400 col-span-full text-center py-12">No staff members found.</p>';

    grid.querySelectorAll('.manage-staff').forEach(btn => {
      btn.addEventListener('click', async () => {
        const data = await showFormModal(`Manage: ${btn.dataset.name}`, [
          { name: 'role', label: 'Role', type: 'select', value: btn.dataset.role, options: [
            { value: 'admin', label: 'Admin' },
            { value: 'staff', label: 'Staff' },
          ]},
        ], 'Update Role');
        if (data) {
          try {
            await api.put(`/users/${btn.dataset.id}`, data);
            showToast('Role updated!', 'success');
            loadStaff();
          } catch (err) { showToast(err.message, 'error'); }
        }
      });
    });
  }

  loadStaff();
});
