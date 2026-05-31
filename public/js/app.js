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

  setUser(u) { this.user = u; API.token = this.token; API.adminToken = this.adminToken; if (u && u.wallpaper && window.applyWallpaper) window.applyWallpaper(u.wallpaper); },
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
  { id:'av1',  name:'小猫', svg:'PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSI1MCIgZmlsbD0iI0ZGQjM0NyIvPjxlbGxpcHNlIGN4PSIzMiIgY3k9IjMwIiByeD0iMTYiIHJ5PSIyMiIgZmlsbD0iI0ZGREFCOSIvPjxlbGxpcHNlIGN4PSI2OCIgY3k9IjMwIiByeD0iMTYiIHJ5PSIyMiIgZmlsbD0iI0ZGREFCOSIvPjxlbGxpcHNlIGN4PSI1MCIgY3k9IjU1IiByeD0iMjgiIHJ5PSIyNCIgZmlsbD0iI0ZGREFCOSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQiIGZpbGw9IiM4QjQ1MTMiLz48ZWxsaXBzZSBjeD0iMzgiIGN5PSI2MCIgcng9IjYiIHJ5PSI0IiBmaWxsPSIjRkZCNkMxIi8+PGVsbGlwc2UgY3g9IjYyIiBjeT0iNjAiIHJ4PSI2IiByeT0iNCIgZmlsbD0iI0ZGQjZDMSIvPjxsaW5lIHgxPSI1MCIgeTE9IjU0IiB4Mj0iNTAiIHkyPSI2MiIgc3Ryb2tlPSIjOEI0NTEzIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=' },
  { id:'av2',  name:'小狗', svg:'PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSI1MCIgZmlsbD0iIzhCNjkxNCIvPjxlbGxpcHNlIGN4PSI1MCIgY3k9IjQ4IiByeD0iMjYiIHJ5PSIyMiIgZmlsbD0iI0RFQjg4NyIvPjxlbGxpcHNlIGN4PSIzMCIgY3k9IjIyIiByeD0iMTMiIHJ5PSIyMCIgZmlsbD0iIzhCNDUxMyIvPjxlbGxpcHNlIGN4PSI3MCIgY3k9IjIyIiByeD0iMTMiIHJ5PSIyMCIgZmlsbD0iIzhCNDUxMyIvPjxlbGxpcHNlIGN4PSIzOCIgY3k9IjQ0IiByeD0iMyIgcnk9IjQiIGZpbGw9IiMzMzMiLz48ZWxsaXBzZSBjeD0iNjIiIGN5PSI0NCIgcng9IjMiIHJ5PSI0IiBmaWxsPSIjMzMzIi8+PGVsbGlwc2UgY3g9IjUwIiBjeT0iNTUiIHJ4PSI4IiByeT0iNSIgZmlsbD0iI0M0QTg4MiIvPjxlbGxpcHNlIGN4PSI1MCIgY3k9IjU3IiByeD0iMyIgcnk9IjIiIGZpbGw9IiNFOTk2N0EiLz48ZWxsaXBzZSBjeD0iNTAiIGN5PSI2NSIgcng9IjE1IiByeT0iMTAiIGZpbGw9IiNERUI4ODciLz48L3N2Zz4=' },
  { id:'av3',  name:'星球', svg:'PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSI1MCIgZmlsbD0iIzFhMWEyZSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjMwIiBmaWxsPSIjRThENUEzIi8+PGVsbGlwc2UgY3g9IjUwIiBjeT0iNTAiIHJ4PSI0NCIgcnk9IjEwIiBmaWxsPSJub25lIiBzdHJva2U9IiNGRkQ3MDAiIHN0cm9rZS13aWR0aD0iMyIgdHJhbnNmb3JtPSJyb3RhdGUoLTIwLDUwLDUwKSIvPjxjaXJjbGUgY3g9IjM1IiBjeT0iNDAiIHI9IjQiIGZpbGw9IiNENEE1NzQiIG9wYWNpdHk9IjAuNSIvPjxjaXJjbGUgY3g9IjU1IiBjeT0iNjAiIHI9IjMiIGZpbGw9IiNENEE1NzQiIG9wYWNpdHk9IjAuNSIvPjxjaXJjbGUgY3g9IjYwIiBjeT0iMzgiIHI9IjIiIGZpbGw9IiNENEE1NzQiIG9wYWNpdHk9IjAuNSIvPjwvc3ZnPg==' },
  { id:'av4',  name:'地球', svg:'PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSI1MCIgZmlsbD0iIzBhMGEyZSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjMyIiBmaWxsPSIjNDY4MkI0Ii8+PGVsbGlwc2UgY3g9IjUwIiBjeT0iMjQiIHJ4PSIxNiIgcnk9IjYiIGZpbGw9IiMzMkNEMzIiIG9wYWNpdHk9IjAuNyIvPjxlbGxpcHNlIGN4PSI1MCIgY3k9IjUyIiByeD0iMTAiIHJ5PSI0IiBmaWxsPSIjMzJDRDMyIiBvcGFjaXR5PSIwLjYiLz48ZWxsaXBzZSBjeD0iNDUiIGN5PSI3MCIgcng9IjgiIHJ5PSIzIiBmaWxsPSIjMzJDRDMyIiBvcGFjaXR5PSIwLjUiLz48ZWxsaXBzZSBjeD0iNTAiIGN5PSIzMiIgcng9IjIwIiByeT0iOCIgZmlsbD0iIzg3Q0VFQiIgb3BhY2l0eT0iMC41Ii8+PC9zdmc+' },
  { id:'av5',  name:'星星', svg:'PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSI1MCIgZmlsbD0iIzFhMDUzMyIvPjxwb2x5Z29uIHBvaW50cz0iNTAsMTIgNjEsNDIgOTMsNDIgNjcsNjIgNzcsOTMgNTAsNzMgMjMsOTMgMzMsNjIgNyw0MiAzOSw0MiIgZmlsbD0iI0ZGRDcwMCIvPjwvc3ZnPg==' },
  { id:'av6',  name:'月亮', svg:'PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSI1MCIgZmlsbD0iIzBEMUIyQSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjMyIiBmaWxsPSIjRjVGOURDIi8+PGNpcmNsZSBjeD0iNDAiIGN5PSI0MiIgcj0iNiIgZmlsbD0iI0U4RTBDOCIvPjxjaXJjbGUgY3g9IjU1IiBjeT0iNTgiIHI9IjQiIGZpbGw9IiNFOEUwQzgiLz48Y2lyY2xlIGN4PSI0OCIgY3k9IjY4IiByPSIzIiBmaWxsPSIjRThFMEM4Ii8+PGNpcmNsZSBjeD0iMzgiIGN5PSI1NSIgcj0iMiIgZmlsbD0iI0U4RTBDOCIvPjxjaXJjbGUgY3g9IjYwIiBjeT0iNDUiIHI9IjIuNSIgZmlsbD0iI0U4RTBDOCIvPjwvc3ZnPg==' },
  { id:'av7',  name:'小兔', svg:'PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSI1MCIgZmlsbD0iI0ZGQjZDMSIvPjxlbGxpcHNlIGN4PSI1MCIgY3k9IjU0IiByeD0iMjYiIHJ5PSIyNCIgZmlsbD0iI2ZmZiIvPjxlbGxpcHNlIGN4PSIzOCIgY3k9IjEyIiByeD0iNSIgcnk9IjIwIiBmaWxsPSIjZmZmIi8+PGVsbGlwc2UgY3g9IjYyIiBjeT0iMTIiIHJ4PSI1IiByeT0iMjAiIGZpbGw9IiNmZmYiLz48ZWxsaXBzZSBjeD0iMzgiIGN5PSI4IiByeD0iNCIgcnk9IjE0IiBmaWxsPSIjRkZCNkMxIi8+PGVsbGlwc2UgY3g9IjYyIiBjeT0iOCIgcng9IjQiIHJ5PSIxNCIgZmlsbD0iI0ZGQjZDMSIvPjxlbGxpcHNlIGN4PSI0MCIgY3k9IjUwIiByeD0iMyIgcnk9IjQiIGZpbGw9IiMzMzMiLz48ZWxsaXBzZSBjeD0iNjAiIGN5PSI1MCIgcng9IjMiIHJ5PSI0IiBmaWxsPSIjMzMzIi8+PGVsbGlwc2UgY3g9IjUwIiBjeT0iNTgiIHJ4PSI0IiByeT0iMyIgZmlsbD0iI0ZGNjlCNCIvPjxsaW5lIHgxPSI0NCIgeTE9IjY2IiB4Mj0iNDYiIHkyPSI3NiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiLz48bGluZSB4MT0iNTYiIHkxPSI2NiIgeDI9IjU0IiB5Mj0iNzYiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+' },
  { id:'av8',  name:'小狐', svg:'PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSI1MCIgZmlsbD0iI0ZGNjM0NyIvPjxwb2x5Z29uIHBvaW50cz0iNTAsMTggMzAsNDIgNTAsNDgiIGZpbGw9IiNmZmYiLz48cG9seWdvbiBwb2ludHM9IjUwLDE4IDcwLDQyIDUwLDQ4IiBmaWxsPSIjZmZmIi8+PGVsbGlwc2UgY3g9IjUwIiBjeT0iNTIiIHJ4PSIyNiIgcnk9IjI0IiBmaWxsPSIjRkY4QzAwIi8+PGVsbGlwc2UgY3g9IjQwIiBjeT0iNDgiIHJ4PSI0IiByeT0iNSIgZmlsbD0iIzMzMyIvPjxlbGxpcHNlIGN4PSI2MCIgY3k9IjQ4IiByeD0iNCIgcnk9IjUiIGZpbGw9IiMzMzMiLz48ZWxsaXBzZSBjeD0iNTAiIGN5PSI2MiIgcng9IjEyIiByeT0iOCIgZmlsbD0iI2ZmZiIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNjIiIHI9IjMiIGZpbGw9IiMzMzMiLz48L3N2Zz4=' },
  { id:'av9',  name:'熊猫', svg:'PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSI1MCIgZmlsbD0iIzJkNTAxNiIvPjxlbGxpcHNlIGN4PSI1MCIgY3k9IjUyIiByeD0iMjgiIHJ5PSIyNiIgZmlsbD0iI2ZmZiIvPjxlbGxpcHNlIGN4PSIzNiIgY3k9IjQyIiByeD0iMTAiIHJ5PSIxMiIgZmlsbD0iIzMzMyIvPjxlbGxpcHNlIGN4PSI2NCIgY3k9IjQyIiByeD0iMTAiIHJ5PSIxMiIgZmlsbD0iIzMzMyIvPjxlbGxpcHNlIGN4PSIzNiIgY3k9IjQyIiByeD0iNSIgcnk9IjYiIGZpbGw9IiNmZmYiLz48ZWxsaXBzZSBjeD0iNjQiIGN5PSI0MiIgcng9IjUiIHJ5PSI2IiBmaWxsPSIjZmZmIi8+PGVsbGlwc2UgY3g9IjUwIiBjeT0iNjAiIHJ4PSI4IiByeT0iNiIgZmlsbD0iIzMzMyIvPjxlbGxpcHNlIGN4PSI1MCIgY3k9IjU2IiByeD0iMyIgcnk9IjIiIGZpbGw9IiNmZmYiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjY4IiByPSIyIiBmaWxsPSIjMzMzIi8+PC9zdmc+' },
  { id:'av10', name:'企鹅', svg:'PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSI1MCIgZmlsbD0iIzg3Q0VFQiIvPjxlbGxpcHNlIGN4PSI1MCIgY3k9IjU0IiByeD0iMjQiIHJ5PSIyOCIgZmlsbD0iIzJGNEY0RiIvPjxlbGxpcHNlIGN4PSI1MCIgY3k9IjQ1IiByeD0iMjAiIHJ5PSIxOCIgZmlsbD0iIzFhMWExYSIvPjxlbGxpcHNlIGN4PSI1MCIgY3k9IjUwIiByeD0iMTQiIHJ5PSIxMiIgZmlsbD0iI2ZmZiIvPjxlbGxpcHNlIGN4PSI0NCIgY3k9IjQ4IiByeD0iMyIgcnk9IjQiIGZpbGw9IiMzMzMiLz48ZWxsaXBzZSBjeD0iNTYiIGN5PSI0OCIgcng9IjMiIHJ5PSI0IiBmaWxsPSIjMzMzIi8+PHBvbHlnb24gcG9pbnRzPSI0Niw1NCA1NCw1NCA1Miw1OCA0OCw1OCIgZmlsbD0iI0ZGNjM0NyIvPjxlbGxpcHNlIGN4PSIzNiIgY3k9IjY0IiByeD0iNSIgcnk9IjEyIiBmaWxsPSIjMkY0RjRGIi8+PGVsbGlwc2UgY3g9IjY0IiBjeT0iNjQiIHJ4PSI1IiByeT0iMTIiIGZpbGw9IiMyRjRGNEYiLz48L3N2Zz4=' },
  { id:'av11', name:'花朵', svg:'PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSI1MCIgZmlsbD0iI0YwRkZGMCIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNDYiIHI9IjEwIiBmaWxsPSIjRkZENzAwIi8+PGNpcmNsZSBjeD0iMzgiIGN5PSIzMiIgcj0iOCIgZmlsbD0iI0ZGNjlCNCIvPjxjaXJjbGUgY3g9IjYyIiBjeT0iMzIiIHI9IjgiIGZpbGw9IiNGRjY5QjQiLz48Y2lyY2xlIGN4PSI2MiIgY3k9IjYwIiByPSI4IiBmaWxsPSIjRkY2OUI0Ii8+PGNpcmNsZSBjeD0iMzgiIGN5PSI2MCIgcj0iOCIgZmlsbD0iI0ZGNjlCNCIvPjxsaW5lIHgxPSI1MCIgeTE9IjU2IiB4Mj0iNTAiIHkyPSI4MiIgc3Ryb2tlPSIjMzJDRDMyIiBzdHJva2Utd2lkdGg9IjQiLz48ZWxsaXBzZSBjeD0iNDIiIGN5PSI3MCIgcng9IjEwIiByeT0iNiIgZmlsbD0iIzMyQ0QzMiIvPjwvc3ZnPg==' },
  { id:'av12', name:'三叶草', svg:'PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSI1MCIgZmlsbD0iI0YwRkZGMCIvPjxsaW5lIHgxPSI1MCIgeTE9IjU4IiB4Mj0iNTAiIHkyPSI4MiIgc3Ryb2tlPSIjMjI4QjIyIiBzdHJva2Utd2lkdGg9IjQiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjMwIiByPSIxNCIgZmlsbD0iIzMyQ0QzMiIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzAiIHI9IjEwIiBmaWxsPSIjOTBFRTkwIi8+PGNpcmNsZSBjeD0iMzIiIGN5PSI1MCIgcj0iMTQiIGZpbGw9IiMzMkNEMzIiLz48Y2lyY2xlIGN4PSIzMiIgY3k9IjUwIiByPSIxMCIgZmlsbD0iIzkwRUU5MCIvPjxjaXJjbGUgY3g9IjY4IiBjeT0iNTAiIHI9IjE0IiBmaWxsPSIjMzJDRDMyIi8+PGNpcmNsZSBjeD0iNjgiIGN5PSI1MCIgcj0iMTAiIGZpbGw9IiM5MEVFOTAiLz48L3N2Zz4=' }
];

function getDefaultAvatar(username) {
  var idx = 0;
  if (username) {
    var h = 0;
    for (var i = 0; i < username.length; i++) h = ((h << 5) - h) + username.charCodeAt(i);
    idx = Math.abs(h) % PRESET_AVATARS.length;
  }
  return 'data:image/svg+xml;base64,' + PRESET_AVATARS[idx].svg;
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
