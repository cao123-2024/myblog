var _gameActive = null;

function render_games() {
  var wrap = document.createElement('div');
  wrap.className = 'stagger';

  var hdr = document.createElement('div');
  hdr.style.cssText = 'margin-bottom:20px';
  hdr.innerHTML = '<h2 style="font-size:1.4rem;font-weight:700">游戏中心</h2>'
    + '<p class="text-sm text-secondary">选择一款游戏开始游玩</p>';
  wrap.appendChild(hdr);

  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:24px';

  var games = [
    {id:'gomoku',name:'五子棋',desc:'AI对战',icon:'♟️',color:'#BF7B00'},
    {id:'2048',name:'2048',desc:'合并数字',icon:'2',color:'#0078D4'},
    {id:'snake',name:'贪吃蛇',desc:'经典蛇',icon:'🐍',color:'#1A7F37'},
    {id:'minesweeper',name:'扫雷',desc:'排雷',icon:'💣',color:'#CF222E'},
    {id:'sudoku',name:'数独',desc:'9x9谜题',icon:'9',color:'#8250DF'},
    {id:'tetris',name:'俄罗斯方块',desc:'消除',icon:'🧱',color:'#BC4C2A'},
    {id:'breakout',name:'打砖块',desc:'弹球',icon:'🎾',color:'#D63384'},
    {id:'pong',name:'乒乓球',desc:'对打',icon:'🏓',color:'#00C6FF'}
  ];

  games.forEach(function(g){
    grid.innerHTML += '<div class="card-glass game-grid-card" style="padding:16px;cursor:pointer;text-align:center" onclick="launchGame(\''+g.id+'\')">'
      + '<div style="font-size:2rem;margin-bottom:6px">'+g.icon+'</div>'
      + '<h3 style="font-size:0.9rem;font-weight:600;margin-bottom:2px">'+g.name+'</h3>'
      + '<p class="text-xs text-secondary">'+g.desc+'</p>'
      + '</div>';
  });
  wrap.appendChild(grid);

  var canvas = document.createElement('div');
  canvas.id = 'game-canvas';
  canvas.style.cssText = 'display:none';
  wrap.appendChild(canvas);
  return wrap;
}

function launchGame(id) {
  _gameActive = id;
  var c = document.getElementById('game-canvas');
  c.style.display = 'block';
  c.innerHTML = ''
    + '<div class="card-glass" style="padding:12px 16px;margin-bottom:12px">'
    + '<div class="flex items-center justify-between">'
    + '<h3 style="font-size:1rem;font-weight:600" id="game-title"></h3>'
    + '<button class="btn btn-glass btn-sm" onclick="closeGame()">← 返回列表</button>'
    + '</div></div>'
    + '<div id="game-container" style="display:flex;justify-content:center"></div>';
  setTimeout(function(){ window['init_'+id](); }, 50);
}

function closeGame() {
  _gameActive = null;
  var c = document.getElementById('game-canvas');
  c.style.display = 'none';
  c.innerHTML = '';
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
  function draw(dead){var h='<div style="display:inline-grid;grid-template-columns:repeat('+C+',34px);gap:2px">';for(var r=0;r<R;r++)for(var c=0;c<C;c++){var cls='gcell',txt='',bg='';if(revealed[r][c]){if(board[r][c]===-1){bg='#CF222E';txt='💣'}else{txt=board[r][c]||'';bg='rgba(255,255,255,0.06)';var cols=['','#0078D4','#1A7F37','#CF222E','#8250DF','#BF7B00','#00C6FF','#333','#888'];if(board[r][c])cls+='" style="color:'+cols[board[r][c]]}}}else if(flagged[r][c]){txt='🚩';bg='rgba(255,255,255,0.04)'}if(dead&&board[r][c]===-1&&!flagged[r][c]){txt='💣';bg='rgba(255,255,255,0.06)'}h+='<div class="'+cls+'" style="width:34px;height:34px;cursor:pointer;font-size:0.85rem;background:'+(bg||'rgba(255,255,255,0.03)')+'" onclick="msClick('+r+','+c+')" oncontextmenu="msFlag('+r+','+c+');return false">'+txt+'</div>'}h+='</div>';document.getElementById('ms-grid').innerHTML=h}
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

