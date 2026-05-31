var _gameActive = null;
var _gameTab = 'single';
var _multiInterval = null;
var _multiRoomId = null;
var _multiMyColor = null;

function render_games() {
  var wrap = document.createElement('div');
  wrap.className = 'stagger';

  var hdr = document.createElement('div');
  hdr.style.cssText = 'margin-bottom:20px';
  hdr.innerHTML = '<h2 style="font-size:1.4rem;font-weight:700;margin-bottom:8px">游戏中心</h2>';
  wrap.appendChild(hdr);

  var tabs = document.createElement('div');
  tabs.style.cssText = 'display:flex;gap:0;margin-bottom:20px;background:var(--bg-glass);border-radius:10px;padding:4px;width:fit-content';
  tabs.innerHTML = '<button class="btn btn-sm" id="gtab-single" style="border-radius:8px;background:var(--blue);color:#fff;font-weight:600" onclick="switchGameTab(\'single\')">单人模式</button>'
    + '<button class="btn btn-sm" id="gtab-dual" style="border-radius:8px;background:transparent;color:var(--text-secondary)" onclick="switchGameTab(\'dual\')">双人对战</button>';
  wrap.appendChild(tabs);

  var content = document.createElement('div');
  content.id = 'game-tab-content';
  content.innerHTML = renderSingleGames();
  wrap.appendChild(content);

  return wrap;
}

function switchGameTab(tab) {
  _gameTab = tab;
  document.getElementById('gtab-single').style.cssText = 'border-radius:8px;background:'+(tab==='single'?'var(--blue)':'transparent')+';color:'+(tab==='single'?'#fff':'var(--text-secondary)')+';font-weight:600';
  document.getElementById('gtab-dual').style.cssText = 'border-radius:8px;background:'+(tab==='dual'?'var(--blue)':'transparent')+';color:'+(tab==='dual'?'#fff':'var(--text-secondary)')+';font-weight:600';
  if (_multiInterval) { clearInterval(_multiInterval); _multiInterval = null; }
  API.post('/game/queue/cancel').catch(function(){});
  document.getElementById('game-tab-content').innerHTML = tab === 'single' ? renderSingleGames() : renderDualGames();
  if (tab === 'dual') initDualMode();

  var canvas = document.getElementById('game-canvas');
  if (canvas) { canvas.style.display = 'none'; canvas.innerHTML = ''; }
}

function renderSingleGames() {
  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:10px';

  var svgs = {
    gomoku: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#BF7B00" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="3" y1="3" x2="21" y2="21"/><line x1="21" y1="3" x2="3" y2="21"/></svg>',
    '2048': '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0078D4" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="3"/><text x="12" y="17" text-anchor="middle" font-size="11" font-weight="700" fill="#0078D4">2</text></svg>',
    snake: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1A7F37" stroke-width="2"><path d="M4 18c0-3 4-3 4-6s-4-3-4-6 4-3 4-6"/><circle cx="14" cy="4" r="1.5" fill="#1A7F37"/><circle cx="18" cy="8" r="1.5" fill="#1A7F37"/><circle cx="16" cy="14" r="1.5" fill="#1A7F37"/></svg>',
    minesweeper: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CF222E" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="13" r="3"/><line x1="12" y1="8" x2="12" y2="10"/></svg>',
    sudoku: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#8250DF" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>',
    tetris: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#BC4C2A" stroke-width="1.5"><rect x="4" y="14" width="6" height="6"/><rect x="10" y="8" width="4" height="12"/><rect x="14" y="4" width="6" height="4"/></svg>',
    breakout: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#D63384" stroke-width="1.8"><rect x="4" y="4" width="16" height="4" rx="1"/><circle cx="12" cy="14" r="2"/><rect x="7" y="18" width="10" height="2" rx="1"/></svg>',
    pong: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#00C6FF" stroke-width="1.8"><rect x="2" y="6" width="2" height="12" rx="1"/><rect x="20" y="6" width="2" height="12" rx="1"/><line x1="12" y1="4" x2="12" y2="8" stroke-dasharray="1 1"/></svg>'
  };

  var games = [
    {id:'gomoku',name:'五子棋',desc:'AI对战',color:'#BF7B00'},
    {id:'2048',name:'2048',desc:'合并数字',color:'#0078D4'},
    {id:'snake',name:'贪吃蛇',desc:'经典蛇',color:'#1A7F37'},
    {id:'minesweeper',name:'扫雷',desc:'排雷',color:'#CF222E'},
    {id:'sudoku',name:'数独',desc:'9x9谜题',color:'#8250DF'},
    {id:'tetris',name:'俄罗斯方块',desc:'消除',color:'#BC4C2A'},
    {id:'breakout',name:'打砖块',desc:'弹球',color:'#D63384'},
    {id:'pong',name:'乒乓球',desc:'对打',color:'#00C6FF'}
  ];

  games.forEach(function(g){
    var el = document.createElement('div');
    el.className = 'card-glass game-grid-card';
    el.style.cssText = 'padding:14px;cursor:pointer;text-align:center';
    el.onclick = function(){ launchGame(g.id); };
    el.innerHTML = '<div style="margin-bottom:6px;display:flex;justify-content:center">'+(svgs[g.id]||'')+'</div>'
      + '<h3 style="font-size:0.85rem;font-weight:600;margin-bottom:2px">'+g.name+'</h3>'
      + '<p class="text-xs text-secondary">'+g.desc+'</p>';
    grid.appendChild(el);
  });
  return grid.outerHTML;
}

/* ===== DUAL MODE ===== */
function renderDualGames() {
  var wrap = document.createElement('div');
  wrap.innerHTML = '<div id="dual-lobby"></div><div id="dual-game-area" style="display:none"></div>';
  return wrap.innerHTML;
}

function initDualMode() {
  var lobby = document.getElementById('dual-lobby');
  if (!lobby) return;
  lobby.innerHTML = ''
    + '<div class="card-glass" style="padding:24px;text-align:center;max-width:600px;margin:0 auto">'
    + '<h3 style="font-size:1.1rem;font-weight:600;margin-bottom:20px">双人五子棋</h3>'
    + '<div style="display:flex;align-items:center;justify-content:center;gap:30px;margin-bottom:24px">'
    + '<div style="text-align:center"><div style="width:64px;height:64px;border-radius:50%;background-size:cover;background-position:center;margin:0 auto 8px;background-color:rgba(255,255,255,0.06);border:2px solid var(--blue);background-image:url('+avatarUrl(Store.user)+')"></div><div class="text-sm font-medium">'+escapeHtml(Store.user?.nickname||'')+' (你)</div></div>'
    + '<div style="font-size:2rem;color:var(--text-tertiary)">VS</div>'
    + '<div id="dual-opponent-slot" style="text-align:center"><div style="width:64px;height:64px;border-radius:50%;border:2px dashed rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;margin:0 auto 8px;cursor:pointer;transition:all 0.2s" id="dual-plus-btn" onclick="showDualInviteOptions()"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div><div class="text-xs text-secondary">选择对手</div></div>'
    + '</div>'
    + '<div id="dual-status" style="min-height:24px;margin-bottom:16px"></div>'
    + '<div id="dual-actions"></div>'
    + '</div>'
    + '<div id="dual-incoming" style="margin-top:12px"></div>';
  checkIncomingInvites();
}

function checkIncomingInvites() {
  setInterval(async function() {
    if (_gameTab !== 'dual' || _multiRoomId) return;
    try {
      var d = await API.get('/game/invites/pending');
      var invites = d.invites || [];
      var container = document.getElementById('dual-incoming');
      if (!container) return;
      if (invites.length === 0) { container.innerHTML = ''; return; }
      container.innerHTML = invites.map(function(inv) {
        if (!inv.from) return '';
        return '<div class="card-glass" style="padding:14px 18px;display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
          + '<div style="display:flex;align-items:center;gap:10px">'
          + '<div style="width:36px;height:36px;border-radius:50%;background-size:cover;background-position:center;background-color:rgba(255,255,255,0.06);background-image:url('+avatarUrl(inv.from)+')"></div>'
          + '<span class="text-sm font-medium">'+escapeHtml(inv.from.nickname||inv.from.username)+'<span class="text-xs text-secondary"> 邀请你对战</span></span></div>'
          + '<div style="display:flex;gap:6px">'
          + '<button class="btn btn-primary btn-sm" style="padding:4px 12px;font-size:0.75rem" onclick="acceptDualInvite('+inv.id+')">接受</button>'
          + '<button class="btn btn-glass btn-sm" style="padding:4px 12px;font-size:0.75rem" onclick="API.post(\'/game/invite/'+inv.id+'/reject\');document.getElementById(\'dual-incoming\').innerHTML=\'\'">拒绝</button>'
          + '</div></div>';
      }).join('');
    } catch (e) {}
  }, 3000);
}

