var _adminSuperId = 1;
var _adminCurrentId = 0;
var _adminIsSuper = false;

function render_admin() {
  if (!Store.isAdmin()) {
    /* Silently refresh role in case of recent promotion */
    API.get('/me').then(function(data){
      Store.user = data.user;
      updateNav();
      render_admin();
    }).catch(function(){
      navigate('home');
    });
    return document.createElement('div');
  }

  /* Semi-admins and promoted admins skip dual verification */
  if (Store.user.role === 'semi_admin' || Store.user.created_by) {
    return renderAdminPanel();
  }

  /* Only super admin needs dual verification */
  if (!Store.adminToken) {
    var wrap = document.createElement('div');
    wrap.className = 'card-glass form-card animate-in';
    wrap.innerHTML = ''
      + '<h2>管理员面板</h2>'
      + '<p class="text-sm text-secondary mb-4">需要双重验证</p>'
      + '<div class="form-group"><label>用户名</label><input class="input input-glass" id="admin-username" placeholder="admin"></div>'
      + '<div class="form-group"><label>密码</label><input class="input input-glass" type="password" id="admin-password" placeholder="******"></div>'
      + '<button class="btn btn-primary w-full mt-4" id="admin-login-btn">登录管理员</button>'
      + '<div class="form-group mt-4 hidden" id="admin-verify-group">'
      + '<label>请输入终端显示的6位验证码</label>'
      + '<input class="input input-glass" id="admin-verify-code" placeholder="验证码">'
      + '<button class="btn btn-primary w-full mt-2" id="admin-verify-btn">确认验证</button></div>';
    setTimeout(initAdminLogin, 100);
    return wrap;
  }
  return renderAdminPanel();
}

async function initAdminLogin() {
  document.getElementById('admin-login-btn').addEventListener('click', async function(){
    var username = document.getElementById('admin-username').value.trim();
    var password = document.getElementById('admin-password').value.trim();
    if(!username||!password) return toast('请输入用户名和密码','error');
    try{ await API.post('/login',{username,password}); await API.post('/admin/request-verify'); document.getElementById('admin-verify-group').classList.remove('hidden'); toast('验证码已显示在终端','info'); }
    catch(e){ toast(e.message,'error'); }
  });
  document.getElementById('admin-verify-btn').addEventListener('click', async function(){
    var code = document.getElementById('admin-verify-code').value.trim();
    if(!code) return toast('请输入验证码','error');
    try{ var data = await API.post('/admin/verify-and-login',{code}); Store.loginAdmin(data.adminToken); toast('管理员验证通过','success'); navigate('admin'); }
    catch(e){ toast(e.message,'error'); }
  });
}

function renderAdminPanel() {
  var wrap = document.createElement('div');
  wrap.className = 'stagger';

  /* Header */
  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:24px';
  hdr.innerHTML = ''
    + '<div>'
    + '<h2 style="font-size:1.5rem;font-weight:700">管理员面板</h2>'
    + '<p class="text-sm text-secondary">' + (Store.user.nickname||Store.user.username) + ' · ' + (Store.user.role==='admin'&&!Store.user.created_by?'超级管理员':Store.user.role==='admin'?'管理员':'半管理员') + '</p>'
    + '</div>';
  wrap.appendChild(hdr);

  /* Quick actions row */
  var tabs = document.createElement('div');
  tabs.style.cssText = 'display:flex;gap:8px;margin-bottom:24px';
  tabs.innerHTML = ''
    + '<button class="btn btn-glass btn-sm admin-tab active" data-tab="users" onclick="switchAdminTab(\'users\')">用户管理</button>'
    + (Store.isSuperAdmin() ? '<button class="btn btn-glass btn-sm admin-tab" data-tab="articles" onclick="switchAdminTab(\'articles\')">发布文章</button>' : '')
    + '<button class="btn btn-glass btn-sm admin-tab" data-tab="wallpapers" onclick="switchAdminTab(\'wallpapers\')">壁纸管理</button>'
    + '<button class="btn btn-glass btn-sm admin-tab" data-tab="upload-perms" onclick="switchAdminTab(\'upload-perms\')">上传权限</button>';
  wrap.appendChild(tabs);

  /* Tab content */
  var content = document.createElement('div');
  content.id = 'admin-tab-content';
  content.innerHTML = '<div class="text-center text-secondary p-6">加载中...</div>';
  wrap.appendChild(content);

  setTimeout(function(){ switchAdminTab('users'); }, 50);
  return wrap;
}

