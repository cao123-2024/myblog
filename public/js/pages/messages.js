let currentChatId = null;
let currentChatIsFriend = false;
let currentChatSentCount = 0;

function render_messages() {
  if (!Store.user) { navigate('login'); return document.createElement('div'); }

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="chat-layout">
      <div class="chat-sidebar card-glass" id="chat-sidebar">
        <div class="flex items-center justify-between p-4">
          <h3 style="font-size:1.1rem;font-weight:600">聊天</h3>
          <button class="btn btn-glass btn-sm btn-icon" onclick="showNewChatModal()" title="发起新对话" style="width:28px;height:28px;font-size:1rem">+</button>
        </div>
        <div style="flex:1;overflow-y:auto" id="chat-people"></div>
        <div style="border-top:1px solid var(--border-subtle);padding:12px">
          <p class="text-xs text-secondary mb-2">好友申请</p>
          <div id="chat-pending"></div>
        </div>
      </div>
      <div class="chat-main card-glass" id="chat-main" style="display:flex;flex-direction:column">
        <div style="flex:1;display:flex;align-items:center;justify-content:center" id="chat-empty">
          <p class="text-secondary">选择联系人开始聊天</p>
        </div>
        <div class="hidden" id="chat-area" style="flex:1;display:flex;flex-direction:column">
          <div class="flex items-center gap-3 p-3" style="border-bottom:1px solid var(--border-subtle)">
            <div class="comment-avatar" id="chat-other-avatar" style="width:36px;height:36px"></div>
            <span class="font-semibold" id="chat-other-name"></span>
          </div>
          <div id="chat-limit-banner" class="hidden"></div>
          <div class="chat-messages" id="chat-messages"></div>
          <div style="border-top:1px solid var(--border-subtle);padding:12px">
            <div class="chat-input-row">
              <input class="input input-glass" id="chat-msg-input" placeholder="输入消息..." onkeydown="if(event.key==='Enter')sendChatMsg()" disabled style="opacity:0.5">
              <button class="btn btn-primary" id="chat-send-btn" onclick="sendChatMsg()" disabled style="opacity:0.5">发送</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  setTimeout(loadChatData, 100);
  return wrap;
}

async function loadChatData() {
  try {
    var [friendData, convData] = await Promise.all([
      API.get('/friends'),
      API.get('/messages/conversations')
    ]);

    var el = document.getElementById('chat-people');
    if(!el) return;
    el.innerHTML = '';

    /* Show recent conversations (from any user) */
    var seenIds = {};
    var friends = friendData.friends || [];
    friends.forEach(function(f){ seenIds[f.id] = true; });

    var convs = convData.conversations || [];
    convs.forEach(function(c){
      if(!c.other) return;
      var id = c.other.id;
      seenIds[id] = true;
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 16px;cursor:pointer;transition:background 0.2s';
      row.onmouseenter = function(){ row.style.background = 'var(--bg-glass)'; };
      row.onmouseleave = function(){ row.style.background = 'transparent'; };
      row.onclick = function(){ openChatWith(id); };
      var unread = c.unread ? '<span style="margin-left:auto;background:var(--blue);color:#fff;border-radius:10px;padding:2px 7px;font-size:0.65rem">'+c.unread+'</span>' : '';
      row.innerHTML = '<div class="comment-avatar" style="background-image:url('+avatarUrl(c.other)+');width:36px;height:36px"></div>'
        + '<span class="font-medium text-sm">'+escapeHtml(c.other.nickname||c.other.username)+'</span>'+unread;
      el.appendChild(row);
    });

    /* Also show only-friend-without-conversation users */
    friends.forEach(function(f){
      if(seenIds[f.id]) return;
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 16px;cursor:pointer;transition:background 0.2s;opacity:0.7';
      row.onmouseenter = function(){ row.style.background = 'var(--bg-glass)'; };
      row.onmouseleave = function(){ row.style.background = 'transparent'; };
      row.onclick = function(){ openChatWith(f.id); };
      row.innerHTML = '<div class="comment-avatar" style="background-image:url('+avatarUrl(f)+');width:36px;height:36px"></div>'
        + '<span class="font-medium text-sm">'+escapeHtml(f.nickname||f.username)+'</span>';
      el.appendChild(row);
    });

    var pendingEl = document.getElementById('chat-pending');
    var pending = friendData.pending;
    if(!pendingEl) return;
    pendingEl.innerHTML = pending.filter(function(p){return p.incoming}).length === 0 ? '<span class="text-xs text-tertiary">无待处理申请</span>' : '';
    pending.forEach(function(p){
      if(p.incoming){
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px';
        row.innerHTML = '<span class="text-xs">'+escapeHtml(p.other?.nickname||'')+'</span>'
          + '<button class="btn btn-primary btn-sm" style="padding:2px 8px;font-size:0.7rem" data-accept="'+p.other?.id+'">接受</button>'
          + '<button class="btn btn-glass btn-sm" style="padding:2px 8px;font-size:0.7rem" data-reject="'+p.other?.id+'">拒绝</button>';
        pendingEl.appendChild(row);
        row.querySelector('[data-accept]').onclick = function(){ acceptFriend(p.other?.id); };
        row.querySelector('[data-reject]').onclick = function(){ rejectFriend(p.other?.id); };
      }
    });
  } catch(e) { console.error(e); }
}