async function acceptDualInvite(inviteId) {
  try {
    var d = await API.post('/game/invite/'+inviteId+'/accept');
    if (d.room) {
      toast('加入对战!', 'success');
      dualStartGame(d.room);
    }
  } catch (e) { toast(e.message, 'error'); }
}

function showDualInviteOptions() {
  var html = '<div style="max-height:360px;overflow-y:auto">'
    + '<div class="text-sm font-medium mb-2">邀请好友</div>'
    + '<div id="dual-friend-list" style="margin-bottom:12px"><div class="text-xs text-secondary p-2">加载中...</div></div>'
    + '<div style="border-top:1px solid var(--border-subtle);padding-top:12px">'
    + '<div class="text-sm font-medium mb-2">随机匹配</div>'
    + '<button class="btn btn-primary btn-sm w-full" onclick="startRandomMatch();closeModal()">寻找在线对手</button>'
    + '</div></div>';
  showModal('选择对手', html, null, null);
  loadFriendList();
}

async function loadFriendList() {
  try {
    var d = await API.get('/game/online-friends');
    var friends = d.friends || [];
    var list = document.getElementById('dual-friend-list');
    if (!list) return;
    if (friends.length === 0) {
      list.innerHTML = '<div class="text-xs text-secondary p-2">暂无好友在线</div>';
      return;
    }
    list.innerHTML = friends.map(function(f) {
      var disabled = f.in_game ? 'style="opacity:0.4;pointer-events:none"' : '';
      var tag = f.in_game ? '<span class="text-xs" style="color:#CF222E">对战中</span>' : '<span class="text-xs" style="color:#1A7F37">在线</span>';
      return '<div class="card-glass" style="padding:10px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;cursor:pointer" '+disabled+' onclick="inviteFriend('+f.id+',\''+escapeHtml(f.nickname||f.username)+'\',\''+escapeHtml(avatarUrl(f))+'\')">'
        + '<div style="display:flex;align-items:center;gap:10px">'
        + '<div style="width:36px;height:36px;border-radius:50%;background-size:cover;background-position:center;background-color:rgba(255,255,255,0.06);background-image:url('+avatarUrl(f)+')"></div>'
        + '<span class="text-sm font-medium">'+escapeHtml(f.nickname||f.username)+'</span></div>'
        + tag
        + '</div>';
    }).join('');
  } catch (e) {}
}

async function inviteFriend(userId, name, avatar) {
  closeModal();
  try {
    await API.post('/game/invite/' + userId);
    document.getElementById('dual-opponent-slot').innerHTML = '<div style="text-align:center"><div style="width:64px;height:64px;border-radius:50%;background-size:cover;background-position:center;margin:0 auto 8px;background-color:rgba(255,255,255,0.06);background-image:url('+escapeHtml(avatar)+')"></div><div class="text-sm font-medium">'+escapeHtml(name)+'</div></div>';
    document.getElementById('dual-status').innerHTML = '<p class="text-sm" style="color:#BF7B00">等待 '+escapeHtml(name)+' 接受邀请...</p>';
    document.getElementById('dual-actions').innerHTML = '<button class="btn btn-glass btn-sm" onclick="cancelInvite()">取消邀请</button>';
    pollInviteResponse(userId);
  } catch (e) { toast(e.message, 'error'); }
}

function pollInviteResponse(userId) {
  if (_multiInterval) clearInterval(_multiInterval);
  _multiInterval = setInterval(async function() {
    try {
      var d = await API.get('/game/invites/pending');
      var invites = (d.invites || []).filter(function(i){ return i.from && i.from.id === userId; });
      if (invites.length === 0) {
        checkForRoom();
      }
    } catch (e) {}
  }, 1500);
}

function cancelInvite() {
  if (_multiInterval) { clearInterval(_multiInterval); _multiInterval = null; }
  initDualMode();
}

async function startRandomMatch() {
  try {
    var d = await API.get('/game/queue');
    if (d.room) {
      document.getElementById('dual-opponent-slot').innerHTML = '<div style="text-align:center"><div style="width:64px;height:64px;border-radius:50%;background-size:cover;background-position:center;margin:0 auto 8px;background-color:rgba(255,255,255,0.06);background-image:url('+avatarUrl(d.room.opponent)+')"></div><div class="text-sm font-medium">'+escapeHtml(d.room.opponent?.nickname||'')+'</div></div>';
      toast('已匹配到对手!', 'success');
      dualStartGame(d.room);
      return;
    }
    document.getElementById('dual-status').innerHTML = '<p class="text-sm" style="color:#BF7B00">匹配中... 等待对手</p>';
    document.getElementById('dual-actions').innerHTML = '<button class="btn btn-glass btn-sm" onclick="cancelMatch()">取消匹配</button>';
    pollMatchStatus();
  } catch (e) { toast(e.message, 'error'); }
}

function pollMatchStatus() {
  if (_multiInterval) clearInterval(_multiInterval);
  _multiInterval = setInterval(async function() {
    try {
      var d = await API.get('/game/queue/status');
      if (d.matched && d.room) {
        clearInterval(_multiInterval); _multiInterval = null;
        document.getElementById('dual-opponent-slot').innerHTML = '<div style="text-align:center"><div style="width:64px;height:64px;border-radius:50%;background-size:cover;background-position:center;margin:0 auto 8px;background-color:rgba(255,255,255,0.06);background-image:url('+avatarUrl(d.room.opponent)+')"></div><div class="text-sm font-medium">'+escapeHtml(d.room.opponent?.nickname||'')+'</div></div>';
        document.getElementById('dual-status').innerHTML = '<p class="text-sm" style="color:#1A7F37">已匹配!</p>';
        toast('已匹配到对手!', 'success');
        setTimeout(function(){ dualStartGame(d.room); }, 500);
      }
    } catch (e) {}
  }, 2000);
}

function cancelMatch() {
  clearInterval(_multiInterval); _multiInterval = null;
  API.post('/game/queue/cancel').catch(function(){});
  initDualMode();
}

/* ===== DUAL GAME FULLSCREEN ===== */
async function checkForRoom() {
  try {
    var d = await API.get('/game/invites/pending');
  } catch (e) {}
}

function dualStartGame(room) {
  if (_multiInterval) { clearInterval(_multiInterval); _multiInterval = null; }
  _multiRoomId = room.id;
  _multiMyColor = room.you_color || 1;
  _gameActive = 'multi-gomoku';

  var oppName = room.opponent ? (room.opponent.nickname || room.opponent.username) : '对手';

  var overlay = document.createElement('div');
  overlay.id = 'gomoku-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.94);display:flex;flex-direction:column;align-items:center;justify-content:center';
  document.body.appendChild(overlay);

  var header = document.createElement('div');
  header.style.cssText = 'position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;z-index:10';
  header.innerHTML = '<div style="color:#ccc;font-size:0.85rem">VS '+escapeHtml(oppName)+'</div>'
    + '<span style="color:#ccc;font-weight:600">五子棋 · 双人对战</span>'
    + '<button id="gmk-resign" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,80,80,0.3);color:#ef4444;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:0.85rem">认输</button>';
  overlay.appendChild(header);

  var status = document.createElement('div');
  status.style.cssText = 'color:#ccc;font-weight:500;font-size:0.95rem;text-align:center;margin-bottom:8px;min-height:24px';
  status.textContent = _multiMyColor === 1 ? '你的回合 · 执黑' : '你的回合 · 执白';
  overlay.appendChild(status);

  var SZ = 15, CELL = 34, B = 5, CW = CELL * SZ + 10;
  var canvas = document.createElement('canvas');
  canvas.width = CW; canvas.height = CW;
  canvas.style.cssText = 'border-radius:8px;background:#1a1a1a;cursor:pointer;max-width:98vw;max-height:calc(100vh - 180px)';
  overlay.appendChild(canvas);

  overlay.appendChild(header); overlay.appendChild(status); overlay.appendChild(canvas);

  document.getElementById('gmk-resign').onclick = function() {
    API.post('/game/room/' + _multiRoomId + '/resign').catch(function(){});
    document.body.removeChild(overlay); _gameActive = null;
    toast('你认输了', 'info');
  };

  /* Board state & draw */
  var board = Array.from({length:SZ}, function(){return Array(SZ).fill(0)});
  var gameOver = false, lastMove = null;

  function drawBoard() {
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0,0,CW,CW);
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    for (var i=0;i<SZ;i++) { ctx.beginPath(); ctx.moveTo(B,B+i*CELL); ctx.lineTo(B+(SZ-1)*CELL,B+i*CELL); ctx.stroke(); ctx.beginPath(); ctx.moveTo(B+i*CELL,B); ctx.lineTo(B+i*CELL,B+(SZ-1)*CELL); ctx.stroke(); }
    ctx.fillStyle='rgba(255,255,255,0.3)';
    [[3,3],[3,7],[3,11],[7,3],[7,7],[7,11],[11,3],[11,7],[11,11]].forEach(function(p){ctx.beginPath();ctx.arc(B+p[0]*CELL,B+p[1]*CELL,2.5,0,Math.PI*2);ctx.fill()});
    for (var y=0;y<SZ;y++)for(var x=0;x<SZ;x++){if(!board[y][x])continue;var cx=B+x*CELL,cy=B+y*CELL,r=CELL*0.42;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);var g=ctx.createRadialGradient(cx-r*0.3,cy-r*0.3,r*0.1,cx,cy,r);if(board[y][x]===1){g.addColorStop(0,'#333');g.addColorStop(1,'#000')}else{g.addColorStop(0,'#fff');g.addColorStop(1,'#aaa')}ctx.fillStyle=g;ctx.fill()}
    if(lastMove){var lx=B+lastMove.x*CELL,ly=B+lastMove.y*CELL;ctx.strokeStyle='#FFD700';ctx.lineWidth=2;ctx.beginPath();ctx.arc(lx,ly,CELL*0.44,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1}
  }

  canvas.addEventListener('click', function(e){
    if(gameOver)return;
    var rect=canvas.getBoundingClientRect();
    var sx=CW/rect.width,sy=CW/rect.height;
    var mx=(e.clientX-rect.left)*sx,my=(e.clientY-rect.top)*sy;
    var x=Math.round((mx-B)/CELL),y=Math.round((my-B)/CELL);
    if(x<0||x>=SZ||y<0||y>=SZ||board[y][x]!==0)return;
    board[y][x]=_multiMyColor;lastMove={x:x,y:y};drawBoard();
    API.post('/game/room/'+_multiRoomId+'/move',{x:x,y:y}).then(function(r){
      var rm=r.room;
      if(rm.status==='finished'){gameOver=true;status.textContent=rm.winner===Store.user.id?'你赢了!':'你输了';toast(rm.winner===Store.user.id?'你赢了!':'你输了','info');return}
      status.textContent='对手回合...';
    }).catch(function(e2){toast(e2.message,'error');board[y][x]=0;lastMove=null;drawBoard()});
  });

  drawBoard();
  dualPollRoom(canvas, overlay, board, status, lastMove, gameOver, SZ, CELL, B, CW, oppName);
}