function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(function(b){ b.classList.toggle('active', b.dataset.tab===tab); });
  var c = document.getElementById('admin-tab-content');
  if(tab === 'users') renderUserManager(c);
  else if(tab === 'wallpapers') renderWallpaperManager(c);
  else if(tab === 'upload-perms') renderUploadPerms(c);
  else renderArticleCreator(c);
}

/* ===== User Manager ===== */
function renderUserManager(container) {
  container.innerHTML = ''
    + '<div class="card-glass" style="padding:20px">'
    + '<h3 style="font-size:1rem;font-weight:600;margin-bottom:16px">用户列表</h3>'
    + '<div style="overflow-x:auto" id="admin-user-list"><div class="text-center text-secondary p-4">加载中...</div></div>'
    + '</div>';
  loadAdminUsers();
}

async function loadAdminUsers() {
  try {
    var data = await API.get('/admin/users');
    _adminSuperId = data.superAdminId;
    _adminCurrentId = data.currentUserId;
    _adminIsSuper = data.currentUserIsSuper;
    var users = data.users || [];

    var html = '<table class="admin-table"><thead><tr>'
      + '<th>ID</th><th>用户名</th><th>昵称</th><th>角色</th><th>授权人</th><th>备注</th><th>状态</th><th>操作</th>'
      + '</tr></thead><tbody>';

    users.forEach(function(u){
      var banned = u.banned_until ? new Date(u.banned_until) > new Date() : false;
      var roleLabel = u.role==='admin'&&!u.created_by?'超级管理员' : u.role==='admin'?'管理员' : u.role==='semi_admin'?'半管理员':'用户';
      var roleColor = u.role==='admin'&&!u.created_by?'color:#0078D4' : u.role==='admin'?'color:#1A7F37' : u.role==='semi_admin'?'color:#BF7B00':'';
      var createdBy = u.created_by ? (function(){
        var creator = users.find(function(x){return x.id===u.created_by;});
        return creator ? (creator.nickname||creator.username) : 'ID:'+u.created_by;
      })() : '-';

      var isSelf = u.id === _adminCurrentId;
      var isSuperAdmin = u.role==='admin'&&!u.created_by;
      var canManage = !isSelf && !isSuperAdmin;
      var currentIsSuper = _adminIsSuper || (Store.isSuperAdmin && Store.isSuperAdmin());

      var actions = '';
      if(canManage){
        if(banned){
          actions += '<button class="btn btn-secondary btn-sm" onclick="adminUnban('+u.id+')">解封</button> ';
        } else {
          actions += '<button class="btn btn-glass btn-sm" onclick="showBanModal('+u.id+')">封禁</button> ';
        }
        if(currentIsSuper){
          if(u.role==='user'){
            actions += '<button class="btn btn-glass btn-sm" onclick="promoteSemi('+u.id+',\''+u.username+'\')">半管理</button> ';
            actions += '<button class="btn btn-glass btn-sm" onclick="promoteAdmin('+u.id+',\''+u.username+'\')">全管理</button> ';
          }
          if(u.role==='semi_admin'){
            actions += '<button class="btn btn-glass btn-sm" onclick="promoteAdmin('+u.id+',\''+u.username+'\')">升级</button> ';
            actions += '<button class="btn btn-danger btn-sm" onclick="demoteUser('+u.id+',\''+u.username+'\')">降级</button> ';
          }
          if(u.role==='admin' && u.created_by===_adminCurrentId){
            actions += '<button class="btn btn-danger btn-sm" onclick="demoteUser('+u.id+',\''+u.username+'\')">降级</button> ';
          }
        }
        if(!isSuperAdmin){
          actions += '<button class="btn btn-danger btn-sm" onclick="adminDeleteUser('+u.id+',\''+escapeHtml(u.username)+'\')">删除</button>';
        }
      } else if(isSelf){
        actions += '<span class="text-xs text-tertiary">自己</span>';
      } else if(isSuperAdmin){
        actions += '<span class="text-xs" style="'+roleColor+'">受保护</span>';
      }

      html += '<tr>'
        + '<td>'+u.id+'</td>'
        + '<td>'+escapeHtml(u.username)+'</td>'
        + '<td>'+escapeHtml(u.nickname||'')+'</td>'
        + '<td><span style="'+roleColor+';font-weight:500">'+roleLabel+'</span></td>'
        + '<td class="text-secondary">'+createdBy+'</td>'
        + '<td class="text-secondary" style="cursor:pointer;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="点击编辑备注" onclick="editUserTag('+u.id+',\''+escapeHtml(u.tag||'')+'\',event)">'+(u.tag||'<span style="opacity:0.3">点击添加</span>')+'</td>'
        + '<td>'+(banned?'<span style="color:#CF222E">封禁</span>':'<span class="text-tertiary">正常</span>')+'</td>'
        + '<td><div class="flex gap-1" style="flex-wrap:wrap">'+actions+'</div></td>'
        + '</tr>';
    });
    html += '</tbody></table>';
    document.getElementById('admin-user-list').innerHTML = html;
  } catch(e) {
    document.getElementById('admin-user-list').innerHTML = '<div class="p-4 text-center" style="color:#CF222E">加载失败: '+e.message+'</div>';
  }
}

