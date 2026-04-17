/**
 * ForgeAdmin - Products Page (Real-Time)
 * Full CRUD with search, category filter, stock filter,
 * column sorting, pagination, and summary cards.
 * ALL data from /api/products and /api/categories — zero dummy data.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;
  updateUserUI(user);

  // DOM refs
  const tbody = document.getElementById('products-tbody');
  const searchInput = document.getElementById('product-search');
  const categoryFilter = document.getElementById('category-filter');
  const stockFilter = document.getElementById('stock-filter');
  const addBtn = document.getElementById('add-product-btn');
  const paginationInfo = document.getElementById('pagination-info');
  const paginationBtns = document.getElementById('pagination-buttons');

  let allProducts = [];   // full unfiltered from API
  let filteredProducts = []; // after client-side filters
  let categories = [];
  let currentPage = 1;
  let sortField = null;
  let sortOrder = 'asc';
  const perPage = 10;

  // ─── Load categories for filter dropdown ─────────────────────
  async function loadCategories() {
    try {
      const data = await api.get('/categories');
      categories = data.categories || [];
      if (categoryFilter) {
        categoryFilter.innerHTML = '<option value="">All Categories</option>' +
          categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      }
    } catch (e) {
      console.warn('Could not load categories:', e);
    }
  }

  // ─── Load products from API ──────────────────────────────────
  async function loadProducts() {
    try {
      // Fetch all products (no server-side pagination, we do it client-side for filters)
      const data = await api.get('/products?limit=50');
      allProducts = data.products || [];

      // Update sidebar badge
      const badge = document.getElementById('sidebar-product-count');
      if (badge) badge.textContent = data.total || allProducts.length;

      applyFiltersAndRender();
    } catch (err) {
      console.error('Failed to load products:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-gray-400">
          <i class="fa-solid fa-triangle-exclamation text-3xl mb-2 block"></i>
          <p class="text-sm font-medium">Failed to load products</p>
          <p class="text-xs mt-1">${err.message || 'Backend unavailable'}</p>
        </td></tr>`;
      }
      if (paginationInfo) paginationInfo.textContent = 'Error loading data';
    }
  }

  // ─── Client-side filter + sort + paginate ────────────────────
  function applyFiltersAndRender() {
    let products = [...allProducts];

    // Search filter
    const searchTerm = (searchInput?.value || '').toLowerCase().trim();
    if (searchTerm) {
      products = products.filter(p =>
        (p.name || '').toLowerCase().includes(searchTerm) ||
        (p.id || '').toLowerCase().includes(searchTerm)
      );
    }

    // Category filter
    const catId = categoryFilter?.value || '';
    if (catId) {
      products = products.filter(p => p.category_id === catId);
    }

    // Stock filter
    const stockVal = stockFilter?.value || '';
    if (stockVal === 'instock') products = products.filter(p => p.stock > 0);
    else if (stockVal === 'outstock') products = products.filter(p => p.stock === 0);
    else if (stockVal === 'low') products = products.filter(p => p.stock > 0 && p.stock <= 10);

    // Sort
    if (sortField) {
      products.sort((a, b) => {
        const av = a[sortField] ?? 0;
        const bv = b[sortField] ?? 0;
        return sortOrder === 'asc' ? av - bv : bv - av;
      });
    }

    filteredProducts = products;

    // Update summary cards
    updateSummary(allProducts);

    // Paginate
    const totalPages = Math.max(1, Math.ceil(products.length / perPage));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * perPage;
    const pageProducts = products.slice(start, start + perPage);

    renderTable(pageProducts);
    renderPagination(products.length, totalPages);
  }

  // ─── Summary Cards ──────────────────────────────────────────
  function updateSummary(products) {
    const total = products.length;
    const inStock = products.filter(p => p.stock > 0).length;
    const outStock = products.filter(p => p.stock === 0).length;
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= 10).length;

    setVal('summary-total', total);
    setVal('summary-instock', inStock);
    setVal('summary-outstock', outStock);
    setVal('summary-lowstock', lowStock);
  }

  function setVal(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('skeleton');
    el.style.minWidth = '';
    el.textContent = val;
  }

  // ─── Render Table ───────────────────────────────────────────
  function renderTable(products) {
    if (!tbody) return;

    if (products.length === 0) {
      const msg = allProducts.length === 0
        ? 'No products yet. Click "Add Product" to create your first product.'
        : 'No products match your filters.';
      tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-gray-400">
        <i class="fa-solid fa-box-open text-3xl mb-2 block"></i>
        <p class="text-sm">${msg}</p>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = products.map(p => {
      const statusClass = p.stock > 0
        ? (p.stock <= 10 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600')
        : 'bg-red-50 text-red-600';
      const statusDot = p.stock > 0
        ? (p.stock <= 10 ? 'bg-amber-500' : 'bg-emerald-500')
        : 'bg-red-500';
      const statusText = p.stock > 0
        ? (p.stock <= 10 ? 'Low Stock' : 'Active')
        : 'Out of Stock';
      const icon = getProductIcon(p.category_name);

      return `<tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors data-loaded" data-id="${p.id}">
        <td class="px-6 py-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400">
              <i class="fa-solid ${icon}"></i>
            </div>
            <div>
              <p class="font-semibold text-gray-900">${p.name}</p>
              <p class="text-gray-500 text-xs">ID: ${(p.id || '').slice(0, 8)}…</p>
            </div>
          </div>
        </td>
        <td class="px-6 py-4">
          <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">${p.category_name || 'Uncategorized'}</span>
        </td>
        <td class="px-6 py-4 font-medium text-gray-900">$${(p.price || 0).toFixed(2)}</td>
        <td class="px-6 py-4 ${p.stock === 0 ? 'text-red-500 font-medium' : (p.stock <= 10 ? 'text-amber-500 font-medium' : 'text-gray-600')}">${p.stock} in stock</td>
        <td class="px-6 py-4">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusClass}">
            <span class="w-1.5 h-1.5 rounded-full ${statusDot}"></span> ${statusText}
          </span>
        </td>
        <td class="px-6 py-4 text-right">
          <button class="text-gray-400 hover:text-brand-500 px-2 py-1 edit-product" data-id="${p.id}" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
          <button class="text-gray-400 hover:text-red-500 px-2 py-1 delete-product" data-id="${p.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`;
    }).join('');

    // Attach event listeners
    tbody.querySelectorAll('.edit-product').forEach(btn => {
      btn.addEventListener('click', () => editProduct(btn.dataset.id));
    });
    tbody.querySelectorAll('.delete-product').forEach(btn => {
      btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
    });
  }

  // ─── Pagination ─────────────────────────────────────────────
  function renderPagination(total, totalPages) {
    if (paginationInfo) {
      const start = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
      const end = Math.min(currentPage * perPage, total);
      paginationInfo.textContent = `Showing ${start}–${end} of ${total} products`;
    }

    if (paginationBtns) {
      if (totalPages <= 1) {
        paginationBtns.innerHTML = '';
        return;
      }

      let html = '';
      // Prev
      html += `<button class="px-3 py-1 border border-gray-200 rounded text-sm ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">Prev</button>`;
      // Page buttons
      for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
          html += `<button class="px-3 py-1 bg-brand-50 border border-brand-200 rounded text-brand-600 font-medium text-sm">${i}</button>`;
        } else {
          html += `<button class="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-700 text-sm" data-page="${i}">${i}</button>`;
        }
      }
      // Next
      html += `<button class="px-3 py-1 border border-gray-200 rounded text-sm ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">Next</button>`;

      paginationBtns.innerHTML = html;

      paginationBtns.querySelectorAll('button[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          currentPage = parseInt(btn.dataset.page);
          applyFiltersAndRender();
        });
      });
    }
  }

  // ─── Product Icon Helper ────────────────────────────────────
  function getProductIcon(category) {
    const icons = {
      'Electronics': 'fa-laptop',
      'Audio': 'fa-headphones',
      'Accessories': 'fa-keyboard',
      'Apparel': 'fa-shirt',
      'Home & Living': 'fa-couch',
      'Sports': 'fa-dumbbell',
      'Books': 'fa-book',
      'Toys': 'fa-gamepad',
      'Food': 'fa-utensils',
    };
    return icons[category] || 'fa-box';
  }

  // ─── Search handler ─────────────────────────────────────────
  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentPage = 1;
        applyFiltersAndRender();
      }, 300);
    });
  }

  // ─── Filter handlers ───────────────────────────────────────
  if (categoryFilter) {
    categoryFilter.addEventListener('change', () => {
      currentPage = 1;
      applyFiltersAndRender();
    });
  }
  if (stockFilter) {
    stockFilter.addEventListener('change', () => {
      currentPage = 1;
      applyFiltersAndRender();
    });
  }

  // ─── Sort handlers ──────────────────────────────────────────
  document.getElementById('sort-price')?.addEventListener('click', () => {
    if (sortField === 'price') { sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'; }
    else { sortField = 'price'; sortOrder = 'asc'; }
    applyFiltersAndRender();
  });
  document.getElementById('sort-stock')?.addEventListener('click', () => {
    if (sortField === 'stock') { sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'; }
    else { sortField = 'stock'; sortOrder = 'asc'; }
    applyFiltersAndRender();
  });

  // ─── Add Product ────────────────────────────────────────────
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      const catOptions = categories.length > 0
        ? categories.map(c => ({ value: c.id, label: c.name }))
        : [{ value: '', label: 'No categories — create one first' }];

      const data = await showFormModal('Add New Product', [
        { name: 'name', label: 'Product Name', required: true, placeholder: 'e.g. Wireless Earbuds' },
        { name: 'price', label: 'Price ($)', type: 'number', required: true, min: '0.01', step: '0.01', placeholder: '99.99' },
        { name: 'category_id', label: 'Category', type: 'select', required: true, options: catOptions },
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

  // ─── Edit Product ───────────────────────────────────────────
  async function editProduct(id) {
    try {
      const { product } = await api.get(`/products/${id}`);
      const catOptions = categories.length > 0
        ? categories.map(c => ({ value: c.id, label: c.name }))
        : [{ value: product.category_id || '', label: product.category_name || 'Unknown' }];

      const data = await showFormModal('Edit Product', [
        { name: 'name', label: 'Product Name', value: product.name, required: true },
        { name: 'price', label: 'Price ($)', type: 'number', value: product.price, required: true, min: '0.01', step: '0.01' },
        { name: 'category_id', label: 'Category', type: 'select', value: product.category_id, options: catOptions },
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

  // ─── Delete Product ─────────────────────────────────────────
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

  // ─── Initial Load ───────────────────────────────────────────
  await loadCategories();
  loadProducts();
});
