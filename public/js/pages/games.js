var _gameActive = null;
var _gameTab = 'single';
var _multiInterval = null;
var _matchPollInterval = null;
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
  content.innerHTML = '';
  content.appendChild(renderSingleGames());
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
  var tc = document.getElementById('game-tab-content');
  tc.innerHTML = '';
  if (tab === 'single') { tc.appendChild(renderSingleGames()); }
  else { tc.innerHTML = renderDualGames(); }
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
function iconMecha(c){return '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="'+c+'" stroke-width="1.6"><rect x="4" y="2" width="16" height="20" rx="3"/><rect x="7" y="5" width="4" height="4" fill="'+c+'"/><rect x="11" y="18" width="3" height="5"/><rect x="5" y="10" width="2" height="6"/><rect x="17" y="10" width="2" height="6"/><circle cx="7" cy="7" r="2" fill="#fff"/></svg>';}

/* ============= LAUNCH ============= */
var _gameEventCleanup = null;

function launchGame(id) {
  if (_gameEventCleanup) { _gameEventCleanup(); _gameEventCleanup = null; }
  _gameActive = id;
  var main = document.getElementById('main-content');
  if (!main) return;

  var container = document.getElementById('game-container');
  if (!container) {
    var existing = document.querySelector('.game-container-wrap');
    if (existing) existing.remove();

    var wrap = document.createElement('div');
    wrap.className = 'game-container-wrap';
    wrap.style.cssText = 'max-width:900px;margin:0 auto;padding:0 16px';

    var backBar = document.createElement('div');
    backBar.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:20px';
    backBar.innerHTML = '<button class="btn btn-glass btn-sm" onclick="navigate(\'games\')">\u2190 返回游戏中心</button>'
      + '<h3 id="game-title" style="font-size:1.1rem;font-weight:600;margin:0"></h3>';
    wrap.appendChild(backBar);

    container = document.createElement('div');
    container.id = 'game-container';
    container.style.cssText = 'display:flex;flex-direction:column;align-items:center';
    wrap.appendChild(container);

    var page = document.querySelector('.page.active');
    if (page) { page.innerHTML = ''; page.appendChild(wrap); }
    else { main.innerHTML = ''; main.appendChild(wrap); }
  }

  container.innerHTML = '';
  var initFn = window['init_' + id];
  if (initFn) {
    initFn();
  } else {
    container.innerHTML = '<div class="text-center text-secondary p-8">游戏正在开发中...</div>';
  }
}

/* ============= SINGLE GAMES ============= */
function renderSingleGames() {
  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:10px';
  var svgs = {
    gomoku: iconGomoku('#BF7B00'), '2048': icon2048('#0078D4'), snake: iconSnake('#1A7F37'),
    minesweeper: iconMinesweeper('#CF222E'), sudoku: iconSudoku('#8250DF'), tetris: iconTetris('#BC4C2A'),
    breakout: iconBreakout('#D63384'), pong: iconPong('#00C6FF'), mechabattle: iconMecha('#00C6FF')
  };
  var games = [
    {id:'gomoku',name:'五子棋',desc:'AI对战 \u00B7 四档难度',color:'#BF7B00'},
    {id:'2048',name:'2048',desc:'合并数字挑战',color:'#0078D4'},
    {id:'snake',name:'贪吃蛇',desc:'经典贪吃蛇',color:'#1A7F37'},
    {id:'minesweeper',name:'扫雷',desc:'经典排雷',color:'#CF222E'},
    {id:'sudoku',name:'数独',desc:'9x9数字谜题',color:'#8250DF'},
    {id:'tetris',name:'俄罗斯方块',desc:'经典消除',color:'#BC4C2A'},
    {id:'breakout',name:'打砖块',desc:'弹球消除',color:'#D63384'},
    {id:'pong',name:'乒乓球',desc:'经典对打',color:'#00C6FF'},
    {id:'mechabattle',name:'机甲对战',desc:'像素双人格斗',color:'#00C6FF'}
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
  return grid;
}

/* ============= DUAL MODE ============= */
var DUAL_GAMES = [
  { id: 'gomoku',    name: '五子棋',   color: '#BF7B00', desc: '经典五子连珠', sz:15, cell:34, b:5 },
  { id: 'tictactoe', name: '井字棋',   color: '#0078D4', desc: '三连即胜',       sz:3,  cell:100, b:10 },
  { id: 'reversi',   name: '黑白棋',   color: '#8250DF', desc: '夹击翻棋',       sz:8,  cell:50, b:10 },
  { id: 'mechabattle',name:'机甲对战', color: '#00C6FF', desc: '像素双人格斗',   sz:0,  cell:0, b:0 }
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
    + '<div id="dual-opponent-slot" style="text-align:center"><div style="width:64px;height:64px;border-radius:50%;border:2px dashed rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;margin:0 auto 8px;cursor:pointer;transition:all 0.2s" id="dual-plus-btn" onclick="'+(_multiGameType==='mechabattle'?'launchGame(\'mechabattle\')':'showDualInviteOptions()')+'"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div><div class="text-xs text-secondary">'+(_multiGameType==='mechabattle'?'开始本地对战':'选择对手')+'</div></div>'
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

function selectDualGame(gid) { _multiGameType = gid; renderDualGameSelector();
  var btn = document.getElementById('dual-plus-btn');
  if (btn) {
    btn.setAttribute('onclick', gid === 'mechabattle' ? 'launchGame(\'mechabattle\')' : 'showDualInviteOptions()');
    var txt = btn.parentElement.querySelector('.text-secondary');
    if (txt) txt.textContent = gid === 'mechabattle' ? '开始本地对战' : '选择对手';
  }
}

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
  loadGameFriendList();
}

async function loadGameFriendList() {
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
  } catch(e){ document.getElementById('dual-friend-list').innerHTML = '<div class="text-xs" style="color:#CF222E">加载失败，请重试</div>'; }
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
  if (_multiGameType === 'mechabattle') { launchGame('mechabattle'); return; }
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
  if(_matchPollInterval)clearInterval(_matchPollInterval);
  _matchPollInterval = setInterval(async function(){
    try {
      var d = await API.get('/game/queue/status');
      if(d.matched&&d.room){ clearInterval(_matchPollInterval);_matchPollInterval=null;
        document.getElementById('dual-opponent-slot').innerHTML = '<div style="text-align:center"><div style="width:64px;height:64px;border-radius:50%;background-size:cover;background-position:center;margin:0 auto 8px;background-color:rgba(255,255,255,0.06);background-image:url('+avatarUrl(d.room.opponent)+')"></div><div class="text-sm font-medium">'+escapeHtml(d.room.opponent?.nickname||'')+'</div></div>';
        document.getElementById('dual-status').innerHTML = '<p class="text-sm" style="color:#1A7F37">已匹配!</p>'; toast('已匹配到对手!','success');
        _multiGameType = d.room.game_type||'gomoku'; setTimeout(function(){dualStartGame(d.room);},500); }
    } catch(e){}
  }, 2000);
}

function cancelMatch() { clearInterval(_matchPollInterval); _matchPollInterval=null; API.post('/game/queue/cancel').catch(function(){}); initDualMode(); }

