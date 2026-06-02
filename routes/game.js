const express = require('express');
const { db } = require('../database/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

var _tablesOk = false;
var _tablesWarned = false;
var _tablesInit = false;

async function ensureTables() {
  if (_tablesOk) return true;
  if (_tablesInit) return false;
  _tablesInit = true;
  try {
    await db('game_queue').all();
    await db('game_rooms').all();
    await db('game_invites').all();
    _tablesOk = true;
    _tablesInit = false;
    return true;
  } catch(e) {
    _tablesInit = false;
    if (!_tablesWarned) {
      console.error('[GAME] 游戏表未创建，正在尝试创建...');
      _tablesWarned = true;
    }
    return false;
  }
}

/* ========== ONLINE PRESENCE ========== */

router.post('/heartbeat', auth, async function(req, res) {
  try {
    await db('users').update(req.user.id, { last_seen: new Date().toISOString() });
    res.json({ ok: true });
  } catch(e) {
    res.json({ ok: true });
  }
});

/* ========== MATCHMAKING QUEUE ========== */

router.get('/queue', auth, async function(req, res) {
  try {
    if (!(await ensureTables())) return res.status(503).json({ error: '游戏服务正在初始化，请稍后再试' });

    var gameType = req.query.game_type || 'gomoku';
    var existing = await db('game_queue').findOne({ user_id: req.user.id, status: 'waiting' });
    if (existing) {
      return res.json({ queued: true, room: null, message: '已在匹配队列中' });
    }
    var opponents = await db('game_queue').find({ status: 'waiting' });
    var opponent = opponents.find(function(o) { return o.user_id !== req.user.id && (o.game_type || 'gomoku') === gameType; });
    if (opponent) {
      var room = await db('game_rooms').insert({
        player1: opponent.user_id,
        player2: req.user.id,
        game_type: gameType,
        turn: 1,
        board: JSON.stringify(initBoard(gameType)),
        status: 'active',
        created_at: new Date().toISOString()
      });
      await db('game_queue').update(opponent.id, { status: 'matched', matched_with: req.user.id, room_id: room.id });
      await db('game_queue').insert({
        user_id: req.user.id,
        game_type: gameType,
        status: 'matched',
        matched_with: opponent.user_id,
        room_id: room.id,
        created_at: new Date().toISOString()
      });
      var p1 = await db('users').getById(opponent.user_id);
      var p2 = await db('users').getById(req.user.id);
      return res.json({
        queued: false, room: {
          id: room.id,
          game_type: gameType,
          opponent: p1 ? { id: p1.id, username: p1.username, nickname: p1.nickname, avatar: p1.avatar } : null,
          you: p2 ? { id: p2.id, username: p2.username, nickname: p2.nickname, avatar: p2.avatar } : null,
          you_color: 2
        }
      });
    }
    await db('game_queue').insert({
      user_id: req.user.id,
      game_type: gameType,
      status: 'waiting',
      created_at: new Date().toISOString()
    });
    res.json({ queued: true, room: null, message: '已加入匹配队列，等待对手...' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/queue/status', auth, async function(req, res) {
  try {
    if (!(await ensureTables())) return res.json({ matched: false });

    var entry = await db('game_queue').findOne({ user_id: req.user.id, status: 'matched' });
    if (!entry || !entry.room_id) return res.json({ matched: false });

    var room = await db('game_rooms').getById(entry.room_id);
    if (!room) return res.json({ matched: false });

    var opponentId = room.player1 === req.user.id ? room.player2 : room.player1;
    var opp = await db('users').getById(opponentId);
    var me = await db('users').getById(req.user.id);

    await db('game_queue').delete(entry.id);

    res.json({
      matched: true, room: {
        id: room.id,
        game_type: room.game_type || 'gomoku',
        opponent: opp ? { id: opp.id, username: opp.username, nickname: opp.nickname, avatar: opp.avatar } : null,
        you: me ? { id: me.id, username: me.username, nickname: me.nickname, avatar: me.avatar } : null,
        you_color: room.player1 === req.user.id ? 1 : 2
      }
    });
  } catch (e) {
    res.json({ matched: false });
  }
});

router.post('/queue/cancel', auth, async function(req, res) {
  try {
    if (!(await ensureTables())) return res.json({ success: true });

    var entries = await db('game_queue').find({ user_id: req.user.id });
    for (var i = 0; i < entries.length; i++) {
      await db('game_queue').delete(entries[i].id);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ========== ROOM / GAME STATE ========== */

router.get('/room/:id', auth, async function(req, res) {
  try {
    if (!(await ensureTables())) return res.status(503).json({ error: '游戏服务正在初始化' });

    var room = await db('game_rooms').getById(parseInt(req.params.id));
    if (!room) return res.status(404).json({ error: '房间不存在' });

    var isP1 = room.player1 === req.user.id;
    var isP2 = room.player2 === req.user.id;
    if (!isP1 && !isP2) return res.status(403).json({ error: '无权访问此房间' });

    var opponentId = isP1 ? room.player2 : room.player1;
    var opp = await db('users').getById(opponentId);

    var now = Date.now(), heartbeatTimeout = 20000;
    var myHB = isP1 ? (room.p1_heartbeat ? new Date(room.p1_heartbeat).getTime() : 0) : (room.p2_heartbeat ? new Date(room.p2_heartbeat).getTime() : 0);
    var oppHB = isP1 ? (room.p2_heartbeat ? new Date(room.p2_heartbeat).getTime() : 0) : (room.p1_heartbeat ? new Date(room.p1_heartbeat).getTime() : 0);
    var opponentDisconnected = room.status === 'active' && oppHB > 0 && (now - oppHB) > heartbeatTimeout;

    res.json({
      room: {
        id: room.id,
        game_type: room.game_type || 'gomoku',
        turn: room.turn,
        board: JSON.parse(room.board || '[]'),
        status: room.status,
        winner: room.winner,
        you_color: isP1 ? 1 : 2,
        opponent: opp ? { id: opp.id, username: opp.username, nickname: opp.nickname, avatar: opp.avatar } : null,
        opponent_disconnected: opponentDisconnected
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/room/:id/move', auth, async function(req, res) {
  try {
    if (!(await ensureTables())) return res.status(503).json({ error: '游戏服务正在初始化' });

    var room = await db('game_rooms').getById(parseInt(req.params.id));
    if (!room || room.status !== 'active') return res.status(400).json({ error: '无效的房间' });

    var isP1 = room.player1 === req.user.id;
    var isP2 = room.player2 === req.user.id;
    if (!isP1 && !isP2) return res.status(403).json({ error: '无权操作' });

    var myColor = isP1 ? 1 : 2;
    if (room.turn !== myColor) return res.status(400).json({ error: '还没轮到你' });

    var board = JSON.parse(room.board || '[]');
    var x = req.body.x, y = req.body.y;
    var gameType = room.game_type || 'gomoku';

    if (gameType === 'gomoku' || gameType === 'tictactoe') {
      if (!board[y] || board[y][x] !== 0) {
        return res.status(400).json({ error: '无效落子' });
      }
      board[y][x] = myColor;
    } else if (gameType === 'reversi') {
      if (!isValidReversiMove(board, x, y, myColor)) {
        return res.status(400).json({ error: '无效落子' });
      }
      board = applyReversiMove(board, x, y, myColor);
    }

    var win = checkWin(board, x, y, myColor, gameType);

    var nextTurn;
    if (gameType === 'reversi') {
      nextTurn = myColor === 1 ? 2 : 1;
      var hasMoves = hasValidReversiMoves(board, nextTurn);
      if (!hasMoves) {
        var otherColor = nextTurn === 1 ? 2 : 1;
        if (hasValidReversiMoves(board, otherColor)) {
          nextTurn = otherColor;
        } else {
          win = determineReversiWinner(board);
        }
      }
    } else {
      nextTurn = room.turn === 1 ? 2 : 1;
    }

    var updates = {
      board: JSON.stringify(board),
      turn: nextTurn
    };

    if (win) {
      updates.status = 'finished';
      updates.winner = win === myColor ? req.user.id : (room.player1 === req.user.id ? room.player2 : room.player1);
    }

    var isDraw = false;
    if (gameType === 'tictactoe' && !win) {
      isDraw = board.every(function(row) { return row.every(function(c) { return c !== 0; }); });
      if (isDraw) {
        updates.status = 'finished';
        updates.winner = 0;
      }
    }

    await db('game_rooms').update(room.id, updates);
    room.board = JSON.stringify(board);
    room.turn = updates.turn;
    room.status = updates.status || room.status;
    room.winner = updates.winner;

    res.json({
      room: {
        id: room.id, game_type: gameType, turn: room.turn, board: JSON.parse(room.board),
        status: room.status, winner: room.winner, you_color: myColor
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/room/:id/heartbeat', auth, async function(req, res) {
  try {
    if (!(await ensureTables())) return res.json({ ok: true });

    var room = await db('game_rooms').getById(parseInt(req.params.id));
    if (!room) return res.status(404).json({ error: '房间不存在' });
    var isP1 = room.player1 === req.user.id, isP2 = room.player2 === req.user.id;
    if (!isP1 && !isP2) return res.status(403).json({ error: '无权操作' });
    var field = isP1 ? 'p1_heartbeat' : 'p2_heartbeat';
    await db('game_rooms').update(room.id, { [field]: new Date().toISOString() });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/room/:id/resign', auth, async function(req, res) {
  try {
    if (!(await ensureTables())) return res.status(503).json({ error: '游戏服务正在初始化' });

    var room = await db('game_rooms').getById(parseInt(req.params.id));
    if (!room || room.status !== 'active') return res.status(400).json({ error: '无效的房间' });
    var isP1 = room.player1 === req.user.id, isP2 = room.player2 === req.user.id;
    if (!isP1 && !isP2) return res.status(403).json({ error: '无权操作' });
    var winnerId = isP1 ? room.player2 : room.player1;
    await db('game_rooms').update(room.id, { status: 'finished', winner: winnerId });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ========== FRIEND INVITES ========== */

router.get('/my-room', auth, async function(req, res) {
  try {
    if (!(await ensureTables())) return res.json({ room: null });
    var allRooms = await db('game_rooms').all();
    var activeRoom = allRooms.find(function(r) {
      return r.status === 'active' && (r.player1 === req.user.id || r.player2 === req.user.id);
    });
    if (!activeRoom) return res.json({ room: null });
    var isP1 = activeRoom.player1 === req.user.id;
    var oppId = isP1 ? activeRoom.player2 : activeRoom.player1;
    var opp = await db('users').getById(oppId);
    var me = await db('users').getById(req.user.id);
    res.json({
      room: {
        id: activeRoom.id,
        game_type: activeRoom.game_type || 'gomoku',
        opponent: opp ? { id: opp.id, username: opp.username, nickname: opp.nickname, avatar: opp.avatar } : null,
        you: me ? { id: me.id, username: me.username, nickname: me.nickname, avatar: me.avatar } : null,
        you_color: isP1 ? 1 : 2
      }
    });
  } catch (e) {
    res.json({ room: null });
  }
});

router.get('/online-friends', auth, async function(req, res) {
  try {
    if (!(await ensureTables())) return res.json({ friends: [] });

    await db('users').update(req.user.id, { last_seen: new Date().toISOString() }).catch(function(){});

    var allFriends = await db('friends').all();
    var myFriends = allFriends.filter(function(f) {
      return (f.user_id === req.user.id || f.friend_id === req.user.id) && f.status === 'accepted';
    });
    var now = Date.now();
    var ONLINE_TIMEOUT = 45000;
    var HEARTBEAT_TIMEOUT = 30000;
    var seen = {};
    var result = [];

    var allRooms = (await db('game_rooms').all().catch(function(){ return []; })) || [];

    for (var i = 0; i < myFriends.length; i++) {
      var fid = myFriends[i].user_id === req.user.id ? myFriends[i].friend_id : myFriends[i].user_id;
      if (seen[fid]) continue;
      seen[fid] = true;

      var fu = null;
      try { fu = await db('users').getById(fid); } catch(e) { continue; }
      if (!fu) continue;

      var lastSeen = 0;
      try { if (fu.last_seen) lastSeen = new Date(fu.last_seen).getTime(); } catch(e) {}
      var isOnline = lastSeen > 0 && (now - lastSeen) < ONLINE_TIMEOUT;

      var inGame = false;
      try {
        inGame = allRooms.some(function(r) {
          if (r.status !== 'active') return false;
          if (r.player1 !== fid && r.player2 !== fid) return false;
          var p1hb = r.p1_heartbeat ? new Date(r.p1_heartbeat).getTime() : 0;
          var p2hb = r.p2_heartbeat ? new Date(r.p2_heartbeat).getTime() : 0;
          var fidHB = r.player1 === fid ? p1hb : p2hb;
          return (now - fidHB) < HEARTBEAT_TIMEOUT;
        });
      } catch(e) {}

      result.push({
        id: fu.id, username: fu.username, nickname: fu.nickname, avatar: fu.avatar,
        online: isOnline, in_game: inGame
      });
    }
    res.json({ friends: result });
  } catch (e) {
    console.error('[GAME] online-friends error:', e.message);
    res.json({ friends: [] });
  }
});

router.post('/invite/:userId', auth, async function(req, res) {
  try {
    if (!(await ensureTables())) return res.status(503).json({ error: '游戏服务正在初始化' });

    var targetId = parseInt(req.params.userId);
    var gameType = req.body.game_type || 'gomoku';

    var existing = await db('game_invites').findOne({
      from_user: req.user.id, to_user: targetId, status: 'pending'
    });
    if (existing) {
      await db('game_invites').update(existing.id, { game_type: gameType });
      return res.json({ message: '已更新邀请' });
    }
    await db('game_invites').insert({
      from_user: req.user.id, to_user: targetId, game_type: gameType, status: 'pending',
      created_at: new Date().toISOString()
    });
    res.json({ message: '邀请已发送' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/invites/pending', auth, async function(req, res) {
  try {
    if (!(await ensureTables())) return res.json({ invites: [] });

    var invites = await db('game_invites').find({ to_user: req.user.id, status: 'pending' });
    var result = [];
    for (var i = 0; i < invites.length; i++) {
      var fu = await db('users').getById(invites[i].from_user);
      result.push({
        id: invites[i].id,
        game_type: invites[i].game_type || 'gomoku',
        from: fu ? { id: fu.id, username: fu.username, nickname: fu.nickname, avatar: fu.avatar } : null,
        created_at: invites[i].created_at
      });
    }
    res.json({ invites: result });
  } catch (e) {
    res.json({ invites: [] });
  }
});

router.get('/invites/sent-status', auth, async function(req, res) {
  try {
    if (!(await ensureTables())) return res.json({ invites: [] });

    var invites = await db('game_invites').find({ from_user: req.user.id });
    var result = [];
    for (var i = 0; i < invites.length; i++) {
      var tu = await db('users').getById(invites[i].to_user);
      result.push({
        id: invites[i].id,
        game_type: invites[i].game_type || 'gomoku',
        to: tu ? { id: tu.id, username: tu.username, nickname: tu.nickname, avatar: tu.avatar } : null,
        status: invites[i].status,
        created_at: invites[i].created_at
      });
    }
    res.json({ invites: result });
  } catch (e) {
    res.json({ invites: [] });
  }
});

router.post('/invite/:id/accept', auth, async function(req, res) {
  try {
    if (!(await ensureTables())) return res.status(503).json({ error: '游戏服务正在初始化' });

    var invite = await db('game_invites').getById(parseInt(req.params.id));
    if (!invite || invite.to_user !== req.user.id) return res.status(404).json({ error: '邀请不存在' });

    var gameType = invite.game_type || 'gomoku';
    var room = await db('game_rooms').insert({
      player1: invite.from_user, player2: req.user.id, game_type: gameType,
      turn: 1, board: JSON.stringify(initBoard(gameType)),
      status: 'active', created_at: new Date().toISOString()
    });
    await db('game_invites').update(invite.id, { status: 'accepted' });
    var p1 = await db('users').getById(invite.from_user);
    var p2 = await db('users').getById(req.user.id);
    res.json({
      room: {
        id: room.id,
        game_type: gameType,
        opponent: p1 ? { id: p1.id, username: p1.username, nickname: p1.nickname, avatar: p1.avatar } : null,
        you: p2 ? { id: p2.id, username: p2.username, nickname: p2.nickname, avatar: p2.avatar } : null,
        you_color: 2
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/invite/:id/reject', auth, async function(req, res) {
  try {
    var invite = await db('game_invites').getById(parseInt(req.params.id));
    if (!invite || invite.to_user !== req.user.id) return res.status(404).json({ error: '邀请不存在' });
    await db('game_invites').update(invite.id, { status: 'rejected' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ========== HELPERS ========== */

function initBoard(gameType) {
  if (gameType === 'gomoku') {
    return Array.from({length: 15}, function() { return Array(15).fill(0); });
  }
  if (gameType === 'tictactoe') {
    return Array.from({length: 3}, function() { return Array(3).fill(0); });
  }
  if (gameType === 'reversi') {
    var b = Array.from({length: 8}, function() { return Array(8).fill(0); });
    b[3][3] = 1; b[3][4] = 2;
    b[4][3] = 2; b[4][4] = 1;
    return b;
  }
  return Array.from({length: 15}, function() { return Array(15).fill(0); });
}

function checkWin(board, bx, by, me, gameType) {
  if (gameType === 'tictactoe') {
    var size = board.length;
    var win = true;
    for (var i = 0; i < size; i++) { if (board[by][i] !== me) { win = false; break; } }
    if (win) return me;
    win = true;
    for (var i = 0; i < size; i++) { if (board[i][bx] !== me) { win = false; break; } }
    if (win) return me;
    if (bx === by) { win = true; for (var i = 0; i < size; i++) { if (board[i][i] !== me) { win = false; break; } } if (win) return me; }
    if (bx + by === size - 1) { win = true; for (var i = 0; i < size; i++) { if (board[i][size - 1 - i] !== me) { win = false; break; } } if (win) return me; }
    return 0;
  }

  if (gameType === 'reversi') {
    return 0;
  }

  var dirs = [[1, 0], [0, 1], [1, 1], [1, -1]], size = board.length;
  for (var d = 0; d < 4; d++) {
    var cnt = 1;
    for (var s = 1; s < 5; s++) { var nx = bx + dirs[d][0] * s, ny = by + dirs[d][1] * s; if (nx >= 0 && nx < size && ny >= 0 && ny < size && board[ny][nx] === me) cnt++; else break; }
    for (var s = 1; s < 5; s++) { var nx = bx - dirs[d][0] * s, ny = by - dirs[d][1] * s; if (nx >= 0 && nx < size && ny >= 0 && ny < size && board[ny][nx] === me) cnt++; else break; }
    if (cnt >= 5) return me;
  }
  return 0;
}

function isValidReversiMove(board, x, y, color) {
  if (board[y][x] !== 0) return false;
  var opp = color === 1 ? 2 : 1;
  var dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  for (var d = 0; d < dirs.length; d++) {
    var dx = dirs[d][0], dy = dirs[d][1];
    var nx = x + dx, ny = y + dy;
    if (nx < 0 || nx >= 8 || ny < 0 || ny >= 8 || board[ny][nx] !== opp) continue;
    while (true) {
      nx += dx; ny += dy;
      if (nx < 0 || nx >= 8 || ny < 0 || ny >= 8 || board[ny][nx] === 0) break;
      if (board[ny][nx] === color) return true;
    }
  }
  return false;
}

function applyReversiMove(board, x, y, color) {
  var newBoard = board.map(function(row) { return row.slice(); });
  newBoard[y][x] = color;
  var opp = color === 1 ? 2 : 1;
  var dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  for (var d = 0; d < dirs.length; d++) {
    var dx = dirs[d][0], dy = dirs[d][1];
    var toFlip = [];
    var nx = x + dx, ny = y + dy;
    while (nx >= 0 && nx < 8 && ny >= 0 && ny < 8 && newBoard[ny][nx] === opp) {
      toFlip.push([nx, ny]);
      nx += dx; ny += dy;
    }
    if (nx >= 0 && nx < 8 && ny >= 0 && ny < 8 && newBoard[ny][nx] === color) {
      for (var i = 0; i < toFlip.length; i++) {
        newBoard[toFlip[i][1]][toFlip[i][0]] = color;
      }
    }
  }
  return newBoard;
}

function hasValidReversiMoves(board, color) {
  for (var y = 0; y < 8; y++) {
    for (var x = 0; x < 8; x++) {
      if (isValidReversiMove(board, x, y, color)) return true;
    }
  }
  return false;
}

function determineReversiWinner(board) {
  var c1 = 0, c2 = 0;
  for (var y = 0; y < 8; y++) {
    for (var x = 0; x < 8; x++) {
      if (board[y][x] === 1) c1++;
      if (board[y][x] === 2) c2++;
    }
  }
  if (c1 > c2) return 1;
  if (c2 > c1) return 2;
  return 0;
}

module.exports = router;
