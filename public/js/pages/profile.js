function render_profile(userId) {
  const wrap = document.createElement('div');
  wrap.className = 'stagger';
  const isMe = !userId || userId === Store.user?.id;
  const targetId = userId || Store.user?.id;
  wrap.id = 'profile-wrap';
  wrap.innerHTML = '<div class="text-center p-6"><div class="skeleton" style="height:300px"></div></div>';
  loadProfile(wrap, targetId, isMe);
  return wrap;
}

async function loadProfile(wrap, targetId, isMe) {
  try {
    if (!Store.user) { navigate('login'); return; }
    const data = await API.get('/users/' + targetId);
    const u = data.user;
    const friendStatus = data.friendStatus || 'none';

    wrap.innerHTML = `
      <div class="profile-header card-glass" style="padding:0">
        <div class="profile-bg" style="background-image:url(${u.bg_image || ''})"></div>
        <div style="position:relative">
          <div class="profile-avatar-wrap">
            <div class="profile-avatar-lg" style="background-image:url(${u.avatar || ''})"></div>
          </div>
        </div>
        <div class="profile-info">
          <h2>${escapeHtml(u.nickname || u.username)}</h2>
          <p class="bio">${escapeHtml(u.bio || '这个人很懒，什么都没写...')}</p>
          <p class="text-xs text-tertiary mt-1">@${escapeHtml(u.username)} · UID ${u.id} · ${u.role === 'admin' ? (u.created_by ? '管理员' : '超级管理员') : u.role === 'semi_admin' ? '半管理员' : '用户'}</p>
          <div class="flex gap-2 mt-3">
            ${isMe ? `
              <button class="btn btn-primary btn-sm" onclick="editProfile()">编辑资料</button>
            ` : `
              <button class="btn btn-primary btn-sm" onclick="navigate('messages');setTimeout(function(){openChatWith(${u.id})},100)">发消息</button>
              ${friendStatus === 'accepted'
                ? `<button class="btn btn-glass btn-sm" onclick="removeFriend(${u.id})">删除好友</button>`
                : friendStatus === 'pending'
                  ? `<button class="btn btn-glass btn-sm" style="opacity:0.6">等待对方确认</button>`
                  : `<button class="btn btn-glass btn-sm" onclick="sendFriendRequest(${u.id})">添加好友</button>`
              }
            `}
          </div>
        </div>
      </div>
      <h3 class="mb-3" style="font-size:1.2rem;font-weight:600">${isMe ? '我的' : 'TA的'}文章</h3>
      <div id="profile-articles">${renderProfileArticles(data.articles)}</div>
    `;

    if (isMe) window._profileData = data;
  } catch (e) {
    wrap.innerHTML = `<div class="text-center p-6 text-secondary">加载失败: ${e.message}</div>`;
  }
}

function renderProfileArticles(articles) {
  if (articles.length === 0) return '<p class="text-sm text-secondary">暂无文章</p>';
  return articles.map(a => `
    <div class="card-glass article-card mb-4" onclick="navigate('article', ${a.id})">
      ${a.cover_image ? `<div class="article-card-img" style="background-image:url(${a.cover_image})"></div>` : ''}
      <div class="article-card-body">
        <h3>${escapeHtml(a.title)}</h3>
        <p>${escapeHtml(a.summary || '')}</p>
        <div class="article-card-meta">${formatDate(a.created_at)}</div>
      </div>
    </div>
  `).join('');
}

function editProfile() {
  const ud = window._profileData?.user || Store.user;
  showModal('编辑资料', `
    <div class="form-group"><label>头像</label><input type="file" class="input" id="edit-avatar" accept="image/*"></div>
    <div class="form-group"><label>背景图</label>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="file" class="input" id="edit-bg" accept="image/*" style="flex:1">
        <button class="btn btn-glass btn-sm" onclick="showWallpaperGallery()" style="white-space:nowrap">选择壁纸</button>
      </div>
    </div>
    <div class="form-group"><label>昵称</label><input class="input input-glass" id="edit-nickname" value="${escapeHtml(ud.nickname || '')}"></div>
    <div class="form-group"><label>简介</label><textarea class="input input-glass textarea" id="edit-bio" rows="3">${escapeHtml(ud.bio || '')}</textarea></div>
  `, async () => {
    const fd = new FormData();
    const nickname = $('#edit-nickname').value.trim();
    const bio = $('#edit-bio').value.trim();
    if (nickname) fd.append('nickname', nickname);
    if (bio) fd.append('bio', bio);
    const avatar = $('#edit-avatar').files[0];
    const bg = $('#edit-bg').files[0];
    if (avatar) fd.append('avatar', avatar);
    if (bg) fd.append('bg_image', bg);
    const data = await API.uploadPut('/users/profile', fd);
    Store.user = data.user;
    updateNav();
    applyWallpaper(data.user.bg_image);
    toast('资料已更新', 'success');
    navigate('profile');
  }, '保存');
}

async function showWallpaperGallery() {
  try {
    var data = await API.get('/wallpapers');
    var wps = data.wallpapers || [];
    if (wps.length === 0) {
      toast('暂无壁纸，请联系管理员上传', 'info');
      return;
    }
    var html = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-height:420px;overflow-y:auto;padding:4px">';
    wps.forEach(function(w) {
      html += '<div style="aspect-ratio:16/9;border-radius:10px;background-image:url('+escapeHtml(w.url)+');background-size:cover;background-position:center;cursor:pointer;border:2px solid transparent;transition:all 0.2s ease" '
        + 'onclick="selectWallpaper(\''+escapeHtml(w.url)+'\')" '
        + 'onmouseenter="this.style.borderColor=\'var(--blue)\';this.style.transform=\'scale(1.03)\'" '
        + 'onmouseleave="this.style.borderColor=\'transparent\';this.style.transform=\'scale(1)\'" '
        + 'title="'+escapeHtml(w.name||'')+'"></div>';
    });
    html += '</div><button class="btn btn-glass w-full mt-3" onclick="removeWallpaper()">清除背景</button>';
    showModal('选择壁纸', html, null, null);
  } catch(e) {
    toast(e.message, 'error');
  }
}

async function selectWallpaper(url) {
  try {
    var data = await API.post('/wallpapers/set', { url: url });
    Store.user = data.user;
    updateNav();
    applyWallpaper(url);
    closeModal();
    toast('壁纸已应用', 'success');
  } catch(e) {
    toast(e.message, 'error');
  }
}

async function removeWallpaper() {
  try {
    await API.post('/wallpapers/set', { url: '' });
    Store.user.bg_image = '';
    applyWallpaper('');
    closeModal();
    toast('背景已清除', 'success');
  } catch(e) {
    toast(e.message, 'error');
  }
}

function applyWallpaper(url) {
  if (url) {
    document.body.style.backgroundImage = 'url(' + url + ')';
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
    const data = await API.post('/friends/request/' + userId);
    toast(data.message || '好友申请已发送', 'success');
    navigate('profile', userId);
  } catch (e) { toast(e.message, 'error'); }
}

async function removeFriend(userId) {
  showConfirm('删除好友', '确定要删除这个好友吗？', async () => {
    await API.delete('/friends/' + userId);
    toast('已删除好友', 'success');
    navigate('profile', userId);
  });
}