function promoteAdmin(id, name){
  showConfirm('升级为管理员', '将「'+name+'」升级为管理员，他拥有完整的管理权限但无法操作你的账号。', async function(){
    await API.post('/admin/users/'+id+'/promote-admin');
    toast('已升级为管理员','success');
    loadAdminUsers();
  });
}
function promoteSemi(id, name){
  showConfirm('设为半管理员', '将「'+name+'」设为半管理员，他无法操作管理员账号及管理员文章。', async function(){
    await API.post('/admin/users/'+id+'/promote-semi');
    toast('已设为半管理员','success');
    loadAdminUsers();
  });
}
function demoteUser(id, name){
  showConfirm('取消管理员', '确定取消「'+name+'」的管理权限吗？', async function(){
    await API.post('/admin/users/'+id+'/demote');
    toast('已取消管理员权限','success');
    loadAdminUsers();
  });
}

function showBanModal(userId){
  showInputModal('封禁用户','封禁时长（分钟）','60',async function(val){
    var mins=parseInt(val);
    if(isNaN(mins)||mins<=0) throw new Error('请输入有效的分钟数');
    await API.put('/admin/users/'+userId+'/ban',{minutes:mins});
    toast('用户已封禁','success');
    loadAdminUsers();
  });
}
async function adminUnban(userId){
  await API.put('/admin/users/'+userId+'/unban');
  toast('用户已解封','success');
  loadAdminUsers();
}
async function adminDeleteUser(userId,username){
  showConfirm('删除用户','确定删除「'+username+'」吗？会同时删除所有文章和评论。',async function(){
    await API.delete('/admin/users/'+userId);
    toast('用户已删除','success');
    loadAdminUsers();
  });
}

/* ===== Article Creator ===== */
function renderArticleCreator(container){
  container.innerHTML = ''
    + '<div class="card-glass" style="padding:24px">'
    + '<h3 style="font-size:1rem;font-weight:600;margin-bottom:16px">发布文章</h3>'
    + '<div class="login-form-group"><label>标题</label><input class="input input-glass" id="admin-art-title"></div>'
    + '<div class="login-form-group"><label>摘要</label><input class="input input-glass" id="admin-art-summary" placeholder="可选，留空自动截取正文前150字"></div>'
    + '<div class="login-form-group"><label>正文</label><textarea class="input input-glass textarea" id="admin-art-content" rows="8" placeholder="支持 Markdown"></textarea></div>'
    + '<div class="login-form-group"><label>配图</label><input type="file" class="input" id="admin-art-images" multiple accept="image/*"></div>'
    + '<button class="btn btn-primary btn-lg" onclick="adminCreateArticle()">发布文章</button>'
    + '</div>';
}

async function adminCreateArticle(){
  var title = $('#admin-art-title').value.trim();
  var content = $('#admin-art-content').value.trim();
  var summary = $('#admin-art-summary').value.trim();
  var files = $('#admin-art-images').files;
  if(!title||!content) return toast('标题和内容不能为空','error');
  var fd = new FormData();
  fd.append('title',title);
  fd.append('content',content);
  if(summary) fd.append('summary',summary);
  for(var i=0;i<files.length;i++) fd.append('images',files[i]);
  await API.upload('/articles',fd);
  toast('文章发布成功','success');
  $('#admin-art-title').value='';
  $('#admin-art-summary').value='';
  $('#admin-art-content').value='';
  $('#admin-art-images').value='';
}

function editUserTag(userId, currentTag, e){
  e.stopPropagation();
  showInputModal('编辑备注','给该用户添加备注（50字以内）',currentTag, async function(val){
    var tag = (val||'').trim().slice(0,50);
    await API.put('/admin/users/'+userId+'/tag',{tag:tag});
    toast('备注已更新','success');
    loadAdminUsers();
  });
}

