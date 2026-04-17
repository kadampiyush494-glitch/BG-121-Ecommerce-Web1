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
    const statValues = document.querySelectorAll('.text-2xl.font-bold.text-gray-900');
    if (statValues[0]) statValues[0].textContent = `$${stats.total_revenue.toLocaleString()}`;
    if (statValues[1]) statValues[1].textContent = stats.total_orders.toLocaleString();
    if (statValues[2]) statValues[2].textContent = stats.total_customers.toLocaleString();
    if (statValues[3]) statValues[3].textContent = stats.total_products.toLocaleString();

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
