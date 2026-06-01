var _gameActive = null;
var _gameTab = 'single';
var _multiInterval = null;
var _multiRoomId = null;
var _multiMyColor = null;
var _multiGameType = 'gomoku';
var _onlineHeartbeat = null;
var _sentInviteCheckInterval = null;
var DIRS = [[1,0],[0,1],[1,1],[1,-1]];

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
  startOnlineHeartbeat();
  return wrap;
}

function startOnlineHeartbeat() {
  if (_onlineHeartbeat) clearInterval(_onlineHeartbeat);
  API.post('/game/heartbeat').catch(function(){});
  _onlineHeartbeat = setInterval(function(){ API.post('/game/heartbeat').catch(function(){}); }, 15000);
}

function switchGameTab(tab) {
  _gameTab = tab;
  document.getElementById('gtab-single').style.cssText = 'border-radius:8px;background:'+(tab==='single'?'var(--blue)':'transparent')+';color:'+(tab==='single'?'#fff':'var(--text-secondary)')+';font-weight:600';
  document.getElementById('gtab-dual').style.cssText = 'border-radius:8px;background:'+(tab==='dual'?'var(--blue)':'transparent')+';color:'+(tab==='dual'?'#fff':'var(--text-secondary)')+';font-weight:600';
  if (_multiInterval) { clearInterval(_multiInterval); _multiInterval = null; }
  if (_sentInviteCheckInterval) { clearInterval(_sentInviteCheckInterval); _sentInviteCheckInterval = null; }
  API.post('/game/queue/cancel').catch(function(){});
  document.getElementById('game-tab-content').innerHTML = tab === 'single' ? renderSingleGames() : renderDualGames();
  if (tab === 'dual') initDualMode();
}

/* ============= ICONS ============= */
function iconGomoku(c){return '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="'+c+'" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5" fill="'+c+'"/></svg>';}
function icon2048(c){return '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="'+c+'" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="4"/><text x="12" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="'+c+'">2</text></svg>';}
function iconSnake(c){return '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="'+c+'" stroke-width="2" stroke-linecap="round"><path d="M4 18c0-3 4-3 4-6s-4-3-4-6 4-3 4-6"/><circle cx="14" cy="5" r="1.5" fill="'+c+'"/><circle cx="17" cy="9" r="1.5" fill="'+c+'"/><circle cx="16" cy="14" r="1.5" fill="'+c+'"/></svg>';}
function iconMinesweeper(c){return '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="'+c+'" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="13" r="3"/><line x1="12" y1="6" x2="12" y2="9"/></svg>';}
function iconSudoku(c){return '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="'+c+'" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="8" y1="2" x2="8" y2="22"/><line x1="14" y1="2" x2="14" y2="22"/><line x1="2" y1="8" x2="22" y2="8"/><line x1="2" y1="14" x2="22" y2="14"/></svg>';}
function iconTetris(c){return '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="'+c+'" stroke-width="1.5"><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="10" y="6" width="5" height="14" rx="1"/><rect x="15" y="3" width="6" height="5" rx="1"/></svg>';}
function iconBreakout(c){return '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="'+c+'" stroke-width="1.8"><rect x="3" y="3" width="18" height="5" rx="1"/><circle cx="12" cy="14" r="2.5"/><rect x="6" y="18" width="12" height="2.5" rx="1.2"/></svg>';}
function iconPong(c){return '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="'+c+'" stroke-width="1.8"><rect x="2" y="7" width="2.5" height="10" rx="1.2"/><rect x="19.5" y="7" width="2.5" height="10" rx="1.2"/><circle cx="12" cy="12" r="2" fill="'+c+'"/><line x1="12" y1="3" x2="12" y2="8" stroke-dasharray="1 1"/></svg>';}
function iconTicTacToe(c){return '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="'+c+'" stroke-width="1.6"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="9" y1="2" x2="9" y2="22"/><line x1="15" y1="2" x2="15" y2="22"/><line x1="2" y1="9" x2="22" y2="9"/><line x1="2" y1="15" x2="22" y2="15"/></svg>';}
function iconReversi(c){return '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="'+c+'" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><circle cx="8" cy="8" r="3" fill="'+c+'"/><circle cx="16" cy="16" r="3" fill="#fff"/><path d="M8 8 L12 12 L16 16" stroke="'+c+'" stroke-width="0.8" opacity="0.5"/></svg>';}