/* ===== Gomoku AI — 4 difficulty levels ===== */
var _gomokuDifficulty = 'medium'; /* medium by default */

function init_gomoku() {
  var el = document.getElementById('game-container');
  el.innerHTML = '';
  el.style.cssText = 'display:flex;flex-direction:column;align-items:center';

  /* Difficulty picker screen */
  var title = document.createElement('h3');
  title.textContent = '选择难度';
  title.style.cssText = 'font-size:1.1rem;font-weight:600;margin-bottom:16px';
  el.appendChild(title);

  var diffs = [
    { id: 'easy',    name: '简单',   desc: '随机+基础防守',      color: '#1A7F37' },
    { id: 'medium',  name: '中等',   desc: '完整棋型识别 · 当前难度', color: '#BF7B00' },
    { id: 'hard',    name: '困难',   desc: '2层前瞻搜索 · 堵冲四活三', color: '#CF222E' },
    { id: 'master',  name: '大师',   desc: '4层深度搜索 · 人类无法战胜', color: '#8250DF' }
  ];

  diffs.forEach(function(d){
    var card = document.createElement('div');
    card.className = 'card-glass';
    card.style.cssText = 'width:340px;max-width:100%;padding:16px 20px;margin-bottom:10px;cursor:pointer;display:flex;align-items:center;gap:14px;transition:all 0.25s var(--jelly-soft)';
    card.onmouseenter = function(){ card.style.boxShadow = '0 0 0 2px ' + d.color + ', var(--shadow-07)'; card.style.transform = 'translateX(4px)'; };
    card.onmouseleave = function(){ card.style.boxShadow = ''; card.style.transform = ''; };
    card.onclick = function(){ startGomokuRound(d.id); };
    card.innerHTML = '<div style="width:40px;height:40px;border-radius:50%;background:'+d.color+';display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.2rem;flex-shrink:0">'+(d.id==='easy'?'☆':d.id==='medium'?'⚡':d.id==='hard'?'🔥':'👑')+'</div>'
      + '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:0.95rem">'+d.name+'</div><div class="text-xs text-secondary">'+d.desc+'</div></div>'
      + '<span style="color:'+d.color+';font-size:1.2rem">▶</span>';
    el.appendChild(card);
  });
}