/* ===== Wallpaper Manager ===== */
function renderWallpaperManager(container) {
  container.innerHTML = ''
    + '<div class="card-glass" style="padding:20px">'
    + '<h3 style="font-size:1rem;font-weight:600;margin-bottom:16px">壁纸库</h3>'
    + '<div id="wp-dropzone" style="border:2px dashed var(--border-glass);border-radius:var(--radius-lg);padding:32px;text-align:center;margin-bottom:16px;cursor:pointer;transition:all 0.2s ease">'
    + '<p class="text-secondary" id="wp-drop-text">拖拽图片到这里或点击上传</p>'
    + '<input type="file" id="wp-file-input" multiple accept="image/*" style="display:none">'
    + '<div id="wp-upload-status" class="text-sm" style="color:var(--blue);margin-top:8px;display:none"></div>'
    + '</div>'
    + '<div id="admin-wp-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px"><div class="text-center text-secondary p-4">加载中...</div></div>'
    + '</div>';
  setupWallpaperDropzone();
  loadAdminWallpapers();
}

function setupWallpaperDropzone() {
  var dz = document.getElementById('wp-dropzone');
  var input = document.getElementById('wp-file-input');
  dz.onclick = function() { input.click(); };
  input.onchange = function() { handleWallpaperFiles(input.files); };

  dz.ondragover = function(e) { e.preventDefault(); dz.style.borderColor = 'var(--blue)'; dz.style.background = 'var(--bg-glass-hover)'; };
  dz.ondragleave = function(e) { dz.style.borderColor = 'var(--border-glass)'; dz.style.background = 'transparent'; };
  dz.ondrop = function(e) { e.preventDefault(); dz.style.borderColor = 'var(--border-glass)'; dz.style.background = 'transparent'; handleWallpaperFiles(e.dataTransfer.files); };
}

async function handleWallpaperFiles(files) {
  if (!files || files.length === 0) return;
  var status = document.getElementById('wp-upload-status');
  status.style.display = 'block';
  var dropText = document.getElementById('wp-drop-text');

  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    if (!/^image\//.test(f.type)) continue;
    var sizeMB = (f.size / 1024 / 1024).toFixed(1);
    status.textContent = '上传中: ' + f.name + ' (' + sizeMB + 'MB) ...';
    try {
      var fd = new FormData();
      fd.append('file', f);
      await API.upload('/wallpapers/upload', fd);
      status.textContent = f.name + ' 上传成功';
    } catch(e) {
      status.textContent = f.name + ' 失败: ' + e.message;
    }
  }
  dropText.textContent = '拖拽图片到这里或点击上传';
  setTimeout(function() { status.style.display = 'none'; }, 2000);
  loadAdminWallpapers();
}

async function loadAdminWallpapers() {
  try {
    var data = await API.get('/wallpapers');
    var wps = data.wallpapers || [];
    var list = document.getElementById('admin-wp-list');
    if (!list) return;
    if (wps.length === 0) { list.innerHTML = '<div class="text-center text-secondary p-4">暂无壁纸</div>'; return; }
    var html = '';
    wps.forEach(function(w) {
      html += '<div style="position:relative;aspect-ratio:16/9;border-radius:10px;background-image:url('+escapeHtml(w.url)+');background-size:cover;background-position:center;overflow:hidden">'
        + '<button onclick="deleteAdminWallpaper('+w.id+')" style="position:absolute;top:4px;right:4px;width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,0.6);border:none;color:#fff;cursor:pointer;font-size:14px;line-height:24px;text-align:center" title="删除">&times;</button>'
        + '</div>';
    });
    list.innerHTML = html;
  } catch(e) {
    var list = document.getElementById('admin-wp-list');
    if (list) list.innerHTML = '<div class="p-4 text-center" style="color:#CF222E">加载失败: '+e.message+'</div>';
  }
}

async function deleteAdminWallpaper(id) {
  showConfirm('删除壁纸','确定删除此壁纸吗？', async function() {
    await API.delete('/wallpapers/' + id);
    toast('已删除','success');
    loadAdminWallpapers();
  });
}

