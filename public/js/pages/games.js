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
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:24px';

  var games = [
    {id:'gomoku',name:'五子棋',desc:'AI对战·15x15棋盘',icon:'♟️',color:'#BF7B00'},
    {id:'2048',name:'2048',desc:'合并数字到2048',icon:'2',color:'#0078D4'},
    {id:'snake',name:'贪吃蛇',desc:'经典贪吃蛇',icon:'🐍',color:'#1A7F37'},
    {id:'minesweeper',name:'扫雷',desc:'经典扫雷',icon:'💣',color:'#CF222E'},
    {id:'sudoku',name:'数独',desc:'9x9数字谜题',icon:'9',color:'#8250DF'}
  ];

  games.forEach(function(g){
    grid.innerHTML += '<div class="card-glass game-grid-card" style="padding:20px;cursor:pointer;text-align:center" onclick="launchGame(\''+g.id+'\')">'
      + '<div style="font-size:2.5rem;margin-bottom:8px">'+g.icon+'</div>'
      + '<h3 style="font-size:1rem;font-weight:600;margin-bottom:4px">'+g.name+'</h3>'
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
    + '<div class="card-glass" style="padding:16px;margin-bottom:12px">'
    + '<div class="flex items-center justify-between">'
    + '<h3 style="font-size:1rem;font-weight:600" id="game-title"></h3>'
    + '<button class="btn btn-glass btn-sm" onclick="closeGame()">← 返回列表</button>'
    + '</div>'
    + '</div>'
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
  var s='<style>.g2048{display:inline-grid;grid-template-columns:repeat(4,70px);gap:8px;padding:12px;background:var(--bg-glass);border-radius:var(--radius-lg)}.gcell{width:70px;height:70px;border-radius:var(--radius-sm);background:rgba(255,255,255,0.03);display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:700}</style>';
  var el=document.getElementById('game-container');
  el.innerHTML=s+'<div><div style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center"><span class="font-medium">分数: <b id="s2048">0</b></span><button class="btn btn-glass btn-sm" onclick="init_2048()">新游戏</button></div><div class="g2048" id="g2048"></div></div>';
  var board=[],score=0;
  function empty(){var r=[];for(var y=0;y<4;y++)for(var x=0;x<4;x++)if(!board[y][x])r.push([y,x]);return r}
  function add(){var e=empty();if(!e.length)return;var p=e[Math.floor(Math.random()*e.length)];board[p[0]][p[1]]=Math.random()<0.9?2:4}
  function draw(){var h='';for(var y=0;y<4;y++)for(var x=0;x<4;x++){var v=board[y][x];var c=v===0?'':(v<8?'rgba(255,255,255,0.08)':v<64?'rgba(0,120,212,0.3)':v<512?'rgba(0,120,212,0.5)':'rgba(0,120,212,0.7)');h+='<div class="gcell" style="background:'+c+'">'+(v||'')+'</div>'}document.getElementById('g2048').innerHTML=h;document.getElementById('s2048').textContent=score}
  function move(dir){var moved=false;function slide(row){var a=row.filter(function(v){return v});while(a.length<4)a.push(0);for(var i=0;i<3;i++){if(a[i]&&a[i]===a[i+1]){a[i]*=2;score+=a[i];a[i+1]=0;i++}}a=a.filter(function(v){return v});while(a.length<4)a.push(0);return a}var lines=[];for(var i=0;i<4;i++){var r=[];for(var j=0;j<4;j++){var y=dir===0?i:dir===2?3-i:j,x=dir===1?j:dir===3?3-j:dir===0?j:i;r.push(board[y][x])}var s=slide(r);for(var j=0;j<4;j++){var y=dir===0?i:dir===2?3-i:j,x=dir===1?j:dir===3?3-j:dir===0?j:i;if(board[y][x]!==s[j])moved=true;board[y][x]=s[j]}}return moved}
  function start(){board=[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];score=0;add();add();draw()}
  document.addEventListener('keydown',function k(e){if(_gameActive!=='2048')return;var d={ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3}[e.key];if(d===undefined)return;e.preventDefault();if(move(d)){add();draw();if(!empty().length){var over=true;for(var y=0;y<4;y++)for(var x=0;x<3;x++)if(board[y][x]===board[y][x+1]||(y<3&&board[y][x]===board[y+1][x]))over=false;if(over)toast('游戏结束!'+score,'info')}}});
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
  function draw(dead){var h='<div style="display:inline-grid;grid-template-columns:repeat('+C+',36px);gap:2px">';for(var r=0;r<R;r++)for(var c=0;c<C;c++){var cls='gcell',txt='',bg='';if(revealed[r][c]){if(board[r][c]===-1){bg='#CF222E';txt='💣'}else{txt=board[r][c]||'';bg='rgba(255,255,255,0.06)';var cols=['','#0078D4','#1A7F37','#CF222E','#8250DF','#BF7B00','#00C6FF','#333','#888'];if(board[r][c])cls+='" style="color:'+cols[board[r][c]]}}}else if(flagged[r][c]){txt='🚩';bg='rgba(255,255,255,0.04)'}if(dead&&board[r][c]===-1&&!flagged[r][c]){txt='💣';bg='rgba(255,255,255,0.06)'}h+='<div class="'+cls+'" style="width:36px;height:36px;cursor:pointer;font-size:0.9rem;background:'+(bg||'rgba(255,255,255,0.03)')+'" onclick="msClick('+r+','+c+')" oncontextmenu="msFlag('+r+','+c+');return false">'+txt+'</div>'}h+='</div>';document.getElementById('ms-grid').innerHTML=h}
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
  function draw(){var h='<table style="border-collapse:collapse;margin:0 auto">';for(var r=0;r<9;r++){h+='<tr>';for(var c=0;c<9;c++){var v=puzzle[r][c],isG=v!==0;var br='',bb='';if(c%3===0&&c>0)br='border-left:2px solid var(--blue)';if(r%3===0&&r>0)bb='border-top:2px solid var(--blue)';h+='<td style="width:40px;height:40px;text-align:center;cursor:'+(isG?'default':'pointer')+';'+(isG?'font-weight:600':'color:var(--text-tertiary)')+';'+br+';'+bb+';border:1px solid var(--border-subtle)" onclick="sdClick('+r+','+c+')">'+(v||'')+'</td>'}h+='</tr>'}h+='</table>';document.getElementById('sd-grid').innerHTML=h}
  window.sdClick=function(r,c){if(puzzle[r][c]!==0)return;var v=prompt('输入数字 1-9:');if(!v)return;var n=parseInt(v);if(n<1||n>9)return;var valid=true;for(var i=0;i<9;i++){if(board[r][i]===n||board[i][c]===n)valid=false}var br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;for(var i=0;i<3;i++)for(var j=0;j<3;j++)if(board[br+i][bc+j]===n)valid=false;if(valid){puzzle[r][c]=n;board[r][c]=n;draw();var done=true;for(var i=0;i<9;i++)for(var j=0;j<9;j++)if(puzzle[i][j]===0)done=false;if(done)toast('数独完成!','success')}else{toast('数字冲突!','error');puzzle[r][c]=0}};
  var el=document.getElementById('game-container');
  el.innerHTML='<div><div style="margin-bottom:8px"><button class="btn btn-glass btn-sm" onclick="init_sudoku()">新游戏</button></div><div id="sd-grid"></div></div>';
  draw();
}