/* ============= DUAL GAME FULLSCREEN ============= */
function dualStartGame(room) {
  if(_multiInterval){clearInterval(_multiInterval);_multiInterval=null;}
  if(_matchPollInterval){clearInterval(_matchPollInterval);_matchPollInterval=null;}
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
  function k2048(e){if(_gameActive!=='2048')return;var d={ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3}[e.key];if(d===undefined)return;e.preventDefault();if(move(d)){add();draw();if(!empty().length){var over=true;for(var y=0;y<4;y++)for(var x=0;x<3;x++)if(board[y][x]===board[y][x+1]||(y<3&&board[y][x]===board[y+1][x]))over=false;if(over)toast('游戏结束! '+score+'分','info')}}}
  document.addEventListener('keydown', k2048);
  _gameEventCleanup = function(){ document.removeEventListener('keydown', k2048); };
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
  function snKey(e){if(_gameActive!=='snake')return;var nd={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[e.key];if(!nd)return;e.preventDefault();if((d==='up'&&nd==='down')||(d==='down'&&nd==='up')||(d==='left'&&nd==='right')||(d==='right'&&nd==='left'))return;d=nd}
  document.addEventListener('keydown', snKey);
  _gameEventCleanup = function(){ document.removeEventListener('keydown', snKey); };
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
    for(var i=0;i<SZ;i++){ctx.beginPath();ctx.moveTo(B,B+i*CELL);ctx.lineTo(B+(SZ-1)*CELL,B+i*CELL);ctx.stroke();ctx.beginPath();ctx.moveTo(B+i*CELL,B);ctx.lineTo(B+i*CELL,B+(SZ-1)*CELL);ctx.stroke();}
    var stars=[[3,3],[3,7],[3,11],[7,3],[7,7],[7,11],[11,3],[11,7],[11,11]];ctx.fillStyle='rgba(255,255,255,0.3)';stars.forEach(function(p){ctx.beginPath();ctx.arc(B+p[0]*CELL,B+p[1]*CELL,2.5,0,Math.PI*2);ctx.fill();});
    for(var y=0;y<SZ;y++)for(var x=0;x<SZ;x++){if(!board[y][x])continue;var cx=B+x*CELL,cy=B+y*CELL,r=CELL*0.42;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);var g=ctx.createRadialGradient(cx-r*0.3,cy-r*0.3,r*0.1,cx,cy,r);if(board[y][x]===1){g.addColorStop(0,'#fff');g.addColorStop(1,'#aaa');}else{g.addColorStop(0,'#333');g.addColorStop(1,'#000');}ctx.fillStyle=g;ctx.fill();}
    if(lastMove){var lx=B+lastMove.x*CELL,ly=B+lastMove.y*CELL;ctx.strokeStyle='#FFD700';ctx.lineWidth=2;ctx.beginPath();ctx.arc(lx,ly,CELL*0.44,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;}
  }
  function chkWin(bx,by){var me=board[by][bx];for(var d=0;d<4;d++){var cnt=1;for(var s=1;s<5;s++){var nx=bx+DIRS[d][0]*s,ny=by+DIRS[d][1]*s;if(nx>=0&&nx<SZ&&ny>=0&&ny<SZ&&board[ny][nx]===me)cnt++;else break;}for(var s=1;s<5;s++){var nx=bx-DIRS[d][0]*s,ny=by-DIRS[d][1]*s;if(nx>=0&&nx<SZ&&ny>=0&&ny<SZ&&board[ny][nx]===me)cnt++;else break;}if(cnt>=5)return true;}return false;}
  var ps=[];for(var y=0;y<SZ;y++){ps[y]=[];for(var x=0;x<SZ;x++){var c2=SZ/2-1;ps[y][x]=SZ-Math.max(Math.abs(x-c2),Math.abs(y-c2));}}
  function getCans(r){r=r||2;var near=[];for(var y=0;y<SZ;y++){near[y]=[];for(var x=0;x<SZ;x++)near[y][x]=false;}var f=false;for(var y=0;y<SZ;y++)for(var x=0;x<SZ;x++){if(board[y][x]!==0){f=true;for(var dy=-r;dy<=r;dy++)for(var dx=-r;dx<=r;dx++){var ny=y+dy,nx=x+dx;if(nx>=0&&nx<SZ&&ny>=0&&ny<SZ&&board[ny][nx]===0)near[ny][nx]=true;}}}if(!f)return[[7,7]];var out=[];for(var y=0;y<SZ;y++)for(var x=0;x<SZ;x++){if(near[y][x])out.push([x,y]);}return out;}
  var FIVE=7,L4=6,S4=5,L3=4,S3=3,L2=2,S2=1;
  var evR=[],evC=[[],[]];for(var y=0;y<SZ;y++){evR[y]=[];for(var x=0;x<SZ;x++)evR[y][x]=[0,0,0,0];}for(var c=0;c<2;c++){evC[c]=[];for(var i=0;i<8;i++)evC[c][i]=0;}
  function gL(bx,by,di,you){var l=Array(9).fill(you);var tx=bx-5*DIRS[di][0],ty=by-5*DIRS[di][1];for(var i=0;i<9;i++){tx+=DIRS[di][0];ty+=DIRS[di][1];if(tx>=0&&tx<SZ&&ty>=0&&ty<SZ)l[i]=board[ty][tx];}return l;}
  function sR(X,Y,l,r,di){var tx=X+(-5+l)*DIRS[di][0],ty=Y+(-5+l)*DIRS[di][1];for(var i=l;i<r;i++){tx+=DIRS[di][0];ty+=DIRS[di][1];if(ty>=0&&ty<SZ&&tx>=0&&tx<SZ)evR[ty][tx][di]=1;}}
  function aL(bx,by,di,me,you,cnt){var line=gL(bx,by,di,you);var li=4,ri=4;while(ri<8&&line[ri+1]===me)ri++;while(li>0&&line[li-1]===me)li--;var lr=li,rr=ri;while(rr<8&&line[rr+1]!==you)rr++;while(lr>0&&line[lr-1]!==you)lr--;var range=rr-lr+1;if(range<5){sR(bx,by,lr,rr,di);return;}sR(bx,by,li,ri,di);var mR=ri-li+1;if(mR===5){cnt[FIVE]++;return;}if(mR===4){var le=line[li-1]===0,re=line[ri+1]===0;cnt[le&&re?L4:(le||re?S4:0)]++;return;}if(mR===3){var le=line[li-1]===0,re=line[ri+1]===0;var l4=false,r4=false;if(le&&line[li-2]===me){sR(bx,by,li-2,li-1,di);cnt[S4]++;l4=true;}if(re&&line[ri+2]===me){sR(bx,by,ri+1,ri+2,di);cnt[S4]++;r4=true;}if(l4||r4)return;if(le&&re){if(range>5)cnt[L3]++;else cnt[S3]++;return;}if(le||re){cnt[S3]++;return;}return;}if(mR===2){var le=line[li-1]===0,re=line[ri+1]===0;var l3=false,r3=false;if(le&&line[li-2]===me){sR(bx,by,li-2,li-1,di);if(line[li-3]===0){if(re)cnt[L3]++;else cnt[S3]++;l3=true;}else if(line[li-3]===you&&re){cnt[S3]++;l3=true;}}if(re&&line[ri+2]===me){if(line[ri+3]===me){sR(bx,by,ri+1,ri+2,di);cnt[S4]++;r3=true;}else if(line[ri+3]===0){if(le)cnt[L3]++;else cnt[S3]++;r3=true;}else if(le){cnt[S3]++;r3=true;}}if(l3||r3)return;if(le&&re)cnt[L2]++;else if(le||re)cnt[S2]++;return;}if(mR===1){var le2=line[li-1]===0,re2=line[ri+1]===0;if(le2&&line[li-2]===me&&line[li-3]===0&&line[ri+1]===you)cnt[S2]++;if(re2&&line[ri+2]===me&&line[ri+3]===0){if(le2)cnt[L2]++;else cnt[S2]++;}}}
  function fEv(){for(var c=0;c<2;c++)for(var i=0;i<8;i++)evC[c][i]=0;for(var y=0;y<SZ;y++)for(var x=0;x<SZ;x++)evR[y][x]=[0,0,0,0];for(var y=0;y<SZ;y++)for(var x=0;x<SZ;x++){if(board[y][x]===0)continue;for(var d=0;d<4;d++){if(evR[y][x][d])continue;var me=board[y][x];aL(x,y,d,me,me===1?2:1,evC[me-1]);}}var my=evC[1],yr=evC[0];if(my[FIVE])return 100000;if(yr[FIVE])return-100000;if(my[S4]>=2)my[L4]++;if(yr[S4]>=2)yr[L4]++;if(yr[L4])return-9050;if(yr[S4])return-9040;if(my[L4])return 9030;if(my[S4]&&my[L3])return 9020;if(yr[L3]&&my[S4]===0)return-9010;if(my[L3]>1&&yr[L3]===0&&yr[S3]===0)return 9000;var ms=0,os=0;if(my[S4])ms+=2000;if(my[L3]>1)ms+=500;else if(my[L3]>0)ms+=100;if(yr[L3]>1)os+=2000;else if(yr[L3]>0)os+=400;if(my[S3])ms+=my[S3]*10;if(yr[S3])os+=yr[S3]*10;if(my[L2])ms+=my[L2]*4;if(yr[L2])os+=yr[L2]*4;if(my[S2])ms+=my[S2]*4;if(yr[S2])os+=yr[S2]*4;return ms-os;}
  function sEv(){var best=-Infinity,bx=7,by=7;for(var y=0;y<SZ;y++)for(var x=0;x<SZ;x++){if(board[y][x]!==0)continue;var atk=0,def=0;for(var d=0;d<4;d++){var a=0;for(var s=1;s<=4;s++){var nx=x+DIRS[d][0]*s,ny=y+DIRS[d][1]*s;if(nx>=0&&nx<SZ&&ny>=0&&ny<SZ&&board[ny][nx]===2)a++;else break;}for(var s=1;s<=4;s++){var nx=x-DIRS[d][0]*s,ny=y-DIRS[d][1]*s;if(nx>=0&&nx<SZ&&ny>=0&&ny<SZ&&board[ny][nx]===2)a++;else break;}atk+=a*a;var dd=0;for(var s=1;s<=4;s++){var nx=x+DIRS[d][0]*s,ny=y+DIRS[d][1]*s;if(nx>=0&&nx<SZ&&ny>=0&&ny<SZ&&board[ny][nx]===1)dd++;else break;}for(var s=1;s<=4;s++){var nx=x-DIRS[d][0]*s,ny=y-DIRS[d][1]*s;if(nx>=0&&nx<SZ&&ny>=0&&ny<SZ&&board[ny][nx]===1)dd++;else break;}def+=dd>=3?100:dd>=2?20:dd;}var cx3=SZ/2-1,center=SZ-Math.max(Math.abs(x-cx3),Math.abs(y-cx3));var sc=Math.max(atk*10,def*1.2)+center*0.5+Math.random()*2;if(sc>best){best=sc;bx=x;by=y;}}return[bx,by];}
  var MAX_D=(diff==='master'?4:2);
  function tSc(x,y){var sc=0;for(var d=0;d<4;d++){var dx=DIRS[d][0],dy=DIRS[d][1];var w=[0,0,0,0,0,0,0,0,0];for(var s=-4;s<=4;s++){var nx=x+dx*s,ny=y+dy*s;w[s+4]=(nx>=0&&nx<SZ&&ny>=0&&ny<SZ)?board[ny][nx]:-1;}var meL=0,meR=0,yrL=0,yrR=0;for(var s=1;s<=4;s++){if(w[4+s]===2)meR++;else break;}for(var s=1;s<=4;s++){if(w[4-s]===2)meL++;else break;}for(var s=1;s<=4;s++){if(w[4+s]===1)yrR++;else break;}for(var s=1;s<=4;s++){if(w[4-s]===1)yrL++;else break;}sc+=(meL+meR)*50+(yrL+yrR)*30;for(var start=0;start<=4;start++){var pCnt=0,aCnt=0;for(var i=0;i<5;i++){if(w[start+i]===1)pCnt++;else if(w[start+i]===2)aCnt++;}if(pCnt===4)return 1000001;if(pCnt===3&&aCnt===0)sc+=80000;if(aCnt>=4)sc+=500000;if(aCnt===3&&pCnt===0)sc+=40000;}}return sc;}
  function sC(cands,limit){for(var i=0;i<cands.length;i++)cands[i].push(tSc(cands[i][0],cands[i][1]));cands.sort(function(a,b){return b[2]-a[2]||ps[b[1]][b[0]]-ps[a[1]][a[0]];});if(limit&&cands.length>limit)cands=cands.slice(0,limit);return cands;}
  function mm(depth,alpha,beta,maxi){if(depth===0){var ev=fEv();if(ev>=100000)return ev+depth;if(ev<=-100000)return ev-depth;return ev;}var cands=getCans(3);cands=sC(cands,25);if(maxi){var best=-Infinity;for(var i=0;i<cands.length;i++){var x=cands[i][0],y=cands[i][1];if(board[y][x]!==0)continue;board[y][x]=2;var v=mm(depth-1,alpha,beta,false);board[y][x]=0;if(v>best)best=v;if(best>alpha)alpha=best;if(alpha>=beta)break;}return best;}else{var worst=Infinity;for(var i=0;i<cands.length;i++){var x=cands[i][0],y=cands[i][1];if(board[y][x]!==0)continue;board[y][x]=1;var v=mm(depth-1,alpha,beta,true);board[y][x]=0;if(v<worst)worst=v;if(worst<beta)beta=worst;if(alpha>=beta)break;}return worst;}}
  function aiT(){if(gameOver)return;if(diff==='easy'){var m=sEv();if(!m)return;board[m[1]][m[0]]=2;lastMove={x:m[0],y:m[1]};drawBoard();if(chkWin(m[0],m[1])){gameOver=true;st.textContent='AI 赢了';toast('AI赢了!','error');return;}turn=1;st.textContent='你的回合 \u00B7 执白';}else if(diff==='hard'||diff==='master'){var cands=getCans(3);if(cands.length===0)return;cands=sC(cands,25);var bestScore=-Infinity,bx=-1,by=-1;for(var i=0;i<cands.length;i++){var x=cands[i][0],y=cands[i][1];if(board[y][x]!==0)continue;board[y][x]=2;var v=mm(MAX_D-1,-Infinity,Infinity,false);board[y][x]=0;if(v>bestScore){bestScore=v;bx=x;by=y;}if(bestScore>=50000)break;}if(bx<0)return;board[by][bx]=2;lastMove={x:bx,y:by};drawBoard();if(chkWin(bx,by)){gameOver=true;st.textContent='AI 赢了';toast('AI赢了!','error');return;}turn=1;st.textContent='你的回合 \u00B7 执白';}else{var bestScore=-Infinity,bx=-1,by=-1;for(var y=0;y<SZ;y++)for(var x=0;x<SZ;x++){if(board[y][x]!==0)continue;board[y][x]=2;var si=fEv()+ps[y][x]*0.1;board[y][x]=0;if(si>bestScore){bestScore=si;bx=x;by=y;}}if(bx<0)return;board[by][bx]=2;lastMove={x:bx,y:by};drawBoard();if(chkWin(bx,by)){gameOver=true;st.textContent='AI 赢了';toast('AI赢了!','error');return;}turn=1;st.textContent='你的回合 \u00B7 执白';}}
  cvs.addEventListener('click',function(e){if(gameOver||turn!==1)return;var r=cvs.getBoundingClientRect();var sx=CW/r.width,sy=CW/r.height;var mx=(e.clientX-r.left)*sx,my=(e.clientY-r.top)*sy;var x=Math.round((mx-B)/CELL),y=Math.round((my-B)/CELL);if(x<0||x>=SZ||y<0||y>=SZ||board[y][x]!==0)return;board[y][x]=1;lastMove={x:x,y:y};drawBoard();if(chkWin(x,y)){gameOver=true;st.textContent='你赢了!';toast('你赢了!','success');return;}turn=2;st.textContent='AI 思考中...';setTimeout(aiT,diff==='master'?50:diff==='hard'?80:150);});
  function initBoard(){board=Array.from({length:SZ},function(){return Array(SZ).fill(0);});turn=1;gameOver=false;lastMove=null;st.textContent='你的回合 \u00B7 执白';drawBoard();}
  initBoard();
}

