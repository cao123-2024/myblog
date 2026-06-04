function render_sponsor() {
  const wrap = document.createElement("div");
  wrap.className = "stagger";

  // === Hero Banner ===
  const hero = document.createElement("div");
  hero.className = "sponsor-hero";
  hero.style.cssText = [
    "position: relative",
    "width: 100%",
    "min-height: 360px",
    "border-radius: 16px",
    "overflow: hidden",
    "background-image: " + cssUrl("/img/赞助.jpg"),
    "background-size: cover",
    "background-position: center",
    "background-repeat: no-repeat",
    "margin-bottom: 24px"
  ].join(";");

  const heroOverlay = document.createElement("div");
  heroOverlay.style.cssText = [
    "position: absolute",
    "inset: 0",
    "background: linear-gradient(135deg, rgba(0,120,212,0.45) 0%, rgba(0,0,0,0.55) 100%)",
    "display: flex",
    "flex-direction: column",
    "align-items: center",
    "justify-content: center",
    "padding: 40px 20px",
    "text-align: center"
  ].join(";");
  heroOverlay.innerHTML =
    '<h1 style="font-size:2.8rem;font-weight:800;color:#ffffff;text-shadow:0 4px 20px rgba(0,0,0,0.5);margin:0 0 12px;letter-spacing:4px">好活当赏</h1>' +
    '<p style="font-size:1.1rem;color:rgba(255,255,255,0.85);text-shadow:0 2px 8px rgba(0,0,0,0.4);margin:0">觉得这个项目不错？来赞助我吧！</p>';
  hero.appendChild(heroOverlay);
  wrap.appendChild(hero);

  // === Glass Card: Introduction ===
  const introCard = document.createElement("div");
  introCard.className = "card-glass stagger";
  introCard.style.cssText = [
    "padding: 32px 28px",
    "text-align: center",
    "margin-bottom: 20px"
  ].join(";");
  introCard.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:16px">' +
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0078D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="12" cy="12" r="10"/>' +
        '<path d="M16 12l-4-4-4 4"/>' +
        '<path d="M12 16V8"/>' +
      '</svg>' +
      '<h2 style="font-size:1.4rem;font-weight:700;margin:0;color:var(--text-primary)">感谢你的支持</h2>' +
    '</div>' +
    '<p style="font-size:1rem;line-height:1.8;color:var(--text-secondary);margin:0 0 16px;max-width:600px;margin:0 auto">' +
      'LUMINA 是一款开源的个人博客系统，致力于打造最优雅的写作与阅读体验。<br>' +
      '你的每一份赞助，都能帮助这个项目走得更远。<br>' +
      '感谢你的慷慨支持！' +
    '</p>' +
    '<div style="display:inline-flex;align-items:center;gap:8px;padding:10px 24px;background:rgba(0,120,212,0.1);border-radius:12px;margin-top:12px">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0078D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>' +
      '</svg>' +
      '<span style="font-size:0.95rem;color:#0078D4;font-weight:600">你的心意，我们铭记在心</span>' +
    '</div>';
  wrap.appendChild(introCard);

  // === Glass Card: Why Sponsor ===
  const whyCard = document.createElement("div");
  whyCard.className = "card-glass";
  whyCard.style.cssText = [
    "padding: 28px",
    "margin-bottom: 20px"
  ].join(";");
  whyCard.innerHTML =
    '<h3 style="font-size:1.15rem;font-weight:700;color:var(--text-primary);margin:0 0 16px;display:flex;align-items:center;gap:8px">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0078D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="12" cy="12" r="10"/>' +
        '<path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>' +
        '<line x1="12" y1="17" x2="12.01" y2="17"/>' +
      '</svg>' +
      '为什么要赞助？' +
    '</h3>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px">' +
      '<div style="padding:16px;background:rgba(0,120,212,0.06);border-radius:12px;text-align:center">' +
        '<div style="font-size:1.8rem;margin-bottom:8px">' +
          '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0078D4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" role="img"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>' +
        '</div>' +
        '<div style="font-weight:600;color:var(--text-primary);margin-bottom:4px">服务器开销</div>' +
        '<div style="font-size:0.85rem;color:var(--text-secondary)">维持项目的持续运行</div>' +
      '</div>' +
      '<div style="padding:16px;background:rgba(0,120,212,0.06);border-radius:12px;text-align:center">' +
        '<div style="font-size:1.8rem;margin-bottom:8px">' +
          '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0078D4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" role="img"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>' +
        '</div>' +
        '<div style="font-weight:600;color:var(--text-primary);margin-bottom:4px">功能开发</div>' +
        '<div style="font-size:0.85rem;color:var(--text-secondary)">更多新特性的研发</div>' +
      '</div>' +
      '<div style="padding:16px;background:rgba(0,120,212,0.06);border-radius:12px;text-align:center">' +
        '<div style="font-size:1.8rem;margin-bottom:8px">' +
          '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0078D4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" role="img"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>' +
        '</div>' +
        '<div style="font-weight:600;color:var(--text-primary);margin-bottom:4px">请开发者喝咖啡</div>' +
        '<div style="font-size:0.85rem;color:var(--text-secondary)">激励持续创作</div>' +
      '</div>' +
    '</div>';
  wrap.appendChild(whyCard);

  // === Big Spacer — forces scrolling to see phone ===
  const spacer = document.createElement("div");
  spacer.style.cssText = "min-height:280px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px";
  spacer.innerHTML =
    '<div style="width:2px;height:180px;background:linear-gradient(to bottom,transparent,rgba(0,120,212,0.2),transparent)"></div>' +
    '<p style="color:var(--text-secondary);font-size:0.9rem;display:flex;align-items:center;gap:8px">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>' +
      '继续下滑查看联系方式' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>' +
    '</p>';
  wrap.appendChild(spacer);

  // === Phone Number Section (at the very bottom, must scroll to see) ===
  const phoneSection = document.createElement("div");
  phoneSection.className = "card-glass";
  phoneSection.style.cssText = [
    "padding: 36px 28px",
    "text-align: center",
    "border: 1px solid rgba(0,120,212,0.25)",
    "background: linear-gradient(135deg, rgba(0,120,212,0.08) 0%, rgba(0,120,212,0.03) 100%), var(--bg-glass)"
  ].join(";");
  phoneSection.innerHTML =
    '<p style="font-size:0.95rem;color:var(--text-secondary);margin:0 0 18px">如有赞助意向，请通过以下方式联系</p>' +
    '<div style="display:inline-flex;align-items:center;gap:14px;padding:18px 36px;background:rgba(0,120,212,0.12);border-radius:14px;border:1px solid rgba(0,120,212,0.2)">' +
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0078D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>' +
      '</svg>' +
      '<a href="tel:13397004066" style="font-size:1.7rem;font-weight:700;color:#0078D4;text-decoration:none;letter-spacing:2px;transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1)" onmouseenter="this.style.transform=\'scale(1.05)\'" onmouseleave="this.style.transform=\'scale(1)\'">133 9700 4066</a>' +
    '</div>';
  wrap.appendChild(phoneSection);

  return wrap;
}