/* ============= SINGLE GAMES ============= */
function renderSingleGames() {
  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:10px';
  var svgs = {
    gomoku: iconGomoku('#BF7B00'), '2048': icon2048('#0078D4'), snake: iconSnake('#1A7F37'),
    minesweeper: iconMinesweeper('#CF222E'), sudoku: iconSudoku('#8250DF'), tetris: iconTetris('#BC4C2A'),
    breakout: iconBreakout('#D63384'), pong: iconPong('#00C6FF')
  };
  var games = [
    {id:'gomoku',name:'五子棋',desc:'AI对战 \u00B7 四档难度',color:'#BF7B00'},
    {id:'2048',name:'2048',desc:'合并数字挑战',color:'#0078D4'},
    {id:'snake',name:'贪吃蛇',desc:'经典贪吃蛇',color:'#1A7F37'},
    {id:'minesweeper',name:'扫雷',desc:'经典排雷',color:'#CF222E'},
    {id:'sudoku',name:'数独',desc:'9x9数字谜题',color:'#8250DF'},
    {id:'tetris',name:'俄罗斯方块',desc:'经典消除',color:'#BC4C2A'},
    {id:'breakout',name:'打砖块',desc:'弹球消除',color:'#D63384'},
    {id:'pong',name:'乒乓球',desc:'经典对打',color:'#00C6FF'}
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

/* ============= DUAL MODE ============= */
var DUAL_GAMES = [
  { id: 'gomoku',    name: '五子棋',   color: '#BF7B00', desc: '经典五子连珠', sz:15, cell:34, b:5 },
  { id: 'tictactoe', name: '井字棋',   color: '#0078D4', desc: '三连即胜',       sz:3,  cell:100, b:10 },
  { id: 'reversi',   name: '黑白棋',   color: '#8250DF', desc: '夹击翻棋',       sz:8,  cell:50, b:10 }
];

function renderDualGames() {
  var w = document.createElement('div');
  w.innerHTML = '<div id="dual-lobby"></div><div id="dual-game-area" style="display:none"></div>';
  return w.innerHTML;
}

function initDualMode() {
  var lobby = document.getElementById('dual-lobby');
  if (!lobby) return;
  _multiGameType = 'gomoku';
  lobby.innerHTML = '<div class="card-glass" style="padding:24px;text-align:center;max-width:680px;margin:0 auto">'
    + '<h3 style="font-size:1.1rem;font-weight:600;margin-bottom:16px">双人对战</h3>'
    + '<div style="display:flex;justify-content:center;gap:8px;margin-bottom:20px;flex-wrap:wrap" id="dual-game-select"></div>'
    + '<div style="display:flex;align-items:center;justify-content:center;gap:30px;margin-bottom:24px">'
    + '<div style="text-align:center"><div style="width:64px;height:64px;border-radius:50%;background-size:cover;background-position:center;margin:0 auto 8px;background-color:rgba(255,255,255,0.06);border:2px solid var(--blue);background-image:url('+avatarUrl(Store.user)+')"></div><div class="text-sm font-medium">'+escapeHtml(Store.user?.nickname||'')+' (你)</div></div>'
    + '<div style="font-size:2rem;color:var(--text-tertiary)">VS</div>'
    + '<div id="dual-opponent-slot" style="text-align:center"><div style="width:64px;height:64px;border-radius:50%;border:2px dashed rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;margin:0 auto 8px;cursor:pointer;transition:all 0.2s" id="dual-plus-btn" onclick="showDualInviteOptions()"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div><div class="text-xs text-secondary">选择对手</div></div>'
    + '</div><div id="dual-status" style="min-height:24px;margin-bottom:16px"></div><div id="dual-actions"></div></div>'
    + '<div id="dual-incoming" style="margin-top:12px"></div>';
  renderDualGameSelector();
  checkIncomingInvites();
  checkSentInviteStatus();
}

function renderDualGameSelector() {
  var sel = document.getElementById('dual-game-select');
  if (!sel) return;
  sel.innerHTML = DUAL_GAMES.map(function(g){
    var a = g.id === _multiGameType;
    return '<button class="btn btn-sm" style="border-radius:8px;background:'+(a?g.color:'transparent')+';color:'+(a?'#fff':'var(--text-secondary)')+';font-weight:600;border:1px solid '+(a?g.color:'var(--border-subtle)')+';padding:6px 14px;transition:all 0.25s var(--jelly-soft)" onclick="selectDualGame(\''+g.id+'\')">'+g.name+'</button>';
  }).join('');
}

function selectDualGame(gid) { _multiGameType = gid; renderDualGameSelector(); }

function checkIncomingInvites() {
  if (_multiInterval) clearInterval(_multiInterval);
  _multiInterval = setInterval(async function(){
    if (_gameTab !== 'dual' || _multiRoomId) return;
    try {
      var d = await API.get('/game/invites/pending');
      var invs = d.invites || [];
      var c = document.getElementById('dual-incoming');
      if (!c) return;
      if (invs.length === 0) { if (!c.querySelector('.invite-popup-card')) c.innerHTML = ''; return; }
      c.innerHTML = invs.map(function(inv){
        if (!inv.from) return '';
        var gi = DUAL_GAMES.find(function(g){return g.id===(inv.game_type||'gomoku');})||DUAL_GAMES[0];
        return '<div class="card-glass invite-popup-card" style="padding:16px 20px;display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;animation:fadeInUp 0.3s var(--jelly-soft);border-left:3px solid '+gi.color+'">'
          + '<div style="display:flex;align-items:center;gap:12px">'
          + '<div style="width:40px;height:40px;border-radius:50%;background-size:cover;background-position:center;background-color:rgba(255,255,255,0.06);background-image:url('+avatarUrl(inv.from)+')"></div>'
          + '<div><div class="text-sm font-medium">'+escapeHtml(inv.from.nickname||inv.from.username)+'</div>'
          + '<div class="text-xs text-secondary">邀请你对战 <span style="color:'+gi.color+';font-weight:600">'+gi.name+'</span></div></div></div>'
          + '<div style="display:flex;gap:8px">'
          + '<button class="btn btn-primary btn-sm" style="padding:6px 16px;font-size:0.8rem;border-radius:8px" onclick="acceptDualInvite('+inv.id+')">接受</button>'
          + '<button class="btn btn-glass btn-sm" style="padding:6px 16px;font-size:0.8rem;border-radius:8px" onclick="rejectDualInvite('+inv.id+')">拒绝</button></div></div>';
      }).join('');
    } catch(e){}
  }, 3000);
}

function checkSentInviteStatus() {
  if (_sentInviteCheckInterval) clearInterval(_sentInviteCheckInterval);
  _sentInviteCheckInterval = setInterval(async function(){
    if (_gameTab !== 'dual' || _multiRoomId) return;
    try {
      var d = await API.get('/game/invites/sent-status');
      var invs = d.invites || [];
      for (var i = 0; i < invs.length; i++) {
        if (invs[i].status === 'rejected') {
          var nm = (invs[i].to && (invs[i].to.nickname || invs[i].to.username)) || '对方';
          toast(nm + ' 拒绝了你的邀请', 'info');
          API.post('/game/queue/cancel').catch(function(){});
          initDualMode(); return;
        }
        if (invs[i].status === 'accepted') { findActiveRoom(); return; }
      }
    } catch(e){}
  }, 2000);
}

async function acceptDualInvite(id) {
  try { var d = await API.post('/game/invite/'+id+'/accept'); if(d.room){toast('加入对战!','success');dualStartGame(d.room);} }
  catch(e){toast(e.message,'error');}
}

async function rejectDualInvite(id) {
  try { await API.post('/game/invite/'+id+'/reject'); document.getElementById('dual-incoming').innerHTML=''; toast('已拒绝邀请','info'); }
  catch(e){}
}

function showDualInviteOptions() {
  var gs = DUAL_GAMES.map(function(g){return '<option value="'+g.id+'" '+(g.id===_multiGameType?'selected':'')+'>'+g.name+'</option>';}).join('');
  var h = '<div style="max-height:400px;overflow-y:auto">'
    + '<div class="text-sm font-medium mb-2">选择游戏</div>'
    + '<select id="dual-invite-game" class="input input-glass" style="margin-bottom:12px;width:100%">'+gs+'</select>'
    + '<div class="text-sm font-medium mb-2">在线好友</div>'
    + '<div id="dual-friend-list" style="margin-bottom:12px"><div class="text-xs text-secondary p-2">加载中...</div></div>'
    + '<div style="border-top:1px solid var(--border-subtle);padding-top:12px">'
    + '<div class="text-sm font-medium mb-2">随机匹配</div>'
    + '<button class="btn btn-primary btn-sm w-full" onclick="startRandomMatch()">寻找在线对手</button></div></div>';
  showModal('选择对手', h, null, null);
  loadFriendList();
}

async function loadFriendList() {
  try {
    var d = await API.get('/game/online-friends');
    var friends = d.friends || [];
    var list = document.getElementById('dual-friend-list');
    if (!list) return;
    var onl = friends.filter(function(f){return f.online;});
    var off = friends.filter(function(f){return !f.online;});
    if (friends.length === 0) { list.innerHTML = '<div class="text-xs text-secondary p-2">暂无好友，先去添加好友吧</div>'; return; }
    var html = '';
    onl.forEach(function(f){
      var dis = f.in_game ? 'style="opacity:0.4;pointer-events:none"' : 'style="cursor:pointer"';
      var tag = f.in_game ? '<span class="text-xs" style="color:#CF222E">对战中</span>' : '<span class="text-xs" style="color:#1A7F37">\u25CF 在线</span>';
      html += '<div class="card-glass" style="padding:10px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between" '+dis+' onclick="if(!'+f.in_game+')inviteFriend('+f.id+',\''+escapeHtml(f.nickname||f.username)+'\',\''+escapeHtml(avatarUrl(f))+'\')">'
        + '<div style="display:flex;align-items:center;gap:10px"><div style="width:36px;height:36px;border-radius:50%;background-size:cover;background-position:center;background-color:rgba(255,255,255,0.06);background-image:url('+avatarUrl(f)+')"></div>'
        + '<span class="text-sm font-medium">'+escapeHtml(f.nickname||f.username)+'</span></div>'+tag+'</div>';
    });
    if (off.length > 0) {
      html += '<div class="text-xs text-secondary mt-2 mb-1">离线好友</div>';
      off.forEach(function(f){
        html += '<div class="card-glass" style="padding:10px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;opacity:0.4">'
          + '<div style="display:flex;align-items:center;gap:10px"><div style="width:36px;height:36px;border-radius:50%;background-size:cover;background-position:center;background-color:rgba(255,255,255,0.06);background-image:url('+avatarUrl(f)+')"></div>'
          + '<span class="text-sm font-medium">'+escapeHtml(f.nickname||f.username)+'</span></div><span class="text-xs text-secondary">离线</span></div>';
      });
    }
    list.innerHTML = html;
  } catch(e){}
}

async function inviteFriend(uid, nm, av) {
  closeModal();
  var gs = document.getElementById('dual-invite-game');
  var gt = gs ? gs.value : _multiGameType;
  _multiGameType = gt;
  try {
    await API.post('/game/invite/' + uid, {game_type: gt});
    var gi = DUAL_GAMES.find(function(g){return g.id===gt;})||DUAL_GAMES[0];
    document.getElementById('dual-opponent-slot').innerHTML = '<div style="text-align:center"><div style="width:64px;height:64px;border-radius:50%;background-size:cover;background-position:center;margin:0 auto 8px;background-color:rgba(255,255,255,0.06);background-image:url('+escapeHtml(av)+')"></div><div class="text-sm font-medium">'+escapeHtml(nm)+'</div></div>';
    document.getElementById('dual-status').innerHTML = '<p class="text-sm" style="color:'+gi.color+'">等待 '+escapeHtml(nm)+' 接受 '+gi.name+' 邀请...</p>';
    document.getElementById('dual-actions').innerHTML = '<button class="btn btn-glass btn-sm" onclick="cancelInvite()">取消邀请</button>';
    toast('已向 '+escapeHtml(nm)+' 发送 '+gi.name+' 对战邀请', 'success');
  } catch(e){toast(e.message,'error');}
}

async function findActiveRoom() {
  try { var d = await API.get('/game/my-room'); if(d.room){toast('对战已开始!','success');dualStartGame(d.room);} }
  catch(e){}
}

function cancelInvite() { if(_sentInviteCheckInterval){clearInterval(_sentInviteCheckInterval);_sentInviteCheckInterval=null;} API.post('/game/queue/cancel').catch(function(){}); initDualMode(); }

async function startRandomMatch() {
  closeModal();
  try {
    var d = await API.get('/game/queue?game_type='+_multiGameType);
    if(d.room){ document.getElementById('dual-opponent-slot').innerHTML = '<div style="text-align:center"><div style="width:64px;height:64px;border-radius:50%;background-size:cover;background-position:center;margin:0 auto 8px;background-color:rgba(255,255,255,0.06);background-image:url('+avatarUrl(d.room.opponent)+')"></div><div class="text-sm font-medium">'+escapeHtml(d.room.opponent?.nickname||'')+'</div></div>'; toast('已匹配到对手!','success'); dualStartGame(d.room); return; }
    var gi = DUAL_GAMES.find(function(g){return g.id===_multiGameType;})||DUAL_GAMES[0];
    document.getElementById('dual-status').innerHTML = '<p class="text-sm" style="color:'+gi.color+'">匹配中... '+gi.name+'</p>';
    document.getElementById('dual-actions').innerHTML = '<button class="btn btn-glass btn-sm" onclick="cancelMatch()">取消匹配</button>';
    pollMatchStatus();
  } catch(e){toast(e.message,'error');}
}

function pollMatchStatus() {
  if(_multiInterval)clearInterval(_multiInterval);
  _multiInterval = setInterval(async function(){
    try {
      var d = await API.get('/game/queue/status');
      if(d.matched&&d.room){ clearInterval(_multiInterval);_multiInterval=null;
        document.getElementById('dual-opponent-slot').innerHTML = '<div style="text-align:center"><div style="width:64px;height:64px;border-radius:50%;background-size:cover;background-position:center;margin:0 auto 8px;background-color:rgba(255,255,255,0.06);background-image:url('+avatarUrl(d.room.opponent)+')"></div><div class="text-sm font-medium">'+escapeHtml(d.room.opponent?.nickname||'')+'</div></div>';
        document.getElementById('dual-status').innerHTML = '<p class="text-sm" style="color:#1A7F37">已匹配!</p>'; toast('已匹配到对手!','success');
        _multiGameType = d.room.game_type||'gomoku'; setTimeout(function(){dualStartGame(d.room);},500); }
    } catch(e){}
  }, 2000);
}

function cancelMatch() { clearInterval(_multiInterval); _multiInterval=null; API.post('/game/queue/cancel').catch(function(){}); initDualMode(); }

/* ============= DUAL GAME FULLSCREEN ============= */
function dualStartGame(room) {
  if(_multiInterval){clearInterval(_multiInterval);_multiInterval=null;}
  if(_sentInviteCheckInterval){clearInterval(_sentInviteCheckInterval);_sentInviteCheckInterval=null;}
  _multiRoomId = room.id; _multiMyColor = room.you_color||1; _multiGameType = room.game_type||'gomoku';
  var gi = DUAL_GAMES.find(function(g){return g.id===_multiGameType;})||DUAL_GAMES[0];
  _gameActive = 'multi-'+_multiGameType;
  var oppNm = room.opponent?(room.opponent.nickname||room.opponent.username):'对手';
  var SZ = gi.sz, CELL = gi.cell, B = gi.b;
  var CW = B*2+CELL*(SZ-1);

  var ov = document.createElement('div');
  ov.id='gomoku-overlay'; ov.style.cssText='position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.94);display:flex;flex-direction:column;align-items:center;justify-content:center';
  document.body.appendChild(ov);

  var hdr = document.createElement('div');
  hdr.style.cssText='position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;z-index:10';
  hdr.innerHTML = '<div style="color:#ccc;font-size:0.85rem">VS '+escapeHtml(oppNm)+'</div>'
    + '<span style="color:#ccc;font-weight:600;font-size:0.9rem">'+gi.name+' \u00B7 双人对战 ('+(_multiMyColor===1?'执黑先手':'执白后手')+')</span>'
    + '<button id="gmk-resign" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,80,80,0.3);color:#ef4444;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:0.85rem">认输</button>';
  ov.appendChild(hdr);

  var st = document.createElement('div');
  st.style.cssText='color:#ccc;font-weight:500;font-size:0.95rem;text-align:center;margin-bottom:8px;min-height:24px';
  st.textContent = _multiMyColor===1?'你的回合':'对手回合，等待中...';
  ov.appendChild(st);

  var cvs = document.createElement('canvas');
  cvs.width=CW; cvs.height=CW;
  cvs.style.cssText='border-radius:8px;background:#1a1a1a;cursor:pointer;max-width:98vw;max-height:calc(100vh-180px)';
  ov.appendChild(cvs);

  document.getElementById('gmk-resign').onclick = function(){
    API.post('/game/room/'+_multiRoomId+'/resign').catch(function(){});
    document.body.removeChild(ov); _gameActive=null;
    if(_multiInterval){clearInterval(_multiInterval);_multiInterval=null;} toast('你认输了','info');
  };

  var board = Array.from({length:SZ},function(){return Array(SZ).fill(0)});
  if(_multiGameType==='reversi'){board[3][3]=1;board[3][4]=2;board[4][3]=2;board[4][4]=1;}
  var gameOver=false, lastMove=null, isMyTurn=_multiMyColor===1;

  function drBd() {
    var ctx=cvs.getContext('2d'); ctx.fillStyle='#1a1a1a'; ctx.fillRect(0,0,CW,CW);
    if(_multiGameType==='reversi'){ drawRevBg(ctx,SZ,CELL,B); drawRevPcs(ctx,board,SZ,CELL,B); }
    else if(_multiGameType==='tictactoe'){ drawTttBg(ctx,SZ,CELL,B); drawTttPcs(ctx,board,SZ,CELL,B); }
    else { drawGmkBg(ctx,SZ,CELL,B); drawGmkPcs(ctx,board,SZ,CELL,B); }
    if(lastMove){ var lx=B+lastMove.x*CELL, ly=B+lastMove.y*CELL; ctx.strokeStyle='#FFD700';ctx.lineWidth=2;ctx.beginPath();ctx.arc(lx,ly,CELL*0.44,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1; }
  }

  function getXY(e){
    var r=cvs.getBoundingClientRect(); var sx=CW/r.width, sy=CW/r.height;
    var mx=(e.clientX-r.left)*sx, my=(e.clientY-r.top)*sy;
    if(_multiGameType==='reversi') return {x:Math.floor((mx-B)/CELL), y:Math.floor((my-B)/CELL)};
    return {x:Math.round((mx-B)/CELL), y:Math.round((my-B)/CELL)};
  }

  cvs.addEventListener('click',function(e){
    if(gameOver)return; if(!isMyTurn){toast('不是你的回合','error');return;}
    var p=getXY(e); var x=p.x, y=p.y;
    if(x<0||x>=SZ||y<0||y>=SZ)return;
    if(_multiGameType==='reversi'){ if(!isRevMove(board,x,y,_multiMyColor))return; }
    else { if(board[y][x]!==0)return; }
    isMyTurn=false;
    if(_multiGameType==='reversi') board=applyRevMove(board,x,y,_multiMyColor);
    else board[y][x]=_multiMyColor;
    lastMove={x:x,y:y}; drBd();
    API.post('/game/room/'+_multiRoomId+'/move',{x:x,y:y}).then(function(r){
      var rm=r.room; st.textContent='对手回合...';
      if(rm.status==='finished'){
        gameOver=true;
        if(rm.winner===0){st.textContent='平局!';toast('平局!','info');}
        else if(rm.winner==Store.user.id){st.textContent='你赢了!';toast('你赢了!','success');}
        else {st.textContent='你输了';toast('你输了','error');}
      }
    }).catch(function(e2){
      toast(e2.message,'error'); if(_multiGameType==='gomoku'||_multiGameType==='tictactoe')board[y][x]=0;
      lastMove=null;isMyTurn=true;drBd();
    });
  });
  drBd(); dualPollRoom(cvs,ov,board,st,SZ,CELL,B,CW,oppNm);
}

function drawGmkBg(c,SZ,CELL,B){c.strokeStyle='rgba(255,255,255,0.10)';for(var i=0;i<SZ;i++){c.beginPath();c.moveTo(B,B+i*CELL);c.lineTo(B+(SZ-1)*CELL,B+i*CELL);c.stroke();c.beginPath();c.moveTo(B+i*CELL,B);c.lineTo(B+i*CELL,B+(SZ-1)*CELL);c.stroke();}c.fillStyle='rgba(255,255,255,0.3)';[[3,3],[3,7],[3,11],[7,3],[7,7],[7,11],[11,3],[11,7],[11,11]].forEach(function(p){c.beginPath();c.arc(B+p[0]*CELL,B+p[1]*CELL,2.5,0,Math.PI*2);c.fill();});}
function drawGmkPcs(c,bd,SZ,CELL,B){for(var y=0;y<SZ;y++)for(var x=0;x<SZ;x++){if(!bd[y][x])continue;var cx=B+x*CELL,cy=B+y*CELL,r=CELL*0.42;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);var g=c.createRadialGradient(cx-r*0.3,cy-r*0.3,r*0.1,cx,cy,r);if(bd[y][x]===1){g.addColorStop(0,'#fff');g.addColorStop(1,'#aaa');}else{g.addColorStop(0,'#333');g.addColorStop(1,'#000');}c.fillStyle=g;c.fill();}}
function drawTttBg(c,SZ,CELL,B){c.strokeStyle='rgba(255,255,255,0.15)';for(var i=1;i<SZ;i++){c.beginPath();c.moveTo(B,B+i*CELL);c.lineTo(B+SZ*CELL,B+i*CELL);c.stroke();c.beginPath();c.moveTo(B+i*CELL,B);c.lineTo(B+i*CELL,B+SZ*CELL);c.stroke();}}
function drawTttPcs(c,bd,SZ,CELL,B){for(var y=0;y<SZ;y++)for(var x=0;x<SZ;x++){if(!bd[y][x])continue;var cx=B+x*CELL+CELL/2,cy=B+y*CELL+CELL/2,pad=CELL*0.18;c.lineWidth=3;if(bd[y][x]===1){c.strokeStyle='#fff';c.beginPath();c.arc(cx,cy,CELL/2-pad,0,Math.PI*2);c.stroke();}else{c.strokeStyle='#ff4444';c.beginPath();c.moveTo(cx-CELL/2+pad,cy-CELL/2+pad);c.lineTo(cx+CELL/2-pad,cy+CELL/2-pad);c.stroke();c.beginPath();c.moveTo(cx+CELL/2-pad,cy-CELL/2+pad);c.lineTo(cx-CELL/2+pad,cy+CELL/2-pad);c.stroke();}c.lineWidth=1;}}
function drawRevBg(c,SZ,CELL,B){c.strokeStyle='rgba(255,255,255,0.12)';for(var i=0;i<=SZ;i++){c.beginPath();c.moveTo(B,B+i*CELL);c.lineTo(B+SZ*CELL,B+i*CELL);c.stroke();c.beginPath();c.moveTo(B+i*CELL,B);c.lineTo(B+i*CELL,B+SZ*CELL);c.stroke();}c.fillStyle='#1A7F37';c.beginPath();c.arc(B+2*CELL,B+2*CELL,4,0,Math.PI*2);c.fill();c.beginPath();c.arc(B+6*CELL,B+2*CELL,4,0,Math.PI*2);c.fill();c.beginPath();c.arc(B+2*CELL,B+6*CELL,4,0,Math.PI*2);c.fill();c.beginPath();c.arc(B+6*CELL,B+6*CELL,4,0,Math.PI*2);c.fill();}
function drawRevPcs(c,bd,SZ,CELL,B){for(var y=0;y<SZ;y++)for(var x=0;x<SZ;x++){if(!bd[y][x])continue;var cx=B+x*CELL+CELL/2,cy=B+y*CELL+CELL/2,r=CELL*0.4;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);var g=c.createRadialGradient(cx-r*0.3,cy-r*0.3,r*0.1,cx,cy,r);if(bd[y][x]===1){g.addColorStop(0,'#fff');g.addColorStop(1,'#ccc');}else{g.addColorStop(0,'#555');g.addColorStop(1,'#111');}c.fillStyle=g;c.fill();}for(var y=0;y<SZ;y++)for(var x=0;x<SZ;x++){if(isRevMove(bd,x,y,_multiMyColor)){var cx=B+x*CELL+CELL/2,cy=B+y*CELL+CELL/2;c.fillStyle='rgba(255,255,255,0.15)';c.beginPath();c.arc(cx,cy,CELL*0.15,0,Math.PI*2);c.fill();}}}
function isRevMove(bd,x,y,col){if(bd[y][x]!==0)return false;var opp=col===1?2:1;var ds=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];for(var d=0;d<ds.length;d++){var nx=x+ds[d][0],ny=y+ds[d][1];if(nx<0||nx>=8||ny<0||ny>=8||bd[ny][nx]!==opp)continue;while(true){nx+=ds[d][0];ny+=ds[d][1];if(nx<0||nx>=8||ny<0||ny>=8||bd[ny][nx]===0)break;if(bd[ny][nx]===col)return true;}}return false;}
function applyRevMove(bd,x,y,col){var nb=bd.map(function(r){return r.slice();});nb[y][x]=col;var opp=col===1?2:1;var ds=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];for(var d=0;d<ds.length;d++){var tf=[],nx=x+ds[d][0],ny=y+ds[d][1];while(nx>=0&&nx<8&&ny>=0&&ny<8&&nb[ny][nx]===opp){tf.push([nx,ny]);nx+=ds[d][0];ny+=ds[d][1];}if(nx>=0&&nx<8&&ny>=0&&ny<8&&nb[ny][nx]===col){for(var i=0;i<tf.length;i++)nb[tf[i][1]][tf[i][0]]=col;}}return nb;}