async function acceptFriend(id) {
  await API.post('/friends/accept/' + id);
  toast('已接受好友申请', 'success');
  loadChatData();
}

async function rejectFriend(id) {
  await API.post('/friends/reject/' + id);
  toast('已拒绝', 'info');
  loadChatData();
}

let chatPollInterval = null;

async function openChatWith(userId) {
  currentChatId = userId;
  $('#chat-empty').classList.add('hidden');
  $('#chat-area').classList.remove('hidden');
  try {
    const data = await API.get('/messages/with/' + userId);
    $('#chat-other-name').textContent = data.other?.nickname || data.other?.username || '';
    const av = avatarUrl(data.other);
    $('#chat-other-avatar').style.backgroundImage = av ? `url(${av})` : 'none';
    renderChatMessages(data.messages || []);

    currentChatIsFriend = !!data.isFriend;
    currentChatSentCount = data.sentCount || 0;

    updateChatBanner();
    updateChatInputState();
  } catch (e) { toast(e.message, 'error'); }

  if (chatPollInterval) clearInterval(chatPollInterval);
  chatPollInterval = setInterval(pollMessages, 3000);
}

function updateChatInputState() {
  var input = $('#chat-msg-input');
  var btn = $('#chat-send-btn');
  if (!input || !btn) return;
  var blocked = !currentChatIsFriend && currentChatSentCount >= 1 && !Store.isAdmin();
  if (blocked) {
    input.disabled = true;
    input.style.opacity = '0.5';
    input.placeholder = '请先添加好友...';
    btn.disabled = true;
    btn.style.opacity = '0.5';
  } else {
    input.disabled = false;
    input.style.opacity = '1';
    input.placeholder = '输入消息...';
    btn.disabled = false;
    btn.style.opacity = '1';
  }
}

function updateChatBanner() {
  var banner = $('#chat-limit-banner');
  if (!banner) return;
  if (!currentChatIsFriend && currentChatSentCount >= 1 && !Store.isAdmin()) {
    banner.className = 'chat-limit-banner';
    banner.innerHTML = ''
      + '<div class="chat-limit-banner-text">'
      + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
      + '<span>目前对方不是你好友，需添加好友后才能无限制发送消息，目前只能发送一条。</span>'
      + '</div>'
      + '<div class="chat-limit-banner-actions">'
      + '<button class="btn btn-primary btn-sm" onclick="addFriendFromChat(' + currentChatId + ')">添加好友</button>'
      + '<button class="btn btn-glass btn-sm btn-icon" onclick="dismissChatBanner()" title="关闭">&times;</button>'
      + '</div>';
  } else {
    banner.className = 'hidden';
  }
}

function dismissChatBanner() {
  var banner = $('#chat-limit-banner');
  if (banner) banner.className = 'hidden';
}