function dualPollRoom(canvas, overlay, board, status, lastMoveRef, gameOverRef, SZ, CELL, B, CW, oppName) {
  if (_multiInterval) clearInterval(_multiInterval);
  _multiInterval = setInterval(async function() {
    try {
      var d = await API.get('/game/room/' + _multiRoomId);
      var r = d.room;
      if (!r) return;
      var newBoard = r.board;

      /* Heartbeat */
      API.post('/game/room/' + _multiRoomId + '/heartbeat').catch(function(){});

      /* Opponent disconnected? */
      if (r.opponent_disconnected) {
        clearInterval(_multiInterval); _multiInterval = null;
        var html = '<div class="text-center"><p class="mb-4">对手已断开连接</p>'
          + '<button class="btn btn-primary btn-sm mr-2" onclick="closeModal();API.post(\'/game/queue/cancel\');switchGameTab(\'dual\')">重新匹配</button>'
          + '<button class="btn btn-glass btn-sm" onclick="closeModal();document.body.removeChild(document.getElementById(\'gomoku-overlay\'));_gameActive=null">退出</button></div>';
        showModal('连接中断', html, null, null);
        return;
      }

      if (r.status === 'finished') {
        clearInterval(_multiInterval); _multiInterval = null;
        var won = r.winner === Store.user.id;
        document.getElementById('gomoku-overlay').querySelectorAll('div')[2].textContent = won ? '你赢了!' : '你输了';
        toast(won ? '你赢了!' : '你输了', won ? 'success' : 'error');
        setTimeout(function(){
          var html2 = '<div class="text-center"><p class="mb-4">'+(won?'恭喜你赢了!':'你输了...')+'</p>'
            + '<button class="btn btn-primary btn-sm mr-2" onclick="closeModal();API.post(\'/game/queue/cancel\');switchGameTab(\'dual\')">再来一局</button>'
            + '<button class="btn btn-glass btn-sm" onclick="closeModal();var ov=document.getElementById(\'gomoku-overlay\');if(ov)document.body.removeChild(ov);_gameActive=null">退出</button></div>';
          showModal('游戏结束', html2, null, null);
        }, 800);
        return;
      }

      var changed = false;
      for (var y = 0; y < 15; y++) for (var x = 0; x < 15; x++) {
        if ((board[y] && board[y][x]) !== (newBoard[y] && newBoard[y][x])) {
          if (newBoard[y] && newBoard[y][x] !== 0) lastMoveRef = {x: x, y: y};
          changed = true;
        }
      }
      if (changed) {
        board = newBoard.map(function(row){return row.slice()});
        drawBoardDual(canvas, board, lastMoveRef, SZ, CELL, B, CW);
        if (r.turn === _multiMyColor) {
          document.getElementById('gomoku-overlay').querySelectorAll('div')[2].textContent = '你的回合';
        } else {
          document.getElementById('gomoku-overlay').querySelectorAll('div')[2].textContent = '对手回合...';
        }
      }
    } catch (e) {}
  }, 1500);

  function drawBoardDual(cvs, bd, lm, sz, cl, br, cw) {
    var ctx = cvs.getContext('2d');
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0,0,cw,cw);
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    for (var i=0;i<sz;i++){ctx.beginPath();ctx.moveTo(br,br+i*cl);ctx.lineTo(br+(sz-1)*cl,br+i*cl);ctx.stroke();ctx.beginPath();ctx.moveTo(br+i*cl,br);ctx.lineTo(br+i*cl,br+(sz-1)*cl);ctx.stroke()}
    ctx.fillStyle='rgba(255,255,255,0.3)';
    [[3,3],[3,7],[3,11],[7,3],[7,7],[7,11],[11,3],[11,7],[11,11]].forEach(function(p){ctx.beginPath();ctx.arc(br+p[0]*cl,br+p[1]*cl,2.5,0,Math.PI*2);ctx.fill()});
    for(var y=0;y<sz;y++)for(var x=0;x<sz;x++){if(!bd[y][x])continue;var cx=br+x*cl,cy=br+y*cl,r=cl*0.42;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);var g=ctx.createRadialGradient(cx-r*0.3,cy-r*0.3,r*0.1,cx,cy,r);if(bd[y][x]===1){g.addColorStop(0,'#333');g.addColorStop(1,'#000')}else{g.addColorStop(0,'#fff');g.addColorStop(1,'#aaa')}ctx.fillStyle=g;ctx.fill()}
    if(lm){var lx=br+lm.x*cl,ly=br+lm.y*cl;ctx.strokeStyle='#FFD700';ctx.lineWidth=2;ctx.beginPath();ctx.arc(lx,ly,cl*0.44,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1}
  }
}

/* ===== 2048 ===== */
function init_2048() {
  document.getElementById('game-title').textContent = '2048';
  var el=document.getElementById('game-container');
  el.innerHTML='<style>.g2048{display:inline-grid;grid-template-columns:repeat(4,65px);gap:6px;padding:10px;background:var(--bg-glass);border-radius:var(--radius-lg)}.gcell{width:65px;height:65px;border-radius:8px;background:rgba(255,255,255,0.03);display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:700}</style><div><div style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center"><span class="font-medium">分数: <b id="s2048">0</b></span><button class="btn btn-glass btn-sm" onclick="init_2048()">新游戏</button></div><div class="g2048" id="g2048"></div></div>';
  var board=[],score=0;
  function empty(){var r=[];for(var y=0;y<4;y++)for(var x=0;x<4;x++)if(!board[y][x])r.push([y,x]);return r}
  function add(){var e=empty();if(!e.length)return;var p=e[Math.floor(Math.random()*e.length)];board[p[0]][p[1]]=Math.random()<0.9?2:4}
  function draw(){var h='';for(var y=0;y<4;y++)for(var x=0;x<4;x++){var v=board[y][x];var c=v===0?'':(v<8?'rgba(255,255,255,0.08)':v<64?'rgba(0,120,212,0.3)':v<512?'rgba(0,120,212,0.5)':'rgba(0,120,212,0.7)');h+='<div class="gcell" style="background:'+c+'">'+(v||'')+'</div>'}document.getElementById('g2048').innerHTML=h;document.getElementById('s2048').textContent=score}
  function move(dir){var moved=false;function slide(row){var a=row.filter(function(v){return v});while(a.length<4)a.push(0);for(var i=0;i<3;i++){if(a[i]&&a[i]===a[i+1]){a[i]*=2;score+=a[i];a[i+1]=0;i++}}a=a.filter(function(v){return v});while(a.length<4)a.push(0);return a}var lines=[];for(var i=0;i<4;i++){var r=[];for(var j=0;j<4;j++){var y=dir===0?i:dir===2?3-i:j,x=dir===1?j:dir===3?3-j:dir===0?j:i;r.push(board[y][x])}var s=slide(r);for(var j=0;j<4;j++){var y=dir===0?i:dir===2?3-i:j,x=dir===1?j:dir===3?3-j:dir===0?j:i;if(board[y][x]!==s[j])moved=true;board[y][x]=s[j]}}return moved}
  function start(){board=[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];score=0;add();add();draw()}
  document.addEventListener('keydown',function k(e){if(_gameActive!=='2048')return;var d={ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3}[e.key];if(d===undefined)return;e.preventDefault();if(move(d)){add();draw();if(!empty().length){var over=true;for(var y=0;y<4;y++)for(var x=0;x<3;x++)if(board[y][x]===board[y][x+1]||(y<3&&board[y][x]===board[y+1][x]))over=false;if(over)toast('游戏结束! '+score+'分','info')}}});
  start();
}