function dualPollRoom(cvs,ov,bd,st,SZ,CELL,B,CW,oppNm){
  if(_multiInterval)clearInterval(_multiInterval);
  var lastMoveRef=null;
  _multiInterval=setInterval(async function(){
    try{
      var d=await API.get('/game/room/'+_multiRoomId); var r=d.room; if(!r)return;
      API.post('/game/room/'+_multiRoomId+'/heartbeat').catch(function(){});
      if(r.opponent_disconnected){clearInterval(_multiInterval);_multiInterval=null;
        var h='<div class="text-center"><p class="mb-4">对手已断开连接</p><button class="btn btn-primary btn-sm mr-2" onclick="closeModal();API.post(\'/game/queue/cancel\');switchGameTab(\'dual\')">重新匹配</button><button class="btn btn-glass btn-sm" onclick="closeModal();var ov2=document.getElementById(\'gomoku-overlay\');if(ov2)document.body.removeChild(ov2);_gameActive=null">退出</button></div>';
        showModal('连接中断',h,null,null); return; }
      if(r.status==='finished'){clearInterval(_multiInterval);_multiInterval=null;
        if(r.winner===0){st.textContent='平局!';toast('平局!','info');}
        else{var w=r.winner==Store.user.id;st.textContent=w?'你赢了!':'你输了';toast(w?'你赢了!':'你输了',w?'success':'error');}
        setTimeout(function(){var w2=r.winner==Store.user.id;var m=r.winner===0?'平局!':(w2?'恭喜你赢了!':'你输了...');
          var h2='<div class="text-center"><p class="mb-4">'+m+'</p><button class="btn btn-primary btn-sm mr-2" onclick="closeModal();API.post(\'/game/queue/cancel\');switchGameTab(\'dual\')">再来一局</button><button class="btn btn-glass btn-sm" onclick="closeModal();var ov3=document.getElementById(\'gomoku-overlay\');if(ov3)document.body.removeChild(ov3);_gameActive=null">退出</button></div>';
          showModal('游戏结束',h2,null,null);},800); return; }
      var nb=r.board; var chg=false;
      for(var y=0;y<SZ;y++)for(var x=0;x<SZ;x++){if((bd[y]&&bd[y][x])!==(nb[y]&&nb[y][x])){if(nb[y]&&nb[y][x]!==0)lastMoveRef={x:x,y:y};chg=true;}}
      if(chg){bd=nb.map(function(rw){return rw.slice();}); drBdDual(cvs,bd,r.turn,SZ,CELL,B,CW,r.game_type);
        st.textContent=r.turn===_multiMyColor?'你的回合':'对手回合...';
        if(_multiGameType==='reversi'&&r.turn===_multiMyColor)setTimeout(function(){drBdDual(cvs,bd,r.turn,SZ,CELL,B,CW,r.game_type);},100);}
    }catch(e){}
  },1500);

  function drBdDual(cvs2,bd2,turn,sz,cl,br,cw,gtype){
    var c=cvs2.getContext('2d');c.fillStyle='#1a1a1a';c.fillRect(0,0,cw,cw);
    if(gtype==='reversi'){drawRevBg(c,sz,cl,br);drawRevPcs(c,bd2,sz,cl,br);if(turn===_multiMyColor){for(var y=0;y<sz;y++)for(var x=0;x<sz;x++){if(isRevMove(bd2,x,y,_multiMyColor)){var cx=br+x*cl+cl/2,cy=br+y*cl+cl/2;c.fillStyle='rgba(255,255,255,0.15)';c.beginPath();c.arc(cx,cy,cl*0.15,0,Math.PI*2);c.fill();}}}}
    else if(gtype==='tictactoe'){drawTttBg(c,sz,cl,br);drawTttPcs(c,bd2,sz,cl,br);}
    else {drawGmkBg(c,sz,cl,br);drawGmkPcs(c,bd2,sz,cl,br);}
    if(lastMoveRef){var lx=br+lastMoveRef.x*cl,ly=br+lastMoveRef.y*cl;c.strokeStyle='#FFD700';c.lineWidth=2;c.beginPath();c.arc(lx,ly,cl*0.44,0,Math.PI*2);c.stroke();c.lineWidth=1;}
  }
}

