function render_friends() {
  if (!Store.user) { navigate('home'); return document.createElement('div'); }

  var wrap = document.createElement('div');
  wrap.className = 'stagger';

  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:20px';
  hdr.innerHTML = ''
    + '<h2 style="font-size:1.4rem;font-weight:700">好友</h2>'
    + '<button class="btn btn-primary btn-sm" onclick="showAddFriendModal()" style="gap:6px">'
    + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
    + '添加好友</button>';
  wrap.appendChild(hdr);

  var cards = document.createElement('div');
  cards.id = 'friend-cards';
  cards.className = 'glass-stack';
  cards.innerHTML = '<div class="text-center text-secondary p-6">加载中...</div>';
  wrap.appendChild(cards);

  setTimeout(loadFriendList, 50);
  return wrap;
}

async function loadFriendList() {
  try {
    var data = await API.get('/friends');
    var el = document.getElementById('friend-cards');
    if(!el) return;

    var html = '';

    /* Incoming requests */
    var incoming = data.pending.filter(function(p){return p.incoming;});
    if(incoming.length > 0){
      html += '<h3 class="mb-3" style="font-size:0.9rem;font-weight:600;color:var(--text-secondary)">待处理的申请</h3>';
      incoming.forEach(function(p){
        var u = p.other || {};
       html += '<div class="card-glass" style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;margin-bottom:8px">';
       html += '<div class="flex items-center gap-3">';
        html += '<div class="comment-avatar" style="width:44px;height:44px;background-image:'+cssUrl(avatarUrl(u))+'"></div>';
       html += '<div><div class="font-medium">'+escapeHtml(u.nickname||u.username||'未知')+'</div><div class="text-xs text-secondary">@'+escapeHtml(u.username||'')+'</div></div>';
        html += '</div>';
        html += '<div class="flex gap-2">';
        html += '<button class="btn btn-primary btn-sm" onclick="acceptFriend('+u.id+')">接受</button>';
        html += '<button class="btn btn-glass btn-sm" onclick="rejectFriend('+u.id+')">拒绝</button>';
        html += '</div>';
        html += '</div>';
      });
    }

    /* Sent pending */
    var sent = data.pending.filter(function(p){return !p.incoming;});
    if(sent.length > 0){
      html += '<h3 class="mb-3" style="font-size:0.9rem;font-weight:600;color:var(--text-secondary)">已发送的申请</h3>';
      sent.forEach(function(p){
       var u = p.other;
       html += '<div class="card-glass" style="display:flex;align-items:center;padding:16px 20px;margin-bottom:8px">';
        html += '<div class="comment-avatar" style="width:44px;height:44px;margin-right:12px;background-image:'+cssUrl(avatarUrl(u))+'"></div>';
       html += '<div><div class="font-medium">'+escapeHtml(u.nickname||u.username)+'</div><div class="text-xs text-secondary">等待对方确认</div></div>';
        html += '</div>';
      });
    }

    /* Friends list */
    html += '<h3 class="mb-3 mt-4" style="font-size:0.9rem;font-weight:600;color:var(--text-secondary)">' + (data.friends.length||0) + ' 位好友</h3>';
    if(data.friends.length === 0){
      html += '<div class="text-center text-secondary p-6">还没有好友，点击上方"添加好友"按钮开始交友</div>';
    } else {
      data.friends.forEach(function(f){
        html += '<div class="card-glass" style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;cursor:pointer" onclick="navigate(\'profile\','+f.id+')">';
        html += '<div class="flex items-center gap-3">';
        html += '<div class="comment-avatar" style="width:44px;height:44px;cursor:pointer;background-image:'+cssUrl(avatarUrl(f))+'"></div>';
        html += '<div><div class="font-medium">'+escapeHtml(f.nickname||f.username)+'</div><div class="text-xs text-secondary">@'+escapeHtml(f.username)+'</div></div>';
        html += '</div>';
        html += '<div class="flex gap-2">';
        html += '<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();if(window.openChatWith){openChatWith('+f.id+');navigate(\'messages\')}else{toast(\'请先打开消息页\',\'error\')}">'
          + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>'
          + ' 发消息</button>';
        html += '<button class="btn btn-glass btn-sm" onclick="event.stopPropagation();removeFriend('+f.id+',\''+escapeHtml(f.nickname||f.username)+'\')">删除</button>';
        html += '</div>';
        html += '</div>';
      });
    }

    el.innerHTML = html;
  } catch(e) {
    document.getElementById('friend-cards').innerHTML = '<div class="text-center p-6" style="color:#CF222E">加载失败: '+e.message+'</div>';
  }
}

function showAddFriendModal(){
  showInputModal('添加好友','输入对方的用户名','',async function(val){
    if(!val.trim()) throw new Error('请输入用户名');
    /* Search for user by username */
    var data = await API.get('/users/search?q='+encodeURIComponent(val.trim()));
    var found = data.users && data.users.length > 0 ? data.users[0] : null;
    if(!found) throw new Error('未找到该用户');
    if(found.id === Store.user.id) throw new Error('不能添加自己');
    var r = await API.post('/friends/request/'+found.id);
    if(r.status === 'accepted'){
      toast('你们已是好友！','success');
    } else {
      toast('好友申请已发送','success');
    }
    loadFriendList();
  });
}

async function acceptFriend(id){
  await API.post('/friends/accept/'+id);
  toast('已接受好友申请','success');
  loadFriendList();
  if (typeof loadChatData === 'function') try { loadChatData(); } catch(_) {}
}
async function rejectFriend(id){
  await API.post('/friends/reject/'+id);
  toast('已拒绝','info');
  loadFriendList();
  if (typeof loadChatData === 'function') try { loadChatData(); } catch(_) {}
}
async function removeFriend(id, name){
  if (!name) name = '该用户';
  showConfirm('删除好友','确定删除好友「'+name+'」吗？', async function(){
    await API.delete('/friends/'+id);
    toast('好友已删除','success');
    loadFriendList();
  });
}

/* Share openChatWith from messages page */
var _chatOpener = null;
function getChatOpener(){
  if(_chatOpener) return _chatOpener;
  _chatOpener = window.openChatWith;
  return _chatOpener;
}
