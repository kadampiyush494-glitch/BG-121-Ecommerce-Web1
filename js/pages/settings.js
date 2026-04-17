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
  const initialElements = document.querySelectorAll('.w-20.h-20, #avatar-initials');
  initialElements.forEach(el => { el.textContent = initials; });

  let avatarBase64 = user.avatar || null;
  const avatarPreview = document.getElementById('avatar-preview');
  const avatarInitials = document.getElementById('avatar-initials');

  if (avatarBase64) {
    avatarPreview.src = avatarBase64;
    avatarPreview.classList.remove('hidden');
    avatarInitials.classList.add('hidden');
  }

  const avatarUpload = document.getElementById('avatar-upload');
  if (avatarUpload) {
    avatarUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        showToast('File too large. Max 5MB.', 'error');
        avatarUpload.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const max_dim = 256;

          if (width > height) {
            if (width > max_dim) {
              height *= max_dim / width;
              width = max_dim;
            }
          } else {
            if (height > max_dim) {
              width *= max_dim / height;
              height = max_dim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          avatarBase64 = canvas.toDataURL('image/jpeg', 0.8);
          avatarPreview.src = avatarBase64;
          avatarPreview.classList.remove('hidden');
          avatarInitials.classList.add('hidden');
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

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
        const payload = { name: fullName };
        if (avatarBase64 !== null) payload.avatar = avatarBase64;

        await api.put(`/users/${user.id}`, payload);
        // Update session
        user.name = fullName;
        if (avatarBase64 !== null) user.avatar = avatarBase64;
        sessionStorage.setItem('forgeadmin_user', JSON.stringify(user));
        showToast('Settings saved!', 'success');
        updateUserUI(user);
      } catch (err) {
        showToast(err.message || 'Failed to save settings.', 'error');
      }
    });
  }

  // Wipe Data button
  const wipeBtn = document.getElementById('btn-wipe-data');
  if (wipeBtn) {
    wipeBtn.addEventListener('click', async () => {
      const confirmed = await showConfirmModal('Wipe All Dummy Data', 'Are you absolutely sure? This will delete ALL Products, Orders, Categories, Inventory, and Customers. This action cannot be undone.');
      if (confirmed) {
        const originalText = wipeBtn.innerHTML;
        try {
          wipeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Wiping...';
          wipeBtn.disabled = true;
          const resp = await api.post('/stats/wipe_data');
          showToast(resp.message || 'Dummy data wiped successfully!', 'success');
          setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
          showToast(err.message || 'Failed to wipe data.', 'error');
          wipeBtn.innerHTML = originalText;
          wipeBtn.disabled = false;
        }
      }
    });
  }
});
