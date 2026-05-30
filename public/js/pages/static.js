function render_tools() {
  var wrap = document.createElement('div');
  wrap.className = 'card-glass animate-in';
  wrap.style.cssText = 'text-align:center;padding:60px 40px';
  wrap.innerHTML = ''
    + '<h2 style="font-size:1.5rem;font-weight:700;margin-bottom:16px">实用工具</h2>'
    + '<p class="text-secondary mb-6">实用工具功能即将上线，敬请期待...</p>'
    + '<div class="flex justify-center gap-4">'

    + '<div class="card-glass" style="padding:24px;width:160px;text-align:center">'
    + '<div style="margin:0 auto 8px;width:56px;height:56px;display:flex;align-items:center;justify-content:center">'
    + '<svg width="44" height="44" viewBox="0 0 48 48" fill="none" stroke="var(--blue)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="40" height="30" rx="4"/><line x1="14" y1="16" x2="34" y2="16"/><circle cx="15" cy="24" r="5" fill="var(--blue)" fill-opacity="0.25"/><circle cx="24" cy="24" r="5" fill="var(--blue)" fill-opacity="0.25"/><circle cx="33" cy="24" r="5" fill="var(--blue)" fill-opacity="0.25"/></svg>'
    + '</div>'
    + '<div class="font-medium">计算器</div>'
    + '<div class="text-xs text-tertiary">即将上线</div></div>'

    + '<div class="card-glass" style="padding:24px;width:160px;text-align:center">'
    + '<div style="margin:0 auto 8px;width:56px;height:56px;display:flex;align-items:center;justify-content:center">'
    + '<svg width="44" height="44" viewBox="0 0 48 48" fill="none" stroke="var(--blue)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="4" width="20" height="36" rx="3"/><line x1="12" y1="14" x2="24" y2="28"/><line x1="24" y1="14" x2="12" y2="28"/><rect x="30" y="10" width="12" height="28" rx="3"/><line x1="32" y1="18" x2="40" y2="18"/><line x1="32" y1="26" x2="40" y2="26"/><line x1="32" y1="34" x2="40" y2="34"/></svg>'
    + '</div>'
    + '<div class="font-medium">便签</div>'
    + '<div class="text-xs text-tertiary">即将上线</div></div>'

    + '<div class="card-glass" style="padding:24px;width:160px;text-align:center">'
    + '<div style="margin:0 auto 8px;width:56px;height:56px;display:flex;align-items:center;justify-content:center">'
    + '<svg width="44" height="44" viewBox="0 0 48 48" fill="none" stroke="var(--blue)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="20"/><polyline points="24 10 24 24 34 28"/><circle cx="24" cy="24" r="2" fill="var(--blue)"/></svg>'
    + '</div>'
    + '<div class="font-medium">计时器</div>'
    + '<div class="text-xs text-tertiary">即将上线</div></div>'

    + '</div>';
  return wrap;
}