/* ============= 2048 ============= */
function init_2048() {
  document.getElementById('game-title').textContent='2048';
  var el=document.getElementById('game-container');
  el.innerHTML='<style>.g2048{display:inline-grid;grid-template-columns:repeat(4,65px);gap:6px;padding:10px;background:var(--bg-glass);border-radius:var(--radius-lg)}.gcell{width:65px;height:65px;border-radius:8px;background:rgba(255,255,255,0.03);display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:700}</style><div><div style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center"><span class="font-medium">分数: <b id="s2048">0</b></span><button class="btn btn-glass btn-sm" onclick="init_2048()">新游戏</button></div><div class="g2048" id="g2048"></div></div>';
  var board=[],score=0;
  function empty(){var r=[];for(var y=0;y<4;y++)for(var x=0;x<4;x++)if(!board[y][x])r.push([y,x]);return r}
  function add(){var e=empty();if(!e.length)return;var p=e[Math.floor(Math.random()*e.length)];board[p[0]][p[1]]=Math.random()<0.9?2:4}
  function draw(){var h='';for(var y=0;y<4;y++)for(var x=0;x<4;x++){var v=board[y][x];var c=v===0?'':(v<8?'rgba(255,255,255,0.08)':v<64?'rgba(0,120,212,0.3)':v<512?'rgba(0,120,212,0.5)':'rgba(0,120,212,0.7)');h+='<div class="gcell" style="background:'+c+'">'+(v||'')+'</div>'}document.getElementById('g2048').innerHTML=h;document.getElementById('s2048').textContent=score}
  function move(dir){var moved=false;function slide(row){var a=row.filter(function(v){return v});while(a.length<4)a.push(0);for(var i=0;i<3;i++){if(a[i]&&a[i]===a[i+1]){a[i]*=2;score+=a[i];a[i+1]=0;i++}}a=a.filter(function(v){return v});while(a.length<4)a.push(0);return a}for(var i=0;i<4;i++){var r=[];for(var j=0;j<4;j++){var y=dir===0?i:dir===2?3-i:j,x=dir===1?j:dir===3?3-j:dir===0?j:i;r.push(board[y][x])}var s=slide(r);for(var j=0;j<4;j++){var y=dir===0?i:dir===2?3-i:j,x=dir===1?j:dir===3?3-j:dir===0?j:i;if(board[y][x]!==s[j])moved=true;board[y][x]=s[j]}}return moved}
  function start(){board=[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];score=0;add();add();draw()}
  document.addEventListener('keydown',function k(e){if(_gameActive!=='2048')return;var d={ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3}[e.key];if(d===undefined)return;e.preventDefault();if(move(d)){add();draw();if(!empty().length){var over=true;for(var y=0;y<4;y++)for(var x=0;x<3;x++)if(board[y][x]===board[y][x+1]||(y<3&&board[y][x]===board[y+1][x]))over=false;if(over)toast('游戏结束! '+score+'分','info')}}});
  start();
}

