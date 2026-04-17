/**
 * ForgeAdmin - Analytics Page Integration
 * Loads real data from /api/stats and populates analytics metrics.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;
  updateUserUI(user);

  try {
    const stats = await api.get('/stats');

    // Calculate analytics metrics from real data
    const avgOrderValue = stats.total_orders > 0 ? (stats.total_revenue / stats.total_orders) : 0;
    
    // Update stat cards
    const statCards = document.querySelectorAll('.bg-white.p-6.rounded-2xl.border');
    if (statCards.length >= 4) {
      // Average Order Value
      const aovValue = statCards[1]?.querySelector('.text-2xl');
      if (aovValue) aovValue.textContent = `$${avgOrderValue.toFixed(2)}`;
    }

    // Update traffic source bars with revenue by category
    const trafficSources = document.querySelector('.space-y-4');
    if (trafficSources && stats.revenue_by_category) {
      const entries = Object.entries(stats.revenue_by_category);
      const maxRev = Math.max(...entries.map(([, v]) => v), 1);
      const colors = ['bg-brand-500', 'bg-blue-500', 'bg-emerald-500', 'bg-violet-500'];

      trafficSources.innerHTML = entries.slice(0, 4).map(([name, rev], i) => {
        const pct = Math.round((rev / maxRev) * 100);
        return `<div class="flex items-center gap-4">
          <span class="text-sm font-medium text-gray-600 w-24">${name}</span>
          <div class="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full ${colors[i]} rounded-full" style="width: ${pct}%"></div>
          </div>
          <span class="text-sm font-bold text-gray-900 w-12 text-right">$${rev.toLocaleString()}</span>
        </div>`;
      }).join('');
    }

  } catch (err) {
    console.error('Failed to load analytics:', err);
  }
});