async function addFriendFromChat(userId) {
  try {
    await API.post('/friends/request/' + userId);
    toast('好友申请已发送', 'success');
    dismissChatBanner();
  } catch (e) { toast(e.message, 'error'); }
}

function renderChatMessages(msgs) {
  const el = $('#chat-messages');
  el.innerHTML = '';
  msgs.forEach(m => {
    const div = document.createElement('div');
    div.className = 'chat-msg ' + (m.sender_id === Store.user?.id ? 'mine' : 'theirs');
    div.textContent = m.content;
    el.appendChild(div);
  });
  el.scrollTop = el.scrollHeight;
}

async function pollMessages() {
  if (!currentChatId) return;
  try {
    const data = await API.get('/messages/with/' + currentChatId);
    renderChatMessages(data.messages || []);
    if (currentChatIsFriend !== !!data.isFriend || currentChatSentCount !== (data.sentCount || 0)) {
      currentChatIsFriend = !!data.isFriend;
      currentChatSentCount = data.sentCount || 0;
      updateChatBanner();
      updateChatInputState();
    }
  } catch (e) { /* silently fail */ }
}

async function sendChatMsg() {
  if (!currentChatId) return;
  const input = $('#chat-msg-input');
  const content = input.value.trim();
  if (!content) return;
  try {
    await API.post('/messages/send/' + currentChatId, { content });
    input.value = '';
    currentChatSentCount++;
    updateChatBanner();
    updateChatInputState();
    await pollMessages();
  } catch (e) {
    try {
      var data = await API.get('/messages/with/' + currentChatId);
      currentChatIsFriend = !!data.isFriend;
      currentChatSentCount = data.sentCount || 0;
      updateChatBanner();
      updateChatInputState();
    } catch(e2) {}
    toast(e.message, 'error');
  }
}

function showNewChatModal(){
  if(Store.isAdminVerified()){
    showAdminBroadcastModal();
    return;
  }
  showInputModal('发起新对话','输入对方的用户名','', async function(val){
    if(!val.trim()) throw new Error('请输入用户名');
    var data = await API.get('/users/search?q='+encodeURIComponent(val.trim()));
    var found = data.users && data.users.length > 0 ? data.users[0] : null;
    if(!found) throw new Error('未找到该用户');
    if(found.id === Store.user.id) throw new Error('不能和自己聊天');
    openChatWith(found.id);
  });
}

async function showAdminBroadcastModal(){
  var html = ''
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'
    + '<h3 style="font-size:1.1rem;font-weight:600">管理员群发消息</h3>'
    + '</div>'
    + '<input class="input input-glass" id="ab-search" placeholder="搜索用户名..." style="margin-bottom:12px" oninput="adminBroadcastFilter()">'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">'
    + '<button class="btn btn-glass btn-sm" onclick="adminBroadcastSelectAll()">全选</button>'
    + '<button class="btn btn-glass btn-sm" onclick="adminBroadcastDeselectAll()">取消全选</button>'
    + '<button class="btn btn-glass btn-sm" onclick="adminBroadcastInvert()">反选</button>'
    + '<span class="text-sm text-secondary" id="ab-count">已选 0 个用户</span>'
    + '</div>'
    + '<div id="ab-user-list" style="max-height:260px;overflow-y:auto;border:1px solid var(--border-glass);border-radius:var(--radius-sm);margin-bottom:12px;background:var(--bg-glass)">'
    + '<div class="text-center text-secondary p-4">加载中...</div>'
    + '</div>'
    + '<textarea class="input input-glass textarea" id="ab-content" rows="3" placeholder="输入群发消息内容..." style="margin-bottom:12px"></textarea>'
    + '<button class="btn btn-primary w-full" id="ab-send-btn" onclick="adminBroadcastSend()">发送群发消息</button>';

  showModal('管理员群发', html, null, null);
  setupAdminBroadcast();
}

var _abAllUsers = [];
var _abSelected = {};

async function setupAdminBroadcast(){
  try{
    var data = await API.get('/admin/users');
    _abAllUsers = data.users || [];
    _abSelected = {};
    adminBroadcastRender();
  }catch(e){
    document.getElementById('ab-user-list').innerHTML = '<div class="text-center text-red p-4">加载失败: '+e.message+'</div>';
  }
}

