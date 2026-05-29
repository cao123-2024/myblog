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

  setUser(u) { this.user = u; API.token = this.token; API.adminToken = this.adminToken; },
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
    var av = Store.user.avatar || '';
    $('#nav-avatar').style.backgroundImage = av ? 'url(' + av + ')' : 'none';
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
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(d) {
  if (!d) return '';
  var dt = new Date(d);
  return dt.toLocaleDateString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'})+' '+
         dt.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
}
