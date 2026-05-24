let currentChatId = null;

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
          <div class="chat-messages" id="chat-messages"></div>
          <div style="border-top:1px solid var(--border-subtle);padding:12px">
            <div class="chat-input-row">
              <input class="input input-glass" id="chat-msg-input" placeholder="输入消息..." onkeydown="if(event.key==='Enter')sendChatMsg()">
              <button class="btn btn-primary" onclick="sendChatMsg()">发送</button>
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
      row.innerHTML = '<div class="comment-avatar" style="background-image:url('+(c.other.avatar||'')+');width:36px;height:36px"></div>'
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
      row.innerHTML = '<div class="comment-avatar" style="background-image:url('+(f.avatar||'')+');width:36px;height:36px"></div>'
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
    const av = data.other?.avatar || '';
    $('#chat-other-avatar').style.backgroundImage = av ? `url(${av})` : 'none';
    renderChatMessages(data.messages || []);
  } catch (e) { toast(e.message, 'error'); }

  if (chatPollInterval) clearInterval(chatPollInterval);
  chatPollInterval = setInterval(pollMessages, 3000);
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
    await pollMessages();
  } catch (e) { toast(e.message, 'error'); }
}

function showNewChatModal(){
  showInputModal('发起新对话','输入对方的用户名','', async function(val){
    if(!val.trim()) throw new Error('请输入用户名');
    var data = await API.get('/users/search?q='+encodeURIComponent(val.trim()));
    var found = data.users && data.users.length > 0 ? data.users[0] : null;
    if(!found) throw new Error('未找到该用户');
    if(found.id === Store.user.id) throw new Error('不能和自己聊天');
    openChatWith(found.id);
  });
}
