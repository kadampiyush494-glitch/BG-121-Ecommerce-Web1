/**
 * ForgeAdmin - Client-side Auth Module
 * Handles login, signup, logout, and auth state persistence.
 */

/**
 * Handle Login form submission.
 * Uses Firebase Auth signInWithEmailAndPassword, then verifies with backend.
 */
async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const email = form.querySelector('input[type="text"], input[type="email"]').value.trim();
  const password = form.querySelectorAll('input[type="text"], input[type="password"]')[1].value;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;

  try {
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Signing in...';
    submitBtn.disabled = true;

    // Firebase client auth
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    const idToken = await userCredential.user.getIdToken();

    // Verify with backend and get role
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Store user info in sessionStorage
    sessionStorage.setItem('forgeadmin_token', idToken);
    sessionStorage.setItem('forgeadmin_user', JSON.stringify(data.user));

    // Redirect to dashboard
    const isInPages = window.location.pathname.includes('/pages/');
    window.location.href = isInPages ? 'dashboard.html' : 'pages/dashboard.html';

  } catch (err) {
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;

    let message = 'Login failed. Please check your credentials.';
    if (err.code === 'auth/user-not-found') message = 'No account found with this email.';
    else if (err.code === 'auth/wrong-password') message = 'Incorrect password.';
    else if (err.code === 'auth/invalid-email') message = 'Invalid email address.';
    else if (err.message) message = err.message;

    showToast(message, 'error');
  }
}

/**
 * Handle Signup form submission.
 */
async function handleSignup(event) {
  event.preventDefault();
  const form = event.target;
  const inputs = form.querySelectorAll('input');
  const name = inputs[0].value.trim();
  const email = inputs[1].value.trim();
  const password = inputs[2].value;
  const confirmPassword = inputs[3].value;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;

  if (password !== confirmPassword) {
    showToast('Passwords do not match.', 'error');
    return;
  }

  try {
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Creating account...';
    submitBtn.disabled = true;

    // Call backend signup endpoint
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role: 'staff' }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Signup failed');
    }

    showToast('Account created! Redirecting to login...', 'success');
    setTimeout(() => {
      window.location.href = '../index.html';
    }, 1500);

  } catch (err) {
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
    showToast(err.message || 'Signup failed.', 'error');
  }
}

/**
 * Handle Logout
 */
async function handleLogout() {
  if (typeof firebase !== 'undefined' && firebase.auth()) {
    await firebase.auth().signOut();
  }
  sessionStorage.clear();
  const isInPages = window.location.pathname.includes('/pages/');
  window.location.href = isInPages ? '../index.html' : 'index.html';
}

/**
 * Get current user from sessionStorage
 */
function getCurrentUser() {
  const stored = sessionStorage.getItem('forgeadmin_user');
  return stored ? JSON.parse(stored) : null;
}

/**
 * Check if user is authenticated. Redirect to login if not.
 */
function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    const isInPages = window.location.pathname.includes('/pages/');
    window.location.href = isInPages ? '../index.html' : 'index.html';
    return null;
  }
  return user;
}

/**
 * Update sidebar and header with real user info
 */
function updateUserUI(user) {
  if (!user) return;

  const initials = user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  // Update all instances of user name and initials
  document.querySelectorAll('.sidebar-text').forEach(el => {
    if (el.textContent.trim() === 'John Doe') el.textContent = user.name;
    if (el.textContent.trim() === 'admin@forgecart.com') el.textContent = user.email;
  });

  // Header user info
  document.querySelectorAll('p').forEach(el => {
    if (el.textContent.trim() === 'John Doe') el.textContent = user.name;
    if (el.textContent.trim() === 'Administrator') el.textContent = user.role === 'admin' ? 'Administrator' : 'Staff';
  });

  // Initials badges
  document.querySelectorAll('div').forEach(el => {
    if (el.textContent.trim() === 'JD' && (
      el.classList.contains('rounded-xl') || el.classList.contains('rounded-full')
    )) {
      el.textContent = initials;
    }
  });

  // Welcome message on dashboard
  document.querySelectorAll('p').forEach(el => {
    if (el.textContent.includes("Welcome back, John")) {
      el.textContent = `Welcome back, ${user.name.split(' ')[0]}! Here's what's happening.`;
    }
  });

  // Setup logout links
  document.querySelectorAll('a[title="Logout"], a[href*="index.html"]').forEach(el => {
    if (el.title === 'Logout' || el.closest('.border-t.border-sidebar-border')) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
      });
    }
  });
}

/**
 * Show a toast notification
 */
function showToast(message, type = 'info') {
  // Remove existing toast
  const existing = document.getElementById('forge-toast');
  if (existing) existing.remove();

  const colors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-amber-500',
  };

  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    info: 'fa-circle-info',
    warning: 'fa-triangle-exclamation',
  };

  const toast = document.createElement('div');
  toast.id = 'forge-toast';
  toast.className = `fixed top-4 right-4 z-[200] ${colors[type]} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-medium transform translate-x-full transition-transform duration-300`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type]}"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(0)';
  });

  // Auto dismiss
  setTimeout(() => {
    toast.style.transform = 'translateX(120%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Show a confirmation modal. Returns a Promise<boolean>.
 */
function showConfirmModal(title, message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4';
    overlay.innerHTML = `
      <div class="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <h3 class="text-lg font-bold text-gray-900 mb-2">${title}</h3>
        <p class="text-gray-500 text-sm mb-6">${message}</p>
        <div class="flex gap-3 justify-end">
          <button id="confirm-cancel" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button>
          <button id="confirm-ok" class="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#confirm-cancel').onclick = () => { overlay.remove(); resolve(false); };
    overlay.querySelector('#confirm-ok').onclick = () => { overlay.remove(); resolve(true); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
  });
}

/**
 * Show a form modal. Returns filled data or null.
 */
function showFormModal(title, fields, submitText = 'Save') {
  return new Promise((resolve) => {
    const fieldsHTML = fields.map(f => `
      <div>
        <label class="forge-label">${f.label}</label>
        ${f.type === 'select' 
          ? `<select name="${f.name}" class="forge-input" ${f.required ? 'required' : ''}>
              ${f.options.map(o => `<option value="${o.value}" ${f.value === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
             </select>`
          : `<input type="${f.type || 'text'}" name="${f.name}" value="${f.value || ''}" placeholder="${f.placeholder || ''}" class="forge-input" ${f.required ? 'required' : ''} ${f.min ? `min="${f.min}"` : ''} ${f.step ? `step="${f.step}"` : ''}>`
        }
      </div>
    `).join('');

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4';
    overlay.innerHTML = `
      <div class="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-bold text-gray-900 mb-6">${title}</h3>
        <form class="space-y-4" id="modal-form">
          ${fieldsHTML}
          <div class="flex gap-3 justify-end pt-4">
            <button type="button" id="modal-cancel" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button>
            <button type="submit" class="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/30">${submitText}</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#modal-cancel').onclick = () => { overlay.remove(); resolve(null); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); resolve(null); } });

    overlay.querySelector('#modal-form').onsubmit = (e) => {
      e.preventDefault();
      const formData = {};
      fields.forEach(f => {
        const input = overlay.querySelector(`[name="${f.name}"]`);
        formData[f.name] = f.type === 'number' ? Number(input.value) : input.value;
      });
      overlay.remove();
      resolve(formData);
    };
  });
}
