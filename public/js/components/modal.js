function showModal(title, contentHtml, onConfirm, confirmText) {
  const overlay = $('#modal-overlay');
  const content = $('#modal-content');
  content.innerHTML = `
    <div class="modal-header">
      <span class="modal-title">${title}</span>
    </div>
    <div>${contentHtml}</div>
    <div class="flex justify-between mt-6">
      <button class="btn btn-glass" onclick="closeModal()">取消</button>
      ${onConfirm ? `<button class="btn btn-primary" id="modal-confirm-btn">${confirmText || '确认'}</button>` : ''}
    </div>
  `;
  overlay.classList.add('active');
  if (onConfirm) {
    setTimeout(() => {
      const btn = $('#modal-confirm-btn');
      if (btn) btn.addEventListener('click', async () => {
        try { await onConfirm(); closeModal(); } catch (e) { toast(e.message, 'error'); }
      });
    }, 100);
  }
}

function showConfirm(title, message, onConfirm) {
  showModal(title, `<p class="text-secondary">${message}</p>`, onConfirm, '确认');
}

function closeModal(e) {
  if (e && e.target !== $('#modal-overlay')) return;
  const overlay = $('#modal-overlay');
  overlay.classList.remove('active');
}

function showInputModal(title, label, placeholder, onSubmit) {
  const id = 'modal-input-' + Date.now();
  showModal(title, `
    <div class="form-group">
      <label for="${id}">${label}</label>
      <input class="input input-glass" id="${id}" placeholder="${placeholder || ''}" />
    </div>
  `, async () => {
    const val = $('#' + id).value.trim();
    if (!val) throw new Error(label + '不能为空');
    await onSubmit(val);
  }, '确认');
}
