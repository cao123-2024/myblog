const API = {
  base: '/api',
  token: localStorage.getItem('token') || '',
  adminToken: localStorage.getItem('adminToken') || '',

  setToken(t) { this.token = t; },
  headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.adminToken) h['Authorization'] = 'Bearer ' + this.adminToken;
    else if (this.token) h['Authorization'] = 'Bearer ' + this.token;
    return h;
  },

  async request(method, path, body) {
    const opts = { method, headers: this.headers() };
    if (body && !(body instanceof FormData)) opts.body = JSON.stringify(body);
    else if (body instanceof FormData) { opts.body = body; delete opts.headers['Content-Type']; }
    const res = await fetch(this.base + path, opts);
    let text = '';
    try {
      text = await res.text();
    } catch(e) {
      throw new Error('网络异常，请检查连接');
    }
    let data = {};
    try { data = JSON.parse(text.trim() || '{}'); }
    catch (e) { data = {}; }
    if (!res.ok) throw new Error(data.error || data.message || '请求失败 ('+res.status+')');
    return data;
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  delete(path) { return this.request('DELETE', path); },
  upload(path, formData) { return this.request('POST', path, formData); },
  uploadPut(path, formData) { return this.request('PUT', path, formData); }
};

const Store = {
  user: null,
  token: localStorage.getItem('token') || '',
  adminToken: localStorage.getItem('adminToken') || '',
  currentPage: 'home',
  lastPageData: null,
  _pendingLogin: null,

  setUser(u) { this.user = u; API.token = this.token; API.adminToken = this.adminToken; if (u && u.bg_image && window.applyWallpaper) window.applyWallpaper(u.bg_image); },
  login(token, user) {
    /* Wipe any stale tokens first */
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    this.token = token; this.user = user;
    localStorage.setItem('token', token); API.token = token;
    this.adminToken = ''; API.adminToken = '';
    localStorage.removeItem('adminToken');
    setTimeout(updateNav, 50);
  },
  loginAdmin(at) {
    this.adminToken = at; localStorage.setItem('adminToken', at); API.adminToken = at;
    updateNav();
  },
  logout() {
    this.token = ''; this.adminToken = ''; this.user = null;
    API.token = ''; API.adminToken = '';
    localStorage.removeItem('token'); localStorage.removeItem('adminToken');
    updateNav();
  },
  logoutAdmin() {
    this.adminToken = ''; localStorage.removeItem('adminToken'); API.adminToken = '';
    updateNav();
  },
  isAdmin() { return this.user && (this.user.role === 'admin' || this.user.role === 'semi_admin'); },
  isSuperAdmin() { return this.user && this.user.role === 'admin' && !this.user.created_by; },
  isAdminVerified() { return this.isAdmin() && !!this.adminToken; }
};

function toast(msg, type) {
  type = type || 'info';
  var c = document.getElementById('toast-container');
  var el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(function(){
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(function(){ el.remove(); }, 300);
  }, 3000);
}

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function navigate(page, data) {
  Store.currentPage = page;
  Store.lastPageData = data;
  history.pushState({ page: page, data: data }, '', '#' + page);

  var links = $$('.nav-link');
  for (var i=0; i<links.length; i++) links[i].classList.remove('active');
  var link = $('.nav-link[data-page="' + page + '"]');
  if (link) link.classList.add('active');

  var main = $('#main-content');
  main.innerHTML = '';
  main.scrollTop = 0;

  var renderFn = window['render_' + page];
  if (renderFn) {
    var el = renderFn(data);
    if (el) main.appendChild(el);
    if (window['afterRender_' + page]) window['afterRender_' + page](data);
  } else {
    main.innerHTML = '<div class="text-center mt-6 text-secondary">页面加载中...</div>';
  }
}

function updateNav() {
  var userInfo = $('#nav-user-info');
  var adminLinks = $$('.admin-only');

  if (Store.user) {
    userInfo.classList.remove('hidden');
    $('#nav-username').textContent = Store.user.nickname || Store.user.username;
    var av = Store.user.avatar || getDefaultAvatar(Store.user.username);
    $('#nav-avatar').style.backgroundImage = av ? 'url(' + av + ')' : 'none';
    $('#nav-avatar').style.backgroundColor = '';
  } else {
    userInfo.classList.add('hidden');
  }
  adminLinks.forEach(function(el){
    el.classList.toggle('hidden', !Store.isAdmin());
  });
}

window.addEventListener('popstate', function(e){
  if (e.state && e.state.page) navigate(e.state.page, e.state.data);
  else navigate('home');
});

var App = {
  init: function(){
    updateNav();
    if (Store.token && !Store.user) {
      try {
        API.get('/me').then(function(data){
          Store.setUser(data.user);
          updateNav();
        }).catch(function(e){
          Store.token = '';
          localStorage.removeItem('token');
          API.token = '';
        });
      } catch(e) {}
    }
    var page = location.hash.slice(1) || 'home';
    navigate(page);

    /* Start polling for unread messages & announcements */
    if (Store.token) {
      pollUnreadCount();
      setInterval(pollUnreadCount, 15000);
      checkAnnouncements();
    }
  }
};

