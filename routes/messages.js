const express = require('express');
const { table } = require('../database/init');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/conversations', auth, (req, res) => {
  const allMsgs = table('messages').all();
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

  const conversations = Object.values(convMap).map(m => {
    const otherId = m.sender_id === req.user.id ? m.receiver_id : m.sender_id;
    const other = table('users').getById(otherId);
    return {
      other: other ? { id: other.id, username: other.username, nickname: other.nickname, avatar: other.avatar } : null,
      lastMessage: m.content,
      lastTime: m.created_at,
      unread: allMsgs.filter(msg => msg.receiver_id === req.user.id && msg.sender_id === otherId && !msg.read).length
    };
  }).sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));

  res.json({ conversations });
});

router.get('/with/:userId', auth, (req, res) => {
  const otherId = parseInt(req.params.userId);
  const allMsgs = table('messages').all();
  const msgs = allMsgs.filter(m =>
    (m.sender_id === req.user.id && m.receiver_id === otherId) ||
    (m.sender_id === otherId && m.receiver_id === req.user.id)
  ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  msgs.forEach(m => {
    if (m.receiver_id === req.user.id && !m.read) {
      table('messages').update(m.id, { read: 1 });
    }
  });

  const other = table('users').getById(otherId);
  res.json({
    messages: msgs,
    other: other ? { id: other.id, username: other.username, nickname: other.nickname, avatar: other.avatar } : null
  });
});

router.post('/send/:userId', auth, (req, res) => {
  const receiverId = parseInt(req.params.userId);
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: '消息不能为空' });

  const receiver = table('users').getById(receiverId);
  if (!receiver) return res.status(404).json({ error: '用户不存在' });

  const msg = table('messages').insert({
    sender_id: req.user.id,
    receiver_id: receiverId,
    content,
    read: 0,
    created_at: new Date().toISOString()
  });
  res.json({ message: msg });
});

module.exports = router;
