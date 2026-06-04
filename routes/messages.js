const express = require('express');
const { db } = require('../database/db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

const isAdminRole = (user) => user && (user.role === 'admin' || user.role === 'semi_admin');

async function isFriend(aId, bId) {
  const allFriends = await db('friends').all();
  return allFriends.some(f =>
    f.status === 'accepted' &&
    ((f.user_id === aId && f.friend_id === bId) ||
     (f.user_id === bId && f.friend_id === aId))
  );
}

router.get('/unread-count', auth, async (req, res) => {
  const allMsgs = await db('messages').all();
  const count = allMsgs.filter(m =>
    m.receiver_id === req.user.id && !m.read
  ).length;
  res.json({ count });
});

router.get('/conversations', auth, async (req, res) => {
  const allMsgs = await db('messages').all();
  const myMsgs = allMsgs.filter(m =>
    m.sender_id === req.user.id || m.receiver_id === req.user.id
  );

  const convMap = {};
  myMsgs.forEach(m => {
    const otherId = m.sender_id === req.user.id ? m.receiver_id : m.sender_id;
    if (!convMap[otherId] || new Date(m.created_at) > new Date(convMap[otherId].created_at)) {
      convMap[otherId] = m;
    }
  });

  const conversations = await Promise.all(
    Object.values(convMap).map(async (m) => {
      const otherId = m.sender_id === req.user.id ? m.receiver_id : m.sender_id;
      const other = await db('users').getById(otherId);
      return {
        other: other ? { id: other.id, username: other.username, nickname: other.nickname, avatar: other.avatar } : null,
        lastMessage: m.content,
        lastTime: m.created_at,
        unread: allMsgs.filter(msg => msg.receiver_id === req.user.id && msg.sender_id === otherId && !msg.read).length
      };
    })
  );
  conversations.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));

  res.json({ conversations });
});

router.get('/with/:userId', auth, async (req, res) => {
  const otherId = parseInt(req.params.userId);
  const allMsgs = await db('messages').all();
  const msgs = allMsgs.filter(m =>
    (m.sender_id === req.user.id && m.receiver_id === otherId) ||
    (m.sender_id === otherId && m.receiver_id === req.user.id)
  ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  for (const m of msgs) {
    if (m.receiver_id === req.user.id && !m.read) {
      await db('messages').update(m.id, { read: 1 });
    }
  }

  const other = await db('users').getById(otherId);
  const friend = await isFriend(req.user.id, otherId);
  const sentCount = msgs.filter(m => m.sender_id === req.user.id).length;

  res.json({
    messages: msgs,
    other: other ? { id: other.id, username: other.username, nickname: other.nickname, avatar: other.avatar } : null,
    isFriend: friend,
    sentCount: sentCount
  });
});

router.post('/send/:userId', auth, async (req, res) => {
  const receiverId = parseInt(req.params.userId);
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: '消息不能为空' });

  const receiver = await db('users').getById(receiverId);
  if (!receiver) return res.status(404).json({ error: '用户不存在' });
  if (receiver.id === req.user.id) return res.status(400).json({ error: '不能给自己发消息' });

  if (!isAdminRole(req.user) && !isAdminRole(receiver)) {
    const friend = await isFriend(req.user.id, receiverId);
    if (!friend) {
      const allMsgs = await db('messages').all();
      const sentCount = allMsgs.filter(m =>
        m.sender_id === req.user.id && m.receiver_id === receiverId
      ).length;
      if (sentCount >= 1) {
        return res.status(403).json({
          error: '你已发送过一条消息，请先添加好友后才能继续发送',
          code: 'NOT_FRIEND_LIMIT',
          canAddFriend: true
        });
      }
    }
  }

  const msg = await db('messages').insert({
    sender_id: req.user.id,
    receiver_id: receiverId,
    content,
    read: 0,
    created_at: new Date().toISOString()
  });
  var wsNotify = req.app && req.app.get && req.app.get('wsNotify');
  if (wsNotify && wsNotify.notifyUser) {
    wsNotify.notifyUser(receiverId, { type: 'new_message', data: { msg: { id: msg.id, sender_id: req.user.id, receiver_id: receiverId, content: req.body.content, created_at: msg.created_at, read: 0 } } });
  }
  res.json({ message: msg });
});

router.post('/broadcast', auth, adminOnly, async (req, res) => {
  const { user_ids, content } = req.body;
  if (!content || !String(content).trim()) return res.status(400).json({ error: '消息内容不能为空' });
  if (!Array.isArray(user_ids) || user_ids.length === 0) return res.status(400).json({ error: '请选择至少一个用户' });

  const results = [];
  for (const uid of user_ids) {
    const receiver = await db('users').getById(parseInt(uid));
    if (!receiver) continue;
    if (receiver.id === req.user.id) continue;
    await db('messages').insert({
      sender_id: req.user.id,
      receiver_id: receiver.id,
      content: content.trim(),
      read: 0,
      created_at: new Date().toISOString()
    });
    results.push({ id: receiver.id, username: receiver.username });
  }

  res.json({ sent: results.length, users: results });
});

module.exports = router;
