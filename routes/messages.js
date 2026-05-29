const express = require('express');
const { db } = require('../database/db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

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
  res.json({
    messages: msgs,
    other: other ? { id: other.id, username: other.username, nickname: other.nickname, avatar: other.avatar } : null
  });
});

const isAdminRole = (user) => user && (user.role === 'admin' || user.role === 'semi_admin');

router.post('/send/:userId', auth, async (req, res) => {
  const receiverId = parseInt(req.params.userId);
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: '消息不能为空' });

  const receiver = await db('users').getById(receiverId);
  if (!receiver) return res.status(404).json({ error: '用户不存在' });
  if (receiver.id === req.user.id) return res.status(400).json({ error: '不能给自己发消息' });

  /* Non-admin users can only message friends or admins who message them first */
  if (!isAdminRole(req.user) && !isAdminRole(receiver)) {
    const allFriends = await db('friends').all();
    const isFriend = allFriends.some(f =>
      f.status === 'accepted' &&
      ((f.user_id === req.user.id && f.friend_id === receiverId) ||
       (f.user_id === receiverId && f.friend_id === req.user.id))
    );
    if (!isFriend) {
      /* Check if they have an existing conversation (admin messaged them first) */
      const allMsgs = await db('messages').all();
      const hasConv = allMsgs.some(m =>
        (m.sender_id === req.user.id && m.receiver_id === receiverId) ||
        (m.sender_id === receiverId && m.receiver_id === req.user.id)
      );
      if (!hasConv) return res.status(403).json({ error: '需要先添加好友才能发送消息' });
    }
  }

  const msg = await db('messages').insert({
    sender_id: req.user.id,
    receiver_id: receiverId,
    content,
    read: 0,
    created_at: new Date().toISOString()
  });
  res.json({ message: msg });
});

router.post('/broadcast', auth, adminOnly, async (req, res) => {
  const { user_ids, content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: '消息内容不能为空' });
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
