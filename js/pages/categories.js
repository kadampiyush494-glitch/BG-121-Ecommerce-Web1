/**
 * ForgeAdmin - Categories Page Integration
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;
  updateUserUI(user);

  const grid = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.xl\\:grid-cols-3');
  const addBtn = document.querySelector('button .fa-plus')?.closest('button');

  const colorSets = [
    { bg: 'bg-brand-50', text: 'text-brand-500', hoverBg: 'group-hover:bg-brand-500', icon: 'fa-laptop' },
    { bg: 'bg-blue-50', text: 'text-blue-500', hoverBg: 'group-hover:bg-blue-500', icon: 'fa-shirt' },
    { bg: 'bg-emerald-50', text: 'text-emerald-500', hoverBg: 'group-hover:bg-emerald-500', icon: 'fa-couch' },
    { bg: 'bg-violet-50', text: 'text-violet-500', hoverBg: 'group-hover:bg-violet-500', icon: 'fa-headphones' },
    { bg: 'bg-amber-50', text: 'text-amber-500', hoverBg: 'group-hover:bg-amber-500', icon: 'fa-dumbbell' },
    { bg: 'bg-rose-50', text: 'text-rose-500', hoverBg: 'group-hover:bg-rose-500', icon: 'fa-tags' },
  ];

  async function loadCategories() {
    try {
      const data = await api.get('/categories');
      renderCategories(data.categories || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }

  function renderCategories(categories) {
    if (!grid) return;
    grid.innerHTML = categories.map((cat, i) => {
      const cs = colorSets[i % colorSets.length];
      return `<div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow group" data-id="${cat.id}">
        <div class="flex items-center justify-between mb-6">
          <div class="w-14 h-14 ${cs.bg} rounded-2xl flex items-center justify-center ${cs.text} ${cs.hoverBg} group-hover:text-white transition-colors">
            <i class="fa-solid ${cs.icon} text-2xl"></i>
          </div>
          <div class="flex gap-1">
            <button class="text-gray-400 hover:text-brand-500 p-1 edit-cat" data-id="${cat.id}" data-name="${cat.name}"><i class="fa-solid fa-pen"></i></button>
            <button class="text-gray-400 hover:text-red-500 p-1 delete-cat" data-id="${cat.id}"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
        <h3 class="font-bold text-lg text-gray-900 mb-1">${cat.name}</h3>
        <div class="flex items-center justify-between pt-6 border-t border-gray-50">
          <div>
            <p class="text-xs text-gray-400 uppercase font-bold tracking-wider">Products</p>
            <p class="font-bold text-gray-900">${cat.product_count || 0}</p>
          </div>
          <span class="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full">Active</span>
        </div>
      </div>`;
    }).join('') || '<p class="text-gray-400 col-span-full text-center py-12">No categories found.</p>';

    grid.querySelectorAll('.edit-cat').forEach(btn => {
      btn.addEventListener('click', async () => {
        const data = await showFormModal('Edit Category', [
          { name: 'name', label: 'Category Name', value: btn.dataset.name, required: true },
        ], 'Save');
        if (data) {
          try {
            await api.put(`/categories/${btn.dataset.id}`, data);
            showToast('Category updated!', 'success');
            loadCategories();
          } catch (err) { showToast(err.message, 'error'); }
        }
      });
    });

    grid.querySelectorAll('.delete-cat').forEach(btn => {
      btn.addEventListener('click', async () => {
        const confirmed = await showConfirmModal('Delete Category', 'Products in this category may become orphaned. Continue?');
        if (confirmed) {
          try {
            await api.delete(`/categories/${btn.dataset.id}`);
            showToast('Category deleted.', 'success');
            loadCategories();
          } catch (err) { showToast(err.message, 'error'); }
        }
      });
    });
  }

  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      const data = await showFormModal('New Category', [
        { name: 'name', label: 'Category Name', required: true, placeholder: 'e.g. Wearables' },
      ], 'Create');
      if (data) {
        try {
          await api.post('/categories', data);
          showToast('Category created!', 'success');
          loadCategories();
        } catch (err) { showToast(err.message, 'error'); }
      }
    });
  }

  loadCategories();
});