/* ============= Tetris ============= */
function init_tetris(){document.getElementById('game-title').textContent='俄罗斯方块';var el=document.getElementById('game-container');var COLS=10,ROWS=20,CS=28;var cvs=document.createElement('canvas');cvs.width=COLS*CS;cvs.height=ROWS*CS;cvs.style.cssText='border-radius:8px;background:#0a0a0a;border:2px solid rgba(255,255,255,0.06)';el.innerHTML='';var wrap=document.createElement('div');wrap.style.cssText='display:flex;flex-direction:column;align-items:center;gap:8px';var se=document.createElement('div');se.style.cssText='font-weight:500';se.textContent='分数: 0';var btn=document.createElement('button');btn.className='btn btn-glass btn-sm';btn.textContent='新游戏';btn.onclick=init_tetris;wrap.appendChild(se);wrap.appendChild(btn);wrap.appendChild(cvs);el.appendChild(wrap);var bd=[],piece=null,score=0,loop,gO=false;var shapes=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]],[[1,1,0],[0,1,1]],[[0,1,1],[1,1,0]]];var colors=['#00C6FF','#FFD700','#9B59B6','#1A7F37','#CF222E','#E67E22','#2980B9'];function nP(){var id=Math.floor(Math.random()*shapes.length);piece={shape:shapes[id],color:colors[id],x:Math.floor(COLS/2)-Math.floor(shapes[id][0].length/2),y:0};if(col()){gO=true;clearInterval(loop);toast('游戏结束! '+score+'分','info');}}function col(xO,yO,sh){sh=sh||piece.shape;for(var r=0;r<sh.length;r++)for(var c=0;c<sh[r].length;c++){if(!sh[r][c])continue;var nx=piece.x+c+(xO||0),ny=piece.y+r+(yO||0);if(nx<0||nx>=COLS||ny>=ROWS||(ny>=0&&bd[ny][nx]))return true;}return false;}function lock(){for(var r=0;r<piece.shape.length;r++)for(var c=0;c<piece.shape[r].length;c++){if(!piece.shape[r][c])continue;var y=piece.y+r;if(y<0){gO=true;return;}bd[y][piece.x+c]=piece.color;}cL();nP();}function cL(){var lines=0;for(var r=ROWS-1;r>=0;r--){if(bd[r].every(function(v){return v;})){bd.splice(r,1);bd.unshift(Array(COLS).fill(0));lines++;r++;}}if(lines){score+=lines*100;se.textContent='分数: '+score;}}function rot(){var s=piece.shape,ns=s[0].map(function(_,i){return s.map(function(r){return r[i];}).reverse();});if(!col(0,0,ns))piece.shape=ns;}function mv(dx,dy){if(!col(dx,dy)){piece.x+=dx;piece.y+=dy;}else if(dy===1){lock();}}function dr(){var ctx=cvs.getContext('2d');ctx.fillStyle='#0a0a0a';ctx.fillRect(0,0,cvs.width,cvs.height);for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++){if(bd[r][c]){ctx.fillStyle=bd[r][c];ctx.fillRect(c*CS,r*CS,CS-1,CS-1);}}if(piece)for(var r=0;r<piece.shape.length;r++)for(var c=0;c<piece.shape[r].length;c++){if(!piece.shape[r][c])continue;ctx.fillStyle=piece.color;ctx.fillRect((piece.x+c)*CS,(piece.y+r)*CS,CS-1,CS-1);}ctx.strokeStyle='rgba(255,255,255,0.04)';for(var r=0;r<=ROWS;r++){ctx.beginPath();ctx.moveTo(0,r*CS);ctx.lineTo(COLS*CS,r*CS);ctx.stroke();}for(var c=0;c<=COLS;c++){ctx.beginPath();ctx.moveTo(c*CS,0);ctx.lineTo(c*CS,ROWS*CS);ctx.stroke();}}function start(){bd=Array.from({length:ROWS},function(){return Array(COLS).fill(0);});score=0;gO=false;se.textContent='分数: 0';nP();if(loop)clearInterval(loop);loop=setInterval(function(){if(!gO){mv(0,1);dr();}},400);dr();}document.addEventListener('keydown',function k(e){if(_gameActive!=='tetris'||gO)return;var act={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowDown:[0,1],ArrowUp:'rot',' ':function(){while(!col(0,1))mv(0,1);}}[e.key];if(!act)return;e.preventDefault();if(act==='rot')rot();else if(typeof act==='function')act();else mv(act[0],act[1]);dr();});start();}

