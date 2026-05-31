const express = require('express');
const { db } = require('../database/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

/* ========== MATCHMAKING QUEUE ========== */

router.get('/queue', auth, async function(req, res) {
  try {
    var existing = await db('game_queue').findOne({ user_id: req.user.id, status: 'waiting' });
    if (existing) {
      return res.json({ queued: true, room: null, message: '已在匹配队列中' });
    }
    var opponents = await db('game_queue').find({ status: 'waiting' });
    var opponent = opponents.find(function(o) { return o.user_id !== req.user.id; });
    if (opponent) {
      await db('game_queue').update(opponent.id, { status: 'matched', matched_with: req.user.id });
      var room = await db('game_rooms').insert({
        player1: opponent.user_id,
        player2: req.user.id,
        game_type: 'gomoku',
        turn: 1,
        board: JSON.stringify(Array.from({length:15}, function(){return Array(15).fill(0)})),
        status: 'active',
        created_at: new Date().toISOString()
      });
      var queueEntry = await db('game_queue').insert({
        user_id: req.user.id,
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
          opponent: p1 ? { id: p1.id, username: p1.username, nickname: p1.nickname, avatar: p1.avatar } : null,
          you: p2 ? { id: p2.id, username: p2.username, nickname: p2.nickname, avatar: p2.avatar } : null,
        }
      });
    }
    await db('game_queue').insert({
      user_id: req.user.id,
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
        opponent: opp ? { id: opp.id, username: opp.username, nickname: opp.nickname, avatar: opp.avatar } : null,
        you: me ? { id: me.id, username: me.username, nickname: me.nickname, avatar: me.avatar } : null,
      }
    });
  } catch (e) {
    res.json({ matched: false });
  }
});

