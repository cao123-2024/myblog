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
    <div class="form-group"><label>背景图</label><input type="file" class="input" id="edit-bg" accept="image/*"></div>
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
    toast('资料已更新', 'success');
    navigate('profile');
  }, '保存');
}

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