function adminBroadcastRender(){
  var list = document.getElementById('ab-user-list');
  var count = document.getElementById('ab-count');
  if(!list) return;

  var q = (document.getElementById('ab-search')?.value || '').trim().toLowerCase();
  var filtered = _abAllUsers;
  if(q){
    filtered = _abAllUsers.filter(function(u){
      return (u.username||'').toLowerCase().includes(q) || (u.nickname||'').toLowerCase().includes(q);
    });
  }

  var selCount = Object.values(_abSelected).filter(Boolean).length;
  if(count) count.textContent = '已选 ' + selCount + ' 个用户';

  if(filtered.length === 0){
    list.innerHTML = '<div class="text-center text-secondary p-4">无匹配用户</div>';
    return;
  }

  var html = '';
  for(var i=0; i<filtered.length; i++){
    var u = filtered[i];
    var checked = !!_abSelected[u.id];
    var avUrl = avatarUrl(u);
    var av = avUrl ? 'style="background-image:url('+escapeHtml(avUrl)+')"' : '';
    var tag = u.tag ? '<span class="text-xs text-tertiary">['+escapeHtml(u.tag)+']</span>' : '';
    var roleBadge = '';
    if(u.role==='admin' && !u.created_by) roleBadge = '<span class="text-xs" style="color:var(--purple, #a855f7)">超管</span>';
    else if(u.role==='admin') roleBadge = '<span class="text-xs" style="color:var(--blue)">管理员</span>';
    else if(u.role==='semi_admin') roleBadge = '<span class="text-xs" style="color:var(--cyan, #06b6d4)">半管理</span>';
    html += '<label style="display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:pointer;transition:background 0.15s;border-bottom:1px solid var(--border-subtle)" onmouseenter="this.style.background=\'var(--bg-glass-hover)\'" onmouseleave="this.style.background=\'transparent\'">'
      + '<input type="checkbox" '+(checked?'checked':'')+' onchange="adminBroadcastToggle('+u.id+',this.checked)" style="width:16px;height:16px;accent-color:var(--blue)">'
      + '<div class="comment-avatar" '+av+' style="width:32px;height:32px;flex-shrink:0"></div>'
      + '<span class="text-sm font-medium">'+escapeHtml(u.nickname||u.username)+'</span>'
      + '<span class="text-xs text-tertiary">@'+escapeHtml(u.username)+'</span>'
      + tag + roleBadge
      + '</label>';
  }
  list.innerHTML = html;
}

function adminBroadcastToggle(id, on){
  _abSelected[id] = on;
  adminBroadcastRender();
}

function adminBroadcastSelectAll(){
  for(var i=0; i<_abAllUsers.length; i++){
    _abSelected[_abAllUsers[i].id] = true;
  }
  adminBroadcastRender();
}

function adminBroadcastDeselectAll(){
  _abSelected = {};
  adminBroadcastRender();
}

function adminBroadcastInvert(){
  for(var i=0; i<_abAllUsers.length; i++){
    var id = _abAllUsers[i].id;
    _abSelected[id] = !_abSelected[id];
  }
  adminBroadcastRender();
}

function adminBroadcastFilter(){
  adminBroadcastRender();
}

async function adminBroadcastSend(){
  var ids = Object.keys(_abSelected).filter(function(k){ return _abSelected[k]; }).map(Number);
  if(ids.length === 0){ toast('请至少选择一个用户','error'); return; }
  var content = (document.getElementById('ab-content')?.value || '').trim();
  if(!content){ toast('消息内容不能为空','error'); return; }
  var btn = document.getElementById('ab-send-btn');
  if(btn){ btn.disabled = true; btn.textContent = '发送中...'; }
  try{
    var result = await API.post('/messages/broadcast', { user_ids: ids, content: content });
    toast('已成功发送给 ' + result.sent + ' 个用户','success');
    closeModal();
  }catch(e){
    toast(e.message,'error');
    if(btn){ btn.disabled = false; btn.textContent = '发送群发消息'; }
  }
}
