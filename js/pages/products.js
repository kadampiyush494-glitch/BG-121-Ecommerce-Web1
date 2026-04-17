/**
 * ForgeAdmin - Products Page Integration
 * Full CRUD for products with search, filter, and pagination.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;
  updateUserUI(user);

  const tbody = document.querySelector('tbody');
  const searchInput = document.querySelector('.forge-input[placeholder*="Search products"]');
  const addBtn = document.querySelector('button .fa-plus')?.closest('button');
  const paginationInfo = document.querySelector('.p-4.border-t .div, .p-4.border-t');

  let allProducts = [];
  let currentPage = 1;
  const perPage = 10;

  async function loadProducts(search = '') {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', currentPage);
      params.set('limit', perPage);

      const data = await api.get(`/products?${params.toString()}`);
      allProducts = data.products || [];
      renderProducts(allProducts, data.total, data.total_pages);
    } catch (err) {
      console.error('Failed to load products:', err);
      showToast('Failed to load products.', 'error');
    }
  }

  function renderProducts(products, total, totalPages) {
    if (!tbody) return;
    tbody.innerHTML = products.map(p => {
      const statusClass = p.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600';
      const statusDot = p.stock > 0 ? 'bg-emerald-500' : 'bg-red-500';
      const statusText = p.stock > 0 ? 'Active' : 'Out of Stock';
      const icon = getProductIcon(p.category_name);

      return `<tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors" data-id="${p.id}">
        <td class="px-6 py-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400">
              <i class="fa-solid ${icon}"></i>
            </div>
            <div>
              <p class="font-semibold text-gray-900">${p.name}</p>
              <p class="text-gray-500 text-xs">ID: ${p.id.slice(0, 8)}</p>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 text-gray-600">${p.category_name || 'Uncategorized'}</td>
        <td class="px-6 py-4 font-medium text-gray-900">$${p.price.toFixed(2)}</td>
        <td class="px-6 py-4 ${p.stock === 0 ? 'text-red-500 font-medium' : 'text-gray-600'}">${p.stock} in stock</td>
        <td class="px-6 py-4">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusClass}">
            <span class="w-1.5 h-1.5 rounded-full ${statusDot}"></span> ${statusText}
          </span>
        </td>
        <td class="px-6 py-4 text-right">
          <button class="text-gray-400 hover:text-brand-500 px-2 py-1 edit-product" data-id="${p.id}"><i class="fa-solid fa-pen-to-square"></i></button>
          <button class="text-gray-400 hover:text-red-500 px-2 py-1 delete-product" data-id="${p.id}"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`;
    }).join('');

    // Update pagination
    const paginationDiv = document.querySelector('.p-4.border-t.border-gray-100');
    if (paginationDiv) {
      const pageInfo = paginationDiv.querySelector('div:first-child');
      if (pageInfo) pageInfo.textContent = `Showing ${products.length} of ${total || products.length} entries`;
    }

    // Attach event listeners
    tbody.querySelectorAll('.edit-product').forEach(btn => {
      btn.addEventListener('click', () => editProduct(btn.dataset.id));
    });
    tbody.querySelectorAll('.delete-product').forEach(btn => {
      btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
    });
  }

  function getProductIcon(category) {
    const icons = {
      'Electronics': 'fa-laptop',
      'Audio': 'fa-headphones',
      'Accessories': 'fa-keyboard',
      'Apparel': 'fa-shirt',
      'Home & Living': 'fa-couch',
      'Sports': 'fa-dumbbell',
    };
    return icons[category] || 'fa-box';
  }

  // Search handler
  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => loadProducts(searchInput.value), 300);
    });
  }

  // Add product
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      // Load categories for dropdown
      let categories = [];
      try {
        const catData = await api.get('/categories');
        categories = catData.categories || [];
      } catch(e) {}

      const data = await showFormModal('Add New Product', [
        { name: 'name', label: 'Product Name', required: true, placeholder: 'e.g. Wireless Earbuds' },
        { name: 'price', label: 'Price ($)', type: 'number', required: true, min: '0.01', step: '0.01', placeholder: '99.99' },
        { name: 'category_id', label: 'Category', type: 'select', required: true, options: categories.map(c => ({ value: c.id, label: c.name })) },
        { name: 'stock', label: 'Initial Stock', type: 'number', required: true, min: '0', placeholder: '100' },
      ], 'Add Product');

      if (data) {
        try {
          await api.post('/products', data);
          showToast('Product added successfully!', 'success');
          loadProducts();
        } catch (err) {
          showToast(err.message || 'Failed to add product.', 'error');
        }
      }
    });
  }

  async function editProduct(id) {
    try {
      const { product } = await api.get(`/products/${id}`);
      let categories = [];
      try {
        const catData = await api.get('/categories');
        categories = catData.categories || [];
      } catch(e) {}

      const data = await showFormModal('Edit Product', [
        { name: 'name', label: 'Product Name', value: product.name, required: true },
        { name: 'price', label: 'Price ($)', type: 'number', value: product.price, required: true, min: '0.01', step: '0.01' },
        { name: 'category_id', label: 'Category', type: 'select', value: product.category_id, options: categories.map(c => ({ value: c.id, label: c.name })) },
        { name: 'stock', label: 'Stock', type: 'number', value: product.stock, min: '0' },
      ], 'Save Changes');

      if (data) {
        await api.put(`/products/${id}`, data);
        showToast('Product updated!', 'success');
        loadProducts();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update product.', 'error');
    }
  }

  async function deleteProduct(id) {
    const confirmed = await showConfirmModal('Delete Product', 'Are you sure? This action cannot be undone.');
    if (confirmed) {
      try {
        await api.delete(`/products/${id}`);
        showToast('Product deleted.', 'success');
        loadProducts();
      } catch (err) {
        showToast(err.message || 'Failed to delete product.', 'error');
      }
    }
  }

  loadProducts();
});
