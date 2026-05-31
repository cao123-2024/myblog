function render_profile(userId) {
  var wrap = document.createElement('div');
  wrap.className = 'stagger';
  var isMe = !userId || userId === Store.user?.id;
  var targetId = userId || Store.user?.id;
  wrap.id = 'profile-wrap';
  wrap.innerHTML = '<div class="text-center p-6"><div class="skeleton" style="height:300px"></div></div>';
  loadProfile(wrap, targetId, isMe);
  return wrap;
}

async function loadProfile(wrap, targetId, isMe) {
  try {
    if (!Store.user) { navigate('login'); return; }
    var data = await API.get('/users/' + targetId);
    var u = data.user;
    var friendStatus = data.friendStatus || 'none';
    var roleText = '用户';
    if (u.role === 'admin' && !u.created_by) roleText = '超级管理员';
    else if (u.role === 'admin') roleText = '管理员';
    else if (u.role === 'semi_admin') roleText = '半管理员';
    var canUpload = u.can_upload_images || Store.isAdmin();

    var avUrl = u.avatar || getDefaultAvatar(u.username);
    wrap.innerHTML = ''
      + '<div class="profile-header card-glass" style="padding:0">'
      + '<div class="profile-bg" style="background-image:url('+(u.bg_image||'')+')"></div>'
      + '<div style="position:relative">'
      + '<div class="profile-avatar-wrap">'
      + '<div class="profile-avatar-lg" style="background-image:url('+avUrl+');background-color:'+(u.avatar?'':'rgba(255,255,255,0.06)')+'"></div>'
      + '</div></div>'
      + '<div class="profile-info">'
      + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">'
      + '<div>'
      + '<h2>'+escapeHtml(u.nickname||u.username)+'</h2>'
      + '<p class="bio">'+escapeHtml(u.bio||'这个人很懒，什么都没写...')+'</p>'
      + '<p class="text-xs text-tertiary mt-1">@'+escapeHtml(u.username)+' · UID '+u.id+' · '+roleText+'</p>'
      + '</div>'
      + '<div class="flex gap-2" style="flex-shrink:0">'
      + (isMe ? '<button class="btn btn-primary btn-sm" onclick="editProfileModal()">编辑资料</button>'
        : ('<button class="btn btn-primary btn-sm" onclick="navigate(\'messages\');setTimeout(function(){openChatWith('+u.id+')},100)">发消息</button>'
        + (friendStatus === 'accepted'
          ? '<button class="btn btn-glass btn-sm" onclick="removeFriend('+u.id+')">删除好友</button>'
          : friendStatus === 'pending'
          ? '<button class="btn btn-glass btn-sm" style="opacity:0.6">等待确认</button>'
          : '<button class="btn btn-glass btn-sm" onclick="sendFriendRequest('+u.id+')">添加好友</button>')))
      + '</div>'
      + '</div></div></div>'
      + '<h3 class="mb-3" style="font-size:1.2rem;font-weight:600">'+(isMe?'我的':'TA的')+'文章</h3>'
      + '<div id="profile-articles">'+renderProfileArticles(data.articles)+'</div>';
    if (isMe) window._profileData = data;
  } catch (e) {
    wrap.innerHTML = '<div class="text-center p-6 text-secondary">加载失败: '+e.message+'</div>';
  }
}

function renderProfileArticles(articles) {
  if (articles.length === 0) return '<p class="text-sm text-secondary">暂无文章</p>';
  return articles.map(a => ''
    + '<div class="card-glass article-card mb-4" onclick="navigate(\'article\', '+a.id+')">'
    + (a.cover_image ? '<div class="article-card-img" style="background-image:url('+a.cover_image+')"></div>' : '')
    + '<div class="article-card-body">'
    + '<h3>'+escapeHtml(a.title)+'</h3>'
    + '<p>'+escapeHtml(a.summary||'')+'</p>'
    + '<div class="article-card-meta">'+formatDate(a.created_at)+'</div>'
    + '</div></div>'
  ).join('');
}