async function pollUnreadCount() {
  if (!Store.token) return;
  try {
    var d = await API.get('/messages/unread-count');
    var badge = document.getElementById('msg-badge');
    if (!badge) return;
    var n = d.count || 0;
    if (n > 0) {
      badge.style.display = 'flex';
      badge.textContent = n > 99 ? '99+' : n;
    } else {
      badge.style.display = 'none';
    }
  } catch(e) {}
}

var _lastAnnouncementId = parseInt(localStorage.getItem('lastAnnId') || '0');

async function checkAnnouncements() {
  if (!Store.token) return;
  try {
    var d = await API.get('/announcements');
    var list = d.announcements || [];
    if (list.length === 0) return;
    var latest = list[0];
    if (latest.id > _lastAnnouncementId) {
      showAnnouncementPopup(latest);
    }
  } catch(e) {}
}

function showAnnouncementPopup(ann) {
  var dt = new Date(ann.created_at);
  var dateStr = dt.getFullYear() + '-' +
    String(dt.getMonth()+1).padStart(2,'0') + '-' +
    String(dt.getDate()).padStart(2,'0') + ' ' +
    String(dt.getHours()).padStart(2,'0') + ':' +
    String(dt.getMinutes()).padStart(2,'0');
  var content = document.getElementById('ann-content');
  content.innerHTML = ''
    + '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">'
    + '<h2 style="font-size:1.3rem;font-weight:700;margin:0">' + escapeHtml(ann.title) + '</h2>'
    + '<button onclick="closeAnnouncement()" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:1.3rem;line-height:1;padding:0 0 0 12px">&times;</button>'
    + '</div>'
    + '<p style="font-weight:700;color:var(--blue);margin-bottom:16px;font-size:0.95rem">' + dateStr + '</p>'
    + '<div style="white-space:pre-wrap;line-height:1.8;color:var(--text-primary);margin-bottom:20px">' + escapeHtml(ann.content) + '</div>'
    + '<button class="btn btn-primary w-full" onclick="confirmAnnouncement(' + ann.id + ')">确 认</button>';
  document.getElementById('ann-overlay').classList.add('active');
  _lastAnnouncementId = ann.id;
}

function confirmAnnouncement(id) {
  localStorage.setItem('lastAnnId', id);
  _lastAnnouncementId = id;
  closeAnnouncement();
}

function closeAnnouncement(e) {
  if (e && e.target !== document.getElementById('ann-overlay')) return;
  document.getElementById('ann-overlay').classList.remove('active');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

var PRESET_AVATARS = [
  { id:'av1', svg:'<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#0078D4"/><circle cx="50" cy="38" r="20" fill="#fff"/><ellipse cx="50" cy="90" rx="35" ry="22" fill="#fff"/></svg>' },
  { id:'av2', svg:'<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#CF222E"/><circle cx="50" cy="38" r="20" fill="#fff"/><ellipse cx="50" cy="90" rx="35" ry="22" fill="#fff"/></svg>' },
  { id:'av3', svg:'<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#1A7F37"/><circle cx="50" cy="38" r="20" fill="#fff"/><ellipse cx="50" cy="90" rx="35" ry="22" fill="#fff"/></svg>' },
  { id:'av4', svg:'<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#8250DF"/><circle cx="50" cy="38" r="20" fill="#fff"/><ellipse cx="50" cy="90" rx="35" ry="22" fill="#fff"/></svg>' },
  { id:'av5', svg:'<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#BF7B00"/><circle cx="50" cy="38" r="20" fill="#fff"/><ellipse cx="50" cy="90" rx="35" ry="22" fill="#fff"/></svg>' },
  { id:'av6', svg:'<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#D63384"/><circle cx="50" cy="38" r="20" fill="#fff"/><ellipse cx="50" cy="90" rx="35" ry="22" fill="#fff"/></svg>' },
  { id:'av7', svg:'<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#00C6FF"/><circle cx="50" cy="38" r="20" fill="#fff"/><ellipse cx="50" cy="90" rx="35" ry="22" fill="#fff"/></svg>' },
  { id:'av8', svg:'<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#6E7681"/><circle cx="50" cy="38" r="20" fill="#fff"/><ellipse cx="50" cy="90" rx="35" ry="22" fill="#fff"/></svg>' }
];

function getDefaultAvatar(username) {
  var idx = 0;
  if (username) {
    var h = 0;
    for (var i = 0; i < username.length; i++) h = ((h << 5) - h) + username.charCodeAt(i);
    idx = Math.abs(h) % PRESET_AVATARS.length;
  }
  return 'data:image/svg+xml,' + encodeURIComponent(PRESET_AVATARS[idx].svg);
}
window.getDefaultAvatar = getDefaultAvatar;

function avatarUrl(user) {
  if (!user) return '';
  return user.avatar || getDefaultAvatar(user.username || '');
}
window.avatarUrl = avatarUrl;

function formatDate(d) {
  if (!d) return '';
  var dt = new Date(d);
  return dt.toLocaleDateString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'})+' '+
         dt.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
}
