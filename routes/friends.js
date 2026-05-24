const express = require('express');
const { db } = require('../database/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/request/:userId', auth, async (req, res) => {
  const targetId = parseInt(req.params.userId);
  const target = await db('users').getById(targetId);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  if (targetId === req.user.id) return res.status(400).json({ error: '不能添加自己为好友' });

  const existing = await db('friends').findOne({
    user_id: req.user.id,
    friend_id: targetId
  });
  if (existing) {
    if (existing.status === 'accepted') return res.status(400).json({ error: '已经是好友' });
    return res.status(400).json({ error: '已发送过申请' });
  }

  const reverse = await db('friends').findOne({ user_id: targetId, friend_id: req.user.id });
  if (reverse && reverse.status === 'pending') {
    await db('friends').update(reverse.id, { status: 'accepted' });
    await db('friends').insert({ user_id: req.user.id, friend_id: targetId, status: 'accepted' });
    return res.json({ status: 'accepted', message: '已自动成为好友' });
  }

  await db('friends').insert({ user_id: req.user.id, friend_id: targetId, status: 'pending' });
  res.json({ status: 'pending', message: '好友申请已发送' });
});

router.post('/accept/:userId', auth, async (req, res) => {
  const fromId = parseInt(req.params.userId);
  const request = await db('friends').findOne({ user_id: fromId, friend_id: req.user.id, status: 'pending' });
  if (!request) return res.status(404).json({ error: '未找到好友申请' });

  await db('friends').update(request.id, { status: 'accepted' });
  await db('friends').insert({ user_id: req.user.id, friend_id: fromId, status: 'accepted' });
  res.json({ success: true, message: '已接受好友申请' });
});

router.post('/reject/:userId', auth, async (req, res) => {
  const fromId = parseInt(req.params.userId);
  const request = await db('friends').findOne({ user_id: fromId, friend_id: req.user.id, status: 'pending' });
  if (!request) return res.status(404).json({ error: '未找到好友申请' });
  await db('friends').delete(request.id);
  res.json({ success: true });
});

router.delete('/:userId', auth, async (req, res) => {
  const friendId = parseInt(req.params.userId);
  const f1 = await db('friends').findOne({ user_id: req.user.id, friend_id: friendId });
  const f2 = await db('friends').findOne({ user_id: friendId, friend_id: req.user.id });
  if (f1) await db('friends').delete(f1.id);
  if (f2) await db('friends').delete(f2.id);
  res.json({ success: true });
});

router.get('/', auth, async (req, res) => {
  const all = await db('friends').all();
  const friends = await Promise.all(
    all.filter(f => f.user_id === req.user.id && f.status === 'accepted')
      .map(async (f) => {
        const user = await db('users').getById(f.friend_id);
        return user ? { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar } : null;
      })
  );
  const pending = await Promise.all(
    all.filter(f =>
      (f.user_id === req.user.id && f.status === 'pending') ||
      (f.friend_id === req.user.id && f.status === 'pending')
    ).map(async (f) => {
      const isIncoming = f.friend_id === req.user.id && f.status === 'pending';
      const otherId = isIncoming ? f.user_id : f.friend_id;
      const user = await db('users').getById(otherId);
      return user ? { ...f, other: { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar }, incoming: isIncoming } : null;
    })
  );
  res.json({ friends: friends.filter(Boolean), pending: pending.filter(Boolean) });
});

module.exports = router;
