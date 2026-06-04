/* UTF-8 → base64，替代废弃的 unescape(encodeURIComponent(...)) */
function svgToBase64(svgStr) {
  return btoa(encodeURIComponent(svgStr).replace(/%([0-9A-F]{2})/g, function(_, p) {
    return String.fromCharCode(parseInt(p, 16));
  }));
}
window.svgToBase64 = svgToBase64;

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
    setTimeout(function(){ updateNav(); wsConnect(); }, 50);
  },
  loginAdmin(at) {
    this.adminToken = at; localStorage.setItem('adminToken', at); API.adminToken = at;
    updateNav();
    wsConnect();
  },
  logout() {
    this.token = ''; this.adminToken = ''; this.user = null;
    API.token = ''; API.adminToken = '';
    localStorage.removeItem('token'); localStorage.removeItem('adminToken');
    try { wsDisconnect(); } catch(e) {}
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
    $('#nav-avatar').style.backgroundImage = cssUrl(av);
    $('#nav-avatar').style.backgroundSize = 'cover';
    $('#nav-avatar').style.backgroundPosition = 'center';
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

    
/* ===== WebSocket 实时通信管理器 ===== */
var _ws = null;
var _wsReconnectTimer = null;
var _wsReconnectAttempts = 0;
var _wsMaxReconnect = 10;
var _wsEventHandlers = {};

function wsConnect() {
  if (!Store.token) return;
  if (_ws && (_ws.readyState === 0 || _ws.readyState === 1)) return;
  try {
    var proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    var wsUrl = proto + '//' + window.location.host + '/ws?token=' + encodeURIComponent(Store.token);
    _ws = new WebSocket(wsUrl);
    _ws.onopen = function() { _wsReconnectAttempts = 0; };
    _ws.onclose = function() { wsReconnect(); };
    _ws.onerror = function() { _ws && _ws.close(); };
    _ws.onmessage = function(e) {
      try {
        var msg = JSON.parse(e.data);
        if (msg.type === 'connected' || msg.type === 'pong') return;
        if (msg.type === 'new_message') {
          if (typeof window._onWsNewMessage === 'function') window._onWsNewMessage(msg.data);
          pollUnreadCount();
          return;
        }
        if (msg.type === 'admin_notify') {
          var n = msg.data;
          if (n.type === 'new_user') {
            toast('新用户注册: ' + (n.nickname || n.username), 'info');
          }
          return;
        }
        if (msg.type === 'appeal_result') {
          var result = msg.data.status === 'approved' ? '已批准' : '已驳回';
          toast('申诉' + result + (msg.data.admin_msg ? ': ' + msg.data.admin_msg : ''), msg.data.status === 'approved' ? 'success' : 'info');
          return;
        }
      } catch(e) {}
    };
  } catch(e) { wsReconnect(); }
}

function wsReconnect() {
  if (_wsReconnectAttempts >= _wsMaxReconnect) return;
  if (_wsReconnectTimer) clearTimeout(_wsReconnectTimer);
  var delay = Math.min(1000 * Math.pow(2, _wsReconnectAttempts), 30000);
  _wsReconnectAttempts++;
  _wsReconnectTimer = setTimeout(wsConnect, delay);
}

function wsDisconnect() {
  if (_wsReconnectTimer) { clearTimeout(_wsReconnectTimer); _wsReconnectTimer = null; }
  _wsReconnectAttempts = _wsMaxReconnect;
  try { if (_ws) { _ws.close(); _ws = null; } } catch(e) { _ws = null; }
}

  /* Start polling for unread messages & announcements - also connect WS */
  wsConnect();
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

/* CSS URL 安全包裹 — 防止用户生成URL注入 */
function cssUrl(url) {
  if (!url) return 'none';
  var safe = url.replace(/'/g, '%27').replace(/\)/g, '%29').replace(/"/g, '%22');
  return "url('" + safe + "')";
}
window.cssUrl = cssUrl;

var PRESET_AVATARS = [
  { id:'av1',  name:'小猫', svg:'<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#FFB347"/><ellipse cx="32" cy="30" rx="16" ry="22" fill="#FFDAB9"/><ellipse cx="68" cy="30" rx="16" ry="22" fill="#FFDAB9"/><ellipse cx="50" cy="55" rx="28" ry="24" fill="#FFDAB9"/><circle cx="50" cy="50" r="4" fill="#8B4513"/><ellipse cx="38" cy="60" rx="6" ry="4" fill="#FFB6C1"/><ellipse cx="62" cy="60" rx="6" ry="4" fill="#FFB6C1"/><line x1="50" y1="54" x2="50" y2="62" stroke="#8B4513" stroke-width="2"/></svg>' },
  { id:'av2',  name:'小狗', svg:'<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#8B6914"/><ellipse cx="50" cy="48" rx="26" ry="22" fill="#DEB887"/><ellipse cx="30" cy="22" rx="13" ry="20" fill="#8B4513"/><ellipse cx="70" cy="22" rx="13" ry="20" fill="#8B4513"/><ellipse cx="38" cy="44" rx="3" ry="4" fill="#333"/><ellipse cx="62" cy="44" rx="3" ry="4" fill="#333"/><ellipse cx="50" cy="55" rx="8" ry="5" fill="#C4A882"/><ellipse cx="50" cy="57" rx="3" ry="2" fill="#E9967A"/><ellipse cx="50" cy="65" rx="15" ry="10" fill="#DEB887"/></svg>' },
  { id:'av3',  name:'星球', svg:'<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#1a1a2e"/><circle cx="50" cy="50" r="30" fill="#E8D5A3"/><ellipse cx="50" cy="50" rx="44" ry="10" fill="none" stroke="#FFD700" stroke-width="3" transform="rotate(-20,50,50)"/><circle cx="35" cy="40" r="4" fill="#D4A574" opacity="0.5"/><circle cx="55" cy="60" r="3" fill="#D4A574" opacity="0.5"/><circle cx="60" cy="38" r="2" fill="#D4A574" opacity="0.5"/></svg>' },
  { id:'av4',  name:'地球', svg:'<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#0a0a2e"/><circle cx="50" cy="50" r="32" fill="#4682B4"/><ellipse cx="50" cy="24" rx="16" ry="6" fill="#32CD32" opacity="0.7"/><ellipse cx="50" cy="52" rx="10" ry="4" fill="#32CD32" opacity="0.6"/><ellipse cx="45" cy="70" rx="8" ry="3" fill="#32CD32" opacity="0.5"/><ellipse cx="50" cy="32" rx="20" ry="8" fill="#87CEEB" opacity="0.5"/></svg>' },
  { id:'av5',  name:'星星', svg:'<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#1a0533"/><polygon points="50,12 61,42 93,42 67,62 77,93 50,73 23,93 33,62 7,42 39,42" fill="#FFD700"/></svg>' },
  { id:'av6',  name:'月亮', svg:'<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#0D1B2A"/><circle cx="50" cy="50" r="30" fill="#F5F5DC"/><circle cx="38" cy="40" r="5" fill="#E8E0C8"/><circle cx="55" cy="55" r="3.5" fill="#E8E0C8"/><circle cx="48" cy="65" r="2.5" fill="#E8E0C8"/></svg>' },
  { id:'av7',  name:'小兔', svg:'<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#FFB6C1"/><ellipse cx="50" cy="54" rx="26" ry="24" fill="#fff"/><ellipse cx="40" cy="10" rx="5" ry="18" fill="#fff"/><ellipse cx="60" cy="10" rx="5" ry="18" fill="#fff"/><ellipse cx="40" cy="8" rx="4" ry="12" fill="#FFB6C1"/><ellipse cx="60" cy="8" rx="4" ry="12" fill="#FFB6C1"/><circle cx="40" cy="50" r="3" fill="#333"/><circle cx="60" cy="50" r="3" fill="#333"/><ellipse cx="50" cy="58" rx="4" ry="3" fill="#FF69B4"/></svg>' },
  { id:'av8',  name:'小狐', svg:'<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#FF6347"/><polygon points="48,22 30,42 48,48" fill="#fff"/><polygon points="52,22 70,42 52,48" fill="#fff"/><ellipse cx="50" cy="52" rx="26" ry="22" fill="#FF8C00"/><circle cx="40" cy="48" r="3" fill="#333"/><circle cx="60" cy="48" r="3" fill="#333"/><ellipse cx="50" cy="62" rx="10" ry="7" fill="#fff"/><circle cx="50" cy="62" r="3" fill="#333"/></svg>' },
  { id:'av9',  name:'熊猫', svg:'<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#2d5016"/><ellipse cx="50" cy="54" rx="28" ry="26" fill="#fff"/><ellipse cx="36" cy="42" rx="9" ry="11" fill="#333"/><ellipse cx="64" cy="42" rx="9" ry="11" fill="#333"/><ellipse cx="36" cy="42" rx="4" ry="5" fill="#fff"/><ellipse cx="64" cy="42" rx="4" ry="5" fill="#fff"/><ellipse cx="50" cy="60" rx="7" ry="5" fill="#333"/><circle cx="50" cy="58" r="2" fill="#fff"/></svg>' },
  { id:'av10', name:'企鹅', svg:'<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#87CEEB"/><ellipse cx="50" cy="54" rx="22" ry="26" fill="#2F4F4F"/><ellipse cx="50" cy="48" rx="18" ry="16" fill="#1a1a1a"/><ellipse cx="50" cy="52" rx="13" ry="11" fill="#fff"/><circle cx="43" cy="50" r="2.5" fill="#333"/><circle cx="57" cy="50" r="2.5" fill="#333"/><polygon points="46,55 54,55 52,58 48,58" fill="#FF6347"/></svg>' },
  { id:'av11', name:'花朵', svg:'<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#F0FFF0"/><circle cx="50" cy="46" r="10" fill="#FFD700"/><circle cx="38" cy="32" r="7" fill="#FF69B4"/><circle cx="62" cy="32" r="7" fill="#FF69B4"/><circle cx="62" cy="60" r="7" fill="#FF69B4"/><circle cx="38" cy="60" r="7" fill="#FF69B4"/><line x1="50" y1="56" x2="50" y2="80" stroke="#32CD32" stroke-width="4"/></svg>' },
  { id:'av12', name:'三叶草', svg:'<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#F0FFF0"/><circle cx="50" cy="32" r="13" fill="#32CD32"/><circle cx="33" cy="50" r="13" fill="#32CD32"/><circle cx="67" cy="50" r="13" fill="#32CD32"/><line x1="50" y1="45" x2="50" y2="82" stroke="#228B22" stroke-width="4"/></svg>' }
];

function getDefaultAvatar(username) {
  var idx = 0;
  if (username) {
    var h = 0;
    for (var i = 0; i < username.length; i++) h = ((h << 5) - h) + username.charCodeAt(i);
    idx = Math.abs(h) % PRESET_AVATARS.length;
  }
  return 'data:image/svg+xml;base64,' + svgToBase64(PRESET_AVATARS[idx].svg);
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

function compressImage(file, maxW, maxH, quality) {
  if (window._isLocal) return Promise.resolve(file);
  maxW = maxW || 1920;
  maxH = maxH || 1920;
  quality = quality || 0.75;
  return new Promise(function(resolve) {
    if (!/^image\//.test(file.type)) return resolve(file);
    if (file.size < 200 * 1024 && file.type === 'image/jpeg') return resolve(file);
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function() {
      URL.revokeObjectURL(url);
      var w = img.width, h = img.height;
      if (w > maxW || h > maxH) {
        var r = Math.min(maxW / w, maxH / h);
        w = Math.round(w * r);
        h = Math.round(h * r);
      }
      var c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      var ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      c.toBlob(function(b) {
        if (b && b.size > 0) {
          resolve(new File([b], file.name.replace(/\.\w+$/i, '.jpg'), { type: 'image/jpeg' }));
        } else {
          resolve(file);
        }
      }, 'image/jpeg', quality);
    };
    img.onerror = function() { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

