/**
 * ForgeAdmin - Reviews Page Integration
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;
  updateUserUI(user);

  const container = document.getElementById('reviews-grid');

  async function loadReviews() {
    try {
      const data = await api.get('/reviews');
      renderReviews(data.reviews || []);
    } catch (err) {
      console.error('Failed to load reviews:', err);
      if (container) {
        container.innerHTML = `<div class="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center text-gray-400">
          <i class="fa-solid fa-triangle-exclamation text-3xl mb-2 block"></i>
          <p class="text-sm font-medium">Failed to load reviews</p>
          <p class="text-xs mt-1 text-red-500">${err.message}</p>
        </div>`;
      }
    }
  }

  function renderReviews(reviews) {
    if (!container) return;
    container.innerHTML = reviews.map(r => {
      const stars = Array.from({ length: 5 }, (_, i) =>
        `<i class="fa-${i < r.rating ? 'solid' : 'regular'} fa-star"></i>`
      ).join('');
      const initials = (r.product_name || 'XX').slice(0, 2).toUpperCase();
      const date = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      return `<div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm data-loaded">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">${initials}</div>
            <div>
              <h4 class="font-bold text-gray-900">Review #${r.id.slice(0, 6)}</h4>
              <p class="text-xs text-gray-400">${date}</p>
            </div>
          </div>
          <div class="flex items-center gap-1 text-amber-400">${stars}</div>
        </div>
        <div class="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100">
          <p class="text-sm font-bold text-gray-700 mb-1">Product: <span class="text-brand-600">${r.product_name || 'Unknown'}</span></p>
          <p class="text-sm text-gray-600">"${r.comment}"</p>
        </div>
        <div class="flex items-center gap-3">
          <button class="px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors delete-review" data-id="${r.id}">Delete</button>
        </div>
      </div>`;
    }).join('') || '<p class="text-gray-400 text-center py-12">No reviews yet.</p>';

    container.querySelectorAll('.delete-review').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (await showConfirmModal('Delete Review', 'Remove this review permanently?')) {
          try {
            await api.delete(`/reviews/${btn.dataset.id}`);
            showToast('Review deleted.', 'success');
            loadReviews();
          } catch (err) { showToast(err.message, 'error'); }
        }
      });
    });
  }

  loadReviews();
});