/* ============= Snake ============= */
function init_snake() {
  document.getElementById('game-title').textContent='贪吃蛇';
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

/* ============= Minesweeper ============= */
function init_minesweeper() {
  document.getElementById('game-title').textContent='扫雷';
  var R=9,C=9,M=10,board=[],revealed=[],flagged=[];
  function reset(){board=Array.from({length:R},function(){return Array(C).fill(0)});revealed=Array.from({length:R},function(){return Array(C).fill(false)});flagged=Array.from({length:R},function(){return Array(C).fill(false)});var placed=0;while(placed<M){var r=Math.floor(Math.random()*R),c=Math.floor(Math.random()*C);if(board[r][c]!==-1){board[r][c]=-1;placed++}}for(var r=0;r<R;r++)for(var c=0;c<C;c++){if(board[r][c]===-1)continue;var cnt=0;for(var dr=-1;dr<=1;dr++)for(var dc=-1;dc<=1;dc++){var nr=r+dr,nc=c+dc;if(nr>=0&&nr<R&&nc>=0&&nc<C&&board[nr][nc]===-1)cnt++}board[r][c]=cnt}}
  function reveal(r,c){if(r<0||r>=R||c<0||c>=C||revealed[r][c]||flagged[r][c])return;revealed[r][c]=true;if(board[r][c]===-1){draw(true);return}if(board[r][c]===0){for(var dr=-1;dr<=1;dr++)for(var dc=-1;dc<=1;dc++)reveal(r+dr,c+dc)}}
  function checkWin(){for(var r=0;r<R;r++)for(var c=0;c<C;c++)if(board[r][c]!==-1&&!revealed[r][c])return false;return true}
  function draw(dead){var h='<div style="display:inline-grid;grid-template-columns:repeat('+C+',34px);gap:2px">';for(var r=0;r<R;r++){for(var c=0;c<C;c++){var cls='gcell',txt='',bg='';if(revealed[r][c]){if(board[r][c]===-1){bg='#CF222E';txt='\u{1F4A3}';}else{txt=board[r][c]||'';bg='rgba(255,255,255,0.06)';var cols=['','#0078D4','#1A7F37','#CF222E','#8250DF','#BF7B00','#00C6FF','#333','#888'];if(board[r][c])cls+='" style="color:'+cols[board[r][c]];}}else if(flagged[r][c]){txt='\u{1F6A9}';bg='rgba(255,255,255,0.04)';}if(dead&&board[r][c]===-1&&!flagged[r][c]){txt='\u{1F4A3}';bg='rgba(255,255,255,0.06)';}var st='width:34px;height:34px;cursor:pointer;font-size:0.85rem;background:'+(bg||'rgba(255,255,255,0.03)');h+='<div class="'+cls+'" style="'+st+'" onclick="msClick('+r+','+c+')" oncontextmenu="msFlag('+r+','+c+');return false">'+txt+'</div>';}}h+='</div>';document.getElementById('ms-grid').innerHTML=h;}
  reset();window.msClick=function(r,c){if(board[r][c]===-1){revealed[r][c]=true;draw(true);setTimeout(function(){toast('踩雷了!','error')},100);return}reveal(r,c);draw(false);if(checkWin()){toast('你赢了!','success');revealed=Array.from({length:R},function(){return Array(C).fill(true)});draw(false)}};
  window.msFlag=function(r,c){if(!revealed[r][c]){flagged[r][c]=!flagged[r][c];draw(false)}};
  var el=document.getElementById('game-container');el.innerHTML='<div><div style="margin-bottom:8px"><button class="btn btn-glass btn-sm" onclick="init_minesweeper()">新游戏</button></div><div id="ms-grid"></div></div>';draw(false);
}

/* ============= Sudoku ============= */
function init_sudoku() {
  document.getElementById('game-title').textContent='数独';
  var puzzle,board;
  function gen(){puzzle=[];board=Array.from({length:9},function(){return Array(9).fill(0)});var base=[1,2,3,4,5,6,7,8,9];for(var r=0;r<9;r++){var shift=(r%3)*3+Math.floor(r/3);for(var c=0;c<9;c++)board[r][c]=base[(c+shift)%9]}for(var i=0;i<3;i++){var br=Math.floor(Math.random()*3)*3;var a=Math.floor(Math.random()*3)*3,b=Math.floor(Math.random()*3)*3;if(a!==b){for(var c=0;c<9;c++){var t=board[br+a][c];board[br+a][c]=board[br+b][c];board[br+b][c]=t}}}puzzle=board.map(function(r){return r.map(function(v){return Math.random()<0.5?v:0})})}
  gen();
  function draw(){var h='<table style="border-collapse:collapse;margin:0 auto">';for(var r=0;r<9;r++){h+='<tr>';for(var c=0;c<9;c++){var v=puzzle[r][c],isG=v!==0;var br='',bb='';if(c%3===0&&c>0)br='border-left:2px solid var(--blue)';if(r%3===0&&r>0)bb='border-top:2px solid var(--blue)';h+='<td style="width:36px;height:36px;text-align:center;cursor:'+(isG?'default':'pointer')+';'+(isG?'font-weight:600':'color:var(--text-tertiary)')+';'+br+';'+bb+';border:1px solid var(--border-subtle)" onclick="sdClick('+r+','+c+')">'+(v||'')+'</td>'}h+='</tr>'}h+='</table>';document.getElementById('sd-grid').innerHTML=h}
  window.sdClick=function(r,c){if(puzzle[r][c]!==0)return;var v=prompt('输入数字 1-9:');if(!v)return;var n=parseInt(v);if(n<1||n>9)return;var valid=true;for(var i=0;i<9;i++){if(board[r][i]===n||board[i][c]===n)valid=false}var br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;for(var i=0;i<3;i++)for(var j=0;j<3;j++)if(board[br+i][bc+j]===n)valid=false;if(valid){puzzle[r][c]=n;board[r][c]=n;draw();var done=true;for(var i=0;i<9;i++)for(var j=0;j<9;j++)if(puzzle[i][j]===0)done=false;if(done)toast('数独完成!','success')}else{toast('数字冲突!','error');puzzle[r][c]=0}};
  var el=document.getElementById('game-container');el.innerHTML='<div><div style="margin-bottom:8px"><button class="btn btn-glass btn-sm" onclick="init_sudoku()">新游戏</button></div><div id="sd-grid"></div></div>';draw();
}

/* ============= Gomoku AI ============= */
var _gomokuDifficulty = 'medium';

function init_gomoku() {
  var el = document.getElementById('game-container'); el.innerHTML=''; el.style.cssText='display:flex;flex-direction:column;align-items:center';
  var title=document.createElement('h3'); title.textContent='选择难度'; title.style.cssText='font-size:1.1rem;font-weight:600;margin-bottom:16px'; el.appendChild(title);
  var diffs = [
    {id:'easy',name:'简单',desc:'基础连子计数评估',color:'#1A7F37'},
    {id:'medium',name:'中等',desc:'完整棋型库 \u00B7 活四冲四识别',color:'#BF7B00'},
    {id:'hard',name:'困难',desc:'Minimax深度2 \u00B7 Alpha-Beta剪枝',color:'#CF222E'},
    {id:'master',name:'大师',desc:'深度4 \u00B7 候选排序优化 \u00B7 高难度',color:'#8250DF'}
  ];
  diffs.forEach(function(d){
    var card=document.createElement('div'); card.className='card-glass';
    card.style.cssText='width:340px;max-width:100%;padding:16px 20px;margin-bottom:10px;cursor:pointer;display:flex;align-items:center;gap:14px;transition:all 0.25s var(--jelly-soft)';
    card.onmouseenter=function(){card.style.boxShadow='0 0 0 2px '+d.color+', var(--shadow-07)';card.style.transform='translateX(4px)';};
    card.onmouseleave=function(){card.style.boxShadow='';card.style.transform='';};
    card.onclick=function(){startGomokuRound(d.id);};
    card.innerHTML='<div style="width:40px;height:40px;border-radius:50%;background:'+d.color+';display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.2rem;flex-shrink:0"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><circle cx="12" cy="12" r="9"/></svg></div><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:0.95rem">'+d.name+'</div><div class="text-xs text-secondary">'+d.desc+'</div></div><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="'+d.color+'" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>';
    el.appendChild(card);
  });
}

function startGomokuRound(diff) {
  _gomokuDifficulty = diff;
  var SZ=15, CELL=34, B=5, CW=B*2+CELL*(SZ-1);
  var board=[], turn=1, gameOver=false, lastMove=null;

  var ov=document.createElement('div'); ov.id='gomoku-overlay';
  ov.style.cssText='position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center';
  document.body.appendChild(ov);

  var hdr=document.createElement('div'); hdr.style.cssText='position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;z-index:10';
  hdr.innerHTML='<button id="gmk-back" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);color:#ccc;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:0.85rem">\u2190 返回</button><span style="color:#ccc;font-weight:500">五子棋 \u00B7 '+(diff==='easy'?'简单':diff==='medium'?'中等':diff==='hard'?'困难':'大师')+'</span><button id="gmk-reset" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);color:#ccc;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:0.85rem">新游戏</button>';
  ov.appendChild(hdr);

  var st=document.createElement('div'); st.style.cssText='color:#ccc;font-weight:500;font-size:0.95rem;text-align:center;margin-bottom:8px;min-height:24px'; st.textContent='你的回合 \u00B7 执白'; ov.appendChild(st);

  var cvs=document.createElement('canvas'); cvs.width=CW; cvs.height=CW; cvs.style.cssText='border-radius:8px;background:#1a1a1a;cursor:pointer;max-width:98vw;max-height:calc(100vh-180px)'; ov.appendChild(cvs);

  document.getElementById('gmk-back').onclick=function(){document.body.removeChild(ov);_gameActive=null;};
  document.getElementById('gmk-reset').onclick=function(){initBoard();};

  function drawBoard(){
    var ctx=cvs.getContext('2d'); ctx.fillStyle='#1a1a1a';ctx.fillRect(0,0,CW,CW);ctx.strokeStyle='rgba(255,255,255,0.10)';
    for(var i=0;i<SZ;i++){ctx.beginPath();ctx.moveTo(B,B+i*CELL);ctx.lineTo(B+(SZ-1)*CELL,B+i*CELL);ctx.stroke();ctx.beginPath();ctx.moveTo(B+i*CELL,B);ctx.lineTo(B+i*CELL,B+(SZ-1)*CELL);ctx.stroke();