/* ===== Snake ===== */
function init_snake() {
  document.getElementById('game-title').textContent = '贪吃蛇';
  var el=document.getElementById('game-container');
  el.innerHTML='<div><div style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center"><span class="font-medium">分数: <b id="sn-score">0</b></span><button class="btn btn-glass btn-sm" onclick="init_snake()">新游戏</button></div><canvas id="sn-canvas" width="400" height="400" style="border-radius:var(--radius-lg);background:var(--bg-glass)"></canvas></div>';
  var c=document.getElementById('sn-canvas'),ctx=c.getContext('2d');
  var s=20,u=3,d='right',snake=[{x:10,y:10}],food={},score=0,loop;
  function place(){food={x:Math.floor(Math.random()*20),y:Math.floor(Math.random()*20)}}
  place();
  function tick(){var h=snake[0],nx=h.x+(d==='right'?1:d==='left'?-1:0),ny=h.y+(d==='down'?1:d==='up'?-1:0);if(nx<0||nx>=20||ny<0||ny>=20||snake.some(function(p){return p.x===nx&&p.y===ny})){clearInterval(loop);toast('游戏结束! '+score+'分','info');return}snake.unshift({x:nx,y:ny});if(nx===food.x&&ny===food.y){score+=10;document.getElementById('sn-score').textContent=score;place()}else{snake.pop()}ctx.fillStyle='#0a0a0a';ctx.fillRect(0,0,400,400);ctx.fillStyle='#CF222E';ctx.fillRect(food.x*20,food.y*20,18,18);ctx.fillStyle='#1A7F37';snake.forEach(function(p,i){var a=i===0?1:0.6;ctx.globalAlpha=a;ctx.fillRect(p.x*20,p.y*20,18,18)});ctx.globalAlpha=1}
  document.addEventListener('keydown',function kk(e){if(_gameActive!=='snake')return;var nd={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[e.key];if(!nd)return;e.preventDefault();if((d==='up'&&nd==='down')||(d==='down'&&nd==='up')||(d==='left'&&nd==='right')||(d==='right'&&nd==='left'))return;d=nd});
  loop=setInterval(tick,150);
}

/* ===== Minesweeper ===== */
function init_minesweeper() {
  document.getElementById('game-title').textContent = '扫雷';
  var R=9,C=9,M=10,board=[],revealed=[],flagged=[];
  function reset(){board=Array.from({length:R},function(){return Array(C).fill(0)});revealed=Array.from({length:R},function(){return Array(C).fill(false)});flagged=Array.from({length:R},function(){return Array(C).fill(false)});var placed=0;while(placed<M){var r=Math.floor(Math.random()*R),c=Math.floor(Math.random()*C);if(board[r][c]!==-1){board[r][c]=-1;placed++}}for(var r=0;r<R;r++)for(var c=0;c<C;c++){if(board[r][c]===-1)continue;var cnt=0;for(var dr=-1;dr<=1;dr++)for(var dc=-1;dc<=1;dc++){var nr=r+dr,nc=c+dc;if(nr>=0&&nr<R&&nc>=0&&nc<C&&board[nr][nc]===-1)cnt++}board[r][c]=cnt}}
  function reveal(r,c){if(r<0||r>=R||c<0||c>=C||revealed[r][c]||flagged[r][c])return;revealed[r][c]=true;if(board[r][c]===-1){draw(true);return}if(board[r][c]===0){for(var dr=-1;dr<=1;dr++)for(var dc=-1;dc<=1;dc++)reveal(r+dr,c+dc)}}
  function checkWin(){for(var r=0;r<R;r++)for(var c=0;c<C;c++)if(board[r][c]!==-1&&!revealed[r][c])return false;return true}
  function draw(dead){
    var h = '<div style="display:inline-grid;grid-template-columns:repeat(' + C + ',34px);gap:2px">';
    for (var r = 0; r < R; r++) {
      for (var c = 0; c < C; c++) {
        var cls = 'gcell', txt = '', bg = '';
        if (revealed[r][c]) {
          if (board[r][c] === -1) {
            bg = '#CF222E';
            txt = '💣';
          } else {
            txt = board[r][c] || '';
            bg = 'rgba(255,255,255,0.06)';
            var cols = ['', '#0078D4', '#1A7F37', '#CF222E', '#8250DF', '#BF7B00', '#00C6FF', '#333', '#888'];
            if (board[r][c]) {
              cls += '" style="color:' + cols[board[r][c]];
            }
          }
        } else if (flagged[r][c]) {
          txt = '🚩';
          bg = 'rgba(255,255,255,0.04)';
        }
        if (dead && board[r][c] === -1 && !flagged[r][c]) {
          txt = '💣';
          bg = 'rgba(255,255,255,0.06)';
        }
        var style = 'width:34px;height:34px;cursor:pointer;font-size:0.85rem;background:' + (bg || 'rgba(255,255,255,0.03)');
        h += '<div class="' + cls + '" style="' + style + '" onclick="msClick(' + r + ',' + c + ')" oncontextmenu="msFlag(' + r + ',' + c + ');return false">' + txt + '</div>';
      }
    }
    h += '</div>';
    document.getElementById('ms-grid').innerHTML = h;
  }
  reset();window.msClick=function(r,c){if(board[r][c]===-1){revealed[r][c]=true;draw(true);setTimeout(function(){toast('踩雷了!','error')},100);return}reveal(r,c);draw(false);if(checkWin()){toast('你赢了!','success');revealed=Array.from({length:R},function(){return Array(C).fill(true)});draw(false)}};
  window.msFlag=function(r,c){if(!revealed[r][c]){flagged[r][c]=!flagged[r][c];draw(false)}};
  var el=document.getElementById('game-container');
  el.innerHTML='<div><div style="margin-bottom:8px"><button class="btn btn-glass btn-sm" onclick="init_minesweeper()">新游戏</button></div><div id="ms-grid"></div></div>';
  draw(false);
}

/* ===== Sudoku ===== */
function init_sudoku() {
  document.getElementById('game-title').textContent = '数独';
  var puzzle,board;
  function gen(){puzzle=[];board=Array.from({length:9},function(){return Array(9).fill(0)});var base=[1,2,3,4,5,6,7,8,9];for(var r=0;r<9;r++){var shift=(r%3)*3+Math.floor(r/3);for(var c=0;c<9;c++)board[r][c]=base[(c+shift)%9]}for(var i=0;i<3;i++){var br=Math.floor(Math.random()*3)*3;var a=Math.floor(Math.random()*3)*3,b=Math.floor(Math.random()*3)*3;if(a!==b){for(var c=0;c<9;c++){var t=board[br+a][c];board[br+a][c]=board[br+b][c];board[br+b][c]=t}}}puzzle=board.map(function(r){return r.map(function(v){return Math.random()<0.5?v:0})})}
  gen();
  function draw(){var h='<table style="border-collapse:collapse;margin:0 auto">';for(var r=0;r<9;r++){h+='<tr>';for(var c=0;c<9;c++){var v=puzzle[r][c],isG=v!==0;var br='',bb='';if(c%3===0&&c>0)br='border-left:2px solid var(--blue)';if(r%3===0&&r>0)bb='border-top:2px solid var(--blue)';h+='<td style="width:36px;height:36px;text-align:center;cursor:'+(isG?'default':'pointer')+';'+(isG?'font-weight:600':'color:var(--text-tertiary)')+';'+br+';'+bb+';border:1px solid var(--border-subtle)" onclick="sdClick('+r+','+c+')">'+(v||'')+'</td>'}h+='</tr>'}h+='</table>';document.getElementById('sd-grid').innerHTML=h}
  window.sdClick=function(r,c){if(puzzle[r][c]!==0)return;var v=prompt('输入数字 1-9:');if(!v)return;var n=parseInt(v);if(n<1||n>9)return;var valid=true;for(var i=0;i<9;i++){if(board[r][i]===n||board[i][c]===n)valid=false}var br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;for(var i=0;i<3;i++)for(var j=0;j<3;j++)if(board[br+i][bc+j]===n)valid=false;if(valid){puzzle[r][c]=n;board[r][c]=n;draw();var done=true;for(var i=0;i<9;i++)for(var j=0;j<9;j++)if(puzzle[i][j]===0)done=false;if(done)toast('数独完成!','success')}else{toast('数字冲突!','error');puzzle[r][c]=0}};
  var el=document.getElementById('game-container');
  el.innerHTML='<div><div style="margin-bottom:8px"><button class="btn btn-glass btn-sm" onclick="init_sudoku()">新游戏</button></div><div id="sd-grid"></div></div>';
  draw();
}

/* ===== Gomoku AI — 4 difficulty levels, fullscreen ===== */
var _gomokuDifficulty = 'medium';

function init_gomoku() {
  var el = document.getElementById('game-container');
  el.innerHTML = '';
  el.style.cssText = 'display:flex;flex-direction:column;align-items:center';

  var title = document.createElement('h3');
  title.textContent = '选择难度';
  title.style.cssText = 'font-size:1.1rem;font-weight:600;margin-bottom:16px';
  el.appendChild(title);

  var diffs = [
    { id: 'easy',   name: '简单', desc: '连子计数 + 随机扰动',      color: '#1A7F37' },
    { id: 'medium', name: '中等', desc: '完整棋型库 · 活四冲四识别', color: '#BF7B00' },
    { id: 'hard',   name: '困难', desc: 'Minimax 深度2 · Alpha-Beta', color: '#CF222E' },
    { id: 'master', name: '大师', desc: '深度4 · 25候选剪枝 · 无解', color: '#8250DF' }
  ];

  diffs.forEach(function(d){
    var card = document.createElement('div');
    card.className = 'card-glass';
    card.style.cssText = 'width:340px;max-width:100%;padding:16px 20px;margin-bottom:10px;cursor:pointer;display:flex;align-items:center;gap:14px;transition:all 0.25s var(--jelly-soft)';
    card.onmouseenter = function(){ card.style.boxShadow = '0 0 0 2px ' + d.color + ', var(--shadow-07)'; card.style.transform = 'translateX(4px)'; };
    card.onmouseleave = function(){ card.style.boxShadow = ''; card.style.transform = ''; };
    card.onclick = function(){ startGomokuRound(d.id); };
    card.innerHTML = '<div style="width:40px;height:40px;border-radius:50%;background:'+d.color+';display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.2rem;flex-shrink:0"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><circle cx="12" cy="12" r="9"/></svg></div>'
      + '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:0.95rem">'+d.name+'</div><div class="text-xs text-secondary">'+d.desc+'</div></div>'
      + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="'+d.color+'" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>';
    el.appendChild(card);
  });
}

function startGomokuRound(diff) {
  _gomokuDifficulty = diff;

  /* Fullscreen overlay */
  var overlay = document.createElement('div');
  overlay.id = 'gomoku-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center';
  document.body.appendChild(overlay);

  var SZ = 15, CELL = 34, B = 5;
  var CW = CELL * SZ + 10;
  var board = [], turn = 1, gameOver = false, lastMove = null;

  /* Header bar */
  var header = document.createElement('div');
  header.style.cssText = 'position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;z-index:10';
  header.innerHTML = '<button id="gmk-back" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);color:#ccc;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:0.85rem">← 返回</button>'
    + '<span style="color:#ccc;font-weight:500">五子棋 · '+(diff==='easy'?'简单':diff==='medium'?'中等':diff==='hard'?'困难':'大师')+'</span>'
    + '<button id="gmk-reset" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);color:#ccc;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:0.85rem">新游戏</button>';
  overlay.appendChild(header);

  /* Status */
  var status = document.createElement('div');
  status.style.cssText = 'color:#ccc;font-weight:500;font-size:0.95rem;text-align:center;margin-bottom:8px;min-height:24px';
  status.textContent = '你的回合 · 执白';
  overlay.appendChild(status);

  /* Canvas */
  var canvas = document.createElement('canvas');
  canvas.width = CW; canvas.height = CW;
  canvas.style.cssText = 'border-radius:8px;background:#1a1a1a;cursor:pointer;max-width:98vw;max-height:calc(100vh - 180px)';
  overlay.appendChild(canvas);

  /* Buttons */
  overlay.appendChild(header);
  overlay.appendChild(status);
  overlay.appendChild(canvas);

  document.getElementById('gmk-back').onclick = function(){ document.body.removeChild(overlay); _gameActive = null; };
  document.getElementById('gmk-reset').onclick = function(){ initBoard(); };

  /* ===== Drawing ===== */
  function drawBoard() {
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, CW, CW);
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    for (var i = 0; i < SZ; i++) {
      ctx.beginPath(); ctx.moveTo(B, B + i * CELL); ctx.lineTo(B + (SZ - 1) * CELL, B + i * CELL); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(B + i * CELL, B); ctx.lineTo(B + i * CELL, B + (SZ - 1) * CELL); ctx.stroke();
    }
    var stars = [[3,3],[3,7],[3,11],[7,3],[7,7],[7,11],[11,3],[11,7],[11,11]];
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    stars.forEach(function(p){ ctx.beginPath(); ctx.arc(B + p[0] * CELL, B + p[1] * CELL, 2.5, 0, Math.PI * 2); ctx.fill(); });

    for (var y = 0; y < SZ; y++) for (var x = 0; x < SZ; x++) {
      if (!board[y][x]) continue;
      var cx = B + x * CELL, cy = B + y * CELL, r = CELL * 0.42;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      var g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
      if (board[y][x] === 1) { g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#aaaaaa'); }
      else { g.addColorStop(0, '#333333'); g.addColorStop(1, '#000000'); }
      ctx.fillStyle = g; ctx.fill();
    }
    if (lastMove) {
      var lx = B + lastMove.x * CELL, ly = B + lastMove.y * CELL;
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(lx, ly, CELL * 0.44, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  function checkWin(bx, by) {
    var me = board[by][bx], dirs = [[1,0],[0,1],[1,1],[1,-1]];
    for (var d = 0; d < 4; d++) {
      var cnt = 1;
      for (var s = 1; s < 5; s++) { var nx = bx + dirs[d][0] * s, ny = by + dirs[d][1] * s; if (nx >= 0 && nx < SZ && ny >= 0 && ny < SZ && board[ny][nx] === me) cnt++; else break; }
      for (var s = 1; s < 5; s++) { var nx = bx - dirs[d][0] * s, ny = by - dirs[d][1] * s; if (nx >= 0 && nx < SZ && ny >= 0 && ny < SZ && board[ny][nx] === me) cnt++; else break; }
      if (cnt >= 5) return true;
    }
    return false;
  }

  /* ===== AI ===== */
  var DIRS = [[1,0],[0,1],[1,1],[1,-1]];
  var FIVE = 7, L4 = 6, S4 = 5, L3 = 4, S3 = 3, L2 = 2, S2 = 1;
  var posScore = [];
  for (var y = 0; y < SZ; y++) { posScore[y] = []; for (var x = 0; x < SZ; x++) { var c2 = SZ / 2 - 1; posScore[y][x] = SZ - Math.max(Math.abs(x - c2), Math.abs(y - c2)); } }

  /* Candidate moves near existing stones */
  function getCandidates(r) {
    r = r || 2; var near = [];
    for (var y = 0; y < SZ; y++) { near[y] = []; for (var x = 0; x < SZ; x++) near[y][x] = false; }
    var found = false;
    for (var y = 0; y < SZ; y++) for (var x = 0; x < SZ; x++) {
      if (board[y][x] !== 0) { found = true;
        for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
          var ny = y + dy, nx = x + dx;
          if (nx >= 0 && nx < SZ && ny >= 0 && ny < SZ && board[ny][nx] === 0) near[ny][nx] = true;
        }
      }
    }
    if (!found) return [[7, 7]];
    var out = [];
    for (var y = 0; y < SZ; y++) for (var x = 0; x < SZ; x++) { if (near[y][x]) out.push([x, y]); }
    return out;
  }

  /* Evaluate engine — positive = AI advantage */
  var evR = [], evC = [[], []];
  for (var y = 0; y < SZ; y++) { evR[y] = []; for (var x = 0; x < SZ; x++) evR[y][x] = [0,0,0,0]; }
  for (var c = 0; c < 2; c++) { evC[c] = []; for (var i = 0; i < 8; i++) evC[c][i] = 0; }

  function getLine(bx, by, di, you) {
    var l = Array(9).fill(you);
    var tx = bx - 5 * DIRS[di][0], ty = by - 5 * DIRS[di][1];
    for (var i = 0; i < 9; i++) { tx += DIRS[di][0]; ty += DIRS[di][1]; if (tx >= 0 && tx < SZ && ty >= 0 && ty < SZ) l[i] = board[ty][tx]; }
    return l;
  }
  function sR(bx, by, l, r, di) {
    var tx = bx + (-5 + l) * DIRS[di][0], ty = by + (-5 + l) * DIRS[di][1];
    for (var i = l; i < r; i++) { tx += DIRS[di][0]; ty += DIRS[di][1]; if (ty >= 0 && ty < SZ && tx >= 0 && tx < SZ) evR[ty][tx][di] = 1; }
  }
  function aL(bx, by, di, me, you, cnt) {
    var line = getLine(bx, by, di, you);
    var li = 4, ri = 4;
    while (ri < 8 && line[ri + 1] === me) ri++;
    while (li > 0 && line[li - 1] === me) li--;
    var lr = li, rr = ri;
    while (rr < 8 && line[rr + 1] !== you) rr++;
    while (lr > 0 && line[lr - 1] !== you) lr--;
    var range = rr - lr + 1;
    if (range < 5) { sR(bx, by, lr, rr, di); return; }
    sR(bx, by, li, ri, di);
    var mR = ri - li + 1;
    if (mR === 5) { cnt[FIVE]++; return; }
    if (mR === 4) { cnt[line[li - 1] === 0 && line[ri + 1] === 0 ? L4 : S4]++; return; }
    if (mR === 3) {
      var le = line[li - 1] === 0, re = line[ri + 1] === 0;
      if (le && re) { if (range > 5) cnt[L3]++; else cnt[S3]++; }
      else if (le || re) { cnt[S3]++; }
      return;
    }
    if (mR === 2) {
      var le = line[li - 1] === 0, re = line[ri + 1] === 0, l2 = line[li - 2] === me, r2 = line[ri + 2] === me;
      var l3 = false, r3 = false;
      if (le && l2) { sR(bx, by, li - 2, li - 1, di); if (line[li - 3] === 0) { if (re) cnt[L3]++; else cnt[S3]++; l3 = true; } else if (line[li - 3] === you && re) { cnt[S3]++; l3 = true; } }
      if (re && r2) { if (line[ri + 3] === me) { sR(bx, by, ri + 1, ri + 2, di); cnt[S4]++; r3 = true; } else if (line[ri + 3] === 0) { if (le) cnt[L3]++; else cnt[S3]++; r3 = true; } else if (le) { cnt[S3]++; r3 = true; } }
      if (l3 || r3) return;
      if (le && re) cnt[L2]++; else if (le || re) cnt[S2]++;
      return;
    }
    if (mR === 1) {
      var le = line[li - 1] === 0, re = line[ri + 1] === 0;
      if (le && line[li - 2] === me && line[li - 3] === 0 && line[ri + 1] === you) cnt[S2]++;
      if (re && line[ri + 2] === me && line[ri + 3] === 0) { if (le) cnt[L2]++; else cnt[S2]++; }
    }
  }

  function fullEvaluate() {
    for (var c = 0; c < 2; c++) for (var i = 0; i < 8; i++) evC[c][i] = 0;
    for (var y = 0; y < SZ; y++) for (var x = 0; x < SZ; x++) evR[y][x] = [0,0,0,0];
    for (var y = 0; y < SZ; y++) for (var x = 0; x < SZ; x++) {
      if (board[y][x] === 0) continue;
      for (var d = 0; d < 4; d++) {
        if (evR[y][x][d]) continue;
        var me = board[y][x];
        aL(x, y, d, me, me === 1 ? 2 : 1, evC[me - 1]);
      }
    }
    /* FIX: positive = AI advantage, negative = player advantage */
    /* evC[1]=AI, evC[0]=player */
    if (evC[1][FIVE]) return 100000;
    if (evC[0][FIVE]) return -100000;
    var my = evC[1], yr = evC[0];
    if (yr[L4]) return -9050; if (yr[S4]) return -9040; if (my[L4]) return 9030;
    if (my[S4] && my[L3]) return 9020;
    if (yr[L3] && my[S4] === 0) return -9010;
    if (my[L3] > 1 && yr[L3] === 0 && yr[S3] === 0) return 9000;
    var ms = 0, os = 0;
    if (my[S4]) ms += 2000;
    if (my[L3] > 1) ms += 500; else if (my[L3] > 0) ms += 100;
    if (yr[L3] > 1) os += 2000; else if (yr[L3] > 0) os += 400;
    if (my[S3]) ms += my[S3] * 10; if (yr[S3]) os += yr[S3] * 10;
    if (my[L2]) ms += my[L2] * 4; if (yr[L2]) os += yr[L2] * 4;
    if (my[S2]) ms += my[S2] * 4; if (yr[S2]) os += yr[S2] * 4;
    return ms - os;
  }

  /* Easy: simple count */
  function simpleEvaluate() {
    var best = -Infinity, bx = 7, by = 7;
    for (var y = 0; y < SZ; y++) for (var x = 0; x < SZ; x++) {
      if (board[y][x] !== 0) continue;
      var atk = 0, def = 0;
      for (var d = 0; d < 4; d++) {
        var a = 0;
        for (var s = 1; s <= 4; s++) { var nx = x + DIRS[d][0] * s, ny = y + DIRS[d][1] * s; if (nx >= 0 && nx < SZ && ny >= 0 && ny < SZ && board[ny][nx] === 2) a++; else break; }
        for (var s = 1; s <= 4; s++) { var nx = x - DIRS[d][0] * s, ny = y - DIRS[d][1] * s; if (nx >= 0 && nx < SZ && ny >= 0 && ny < SZ && board[ny][nx] === 2) a++; else break; }
        atk += a * a;
        var dd = 0;
        for (var s = 1; s <= 4; s++) { var nx = x + DIRS[d][0] * s, ny = y + DIRS[d][1] * s; if (nx >= 0 && nx < SZ && ny >= 0 && ny < SZ && board[ny][nx] === 1) dd++; else break; }
        for (var s = 1; s <= 4; s++) { var nx = x - DIRS[d][0] * s, ny = y - DIRS[d][1] * s; if (nx >= 0 && nx < SZ && ny >= 0 && ny < SZ && board[ny][nx] === 1) dd++; else break; }
        def += dd >= 3 ? 100 : dd >= 2 ? 20 : dd;
      }
      var cx = SZ / 2 - 1, center = SZ - Math.max(Math.abs(x - cx), Math.abs(y - cx));
      var sc = Math.max(atk * 10, def * 1.2) + center * 0.5 + Math.random() * 2;
      if (sc > best) { best = sc; bx = x; by = y; }
    }
    return [bx, by];
  }

  /* Minimax with Alpha-Beta — threat-aware */
  var MAX_D = (diff === 'master' ? 4 : 2);

  /* Threat score for candidate sorting — GAP-AWARE */
  function threatScore(x, y) {
    var sc = 0;
    for (var d = 0; d < 4; d++) {
      var dx = DIRS[d][0], dy = DIRS[d][1];
      /* Build a 9-cell window: candidates position at index 4 */
      var w = [0,0,0,0,0,0,0,0,0];
      for (var s = -4; s <= 4; s++) {
        var nx = x + dx * s, ny = y + dy * s;
        w[s + 4] = (nx >= 0 && nx < SZ && ny >= 0 && ny < SZ) ? board[ny][nx] : -1;
      }
      /* Consecutive counting from center */
      var meL = 0, meR = 0, yrL = 0, yrR = 0;
      for (var s = 1; s <= 4; s++) { if (w[4 + s] === 2) meR++; else break; }
      for (var s = 1; s <= 4; s++) { if (w[4 - s] === 2) meL++; else break; }
      for (var s = 1; s <= 4; s++) { if (w[4 + s] === 1) yrR++; else break; }
      for (var s = 1; s <= 4; s++) { if (w[4 - s] === 1) yrL++; else break; }
      sc += (meL + meR) * 50 + (yrL + yrR) * 30;

      /* SWEEP: 5-cell sliding windows — catches X_X_X, XX_XX, etc. */
      for (var start = 0; start <= 4; start++) {
        var pCnt = 0, aCnt = 0, emptySlots = 0;
        for (var i = 0; i < 5; i++) {
          if (w[start + i] === 1) pCnt++;
          else if (w[start + i] === 2) aCnt++;
          else if (w[start + i] === 0) emptySlots++;
        }
        if (pCnt >= 4) return 1000001;
        if (pCnt === 3 && aCnt === 0) sc += 80000;
        if (pCnt === 2 && aCnt === 0 && emptySlots === 3) sc += 500;
        if (aCnt >= 4) sc += 500000;
        if (aCnt === 3 && pCnt === 0) sc += 40000;
        if (aCnt === 2 && pCnt === 0 && emptySlots === 3) sc += 300;
      }
    }
    return sc;
  }

  function sortCandidates(cands, limit) {
    for (var i = 0; i < cands.length; i++) cands[i].push(threatScore(cands[i][0], cands[i][1]));
    cands.sort(function(a, b) { return b[2] - a[2] || posScore[b[1]][b[0]] - posScore[a[1]][a[0]]; });
    if (limit && cands.length > limit) cands = cands.slice(0, limit);
    return cands;
  }

  function minimax(depth, alpha, beta, maxi) {
    if (depth === 0) {
      var ev = fullEvaluate();
      if (ev >= 100000) return ev + depth; if (ev <= -100000) return ev - depth;
      return ev;
    }
    var cands = getCandidates(2);
    cands = sortCandidates(cands, 50);
    if (maxi) {
      var best = -Infinity;
      for (var i = 0; i < cands.length; i++) {
        var x = cands[i][0], y = cands[i][1];
        if (board[y][x] !== 0) continue;
        board[y][x] = 2;
        var v = minimax(depth - 1, alpha, beta, false);
        board[y][x] = 0;
        if (v > best) best = v;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
      }
      return best;
    } else {
      var best = Infinity;
      for (var i = 0; i < cands.length; i++) {
        var x = cands[i][0], y = cands[i][1];
        if (board[y][x] !== 0) continue;
        board[y][x] = 1;
        var v = minimax(depth - 1, alpha, beta, true);
        board[y][x] = 0;
        if (v < best) best = v;
        if (best < beta) beta = best;
        if (alpha >= beta) break;
      }
      return best;
    }
  }

  function aiThink() {
    if (gameOver) return;
    if (diff === 'easy') {
      var m = simpleEvaluate();
      if (!m) return;
      board[m[1]][m[0]] = 2;
      lastMove = { x: m[0], y: m[1] };
      drawBoard();
      if (checkWin(m[0], m[1])) { gameOver = true; status.textContent = 'AI 赢了'; toast('AI赢了!', 'error'); return; }
      turn = 1; status.textContent = '你的回合 · 执白';
    } else if (diff === 'hard' || diff === 'master') {
      var cands = getCandidates(3);
      if (cands.length === 0) return;
      cands = sortCandidates(cands, 50);
      var bestScore = -Infinity, bx = -1, by = -1;
      for (var i = 0; i < cands.length; i++) {
        var x = cands[i][0], y = cands[i][1];
        if (board[y][x] !== 0) continue;
        board[y][x] = 2;
        var v = minimax(MAX_D, -Infinity, Infinity, false);
        board[y][x] = 0;
        if (v > bestScore) { bestScore = v; bx = x; by = y; }
        if (bestScore >= 100000) break;
      }
      if (bx < 0) return;
      board[by][bx] = 2;
      lastMove = { x: bx, y: by };
      drawBoard();
      if (checkWin(bx, by)) { gameOver = true; status.textContent = 'AI 赢了'; toast('AI赢了!', 'error'); return; }
      turn = 1; status.textContent = '你的回合 · 执白';
    } else {
      /* Medium: single-layer fullEvaluate */
      var bestScore = -Infinity, bx = -1, by = -1;
      for (var y = 0; y < SZ; y++) for (var x = 0; x < SZ; x++) {
        if (board[y][x] !== 0) continue;
        board[y][x] = 2;
        var s = fullEvaluate() + posScore[y][x] * 0.1;
        board[y][x] = 0;
        if (s > bestScore) { bestScore = s; bx = x; by = y; }
      }
      if (bx < 0) return;
      board[by][bx] = 2;
      lastMove = { x: bx, y: by };
      drawBoard();
      if (checkWin(bx, by)) { gameOver = true; status.textContent = 'AI 赢了'; toast('AI赢了!', 'error'); return; }
      turn = 1; status.textContent = '你的回合 · 执白';
    }
  }

  canvas.addEventListener('click', function(e) {
    if (gameOver || turn !== 1) return;
    var rect = canvas.getBoundingClientRect();
    var scaleX = CW / rect.width;
    var scaleY = CW / rect.height;
    var mx = (e.clientX - rect.left) * scaleX;
    var my = (e.clientY - rect.top) * scaleY;
    var x = Math.round((mx - B) / CELL), y = Math.round((my - B) / CELL);
    if (x < 0 || x >= SZ || y < 0 || y >= SZ || board[y][x] !== 0) return;
    board[y][x] = 1; lastMove = { x: x, y: y }; drawBoard();
    if (checkWin(x, y)) { gameOver = true; status.textContent = '你赢了!'; toast('你赢了!', 'success'); return; }
    turn = 2; status.textContent = 'AI 思考中...';
    setTimeout(aiThink, diff === 'master' ? 50 : diff === 'hard' ? 80 : 150);
  });

  function initBoard() {
    board = Array.from({ length: SZ }, function() { return Array(SZ).fill(0); });
    turn = 1; gameOver = false; lastMove = null;
    status.textContent = '你的回合 · 执白';
    drawBoard();
  }
  initBoard();
}

/* ===== Tetris ===== */
function init_tetris() {
  document.getElementById('game-title').textContent = '俄罗斯方块';
  var el=document.getElementById('game-container');
  var COLS=10,ROWS=20,CS=28;
  var canvas=document.createElement('canvas');
  canvas.width=COLS*CS; canvas.height=ROWS*CS;
  canvas.style.cssText='border-radius:8px;background:#0a0a0a;border:2px solid rgba(255,255,255,0.06)';
  el.innerHTML='';
  var wrap=document.createElement('div'); wrap.style.cssText='display:flex;flex-direction:column;align-items:center;gap:8px';
  var scoreEl=document.createElement('div'); scoreEl.style.cssText='font-weight:500'; scoreEl.textContent='分数: 0';
  var btn=document.createElement('button'); btn.className='btn btn-glass btn-sm'; btn.textContent='新游戏'; btn.onclick=init_tetris;
  wrap.appendChild(scoreEl); wrap.appendChild(btn); wrap.appendChild(canvas); el.appendChild(wrap);

  var board=[],piece=null,score=0,loop,gameOver=false;
  var shapes=[
    [[1,1,1,1]], [[1,1],[1,1]], [[0,1,0],[1,1,1]], [[1,0,0],[1,1,1]], [[0,0,1],[1,1,1]],
    [[1,1,0],[0,1,1]], [[0,1,1],[1,1,0]]
  ];
  var colors=['#00C6FF','#FFD700','#9B59B6','#1A7F37','#CF222E','#E67E22','#2980B9'];
  function newPiece(){
    var id=Math.floor(Math.random()*shapes.length);
    piece={shape:shapes[id],color:colors[id],x:Math.floor(COLS/2)-Math.floor(shapes[id][0].length/2),y:0};
    if(collide()){gameOver=true;clearInterval(loop);toast('游戏结束! '+score+'分','info')}
  }
  function collide(xOff,yOff,shape){
    shape=shape||piece.shape;
    for(var r=0;r<shape.length;r++)for(var c=0;c<shape[r].length;c++){
      if(!shape[r][c])continue;
      var nx=piece.x+c+(xOff||0), ny=piece.y+r+(yOff||0);
      if(nx<0||nx>=COLS||ny>=ROWS||(ny>=0&&board[ny][nx]))return true
    }
    return false
  }
  function lock(){for(var r=0;r<piece.shape.length;r++)for(var c=0;c<piece.shape[r].length;c++){if(!piece.shape[r][c])continue;var y=piece.y+r;if(y<0){gameOver=true;return}board[y][piece.x+c]=piece.color}clearLines();newPiece()}
  function clearLines(){var lines=0;for(var r=ROWS-1;r>=0;r--){if(board[r].every(function(v){return v})){board.splice(r,1);board.unshift(Array(COLS).fill(0));lines++;r++}}if(lines){score+=lines*100;scoreEl.textContent='分数: '+score}}
  function rotate(){var s=piece.shape,newS=s[0].map(function(_,i){return s.map(function(r){return r[i]}).reverse()});if(!collide(0,0,newS))piece.shape=newS}
  function move(dx,dy){if(!collide(dx,dy)){piece.x+=dx;piece.y+=dy}else if(dy===1){lock()}}

  function draw(){
    var ctx=canvas.getContext('2d');
    ctx.fillStyle='#0a0a0a'; ctx.fillRect(0,0,canvas.width,canvas.height);
    for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++){if(board[r][c]){ctx.fillStyle=board[r][c];ctx.fillRect(c*CS,r*CS,CS-1,CS-1)}}
    if(piece)for(var r=0;r<piece.shape.length;r++)for(var c=0;c<piece.shape[r].length;c++){if(!piece.shape[r][c])continue;ctx.fillStyle=piece.color;ctx.fillRect((piece.x+c)*CS,(piece.y+r)*CS,CS-1,CS-1)}
    ctx.strokeStyle='rgba(255,255,255,0.04)';
    for(var r=0;r<=ROWS;r++){ctx.beginPath();ctx.moveTo(0,r*CS);ctx.lineTo(COLS*CS,r*CS);ctx.stroke()}
    for(var c=0;c<=COLS;c++){ctx.beginPath();ctx.moveTo(c*CS,0);ctx.lineTo(c*CS,ROWS*CS);ctx.stroke()}
  }

  function start(){board=Array.from({length:ROWS},function(){return Array(COLS).fill(0)});score=0;gameOver=false;scoreEl.textContent='分数: 0';newPiece();if(loop)clearInterval(loop);loop=setInterval(function(){if(!gameOver){move(0,1);draw()}},400);draw()}

  document.addEventListener('keydown',function k(e){
    if(_gameActive!=='tetris'||gameOver)return;
    var act={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowDown:[0,1],ArrowUp:'rotate', ' ':function(){while(!collide(0,1))move(0,1)}}[e.key];
    if(!act)return; e.preventDefault();
    if(act==='rotate')rotate(); else if(typeof act==='function')act(); else move(act[0],act[1]);
    draw();
  });
  start();
}

/* ===== Breakout ===== */
function init_breakout() {
  document.getElementById('game-title').textContent = '打砖块';
  var el=document.getElementById('game-container');
  var W=480,H=400;
  var canvas=document.createElement('canvas');
  canvas.width=W; canvas.height=H;
  canvas.style.cssText='border-radius:8px;background:#0a0a0a;border:2px solid rgba(255,255,255,0.06);max-width:100%';
  el.innerHTML='';
  var wrap=document.createElement('div'); wrap.style.cssText='display:flex;flex-direction:column;align-items:center;gap:8px';
  var scoreEl=document.createElement('div'); scoreEl.style.cssText='font-weight:500'; scoreEl.textContent='分数: 0 命: 3';
  var btn=document.createElement('button'); btn.className='btn btn-glass btn-sm'; btn.textContent='新游戏'; btn.onclick=init_breakout;
  wrap.appendChild(scoreEl); wrap.appendChild(btn); wrap.appendChild(canvas); el.appendChild(wrap);

  var ctx=canvas.getContext('2d');
  var paddle={w:80,h:12,x:W/2-40,y:H-30},ball={x:W/2,y:H-50,r:6,dx:4,dy:-4};
  var bricks=[],score=0,lives=3,loop,gameOver=false;
  function genBricks(){bricks=[];for(var r=0;r<5;r++)for(var c=0;c<8;c++){bricks.push({x:c*60+2,y:r*22+40,w:56,h:18,alive:true,color:['#CF222E','#E67E22','#FFD700','#1A7F37','#0078D4'][r]})}}
  genBricks();

  function draw(){
    ctx.fillStyle='#0a0a0a'; ctx.fillRect(0,0,W,H);
    bricks.forEach(function(b){if(b.alive){ctx.fillStyle=b.color;ctx.fillRect(b.x,b.y,b.w,b.h)}});
    ctx.fillStyle='#0078D4'; ctx.fillRect(paddle.x,paddle.y,paddle.w,paddle.h);
    ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
  }

  function tick(){
    if(gameOver)return;
    ball.x+=ball.dx; ball.y+=ball.dy;
    if(ball.x-ball.r<0||ball.x+ball.r>W)ball.dx*=-1;
    if(ball.y-ball.r<0)ball.dy*=-1;
    if(ball.y+ball.r>H){lives--; scoreEl.textContent='分数: '+score+' 命: '+lives; if(lives<=0){gameOver=true;clearInterval(loop);toast('游戏结束! '+score+'分','info');return}ball.x=W/2;ball.y=H-50;ball.dx=4;ball.dy=-4}
    if(ball.y+ball.r>paddle.y&&ball.x>paddle.x&&ball.x<paddle.x+paddle.w&&ball.dy>0){ball.dy*=-1;ball.dx=(ball.x-paddle.x-paddle.w/2)*0.2}
    bricks.forEach(function(b){if(b.alive&&ball.x>b.x&&ball.x<b.x+b.w&&ball.y>b.y&&ball.y<b.y+b.h){b.alive=false;ball.dy*=-1;score+=10;scoreEl.textContent='分数: '+score+' 命: '+lives;if(bricks.every(function(bb){return!bb.alive})){genBricks();ball.dx*=1.05;ball.dy*=1.05}}});
    draw();
  }

  document.addEventListener('mousemove',function(e){if(_gameActive!=='breakout')return;var rect=canvas.getBoundingClientRect();paddle.x=e.clientX-rect.left-paddle.w/2;if(paddle.x<0)paddle.x=0;if(paddle.x>W-paddle.w)paddle.x=W-paddle.w});
  document.addEventListener('touchmove',function(e){if(_gameActive!=='breakout')return;var rect=canvas.getBoundingClientRect();paddle.x=e.touches[0].clientX-rect.left-paddle.w/2;if(paddle.x<0)paddle.x=0;if(paddle.x>W-paddle.w)paddle.x=W-paddle.w});

  loop=setInterval(tick,1000/60);
  draw();
}

/* ===== Pong ===== */
function init_pong() {
  document.getElementById('game-title').textContent = '乒乓球';
  var el=document.getElementById('game-container');
  var W=500,H=360;
  var canvas=document.createElement('canvas');
  canvas.width=W; canvas.height=H;
  canvas.style.cssText='border-radius:8px;background:#0a0a0a;border:2px solid rgba(255,255,255,0.06);max-width:100%';
  el.innerHTML='';
  var wrap=document.createElement('div'); wrap.style.cssText='display:flex;flex-direction:column;align-items:center;gap:8px';
  var scoreEl=document.createElement('div'); scoreEl.style.cssText='font-weight:500'; scoreEl.textContent='玩家: 0  AI: 0';
  var btn=document.createElement('button'); btn.className='btn btn-glass btn-sm'; btn.textContent='新游戏'; btn.onclick=init_pong;
  wrap.appendChild(scoreEl); wrap.appendChild(btn); wrap.appendChild(canvas); el.appendChild(wrap);

  var ctx=canvas.getContext('2d');
  var p1={y:H/2-50}, p2={y:H/2-50}, pw=10,ph=80;
  var ball={x:W/2,y:H/2,r:8,dx:4,dy:3};
  var s1=0,s2=0,loop,gameOver=false;

  function draw(){
    ctx.fillStyle='#0a0a0a'; ctx.fillRect(0,0,W,H);
    for(var i=0;i<H;i+=20){ctx.fillStyle='rgba(255,255,255,0.06)';ctx.fillRect(W/2-1,i,2,10)}
    ctx.fillStyle='#fff'; ctx.fillRect(10,p1.y,pw,ph); ctx.fillRect(W-10-pw,p2.y,pw,ph);
    ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
  }

  function tick(){
    ball.x+=ball.dx; ball.y+=ball.dy;
    if(ball.y-ball.r<0||ball.y+ball.r>H)ball.dy*=-1;
    if(ball.x-ball.r<20&&ball.y>p1.y&&ball.y<p1.y+ph){ball.dx*=-1.05;ball.dx=Math.min(ball.dx,8)}
    if(ball.x+ball.r>W-20&&ball.y>p2.y&&ball.y<p2.y+ph){ball.dx*=-1.05;ball.dx=Math.max(ball.dx,-8)}
    if(ball.x<0){s2++;scoreEl.textContent='玩家: '+s1+'  AI: '+s2;reset()}
    if(ball.x>W){s1++;scoreEl.textContent='玩家: '+s1+'  AI: '+s2;reset()}
    var target=ball.y-ph/2; p2.y+=(target-p2.y)*0.08;
    draw();
  }

  function reset(){ball.x=W/2;ball.y=H/2;ball.dx=(Math.random()>0.5?4:-4);ball.dy=(Math.random()-0.5)*6}

  document.addEventListener('mousemove',function(e){if(_gameActive!=='pong')return;var rect=canvas.getBoundingClientRect();p1.y=e.clientY-rect.top-ph/2;if(p1.y<0)p1.y=0;if(p1.y>H-ph)p1.y=H-ph});

  loop=setInterval(tick,1000/60);
  draw();
}