/* ===== Upload Permissions Manager ===== */
function renderUploadPerms(container) {
  container.innerHTML = ''
    + '<div class="card-glass" style="padding:20px">'
    + '<h3 style="font-size:1rem;font-weight:600;margin-bottom:16px">上传权限管理</h3>'
    + '<div style="display:flex;gap:8px;margin-bottom:12px">'
    + '<input class="input input-glass" id="up-search" placeholder="搜索用户名..." style="flex:1" oninput="loadUploadPerms()">'
    + '</div>'
    + '<div id="up-apply-list"><div class="text-center text-secondary p-4">加载中...</div></div>'
    + '<h4 style="font-size:0.95rem;font-weight:600;margin-top:20px;margin-bottom:12px">所有用户</h4>'
    + '<div id="up-user-list"><div class="text-center text-secondary p-4">加载中...</div></div>'
    + '</div>';
  loadUploadPerms();
}

async function loadUploadPerms() {
  try {
    var appliesData = await API.get('/admin/upload-applies');
    var usersData = await API.get('/admin/users');
    var applies = appliesData.applies || [];
    var users = usersData.users || [];
    var q = (document.getElementById('up-search')?.value || '').trim().toLowerCase();

    var applyList = document.getElementById('up-apply-list');
    if (applyList) {
      var pendings = applies.filter(function(a){ return a.status === 'pending'; });
      if (pendings.length === 0) {
        applyList.innerHTML = '<p class="text-sm text-secondary">暂无待处理申请</p>';
      } else {
        var h = '';
        pendings.forEach(function(a) {
          if (!a.user) return;
          if (q && !a.user.username.toLowerCase().includes(q) && !(a.user.nickname||'').toLowerCase().includes(q)) return;
          h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-subtle)">'
            + '<span class="text-sm">'+escapeHtml(a.user.nickname||a.user.username)+' (@'+escapeHtml(a.user.username)+')</span>'
            + '<span class="text-xs text-tertiary">'+formatDate(a.created_at)+'</span>'
            + '<div class="flex gap-1">'
            + '<button class="btn btn-primary btn-sm" style="padding:2px 10px;font-size:0.7rem" onclick="approveUpload('+a.id+')">批准</button>'
            + '<button class="btn btn-glass btn-sm" style="padding:2px 10px;font-size:0.7rem" onclick="rejectUpload('+a.id+')">拒绝</button>'
            + '</div></div>';
        });
        applyList.innerHTML = h || '<p class="text-sm text-secondary">无匹配结果</p>';
      }
    }

    var userList = document.getElementById('up-user-list');
    if (userList) {
      var filtered = q ? users.filter(function(u){ return u.username.toLowerCase().includes(q) || (u.nickname||'').toLowerCase().includes(q); }) : users;
      if (filtered.length === 0) { userList.innerHTML = '<p class="text-sm text-secondary">无匹配用户</p>'; return; }
      var h = '';
      filtered.forEach(function(u) {
        var hasPerm = u.can_upload_images || u.role==='admin' || u.role==='semi_admin';
        var btn = hasPerm
          ? '<button class="btn btn-glass btn-sm" style="padding:2px 10px;font-size:0.7rem" onclick="revokeUpload('+u.id+')">取消权限</button>'
          : '<button class="btn btn-primary btn-sm" style="padding:2px 10px;font-size:0.7rem" onclick="grantUpload('+u.id+')">开通权限</button>';
        h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-subtle)">'
          + '<span class="text-sm">'+escapeHtml(u.nickname||u.username)+' (@'+escapeHtml(u.username)+')</span>'
          + '<span class="text-xs">'+(hasPerm?'<span style="color:var(--blue)">可上传</span>':'<span class="text-tertiary">无权限</span>')+'</span>'
          + btn
          + '</div>';
      });
      userList.innerHTML = h;
    }
  } catch(e) {
    var applyList = document.getElementById('up-apply-list');
    if (applyList) applyList.innerHTML = '<p class="text-sm" style="color:#CF222E">加载失败: '+e.message+'</p>';
    var userList = document.getElementById('up-user-list');
    if (userList) userList.innerHTML = '<p class="text-sm" style="color:#CF222E">加载失败</p>';
  }
}

async function approveUpload(applyId) {
  await API.post('/admin/upload-apply/'+applyId+'/approve');
  toast('已批准','success');
  loadUploadPerms();
}
async function rejectUpload(applyId) {
  await API.post('/admin/upload-apply/'+applyId+'/reject');
  toast('已拒绝','info');
  loadUploadPerms();
}
async function grantUpload(userId) {
  await API.post('/admin/users/'+userId+'/grant-upload');
  toast('已开通上传权限','success');
  loadUploadPerms();
}
async function revokeUpload(userId) {
  await API.post('/admin/users/'+userId+'/revoke-upload');
  toast('已取消上传权限','success');
  loadUploadPerms();
}