function startGomokuRound(diff) {
  _gomokuDifficulty = diff;
  document.getElementById('game-title').textContent = '五子棋 · ' + (diff==='easy'?'简单':diff==='medium'?'中等':diff==='hard'?'困难':'大师');

  var size = 15, CELL = 34, BORDER = 5;
  var board = [], turn = 1, gameOver = false, lastMove = null;

  var canvas = document.createElement('canvas');
  canvas.width = CELL * size + 10;
  canvas.height = CELL * size + 10;
  canvas.style.cssText = 'border-radius:var(--radius-lg);background:#1a1a1a;cursor:pointer;max-width:100%';

  var status = document.createElement('div');
  status.style.cssText = 'margin:8px 0;text-align:center;font-weight:500';
  status.textContent = '你的回合 - 黑棋♟️';

  /* Drawing */
  function drawBoard() {
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    for (var i = 0; i < size; i++) {
      ctx.beginPath(); ctx.moveTo(BORDER, BORDER + i * CELL); ctx.lineTo(BORDER + (size - 1) * CELL, BORDER + i * CELL); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(BORDER + i * CELL, BORDER); ctx.lineTo(BORDER + i * CELL, BORDER + (size - 1) * CELL); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    [[3,3],[3,7],[3,11],[7,3],[7,7],[7,11],[11,3],[11,7],[11,11]].forEach(function(p) {
      ctx.beginPath(); ctx.arc(BORDER + p[0] * CELL, BORDER + p[1] * CELL, 3, 0, Math.PI * 2); ctx.fill();
    });
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      if (!board[y][x]) continue;
      var cx = BORDER + x * CELL, cy = BORDER + y * CELL, r = CELL * 0.42;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      var g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
      if (board[y][x] === 1) { g.addColorStop(0, '#fff'); g.addColorStop(1, '#888'); }
      else { g.addColorStop(0, '#555'); g.addColorStop(1, '#111'); }
      ctx.fillStyle = g; ctx.fill();
    }
    if (lastMove) {
      var lcx = BORDER + lastMove.x * CELL, lcy = BORDER + lastMove.y * CELL;
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(lcx, lcy, CELL * 0.44, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  function checkWin(bx, by) {
    var me = board[by][bx], dirs = [[1,0],[0,1],[1,1],[1,-1]];
    for (var d = 0; d < 4; d++) {
      var cnt = 1;
      for (var s = 1; s < 5; s++) { var nx = bx + dirs[d][0] * s, ny = by + dirs[d][1] * s; if (nx >= 0 && nx < size && ny >= 0 && ny < size && board[ny][nx] === me) cnt++; else break; }
      for (var s = 1; s < 5; s++) { var nx = bx - dirs[d][0] * s, ny = by - dirs[d][1] * s; if (nx >= 0 && nx < size && ny >= 0 && ny < size && board[ny][nx] === me) cnt++; else break; }
      if (cnt >= 5) return true;
    }
    return false;
  }

  /* === AI Engines === */
  var DIRS = [[1,0],[0,1],[1,1],[1,-1]];
  var FIVE = 7, L4 = 6, S4 = 5, L3 = 4, S3 = 3, L2 = 2, S2 = 1;

  /* Get candidate moves: only empty cells near existing stones */
  function getCandidates(radius) {
    radius = radius || 2;
    var near = [];
    for (var y = 0; y < size; y++) { near[y] = []; for (var x = 0; x < size; x++) near[y][x] = false; }
    var foundStone = false;
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      if (board[y][x] !== 0) {
        foundStone = true;
        for (var dy = -radius; dy <= radius; dy++) for (var dx = -radius; dx <= radius; dx++) {
          var ny = y + dy, nx = x + dx;
          if (nx >= 0 && nx < size && ny >= 0 && ny < size && board[ny][nx] === 0) near[ny][nx] = true;
        }
      }
    }
    if (!foundStone) return [[7, 7]]; /* first move: center */
    var result = [];
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      if (near[y][x]) result.push([x, y]);
    }
    return result;
  }

  /* === Evaluate engine (shared by all difficulties) === */
  var evalRecord = [], evalCount = [[], []];
  for (var y = 0; y < size; y++) { evalRecord[y] = []; for (var x = 0; x < size; x++) evalRecord[y][x] = [0, 0, 0, 0]; }
  for (var c = 0; c < 2; c++) { evalCount[c] = []; for (var i = 0; i < 8; i++) evalCount[c][i] = 0; }

  function getLine(bx, by, di, you) {
    var line = Array(9).fill(you);
    var tx = bx - 5 * DIRS[di][0], ty = by - 5 * DIRS[di][1];
    for (var i = 0; i < 9; i++) { tx += DIRS[di][0]; ty += DIRS[di][1]; if (tx >= 0 && tx < size && ty >= 0 && ty < size) line[i] = board[ty][tx]; }
    return line;
  }
  function setRecord(bx, by, left, right, di) {
    var tx = bx + (-5 + left) * DIRS[di][0], ty = by + (-5 + left) * DIRS[di][1];
    for (var i = left; i < right; i++) { tx += DIRS[di][0]; ty += DIRS[di][1]; if (ty >= 0 && ty < size && tx >= 0 && tx < size) evalRecord[ty][tx][di] = 1; }
  }

  function analyzeLine(bx, by, di, me, you, cnt) {
    var line = getLine(bx, by, di, you);
    var li = 4, ri = 4;
    while (ri < 8 && line[ri + 1] === me) ri++;
    while (li > 0 && line[li - 1] === me) li--;
    var lr = li, rr = ri;
    while (rr < 8 && line[rr + 1] !== you) rr++;
    while (lr > 0 && line[lr - 1] !== you) lr--;
    var range = rr - lr + 1;
    if (range < 5) { setRecord(bx, by, lr, rr, di); return; }
    setRecord(bx, by, li, ri, di);
    var mRange = ri - li + 1;
    if (mRange === 5) { cnt[FIVE]++; return; }
    if (mRange === 4) { cnt[line[li - 1] === 0 && line[ri + 1] === 0 ? L4 : S4]++; return; }
    if (mRange === 3) {
      var le = line[li - 1] === 0, re = line[ri + 1] === 0;
      if (le && re) { if (range > 5) cnt[L3]++; else cnt[S3]++; }
      else if (le || re) { cnt[S3]++; }
      return;
    }
    if (mRange === 2) {
      var le = line[li - 1] === 0, re = line[ri + 1] === 0, l2 = line[li - 2] === me, r2 = line[ri + 2] === me;
      var leftThree = false, rightThree = false;
      if (le && l2) { setRecord(bx, by, li - 2, li - 1, di); if (line[li - 3] === 0) { if (re) cnt[L3]++; else cnt[S3]++; leftThree = true; } else if (line[li - 3] === you && re) { cnt[S3]++; leftThree = true; } }
      if (re && r2) { if (line[ri + 3] === me) { setRecord(bx, by, ri + 1, ri + 2, di); cnt[S4]++; rightThree = true; } else if (line[ri + 3] === 0) { if (le) cnt[L3]++; else cnt[S3]++; rightThree = true; } else if (le) { cnt[S3]++; rightThree = true; } }
      if (leftThree || rightThree) return;
      if (le && re) cnt[L2]++; else if (le || re) cnt[S2]++;
      return;
    }
    if (mRange === 1) {
      var le = line[li - 1] === 0, re = line[ri + 1] === 0;
      if (le && line[li - 2] === me && line[li - 3] === 0 && line[ri + 1] === you) cnt[S2]++;
      if (re && line[ri + 2] === me && line[ri + 3] === 0) { if (le) cnt[L2]++; else cnt[S2]++; }
    }
  }

  function fullEvaluate() {
    for (var c = 0; c < 2; c++) for (var i = 0; i < 8; i++) evalCount[c][i] = 0;
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) evalRecord[y][x] = [0, 0, 0, 0];
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      if (board[y][x] === 0) continue;
      for (var d = 0; d < 4; d++) {
        if (evalRecord[y][x][d]) continue;
        var me = board[y][x];
        analyzeLine(x, y, d, me, me === 1 ? 2 : 1, evalCount[me - 1]);
      }
    }
    if (evalCount[0][FIVE]) return 100000; if (evalCount[1][FIVE]) return -100000;
    var my = evalCount[0], yr = evalCount[1];
    if (yr[L4]) return -9050; if (yr[S4]) return -9040; if (my[L4]) return 9030;
    if (my[S4] && my[L3]) return 9020;
    if (yr[L3] && my[S4] === 0) return -9010;
    if (my[L3] > 1 && yr[L3] === 0 && yr[S3] === 0) return 9000;
    var mscore = 0, oscore = 0;
    if (my[S4]) mscore += 2000;
    if (my[L3] > 1) mscore += 500; else if (my[L3] > 0) mscore += 100;
    if (yr[L3] > 1) oscore += 2000; else if (yr[L3] > 0) oscore += 400;
    if (my[S3]) mscore += my[S3] * 10; if (yr[S3]) oscore += yr[S3] * 10;
    if (my[L2]) mscore += my[L2] * 4; if (yr[L2]) oscore += yr[L2] * 4;
    if (my[S2]) mscore += my[S2] * 4; if (yr[S2]) oscore += yr[S2] * 4;
    return mscore - oscore;
  }

  function simpleEvaluate() {
    /* Score each empty cell by counting consecutive stones in all 4 directions */
    var bestScore = -Infinity, bx = 7, by = 7;
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      if (board[y][x] !== 0) continue;
      var atkScore = 0, defScore = 0;
      for (var d = 0; d < 4; d++) {
        /* Attack: AI placing here */
        var a3 = 0, a2 = 0, a1 = 0;
        for (var s = 1; s <= 4; s++) { var nx = x + DIRS[d][0] * s, ny = y + DIRS[d][1] * s; if (nx >= 0 && nx < size && ny >= 0 && ny < size && board[ny][nx] === 2) a3++; else break; }
        for (var s = 1; s <= 4; s++) { var nx = x - DIRS[d][0] * s, ny = y - DIRS[d][1] * s; if (nx >= 0 && nx < size && ny >= 0 && ny < size && board[ny][nx] === 2) a3++; else break; }
        /* Defense: block player */
        var d3 = 0;
        for (var s = 1; s <= 4; s++) { var nx = x + DIRS[d][0] * s, ny = y + DIRS[d][1] * s; if (nx >= 0 && nx < size && ny >= 0 && ny < size && board[ny][nx] === 1) d3++; else break; }
        for (var s = 1; s <= 4; s++) { var nx = x - DIRS[d][0] * s, ny = y - DIRS[d][1] * s; if (nx >= 0 && nx < size && ny >= 0 && ny < size && board[ny][nx] === 1) d3++; else break; }
        atkScore += a3 * 10 + a2 * 2;
        defScore += d3 >= 3 ? 100 : d3 >= 2 ? 20 : d3;
      }
      /* Center bonus */
      var cx = size / 2 - 1;
      var center = size - Math.max(Math.abs(x - cx), Math.abs(y - cx));
      var score = Math.max(atkScore, defScore * 1.2) + center * 0.5 + Math.random() * 2;
      if (score > bestScore) { bestScore = score; bx = x; by = y; }
    }
    return [bx, by];
  }

  /* === Depth-limited Minimax (Hard & Master) === */
  var MAX_DEPTH = (diff === 'master' ? 4 : 2);
  var posScore = [];
  for (var y = 0; y < size; y++) { posScore[y] = []; for (var x = 0; x < size; x++) { var cx2 = size / 2 - 1; posScore[y][x] = size - Math.max(Math.abs(x - cx2), Math.abs(y - cx2)); } }

  function minimax(depth, alpha, beta, maximizing) {
    /* Check terminal */
    if (depth === 0) {
      return fullEvaluate();
    }
    var candidates = getCandidates(2);
    /* Sort by quick heuristic: prefer center */
    candidates.sort(function(a, b) {
      return posScore[b[1]][b[0]] - posScore[a[1]][a[0]];
    });
    /* Limit candidates for performance */
    if (candidates.length > (diff === 'master' ? 25 : 15)) {
      candidates = candidates.slice(0, (diff === 'master' ? 25 : 15));
    }

    if (maximizing) {
      var best = -Infinity;
      for (var i = 0; i < candidates.length; i++) {
        var x = candidates[i][0], y = candidates[i][1];
        board[y][x] = 2;
        var val = minimax(depth - 1, alpha, beta, false);
        board[y][x] = 0;
        if (val > best) best = val;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
      }
      return best;
    } else {
      var best = Infinity;
      for (var i = 0; i < candidates.length; i++) {
        var x = candidates[i][0], y = candidates[i][1];
        board[y][x] = 1;
        var val = minimax(depth - 1, alpha, beta, true);
        board[y][x] = 0;
        if (val < best) best = val;
        if (best < beta) beta = best;
        if (alpha >= beta) break;
      }
      return best;
    }
  }

  function aiMoveHard(depthOverride) {
    var maxDepth = depthOverride || MAX_DEPTH;
    var candidates = getCandidates(2);
    if (candidates.length === 0) return;
    candidates.sort(function(a, b) { return posScore[b[1]][b[0]] - posScore[a[1]][a[0]]; });
    if (candidates.length > 20) candidates = candidates.slice(0, 20);

    var bestScore = -Infinity, bx = -1, by = -1;
    for (var i = 0; i < candidates.length; i++) {
      var x = candidates[i][0], y = candidates[i][1];
      board[y][x] = 2;
      var val = minimax(maxDepth, -Infinity, Infinity, false);
      board[y][x] = 0;
      if (val > bestScore) { bestScore = val; bx = x; by = y; }
    }
    if (bx < 0) return;
    board[by][bx] = 2;
    lastMove = { x: bx, y: by };
    drawBoard();
    if (checkWin(bx, by)) { gameOver = true; status.textContent = 'AI赢了!🤖'; toast('AI赢了!', 'error'); return; }
    turn = 1; status.textContent = '你的回合 - 黑棋♟️';
  }

  function aiMoveMedium() {
    if (gameOver) return;
    var bestScore = -Infinity, bx = -1, by = -1;
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
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
    if (checkWin(bx, by)) { gameOver = true; status.textContent = 'AI赢了!🤖'; toast('AI赢了!', 'error'); return; }
    turn = 1; status.textContent = '你的回合 - 黑棋♟️';
  }

  function aiMoveEasy() {
    if (gameOver) return;
    var move = simpleEvaluate();
    var bx = move[0], by = move[1];
    board[by][bx] = 2;
    lastMove = { x: bx, y: by };
    drawBoard();
    if (checkWin(bx, by)) { gameOver = true; status.textContent = 'AI赢了!🤖'; toast('AI赢了!', 'error'); return; }
    turn = 1; status.textContent = '你的回合 - 黑棋♟️';
  }

  function aiMove() {
    if (diff === 'easy') aiMoveEasy();
    else if (diff === 'hard' || diff === 'master') aiMoveHard();
    else aiMoveMedium();
  }

  window.gomokuClick = function(e) {
    if (gameOver || turn !== 1) return;
    var rect = canvas.getBoundingClientRect();
    var x = Math.round((e.clientX - rect.left - BORDER) / CELL), y = Math.round((e.clientY - rect.top - BORDER) / CELL);
    if (x < 0 || x >= size || y < 0 || y >= size || board[y][x] !== 0) return;
    board[y][x] = 1; lastMove = { x: x, y: y }; drawBoard();
    if (checkWin(x, y)) { gameOver = true; status.textContent = '你赢了!🎉'; toast('你赢了!', 'success'); return; }
    turn = 2; status.textContent = 'AI思考中...';
    setTimeout(aiMove, diff === 'master' ? 50 : diff === 'hard' ? 100 : 150);
  };

  canvas.addEventListener('click', window.gomokuClick);

  function initBoard() {
    board = Array.from({ length: size }, function() { return Array(size).fill(0); });
    turn = 1; gameOver = false; lastMove = null;
    status.textContent = '你的回合 - 黑棋♟️';
    drawBoard();
  }

  var el2 = document.getElementById('game-container');
  el2.innerHTML = '';
  el2.style.cssText = 'display:flex;flex-direction:column;align-items:center';
  el2.appendChild(status);
  var btnWrap = document.createElement('div');
  btnWrap.style.cssText = 'text-align:center;margin:6px 0;display:flex;gap:8px';
  btnWrap.innerHTML = '<button class="btn btn-glass btn-sm" onclick="init_gomoku()">选择难度</button><button class="btn btn-glass btn-sm" onclick="startGomokuRound(\'' + diff + '\')">新游戏</button>';
  el2.appendChild(btnWrap);
  el2.appendChild(canvas);
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