/* ============= Breakout ============= */
function init_breakout(){document.getElementById('game-title').textContent='打砖块';var el=document.getElementById('game-container');var W=480,H=400;var cvs=document.createElement('canvas');cvs.width=W;cvs.height=H;cvs.style.cssText='border-radius:8px;background:#0a0a0a;border:2px solid rgba(255,255,255,0.06);max-width:100%';el.innerHTML='';var wrap=document.createElement('div');wrap.style.cssText='display:flex;flex-direction:column;align-items:center;gap:8px';var se=document.createElement('div');se.style.cssText='font-weight:500';se.textContent='分数: 0 命: 3';var btn=document.createElement('button');btn.className='btn btn-glass btn-sm';btn.textContent='新游戏';btn.onclick=init_breakout;wrap.appendChild(se);wrap.appendChild(btn);wrap.appendChild(cvs);el.appendChild(wrap);var ctx=cvs.getContext('2d');var pad={w:80,h:12,x:W/2-40,y:H-30},ball={x:W/2,y:H-50,r:6,dx:4,dy:-4};var bricks=[],score=0,lives=3,loop,gO=false;function gB(){bricks=[];for(var r=0;r<5;r++)for(var c=0;c<8;c++){bricks.push({x:c*60+2,y:r*22+40,w:56,h:18,alive:true,color:['#CF222E','#E67E22','#FFD700','#1A7F37','#0078D4'][r]});}}gB();function dr(){ctx.fillStyle='#0a0a0a';ctx.fillRect(0,0,W,H);bricks.forEach(function(b){if(b.alive){ctx.fillStyle=b.color;ctx.fillRect(b.x,b.y,b.w,b.h);}});ctx.fillStyle='#0078D4';ctx.fillRect(pad.x,pad.y,pad.w,pad.h);ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();}function tk(){if(gO)return;ball.x+=ball.dx;ball.y+=ball.dy;if(ball.x-ball.r<0||ball.x+ball.r>W)ball.dx*=-1;if(ball.y-ball.r<0)ball.dy*=-1;if(ball.y+ball.r>H){lives--;se.textContent='分数: '+score+' 命: '+lives;if(lives<=0){gO=true;clearInterval(loop);toast('游戏结束! '+score+'分','info');return;}ball.x=W/2;ball.y=H-50;ball.dx=4;ball.dy=-4;}if(ball.y+ball.r>pad.y&&ball.x>pad.x&&ball.x<pad.x+pad.w&&ball.dy>0){ball.dy*=-1;ball.dx=(ball.x-pad.x-pad.w/2)*0.2;}bricks.forEach(function(b){if(b.alive&&ball.x>b.x&&ball.x<b.x+b.w&&ball.y>b.y&&ball.y<b.y+b.h){b.alive=false;ball.dy*=-1;score+=10;se.textContent='分数: '+score+' 命: '+lives;if(bricks.every(function(bb){return!bb.alive;})){gB();ball.dx*=1.05;ball.dy*=1.05;}}});dr();}document.addEventListener('mousemove',function(e){if(_gameActive!=='breakout')return;var rect=cvs.getBoundingClientRect();pad.x=e.clientX-rect.left-pad.w/2;if(pad.x<0)pad.x=0;if(pad.x>W-pad.w)pad.x=W-pad.w;});document.addEventListener('touchmove',function(e){if(_gameActive!=='breakout')return;var rect=cvs.getBoundingClientRect();pad.x=e.touches[0].clientX-rect.left-pad.w/2;if(pad.x<0)pad.x=0;if(pad.x>W-pad.w)pad.x=W-pad.w;});loop=setInterval(tk,1000/60);dr();}