function compressProfileImage(file) {
  return new Promise(function(resolve) {
    if (!/^image\//.test(file.type) || file.size < 300*1024) return resolve(file);
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function() {
      URL.revokeObjectURL(url);
      var maxW=800, maxH=800, w=img.width, h=img.height;
      if (w>maxW||h>maxH){ var r=Math.min(maxW/w,maxH/h); w=Math.round(w*r); h=Math.round(h*r); }
      var c=document.createElement('canvas'); c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      c.toBlob(function(b){
        if(b&&b.size>0) resolve(new File([b], file.name.replace(/\.\w+$/,'.jpg'), {type:'image/jpeg'}));
        else resolve(file);
      },'image/jpeg',0.7);
    };
    img.onerror = function(){ URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

async function editProfileModal() {
  var ud = window._profileData?.user || Store.user;
  var canUpload = ud.can_upload_images || Store.isAdmin();
  var curAv = (ud.avatar || '');
  var curBg = (ud.bg_image || '');

  var presetHtml = '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">';
  PRESET_AVATARS.forEach(function(p){
    var uri = 'data:image/svg+xml;base64,' + p.svg;
    var sel = curAv === uri ? 'border:3px solid var(--blue)!important' : '';
    presetHtml += '<div class="preset-av-item" data-av="'+p.id+'" title="'+p.name+'" style="width:44px;height:44px;border-radius:50%;background-size:cover;cursor:pointer;border:2px solid transparent;transition:all 0.2s;'+sel+';background-image:url('+uri+')" onclick="var qs=document.querySelectorAll(\'.preset-av-item\');for(var i=0;i<qs.length;i++)qs[i].style.border=\'2px solid transparent\';this.style.border=\'3px solid var(--blue)\';window._selectedPresetAv=\''+p.id+'\';var up=document.getElementById(\'edit-avatar\');if(up)up.value=\'\'"></div>';
  });
  presetHtml += '</div>';

  var bgHtml = '<div style="display:flex;flex-wrap:wrap;gap:6px;max-height:180px;overflow-y:auto;margin-bottom:4px">';
  var STATIC_COUNT = 12;
  for (var i = 0; i < STATIC_COUNT; i++) {
    var url = '/img/wallpapers/' + i + '.jpg';
    var bSel = curBg === url ? 'border:3px solid var(--blue)!important' : '';
    bgHtml += '<div class="preset-bg-item" data-bg="'+escapeHtml(url)+'" style="width:80px;height:48px;border-radius:6px;background-image:url('+escapeHtml(url)+');background-size:cover;cursor:pointer;border:2px solid transparent;transition:all 0.2s;'+bSel+'" onclick="var qs=document.querySelectorAll(\'.preset-bg-item\');for(var i=0;i<qs.length;i++)qs[i].style.border=\'2px solid transparent\';this.style.border=\'3px solid var(--blue)\';window._selectedPresetBg=this.dataset.bg;var bgEl=document.getElementById(\'edit-bg\');if(bgEl)bgEl.value=\'\'"></div>';
  }
  bgHtml += '</div>';

  var uploadSection = '';
  if (canUpload) {
    uploadSection = ''
      + '<div style="border-top:1px solid var(--border-subtle);padding-top:12px"><label>上传自定义头像</label><input type="file" class="input" id="edit-avatar" accept="image/*" onchange="var qs=document.querySelectorAll(\'.preset-av-item\');for(var i=0;i<qs.length;i++)qs[i].style.border=\'2px solid transparent\';window._selectedPresetAv=null"></div>'
      + '<div class="form-group"><label>上传自定义背景图</label><input type="file" class="input" id="edit-bg" accept="image/*" onchange="var qs=document.querySelectorAll(\'.preset-bg-item\');for(var i=0;i<qs.length;i++)qs[i].style.border=\'2px solid transparent\';window._selectedPresetBg=null"></div>';
  } else {
    uploadSection = ''
      + '<div style="border-top:1px solid var(--border-subtle);padding-top:12px">'
      + '<p class="text-xs text-secondary mb-2">上传自定义头像和背景图需要管理员授权</p>'
      + '<button class="btn btn-glass btn-sm w-full" onclick="event.preventDefault();applyUploadPermission()">申请上传权限</button>'
      + '</div>';
  }

  showModal('编辑资料', ''
    + '<div class="form-group"><label>选择头像</label>'+presetHtml+'</div>'
    + '<div class="form-group"><label>选择资料背景图</label>'+bgHtml+'</div>'
    + uploadSection
    + '<div class="form-group"><label>昵称</label><input class="input input-glass" id="edit-nickname" value="'+escapeHtml(ud.nickname||'')+'"></div>'
    + '<div class="form-group"><label>简介</label><textarea class="input input-glass textarea" id="edit-bio" rows="3">'+escapeHtml(ud.bio||'')+'</textarea></div>'
  , async function() {
    var fd = new FormData();
    var nn = document.getElementById('edit-nickname') ? document.getElementById('edit-nickname').value.trim() : '';
    var bio = document.getElementById('edit-bio') ? document.getElementById('edit-bio').value.trim() : '';
    if (nn) fd.append('nickname', nn);
    if (bio) fd.append('bio', bio);

    var selAv = window._selectedPresetAv;
    if (selAv) {
      var preset = PRESET_AVATARS.find(function(p){ return p.id === selAv; });
      if (preset) fd.append('avatar_data', 'data:image/svg+xml;base64,' + preset.svg);
    } else if (canUpload) {
      var avEl = document.getElementById('edit-avatar');
      if (avEl && avEl.files && avEl.files[0]) fd.append('avatar', await compressProfileImage(avEl.files[0]));
    }

    var selBg = window._selectedPresetBg;
    if (selBg) {
      fd.append('bg_image_data', selBg);
    } else if (canUpload) {
      var bgEl = document.getElementById('edit-bg');
      if (bgEl && bgEl.files && bgEl.files[0]) fd.append('bg_image', await compressProfileImage(bgEl.files[0]));
    }

    var data = await API.uploadPut('/users/profile', fd);
    Store.user = data.user;
    updateNav();
    toast('资料已更新', 'success');
    navigate('profile');
  }, '保存');
}

async function applyUploadPermission() {
  try {
    await API.post('/admin/upload-apply');
    closeModal();
    toast('已向管理员申请上传权限', 'success');
  } catch(e) { toast(e.message, 'error'); }
}

function openSettingsModal() {
  var html = '<div class="form-group"><label>选择壁纸</label></div>'
    + '<div id="settings-wp-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-height:360px;overflow-y:auto;padding:4px">'
    + '<div class="text-center text-secondary p-4">加载中...</div>'
    + '</div>';
  showModal('设置', html, async function() {
    var sel = document.querySelector('#settings-wp-grid .selected');
    if (!sel) return;
    var url = sel.dataset.url;
    await API.post('/wallpapers/set', { url: url });
    Store.user.wallpaper = url;
    applyWallpaper(url);
    updateNav();
    toast('壁纸已应用', 'success');
  }, '确定');
  loadSettingsWallpapers();
}

async function loadSettingsWallpapers() {
  var grid = document.getElementById('settings-wp-grid');
  if (!grid) return;

  var STATIC_COUNT = 20;
  var wps = [];
  for (var i = 0; i < STATIC_COUNT; i++) {
    wps.push({ url: '/img/wallpapers/' + i + '.jpg', name: '壁纸 ' + (i + 1) });
  }

  try {
    var d = await API.get('/wallpapers');
    var dbWps = d.wallpapers || [];
    if (dbWps.length > 0) wps = dbWps;
  } catch(e) {}

  var html = '';
  var curWp = Store.user.wallpaper || '';
  wps.forEach(function(w) {
    var sel = '';
    if (curWp && w.url && curWp.replace(/^\/?/, '/') === w.url.replace(/^\/?/, '/')) sel = ' selected';
    html += '<div class="settings-wp-item' + sel + '" data-url="' + escapeHtml(w.url) + '"'
      + ' style="aspect-ratio:16/9;border-radius:10px;background-image:url('+escapeHtml(w.url)+');background-size:cover;background-position:center;cursor:pointer;border:2px solid transparent;transition:all 0.2s ease"'
      + ' onclick="document.querySelectorAll(\'.settings-wp-item\').forEach(function(e){e.classList.remove(\'selected\')});this.classList.add(\'selected\')"'
      + '></div>';
  });
  grid.innerHTML = html;
  var selEl = grid.querySelector('.settings-wp-item.selected');
  if (selEl) selEl.scrollIntoView({block:'nearest'});
}

function applyWallpaper(url) {
  if (url) {
    document.body.style.backgroundImage = 'url('+url+')';
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
  } else {
    document.body.style.backgroundImage = '';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundPosition = '';
    document.body.style.backgroundAttachment = '';
  }
}
window.applyWallpaper = applyWallpaper;

async function sendFriendRequest(userId) {
  try {
    var data = await API.post('/friends/request/' + userId);
    toast(data.message || '好友申请已发送', 'success');
    navigate('profile', userId);
  } catch (e) { toast(e.message, 'error'); }
}

async function removeFriend(userId) {
  showConfirm('删除好友', '确定要删除这个好友吗？', async function() {
    await API.delete('/friends/' + userId);
    toast('已删除', 'success');
    navigate('profile', userId);
  });
}