/* ===== Gomoku AI ===== */
function init_gomoku() {
  document.getElementById('game-title').textContent = '五子棋 AI对战';

  var size=15,board=[],turn=1,gameOver=false;
  var canvas=document.createElement('canvas');
  canvas.width=570;canvas.height=570;
  canvas.style.cssText='border-radius:var(--radius-lg);background:var(--bg-glass)';
  var status=document.createElement('div');
  status.style.cssText='margin:8px 0;text-align:center;font-weight:500';
  status.textContent='你的回合 - 黑棋';

  function initBoard(){board=Array.from({length:size},function(){return Array(size).fill(0)});turn=1;gameOver=false;status.textContent='你的回合 - 黑棋';drawBoard()}
  function drawBoard(){var ctx=canvas.getContext('2d');var m=570/size;ctx.fillStyle='#0a0a0a';ctx.fillRect(0,0,570,570);
    for(var i=1;i<size;i++){ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.beginPath();ctx.moveTo(m*i,0);ctx.lineTo(m*i,570);ctx.stroke();ctx.beginPath();ctx.moveTo(0,m*i);ctx.lineTo(570,m*i);ctx.stroke()}
    for(var y=0;y<size;y++)for(var x=0;x<size;x++){if(!board[y][x])continue;ctx.beginPath();ctx.arc(m*x+m/2,m*y+m/2,m*0.4,0,Math.PI*2);ctx.fillStyle=board[y][x]===1?'#fff':'#000';ctx.fill()}}
  function checkWin(bx,by){var dx=[1,0,1,1],dy=[0,1,1,-1];for(var d=0;d<4;d++){var cnt=1;for(var s=1;s<5;s++){var nx=bx+dx[d]*s,ny=by+dy[d]*s;if(nx>=0&&nx<size&&ny>=0&&ny<size&&board[ny][nx]===board[by][bx])cnt++;else break}for(var s=1;s<5;s++){var nx=bx-dx[d]*s,ny=by-dy[d]*s;if(nx>=0&&nx<size&&ny>=0&&ny<size&&board[ny][nx]===board[by][bx])cnt++;else break}if(cnt>=5)return true}return false}

  /* AI Engine */
  var FIVE=7,L4=6,S4=5,L3=4,S3=3,L2=2,S2=1;
  var record=[],aiCount=[[],[]],posScore=[];
  for(var y=0;y<size;y++){record[y]=[];for(var x=0;x<size;x++)record[y][x]=[0,0,0,0]}
  for(var c=0;c<2;c++){aiCount[c]=[];for(var i=0;i<8;i++)aiCount[c][i]=0}
  posScore=[];for(var y=0;y<size;y++){posScore[y]=[];for(var x=0;x<size;x++){var cx2=size/2-1;posScore[y][x]=size-Math.max(Math.abs(x-cx2),Math.abs(y-cx2))}}
  var DIRS=[[1,0],[0,1],[1,1],[1,-1]];

  function getLine(bx,by,di,you){var line=Array(9).fill(you);var tx=bx-5*DIRS[di][0],ty=by-5*DIRS[di][1];for(var i=0;i<9;i++){tx+=DIRS[di][0];ty+=DIRS[di][1];if(tx>=0&&tx<size&&ty>=0&&ty<size)line[i]=b[ty][tx]}return line}
  function setRecord(bx,by,left,right,di){var tx=bx+(-5+left)*DIRS[di][0],ty=by+(-5+left)*DIRS[di][1];for(var i=left;i<right;i++){tx+=DIRS[di][0];ty+=DIRS[di][1];if(ty>=0&&ty<size&&tx>=0&&tx<size)record[ty][tx][di]=1}}
  function analyzeLine(bx,by,di,me,you,cnt){var line=getLine(bx,by,di,you);var li=4,ri=4;while(ri<8&&line[ri+1]===me)ri++;while(li>0&&line[li-1]===me)li--;var lr=li,rr=ri;while(rr<8&&line[rr+1]!==you)rr++;while(lr>0&&line[lr-1]!==you)lr--;var range=rr-lr+1;if(range<5){setRecord(bx,by,lr,rr,di);return}setRecord(bx,by,li,ri,di);var mRange=ri-li+1;if(mRange===5){cnt[FIVE]++;return}if(mRange===4){cnt[line[li-1]===0&&line[ri+1]===0?L4:S4]++;return}if(mRange===3){var le=line[li-1]===0,re=line[ri+1]===0;cnt[le&&re?L3:S3]++;return}if(mRange===2){cnt[L2]++}}
  function evaluate(b,t){var cnt=[Array(8).fill(0),Array(8).fill(0)];for(var c=0;c<2;c++)for(var i=0;i<8;i++)cnt[c][i]=0;for(var y=0;y<size;y++)for(var x=0;x<size;x++)record[y][x]=[0,0,0,0];for(var y=0;y<size;y++)for(var x=0;x<size;x++){if(b[y][x]===0)continue;for(var d=0;d<4;d++){if(record[y][x][d])continue;var me=b[y][x]===1?1:2;analyzeLine(x,y,d,me,me===1?2:1,cnt[me-1])}}
      if(cnt[0][FIVE])return 10000;if(cnt[1][FIVE])return -10000;if(cnt[0][L4]||cnt[0][S4])return 9000;if(cnt[1][L4]||cnt[1][S4])return -9000;var s=cnt[0][L3]*100+cnt[0][S3]*10+cnt[0][L2]*4-cnt[1][L3]*100-cnt[1][S3]*10-cnt[1][L2]*4;return s}

  function aiMove(){
    if(gameOver)return;
    var bestScore=-Infinity,bx=-1,by=-1;
    for(var y=0;y<size;y++)for(var x=0;x<size;x++){
      if(board[y][x]!==0)continue;board[y][x]=2;
      var s=evaluate(board,1)+posScore[y][x]*0.1;
      board[y][x]=0;
      if(s>bestScore){bestScore=s;bx=x;by=y}
    }
    if(bx<0)return;
    board[by][bx]=2;drawBoard();
    if(checkWin(bx,by)){gameOver=true;status.textContent='AI赢了!';toast('AI赢了!','error');return}
    turn=1;status.textContent='你的回合 - 黑棋';
  }

  window.gomokuClick=function(e){
    if(gameOver||turn!==1)return;
    var rect=canvas.getBoundingClientRect();
    var m=570/size;
    var x=Math.floor((e.clientX-rect.left)/m),y=Math.floor((e.clientY-rect.top)/m);
    if(x<0||x>=size||y<0||y>=size||board[y][x]!==0)return;
    board[y][x]=1;drawBoard();
    if(checkWin(x,y)){gameOver=true;status.textContent='你赢了!';toast('你赢了!','success');return}
    turn=2;status.textContent='AI思考中...';
    setTimeout(aiMove,200);
  };
  canvas.addEventListener('click',window.gomokuClick);

  var el=document.getElementById('game-container');
  el.innerHTML='';
  el.appendChild(status);
  el.appendChild(document.createElement('br'));
  var btnWrap=document.createElement('div');
  btnWrap.style.cssText='text-align:center;margin-bottom:8px';
  btnWrap.innerHTML='<button class="btn btn-glass btn-sm" onclick="init_gomoku()">新游戏</button>';
  el.appendChild(btnWrap);
  el.appendChild(canvas);
  initBoard();
}