/* ============= Pong ============= */
function init_pong(){
  document.getElementById('game-title').textContent='乒乓球';
  var el=document.getElementById('game-container'), W=520, H=380;
  var cvs=document.createElement('canvas');cvs.width=W;cvs.height=H;
  cvs.style.cssText='border-radius:10px;background:#0a0a0a;border:2px solid rgba(255,255,255,0.05);max-width:100%';
  el.innerHTML='';
  var wrap=document.createElement('div');wrap.style.cssText='display:flex;flex-direction:column;align-items:center;gap:10px';
  var se=document.createElement('div');se.style.cssText='font-weight:600;font-size:1.1rem;letter-spacing:2px';
  var btn=document.createElement('button');btn.className='btn btn-glass btn-sm';btn.textContent='新游戏';btn.onclick=init_pong;
  wrap.appendChild(se);wrap.appendChild(btn);wrap.appendChild(cvs);el.appendChild(wrap);

  var ctx=cvs.getContext('2d');
  var pw=12, ph=80, p1={y:H/2-ph/2,score:0}, p2={y:H/2-ph/2,score:0};
  var ball={x:W/2, y:H/2, r:7, dx:5, dy:(Math.random()-0.5)*5};
  var trail=[], maxTrail=8, ballColor='#fff', p1Color='#0078D4', p2Color='#CF222E';
  var aiTargetY=p2.y+ph/2, aiJitter=0, aiUpdateT=0;
  var flashAlpha=0, scoreFlashSide='';
  var keys={}, loop, paused=false;

  function updateScore(){se.innerHTML='<span style="color:'+p1Color+'">玩家 '+p1.score+'</span>  <span style="color:rgba(255,255,255,0.2)">\u2502</span>  <span style="color:'+p2Color+'">'+p2.score+' AI</span>';}
  updateScore();

  function dr(){
    ctx.fillStyle='#0a0a0a';ctx.fillRect(0,0,W,H);
    /* net */
    ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=2;
    for(var i=0;i<H;i+=22){ctx.beginPath();ctx.moveTo(W/2,i);ctx.lineTo(W/2,i+12);ctx.stroke();}
    /* center circle */
    ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(W/2,H/2,60,0,Math.PI*2);ctx.stroke();
    /* ball trail */
    for(var i=trail.length-1;i>=0;i--){var t=trail[i],a=(i/trail.length)*0.5;ctx.fillStyle='rgba(255,255,255,'+a+')';ctx.beginPath();ctx.arc(t.x,t.y,ball.r*0.6,0,Math.PI*2);ctx.fill();}
    /* ball */
    ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);
    var gb=ctx.createRadialGradient(ball.x-ball.r*0.3,ball.y-ball.r*0.3,ball.r*0.1,ball.x,ball.y,ball.r);
    gb.addColorStop(0,'#fff');gb.addColorStop(0.6,'rgba(255,255,255,0.8)');gb.addColorStop(1,'rgba(255,255,255,0.2)');
    ctx.fillStyle=gb;ctx.fill();
    /* ball glow */
    ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r*1.6,0,Math.PI*2);
    var gl=ctx.createRadialGradient(ball.x,ball.y,ball.r*0.5,ball.x,ball.y,ball.r*1.6);
    gl.addColorStop(0,'rgba(255,255,255,0.15)');gl.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=gl;ctx.fill();
    /* paddles */
    var grp1=ctx.createLinearGradient(0,0,pw,0);grp1.addColorStop(0,p1Color);grp1.addColorStop(1,'rgba(0,120,212,0.3)');
    ctx.fillStyle=grp1;roundRect(ctx,10,p1.y,pw,ph,6);
    var grp2=ctx.createLinearGradient(W-pw,0,W,0);grp2.addColorStop(0,'rgba(207,34,46,0.3)');grp2.addColorStop(1,p2Color);
    ctx.fillStyle=grp2;roundRect(ctx,W-10-pw,p2.y,pw,ph,6);
    /* paddle glow */
    ctx.fillStyle='rgba(0,120,212,0.08)';roundRect(ctx,6,p1.y-4,pw+8,ph+8,10);
    ctx.fillStyle='rgba(207,34,46,0.08)';roundRect(ctx,W-14-pw,p2.y-4,pw+8,ph+8,10);
    /* score flash */
    if(flashAlpha>0){ctx.fillStyle='rgba(255,255,255,'+flashAlpha+')';ctx.fillRect(0,0,W,H);flashAlpha-=0.03;}
  }

  function roundRect(c,x,y,w,h,r){
    c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.arcTo(x+w,y,x+w,y+r,r);
    c.lineTo(x+w,y+h-r);c.arcTo(x+w,y+h,x+w-r,y+h,r);c.lineTo(x+r,y+h);
    c.arcTo(x,y+h,x,y+h-r,r);c.lineTo(x,y+r);c.arcTo(x,y,x+r,y,r);c.closePath();c.fill();
  }

  function tk(){
    if(paused)return;
    /* trail */
    trail.push({x:ball.x,y:ball.y});if(trail.length>maxTrail)trail.shift();
    /* move ball */
    ball.x+=ball.dx;ball.y+=ball.dy;
    /* wall bounce */
    if(ball.y-ball.r<0){ball.y=ball.r;ball.dy*=-1;}
    if(ball.y+ball.r>H){ball.y=H-ball.r;ball.dy*=-1;}
    /* player paddle collision */
    if(ball.dx<0 && ball.x-ball.r<=10+pw && ball.x+ball.r>=10 && ball.y+ball.r>p1.y && ball.y-ball.r<p1.y+ph){
      ball.x=10+pw+ball.r;
      var hitPos=(ball.y-(p1.y+ph/2))/(ph/2);hitPos=Math.max(-1,Math.min(1,hitPos));
      ball.dx=Math.abs(ball.dx);
      ball.dy+=hitPos*3;
      var speed=Math.sqrt(ball.dx*ball.dx+ball.dy*ball.dy);
      var maxSp=10;if(speed>maxSp){ball.dx*=maxSp/speed;ball.dy*=maxSp/speed;}
      var minSp=5;if(speed<minSp){ball.dx*=minSp/speed;ball.dy*=minSp/speed;}
      trail=[];aiJitter=(Math.random()-0.5)*40;
    }
    /* AI paddle collision */
    if(ball.dx>0 && ball.x+ball.r>=W-10-pw && ball.x-ball.r<=W-10 && ball.y+ball.r>p2.y && ball.y-ball.r<p2.y+ph){
      ball.x=W-10-pw-ball.r;
      var hitPos2=(ball.y-(p2.y+ph/2))/(ph/2);hitPos2=Math.max(-1,Math.min(1,hitPos2));
      ball.dx=-Math.abs(ball.dx);
      ball.dy+=hitPos2*3;
      var speed2=Math.sqrt(ball.dx*ball.dx+ball.dy*ball.dy);
      var maxSp2=9;if(speed2>maxSp2){ball.dx*=maxSp2/speed2;ball.dy*=maxSp2/speed2;}
      var minSp2=5;if(speed2<minSp2){ball.dx*=minSp2/speed2;ball.dy*=minSp2/speed2;}
      trail=[];aiJitter=(Math.random()-0.5)*40;
    }
    /* scoring */
    if(ball.x<0){p2.score++;flashAlpha=0.4;scoreFlashSide='right';rst();}
    if(ball.x>W){p1.score++;flashAlpha=0.4;scoreFlashSide='left';rst();}
    /* AI movement */
    aiUpdateT++;if(aiUpdateT>12){aiUpdateT=0;
      if(ball.dx>0){var stepsToReach=(W-10-pw-ball.x)/Math.max(Math.abs(ball.dx),1);var predY=ball.y+ball.dy*stepsToReach;
        var refl=0;while(predY<0||predY>H){if(predY<0)predY=-predY;else predY=2*H-predY;refl++;if(refl>5)break;}
        aiTargetY=predY+aiJitter;}else{aiTargetY=H/2+aiJitter;}
    }
    var aiSpeed=0.06+Math.abs(ball.dx)*0.01;p2.y+=(aiTargetY-p2.y-ph/2)*aiSpeed;
    if(p2.y<0)p2.y=0;if(p2.y>H-ph)p2.y=H-ph;
    dr();
  }

  function rst(){
    ball.x=W/2;ball.y=H/2;
    ball.dx=(Math.random()>0.5?5:-5);ball.dy=(Math.random()-0.5)*5;
    trail=[];aiJitter=(Math.random()-0.5)*40;
    updateScore();paused=true;setTimeout(function(){paused=false;},800);
  }

  function pongMM(e){if(_gameActive!=='pong')return;var rect=cvs.getBoundingClientRect();p1.y=e.clientY-rect.top-ph/2;if(p1.y<0)p1.y=0;if(p1.y>H-ph)p1.y=H-ph;}
  document.addEventListener('mousemove', pongMM);
  function pongKD(e){if(_gameActive!=='pong')return;if(e.key==='w'||e.key==='W'||e.key==='ArrowUp'){keys[e.key]=true;e.preventDefault();}else if(e.key==='s'||e.key==='S'||e.key==='ArrowDown'){keys[e.key]=true;e.preventDefault();}}
  document.addEventListener('keydown', pongKD);
  function pongKU(e){if(_gameActive!=='pong')return;keys[e.key]=false;}
  document.addEventListener('keyup', pongKU);
  _gameEventCleanup = function(){ document.removeEventListener('mousemove', pongMM); document.removeEventListener('keydown', pongKD); document.removeEventListener('keyup', pongKU); };
  function handleKeys(){if(_gameActive!=='pong')return;var sp=6;if(keys.w||keys.W||keys.ArrowUp)p1.y-=sp;if(keys.s||keys.S||keys.ArrowDown)p1.y+=sp;if(p1.y<0)p1.y=0;if(p1.y>H-ph)p1.y=H-ph;requestAnimationFrame(function(){handleKeys();});}
  handleKeys();
  loop=setInterval(tk,1000/60);dr();
}