router.post('/queue/cancel', auth, async function(req, res) {
  try {
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
    var room = await db('game_rooms').getById(parseInt(req.params.id));
    if (!room) return res.status(404).json({ error: '房间不存在' });

    var isP1 = room.player1 === req.user.id;
    var isP2 = room.player2 === req.user.id;
    if (!isP1 && !isP2) return res.status(403).json({ error: '无权访问此房间' });

    var opponentId = isP1 ? room.player2 : room.player1;
    var opp = await db('users').getById(opponentId);

    var now = Date.now(), heartbeatTimeout = 15000;
    var myHB = isP1 ? (room.p1_heartbeat ? new Date(room.p1_heartbeat).getTime() : 0) : (room.p2_heartbeat ? new Date(room.p2_heartbeat).getTime() : 0);
    var oppHB = isP1 ? (room.p2_heartbeat ? new Date(room.p2_heartbeat).getTime() : 0) : (room.p1_heartbeat ? new Date(room.p1_heartbeat).getTime() : 0);
    var opponentDisconnected = room.status === 'active' && oppHB > 0 && (now - oppHB) > heartbeatTimeout;

    res.json({
      room: {
        id: room.id,
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
    var room = await db('game_rooms').getById(parseInt(req.params.id));
    if (!room || room.status !== 'active') return res.status(400).json({ error: '无效的房间' });

    var isP1 = room.player1 === req.user.id;
    var isP2 = room.player2 === req.user.id;
    if (!isP1 && !isP2) return res.status(403).json({ error: '无权操作' });

    var myColor = isP1 ? 1 : 2;
    if (room.turn !== myColor) return res.status(400).json({ error: '还没轮到你' });

    var board = JSON.parse(room.board || '[]');
    var x = req.body.x, y = req.body.y;
    if (board[y] && board[y][x] === 0) {
      board[y][x] = myColor;
    } else {
      return res.status(400).json({ error: '无效落子' });
    }

    var win = checkWin(board, x, y, myColor);

    var updates = {
      board: JSON.stringify(board),
      turn: room.turn === 1 ? 2 : 1
    };

    if (win) {
      updates.status = 'finished';
      updates.winner = req.user.id;
    }

    await db('game_rooms').update(room.id, updates);
    room.board = JSON.stringify(board);
    room.turn = updates.turn;
    room.status = updates.status || room.status;
    room.winner = updates.winner || room.winner;

    res.json({
      room: {
        id: room.id, turn: room.turn, board: JSON.parse(room.board),
        status: room.status, winner: room.winner, you_color: myColor
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/room/:id/heartbeat', auth, async function(req, res) {
  try {
    var room = await db('game_rooms').getById(parseInt(req.params.id));
    if (!room) return res.status(404).json({ error: '房间不存在' });
    var field = room.player1 === req.user.id ? 'p1_heartbeat' : 'p2_heartbeat';
    await db('game_rooms').update(room.id, { [field]: new Date().toISOString() });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/room/:id/resign', auth, async function(req, res) {
  try {
    var room = await db('game_rooms').getById(parseInt(req.params.id));
    if (!room || room.status !== 'active') return res.status(400).json({ error: '无效的房间' });
    var isP1 = room.player1 === req.user.id, isP2 = room.player2 === req.user.id;
    if (!isP1 && !isP2) return res.status(403);
    var winnerId = isP1 ? room.player2 : room.player1;
    await db('game_rooms').update(room.id, { status: 'finished', winner: winnerId });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ========== FRIEND INVITES ========== */

router.get('/online-friends', auth, async function(req, res) {
  try {
    var allFriends = await db('friends').all();
    var myFriends = allFriends.filter(function(f) {
      return (f.user_id === req.user.id || f.friend_id === req.user.id) && f.status === 'accepted';
    });
    var result = [];
    for (var i = 0; i < myFriends.length; i++) {
      var fid = myFriends[i].user_id === req.user.id ? myFriends[i].friend_id : myFriends[i].user_id;
      var fu = await db('users').getById(fid);
      if (fu) {
        var allRooms = await db('game_rooms').all();
        var inGame = allRooms.some(function(r) {
          return r.status === 'active' && (r.player1 === fid || r.player2 === fid);
        });
        result.push({
          id: fu.id, username: fu.username, nickname: fu.nickname, avatar: fu.avatar,
          in_game: !!inGame
        });
      }
    }
    res.json({ friends: result });
  } catch (e) {
    res.json({ friends: [] });
  }
});

router.post('/invite/:userId', auth, async function(req, res) {
  try {
    var targetId = parseInt(req.params.userId);
    var existing = await db('game_invites').findOne({
      from_user: req.user.id, to_user: targetId, status: 'pending'
    });
    if (existing) return res.json({ message: '已发送邀请，等待对方确认' });
    await db('game_invites').insert({
      from_user: req.user.id, to_user: targetId, status: 'pending',
      created_at: new Date().toISOString()
    });
    res.json({ message: '邀请已发送' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/invites/pending', auth, async function(req, res) {
  try {
    var invites = await db('game_invites').find({ to_user: req.user.id, status: 'pending' });
    var result = [];
    for (var i = 0; i < invites.length; i++) {
      var fu = await db('users').getById(invites[i].from_user);
      result.push({ id: invites[i].id, from: fu ? { id: fu.id, username: fu.username, nickname: fu.nickname, avatar: fu.avatar } : null });
    }
    res.json({ invites: result });
  } catch (e) {
    res.json({ invites: [] });
  }
});

router.post('/invite/:id/accept', auth, async function(req, res) {
  try {
    var invite = await db('game_invites').getById(parseInt(req.params.id));
    if (!invite || invite.to_user !== req.user.id) return res.status(404).json({ error: '邀请不存在' });
    var room = await db('game_rooms').insert({
      player1: invite.from_user, player2: req.user.id, game_type: 'gomoku',
      turn: 1, board: JSON.stringify(Array.from({length:15}, function(){return Array(15).fill(0)})),
      status: 'active', created_at: new Date().toISOString()
    });
    await db('game_invites').update(invite.id, { status: 'accepted' });
    var p1 = await db('users').getById(invite.from_user);
    var p2 = await db('users').getById(req.user.id);
    res.json({
      room: {
        id: room.id,
        opponent: p1 ? { id: p1.id, username: p1.username, nickname: p1.nickname, avatar: p1.avatar } : null,
        you: p2 ? { id: p2.id, username: p2.username, nickname: p2.nickname, avatar: p2.avatar } : null,
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/invite/:id/reject', auth, async function(req, res) {
  try {
    var invite = await db('game_invites').getById(parseInt(req.params.id));
    if (!invite || invite.to_user !== req.user.id) return res.status(404);
    await db('game_invites').update(invite.id, { status: 'rejected' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* Win check helper */
function checkWin(board, bx, by, me) {
  var dirs = [[1, 0], [0, 1], [1, 1], [1, -1]], size = board.length;
  for (var d = 0; d < 4; d++) {
    var cnt = 1;
    for (var s = 1; s < 5; s++) { var nx = bx + dirs[d][0] * s, ny = by + dirs[d][1] * s; if (nx >= 0 && nx < size && ny >= 0 && ny < size && board[ny][nx] === me) cnt++; else break; }
    for (var s = 1; s < 5; s++) { var nx = bx - dirs[d][0] * s, ny = by - dirs[d][1] * s; if (nx >= 0 && nx < size && ny >= 0 && ny < size && board[ny][nx] === me) cnt++; else break; }
    if (cnt >= 5) return true;
  }
  return false;
}

module.exports = router;
