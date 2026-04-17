/**
 * ForgeAdmin - Dashboard Page Integration
 * Loads real stats from /api/stats and populates dashboard cards.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;
  updateUserUI(user);

  try {
    const stats = await api.get('/stats');

    // Update stat cards
    const statCards = document.querySelectorAll('.grid.grid-cols-1.sm\\:grid-cols-2.xl\\:grid-cols-4 > div');
    if (statCards[0]) statCards[0].querySelector('.text-2xl').textContent = `$${stats.total_revenue.toLocaleString()}`;
    if (statCards[1]) statCards[1].querySelector('.text-2xl').textContent = stats.total_orders.toLocaleString();
    if (statCards[2]) statCards[2].querySelector('.text-2xl').textContent = stats.total_customers.toLocaleString();
    if (statCards[3]) statCards[3].querySelector('.text-2xl').textContent = stats.total_products.toLocaleString();

    // Update sidebar products count badge
    document.querySelectorAll('.sidebar-text').forEach(el => {
      if (el.textContent.trim() === '24' && el.classList.contains('ml-auto')) {
        el.textContent = stats.total_products;
      }
    });

    // Update sales by category legend
    const categoryLegend = document.querySelector('.grid.grid-cols-2.gap-3.mt-4');
    if (categoryLegend && stats.revenue_by_category) {
      const cats = Object.entries(stats.revenue_by_category);
      const total = cats.reduce((s, [, v]) => s + v, 0) || 1;
      const colors = ['bg-brand-500', 'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500'];
      categoryLegend.innerHTML = cats.slice(0, 4).map(([name, rev], i) => {
        const pct = Math.round((rev / total) * 100);
        return `<div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full ${colors[i % colors.length]}"></span><span class="text-xs text-gray-600">${name} ${pct}%</span></div>`;
      }).join('');
    }

  } catch (err) {
    console.error('Failed to load dashboard stats:', err);
  }
});