/* ============= MECHA BATTLE ============= */
function init_mechabattle() {
  document.getElementById('game-title').textContent = '机甲对战';
  var el = document.getElementById('game-container');
  el.innerHTML = '';

  var W = 800, H = 400, GROUND = 320;
  var cvs = document.createElement('canvas');
  cvs.width = W; cvs.height = H;
  cvs.style.cssText = 'border-radius:10px;background:#0d0d18;border:2px solid rgba(255,255,255,0.05);max-width:100%';

  var infoBar = document.createElement('div');
  infoBar.style.cssText = 'display:flex;justify-content:space-between;width:100%;max-width:800px;margin-bottom:8px;padding:0 4px';
  el.appendChild(infoBar);
  el.appendChild(cvs);

  var ctx = cvs.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  var P1 = { x: 120, y: GROUND - 50, w: 40, h: 50, vx: 0, vy: 0, hp: 100, maxHp: 100, facing: 1, grounded: true, attacking: 0, attackType: '', blocking: false, stun: 0, name: 'P1', color: '#0078D4', color2: '#3AA0FF', particles: [] };
  var P2 = { x: 640, y: GROUND - 50, w: 40, h: 50, vx: 0, vy: 0, hp: 100, maxHp: 100, facing: -1, grounded: true, attacking: 0, attackType: '', blocking: false, stun: 0, name: 'P2', color: '#CF222E', color2: '#FF5A5A', particles: [] };
  var gravity = 0.65, friction = 0.82, speed = 3.5, jumpForce = -10;
  var keys = {}, round = 1, maxRounds = 3, scores = [0, 0];
  var timer = 99, tickCounter = 0, gameState = 'countdown', countdownT = 100;
  var shakeAmount = 0, screenFlash = 0;
  var bgStars = []; for (var i = 0; i < 40; i++) bgStars.push({ x: Math.random() * W, y: Math.random() * (GROUND - 20), s: Math.random() * 1.5 + 0.5, blink: Math.random() * Math.PI * 2 });

  function rn(min, max) { return Math.random() * (max - min) + min; }

  /* Pixel art sprites (8x8 upscaled) */
  function drawMecha(c, p) {
    var x = Math.round(p.x), y = Math.round(p.y), f = p.facing, st = p.stun, atk = p.attacking;
    var swing = atk > 0 ? (atk < 6 ? -3 : 3) * f : 0;
    var stun_anim = st > 0 ? Math.sin(st * 0.5) * 2 : 0;
    if (p.blocking) { x += (Math.sin(Date.now() * 0.02) * 0.5); }

    c.save(); c.translate(x + p.w / 2, y);
    if (stun_anim) c.rotate(stun_anim * 0.1);

    var col = p.color, col2 = p.color2;
    if (st % 6 < 3 && st > 0) { col = '#fff'; col2 = '#ccc'; }
    if (p.blocking) { col = '#4488AA'; col2 = '#6699CC'; }
    if (p.blocking && p.color === '#CF222E') { col = '#884444'; col2 = '#996666'; }

    /* Legs — pixel blocks */
    c.fillStyle = '#333';
    c.fillRect(-10, 30, 8, 20); c.fillRect(2, 30, 8, 20);
    if (!p.grounded && p.vy < 0) { c.fillRect(-12, 28, 8, 16); c.fillRect(4, 28, 8, 16); }
    /* Knee joints */
    c.fillStyle = col; c.fillRect(-9, 28, 6, 4); c.fillRect(3, 28, 6, 4);
    /* Feet */
    c.fillStyle = '#222'; c.fillRect(-14, 47, 12, 4); c.fillRect(2, 47, 12, 4);

    /* Body */
    c.fillStyle = col; c.fillRect(-14, -2, 28, 34);
    c.fillStyle = col2; c.fillRect(-10, 2, 20, 26);
    /* Core reactor */
    c.fillStyle = st % 8 < 4 ? '#FFD700' : '#FF6B00';
    c.fillRect(-4, 10, 8, 8);
    c.fillStyle = 'rgba(255,200,0,0.5)'; c.fillRect(-5, 9, 10, 10);

    /* Shoulders */
    c.fillStyle = col2; c.fillRect(-19, -4, 8, 10); c.fillRect(11, -4, 8, 10);

    /* Arms */
    c.fillStyle = col;
    var armLx = -18 + swing, armLy = 6;
    c.fillRect(armLx - 4, armLy, 7, 20);
    var armRx = 11 + swing, armRy = 6;
    c.fillRect(armRx - 3, armRy, 7, 20);

    if (atk > 0 && atk < 8) {
      if (p.attackType === 'punch') {
        c.fillStyle = '#FFD700'; var px = (p.facing > 0 ? armRx - 3 + 7 : armLx - 4 - 6);
        c.fillRect(px, armRy + 4, 6, 8);
      } else if (p.attackType === 'kick') {
        c.fillStyle = '#FF6B00'; var kx = (p.facing > 0 ? -10 : 4);
        c.fillRect(kx + swing * 2, 42, 8, 8);
      }
    }

    /* Head */
    c.fillStyle = col; c.fillRect(-8, -16, 16, 16);
    /* Visor */
    c.fillStyle = st % 8 < 4 ? '#00FFCC' : '#00CCAA';
    c.fillRect(-7, -12, 14, 5);
    /* Antenna */
    c.fillStyle = col2; c.fillRect(-1, -20, 2, 6);

    c.restore();
  }

  function spawnParticles(p, count, color) {
    for (var i = 0; i < count; i++) {
      p.particles.push({ x: 0, y: -20, vx: rn(-4, 4), vy: rn(-6, -1), life: 20, maxLife: 20, color: color, size: rn(2, 5) });
    }
  }

  function updateParticles(p) {
    for (var i = p.particles.length - 1; i >= 0; i--) {
      var pt = p.particles[i]; pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.15; pt.life--;
      if (pt.life <= 0) p.particles.splice(i, 1);
    }
  }

  function drawParticles(c, p) {
    for (var i = 0; i < p.particles.length; i++) {
      var pt = p.particles[i], a = pt.life / pt.maxLife;
      c.fillStyle = 'rgba(' + (pt.color === 'blue' ? '100,180,255' : '255,100,100') + ',' + a + ')';
      c.fillRect(Math.round(p.x + p.w / 2 + pt.x), Math.round(p.y + pt.y), pt.size, pt.size);
    }
  }

  function checkHit(attacker, defender) {
    if (attacker.attacking <= 0 || attacker.attacking > 8) return;
    var ax = attacker.x + attacker.w / 2, ay = attacker.y;
    var range = attacker.attackType === 'kick' ? 55 : 40;
    var hitX = ax + attacker.facing * range;
    var hitY = ay + 20;
    var dx = Math.abs(hitX - (defender.x + defender.w / 2));
    var dy = Math.abs(hitY - (defender.y + defender.h / 2));
    if (dx < 45 && dy < 40) {
      if (defender.blocking) {
        defender.vy = -3; defender.vx = attacker.facing * 2; defender.blocking = false;
        spawnParticles(defender, 8, defender.color === '#0078D4' ? 'blue' : 'red');
        shakeAmount = 4;
      } else {
        var dmg = attacker.attackType === 'kick' ? 12 : 8;
        defender.hp = Math.max(0, defender.hp - dmg);
        defender.vx = attacker.facing * 7; defender.vy = -5;
        defender.stun = 20;
        spawnParticles(defender, 15, defender.color === '#0078D4' ? 'blue' : 'red');
        shakeAmount = 8;
        screenFlash = 8;
      }
    }
  }

  function update() {
    if (gameState === 'countdown') { countdownT--; if (countdownT <= 0) gameState = 'fighting'; return; }
    if (gameState === 'ko') return;
    if (gameState === 'roundEnd') { countdownT--; if (countdownT <= 0) resetRound(); return; }

    tickCounter++;
    if (tickCounter % 60 === 0) timer--;

    [P1, P2].forEach(function(p) {
      p.attacking = Math.max(0, p.attacking - 1);
      p.stun = Math.max(0, p.stun - 1);
      if (shakeAmount > 0) shakeAmount *= 0.85; if (shakeAmount < 0.1) shakeAmount = 0;
      if (screenFlash > 0) screenFlash *= 0.85; if (screenFlash < 0.1) screenFlash = 0;
      updateParticles(p);
    });

    /* Player 1 controls */
    if (P1.stun <= 0) {
      P1.blocking = keys['KeyH'] || keys['h'];
      if (!P1.blocking || !P1.grounded) P1.blocking = false;
      if (P1.blocking) P1.vx *= 0.5;
      if (!P1.blocking) {
        if (keys['KeyA'] || keys['a']) P1.vx = -speed;
        else if (keys['KeyD'] || keys['d']) P1.vx = speed;
        else P1.vx *= friction;
        if ((keys['KeyW'] || keys['w']) && P1.grounded) { P1.vy = jumpForce; P1.grounded = false; }
        if (P1.attacking <= 0) {
          P1.attackType = '';
          if (keys['KeyF'] || keys['f']) { P1.attacking = 14; P1.attackType = 'punch'; P1.vx = P1.facing * 2; }
          if (keys['KeyG'] || keys['g']) { P1.attacking = 18; P1.attackType = 'kick'; P1.vx = P1.facing * 3; }
        }
      }
      if (P1.vx > 0.5) P1.facing = 1; else if (P1.vx < -0.5) P1.facing = -1;
    } else { P1.vx *= 0.8; }

    /* Player 2 controls */
    if (P2.stun <= 0) {
      P2.blocking = keys['Quote'] || keys["'"];
      if (!P2.blocking || !P2.grounded) P2.blocking = false;
      if (P2.blocking) P2.vx *= 0.5;
      if (!P2.blocking) {
        if (keys['ArrowLeft']) P2.vx = -speed;
        else if (keys['ArrowRight']) P2.vx = speed;
        else P2.vx *= friction;
        if (keys['ArrowUp'] && P2.grounded) { P2.vy = jumpForce; P2.grounded = false; }
        if (P2.attacking <= 0) {
          P2.attackType = '';
          if (keys['Period'] || keys['.'] || keys['NumpadDecimal']) { P2.attacking = 14; P2.attackType = 'punch'; P2.vx = P2.facing * 2; }
          if (keys['Slash'] || keys['/'] || keys['NumpadDivide']) { P2.attacking = 18; P2.attackType = 'kick'; P2.vx = P2.facing * 3; }
        }
      }
      if (P2.vx > 0.5) P2.facing = 1; else if (P2.vx < -0.5) P2.facing = -1;
    } else { P2.vx *= 0.8; }

    /* Physics */
    [P1, P2].forEach(function(p) {
      p.x += p.vx; p.y += p.vy; p.vy += gravity;
      if (p.y + p.h >= GROUND) { p.y = GROUND - p.h; p.vy = 0; p.grounded = true; }
      if (p.x < 10) p.x = 10; if (p.x + p.w > W - 10) p.x = W - 10 - p.w;
    });

    /* Hit detection */
    checkHit(P1, P2); checkHit(P2, P1);

    /* KO check */
    if (P1.hp <= 0 || timer <= 0) { scores[1]++; gameState = 'roundEnd'; countdownT = 120; }
    else if (P2.hp <= 0 || timer <= 0) { scores[0]++; gameState = 'roundEnd'; countdownT = 120; }
  }

  function draw() {
    var sx = shakeAmount > 0 ? Math.sin(Date.now() * 0.5) * shakeAmount : 0;
    ctx.save(); ctx.translate(sx, 0);

    ctx.fillStyle = '#0d0d18'; ctx.fillRect(0, 0, W, H);
    /* Stars */
    for (var i = 0; i < bgStars.length; i++) {
      var s = bgStars[i], a = 0.3 + Math.sin(Date.now() * 0.003 + s.blink) * 0.2;
      ctx.fillStyle = 'rgba(255,255,255,' + a + ')'; ctx.fillRect(Math.round(s.x), Math.round(s.y), s.s, s.s);
    }
    /* City skyline */
    ctx.fillStyle = '#111122';
    for (var bx = 0; bx < W; bx += 35) {
      var bh = 30 + Math.sin(bx * 0.3) * 25 + Math.cos(bx * 0.7) * 15;
      ctx.fillRect(bx, GROUND - bh, 30, bh);
      ctx.fillStyle = '#1a1a30'; ctx.fillRect(bx + 6, GROUND - bh + 5, 6, 4);
      ctx.fillStyle = '#111122';
    }
    /* Ground */
    ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (var gl = 0; gl < W; gl += 40) ctx.fillRect(gl, GROUND, 20, 2);

    /* Screen flash */
    if (screenFlash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (screenFlash * 0.02) + ')'; ctx.fillRect(0, 0, W, H); }

    /* Draw mechas (sorted by Y) */
    var order = [P1, P2].sort(function(a, b) { return a.y - b.y; });
    order.forEach(function(p) { drawMecha(ctx, p); drawParticles(ctx, p); });

    ctx.restore();

    /* HUD */
    var hudY = 10, barW = 200, barH = 14;
    drawHPBar(ctx, 20, hudY, barW, barH, P1.hp, P1.maxHp, '#0078D4', 'BLUE');
    drawHPBar(ctx, W - 20 - barW, hudY, barW, barH, P2.hp, P2.maxHp, '#CF222E', 'RED');
    /* Timer */
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center';
    ctx.fillText(timer, W / 2, hudY + 14);
    /* Round */
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '10px monospace';
    ctx.fillText('ROUND ' + round + '/' + maxRounds, W / 2, hudY + 30);
    /* Scores */
    ctx.fillStyle = '#0078D4'; ctx.fillText('\u25CF'.repeat(scores[0]), W / 2 - 40, hudY + 44);
    ctx.fillStyle = '#CF222E'; ctx.fillText('\u25CF'.repeat(scores[1]), W / 2 + 20, hudY + 44);

    /* Controls hint */
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
    ctx.fillText('P1: WASD  F\u653B G\u8E22 H\u9632', 14, H - 8);
    ctx.textAlign = 'right';
    ctx.fillText('P2: \u2190\u2191\u2193\u2192  .\u653B /\u8E22 \'\u9632', W - 14, H - 8);
    ctx.textAlign = 'start';

    /* Countdown */
    if (gameState === 'countdown') {
      var num = Math.ceil(countdownT / 35);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 64px monospace'; ctx.textAlign = 'center';
      ctx.fillText(num > 0 ? num : 'FIGHT!', W / 2, H / 2 + 20); ctx.textAlign = 'start';
    }
    if (gameState === 'roundEnd') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 28px monospace'; ctx.textAlign = 'center';
      var winName = P1.hp <= 0 || (timer <= 0 && P1.hp < P2.hp) ? 'RED WINS!' : 'BLUE WINS!';
      if (timer <= 0 && P1.hp === P2.hp) winName = 'DRAW!';
      ctx.fillText(winName, W / 2, H / 2);
      if (scores[0] >= maxRounds || scores[1] >= maxRounds) {
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 20px monospace';
        ctx.fillText('GAME OVER', W / 2, H / 2 + 40);
        ctx.fillStyle = '#fff'; ctx.font = '14px monospace';
        ctx.fillText('Press R to restart', W / 2, H / 2 + 65);
        gameState = 'ko';
      }
      ctx.textAlign = 'start';
    }
  }

  function drawHPBar(c, x, y, w, h, hp, max, color, label) {
    c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(x - 1, y - 1, w + 2, h + 8);
    c.fillStyle = '#fff'; c.font = 'bold 10px monospace'; c.textAlign = 'left';
    c.fillText(label, x + 4, y - 2);
    c.fillStyle = '#333'; c.fillRect(x, y + 4, w, h);
    var ratio = Math.max(0, hp / max);
    var barCol = ratio > 0.5 ? color : ratio > 0.25 ? '#FFD700' : '#CF222E';
    c.fillStyle = barCol; c.fillRect(x, y + 4, w * ratio, h);
    c.strokeStyle = 'rgba(255,255,255,0.2)'; c.strokeRect(x, y + 4, w, h);
    c.fillStyle = '#fff'; c.font = 'bold 9px monospace'; c.textAlign = 'center';
    c.fillText(Math.ceil(hp), x + w / 2, y + 4 + h - 3);
    c.textAlign = 'start';
  }

  function resetRound() {
    round++;
    if (scores[0] >= maxRounds || scores[1] >= maxRounds) { gameState = 'roundEnd'; countdownT = 120; return; }
    P1.x = 120; P1.y = GROUND - 50; P1.vx = 0; P1.vy = 0; P1.hp = 100; P1.stun = 0; P1.attacking = 0; P1.blocking = false; P1.particles = []; P1.facing = 1;
    P2.x = 640; P2.y = GROUND - 50; P2.vx = 0; P2.vy = 0; P2.hp = 100; P2.stun = 0; P2.attacking = 0; P2.blocking = false; P2.particles = []; P2.facing = -1;
    timer = 99; shakeAmount = 0; screenFlash = 0; gameState = 'countdown'; countdownT = 100;
  }

  function fullReset() {
    round = 1; scores = [0, 0];
    P1.x = 120; P1.y = GROUND - 50; P1.vx = 0; P1.vy = 0; P1.hp = 100; P1.stun = 0; P1.attacking = 0; P1.blocking = false; P1.particles = []; P1.facing = 1;
    P2.x = 640; P2.y = GROUND - 50; P2.vx = 0; P2.vy = 0; P2.hp = 100; P2.stun = 0; P2.attacking = 0; P2.blocking = false; P2.particles = []; P2.facing = -1;
    timer = 99; shakeAmount = 0; screenFlash = 0; gameState = 'countdown'; countdownT = 100;
  }

  function mechKD(e) {
    if (_gameActive !== 'mechabattle') return;
    if (gameState === 'ko' && (e.key === 'r' || e.key === 'R')) { fullReset(); return; }
    keys[e.key] = keys[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'Period', 'Slash', 'Quote'].some(function(k) { return e.code === k; })) e.preventDefault();
  }
  document.addEventListener('keydown', mechKD);
  function mechKU(e) {
    if (_gameActive !== 'mechabattle') return;
    keys[e.key] = keys[e.code] = false;
  }
  document.addEventListener('keyup', mechKU);
  _gameEventCleanup = function(){ document.removeEventListener('keydown', mechKD); document.removeEventListener('keyup', mechKU); };

  function loop() {
    if (_gameActive !== 'mechabattle') return;
    update(); draw(); requestAnimationFrame(loop);
  }
  loop();
}