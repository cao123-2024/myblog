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
    var roleText = 'User';
    if (u.role === 'admin' && !u.created_by) roleText = 'Super Admin';
    else if (u.role === 'admin') roleText = 'Admin';
    else if (u.role === 'semi_admin') roleText = 'Moderator';

    wrap.innerHTML = ''
      + '<div class="profile-header card-glass" style="padding:0">'
      + '<div class="profile-bg" style="background-image:url('+(u.bg_image||'')+')"></div>'
      + '<div style="position:relative">'
      + '<div class="profile-avatar-wrap">'
      + '<div class="profile-avatar-lg" style="background-image:url('+(u.avatar||'')+')"></div>'
      + '</div></div>'
      + '<div class="profile-info">'
      + '<h2>'+escapeHtml(u.nickname||u.username)+'</h2>'
      + '<p class="bio">'+escapeHtml(u.bio||'Nothing here yet...')+'</p>'
      + '<p class="text-xs text-tertiary mt-1">@'+escapeHtml(u.username)+' · UID '+u.id+' · '+roleText+'</p>'
      + '<div class="flex gap-2 mt-3">'
      + (isMe ? '<button class="btn btn-primary btn-sm" onclick="editProfileModal()">Edit Profile</button>'
        : ('<button class="btn btn-primary btn-sm" onclick="navigate(\'messages\');setTimeout(function(){openChatWith('+u.id+')},100)">Message</button>'
        + (friendStatus === 'accepted'
          ? '<button class="btn btn-glass btn-sm" onclick="removeFriend('+u.id+')">Remove Friend</button>'
          : friendStatus === 'pending'
          ? '<button class="btn btn-glass btn-sm" style="opacity:0.6">Pending</button>'
          : '<button class="btn btn-glass btn-sm" onclick="sendFriendRequest('+u.id+')">Add Friend</button>')))
      + '</div></div></div>'
      + '<h3 class="mb-3" style="font-size:1.2rem;font-weight:600">'+(isMe?'My':'Their')+' Articles</h3>'
      + '<div id="profile-articles">'+renderProfileArticles(data.articles)+'</div>';
    if (isMe) window._profileData = data;
  } catch (e) {
    wrap.innerHTML = '<div class="text-center p-6 text-secondary">Load failed: '+e.message+'</div>';
  }
}

function renderProfileArticles(articles) {
  if (articles.length === 0) return '<p class="text-sm text-secondary">No articles</p>';
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
    if (!/^image\//.test(file.type) || file.size < 300 * 1024) return resolve(file);
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function() {
      URL.revokeObjectURL(url);
      var maxW = 800, maxH = 800;
      var w = img.width, h = img.height;
      if (w > maxW || h > maxH) { var r = Math.min(maxW/w, maxH/h); w = Math.round(w*r); h = Math.round(h*r); }
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      c.toBlob(function(b) {
        if (b && b.size > 0) resolve(new File([b], file.name.replace(/\.\w+$/,'.jpg'), {type:'image/jpeg'}));
        else resolve(file);
      }, 'image/jpeg', 0.7);
    };
    img.onerror = function(){ URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

async function editProfileModal() {
  var ud = window._profileData?.user || Store.user;
  showModal('Edit Profile', ''
    + '<div class="form-group"><label>Avatar</label><input type="file" class="input" id="edit-avatar" accept="image/*"></div>'
    + '<div class="form-group"><label>Background</label>'
    + '<div style="display:flex;gap:8px;align-items:center">'
    + '<input type="file" class="input" id="edit-bg" accept="image/*" style="flex:1">'
    + '<button class="btn btn-glass btn-sm" onclick="showWallpaperGallery()" style="white-space:nowrap">Gallery</button>'
    + '</div></div>'
    + '<div class="form-group"><label>Nickname</label><input class="input input-glass" id="edit-nickname" value="'+escapeHtml(ud.nickname||'')+'"></div>'
    + '<div class="form-group"><label>Bio</label><textarea class="input input-glass textarea" id="edit-bio" rows="3">'+escapeHtml(ud.bio||'')+'</textarea></div>'
  , async function() {
    var fd = new FormData();
    var nn = $('#edit-nickname').value.trim();
    var bio = $('#edit-bio').value.trim();
    if (nn) fd.append('nickname', nn);
    if (bio) fd.append('bio', bio);
    var av = $('#edit-avatar').files[0];
    var bg = $('#edit-bg').files[0];
    if (av) fd.append('avatar', await compressProfileImage(av));
    if (bg) fd.append('bg_image', await compressProfileImage(bg));
    var data = await API.uploadPut('/users/profile', fd);
    Store.user = data.user;
    updateNav();
    if (window.applyWallpaper) applyWallpaper(data.user.bg_image);
    toast('Profile updated', 'success');
    navigate('profile');
  }, 'Save');
}

async function showWallpaperGallery() {
  try {
    var data = await API.get('/wallpapers');
    var wps = data.wallpapers || [];
    if (wps.length === 0) { toast('No wallpapers. Admin can upload via Admin Panel → Wallpapers.', 'info'); return; }
    var html = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-height:420px;overflow-y:auto;padding:4px">';
    wps.forEach(function(w) {
      html += '<div style="aspect-ratio:16/9;border-radius:10px;background-image:url('+escapeHtml(w.url)+');background-size:cover;background-position:center;cursor:pointer;border:2px solid transparent;transition:all 0.2s ease"'
        + ' onclick="selectWallpaper(\''+escapeHtml(w.url)+'\')"'
        + ' onmouseenter="this.style.borderColor=\'var(--blue)\';this.style.transform=\'scale(1.03)\'"'
        + ' onmouseleave="this.style.borderColor=\'transparent\';this.style.transform=\'scale(1)\'"'
        + ' title="'+escapeHtml(w.name||'')+'"></div>';
    });
    html += '</div><button class="btn btn-glass w-full mt-3" onclick="removeWallpaper()">Clear Background</button>';
    showModal('Wallpapers', html, null, null);
  } catch(e) { toast(e.message, 'error'); }
}

async function selectWallpaper(url) {
  try {
    var data = await API.post('/wallpapers/set', { url: url });
    Store.user = data.user;
    updateNav();
    if (window.applyWallpaper) applyWallpaper(url);
    closeModal();
    toast('Wallpaper applied', 'success');
  } catch(e) { toast(e.message, 'error'); }
}

async function removeWallpaper() {
  try {
    await API.post('/wallpapers/set', { url: '' });
    Store.user.bg_image = '';
    if (window.applyWallpaper) applyWallpaper('');
    closeModal();
    toast('Background cleared', 'success');
  } catch(e) { toast(e.message, 'error'); }
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
    toast(data.message || 'Request sent', 'success');
    navigate('profile', userId);
  } catch (e) { toast(e.message, 'error'); }
}

async function removeFriend(userId) {
  showConfirm('Remove Friend', 'Are you sure?', async function() {
    await API.delete('/friends/' + userId);
    toast('Removed', 'success');
    navigate('profile', userId);
  });
}
