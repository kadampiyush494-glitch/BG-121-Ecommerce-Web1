/**
 * ForgeAdmin - API Helper
 * Wraps fetch() with auth token injection and error handling.
 */

const API_BASE = '/api';

/**
 * Get the current Firebase ID token for authenticated requests.
 */
async function getAuthToken() {
  if (typeof firebase !== 'undefined' && firebase.auth().currentUser) {
    return await firebase.auth().currentUser.getIdToken();
  }
  // Fallback: check sessionStorage for demo mode
  return sessionStorage.getItem('forgeadmin_token') || null;
}

/**
 * Make an authenticated API request.
 * Automatically injects Bearer token if user is logged in.
 */
async function apiRequest(endpoint, options = {}) {
  const token = await getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      throw { status: response.status, ...data };
    }

    return data;
  } catch (err) {
    if (err.status === 401) {
      // Token expired or invalid - redirect to login
      console.warn('Authentication expired. Redirecting to login.');
      sessionStorage.clear();
      const isInPages = window.location.pathname.includes('/pages/');
      window.location.href = isInPages ? '../index.html' : 'index.html';
      return;
    }
    throw err;
  }
}

// Convenience methods
const api = {
  get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),
  post: (endpoint, body) => apiRequest(endpoint, { method: 'POST', body }),
  put: (endpoint, body) => apiRequest(endpoint, { method: 'PUT', body }),
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' }),
};
