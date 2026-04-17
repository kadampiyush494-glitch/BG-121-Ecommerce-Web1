/**
 * ForgeAdmin - Settings Page Integration
 * Loads and saves user profile settings.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;
  updateUserUI(user);

  // Populate form fields with current user data
  const inputs = document.querySelectorAll('.forge-input');
  if (inputs[0] && user.name) {
    const parts = user.name.split(' ');
    inputs[0].value = parts[0] || '';
    if (inputs[1]) inputs[1].value = parts.slice(1).join(' ') || '';
  }
  if (inputs[2] && user.email) {
    inputs[2].value = user.email;
  }

  // Profile initials
  const initials = user.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'JD';
  document.querySelectorAll('.w-20.h-20').forEach(el => { el.textContent = initials; });

  // Save button
  const saveBtn = document.querySelector('button');
  if (saveBtn && saveBtn.textContent.includes('Save')) {
    saveBtn.addEventListener('click', async () => {
      const firstName = inputs[0]?.value?.trim() || '';
      const lastName = inputs[1]?.value?.trim() || '';
      const fullName = `${firstName} ${lastName}`.trim();

      if (!fullName) {
        showToast('Name cannot be empty.', 'error');
        return;
      }

      try {
        await api.put(`/users/${user.id}`, { name: fullName });
        // Update session
        user.name = fullName;
        sessionStorage.setItem('forgeadmin_user', JSON.stringify(user));
        showToast('Settings saved!', 'success');
        updateUserUI(user);
      } catch (err) {
        showToast(err.message || 'Failed to save settings.', 'error');
      }
    });
  }
});
