const express = require('express');
const { db } = require('../database/db');
const { auth, adminOnly, superAdminOnly, isSuperAdmin, canManageUser, canEditArticle, JWT_SECRET } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

const router = express.Router();

const ADMIN_PIN = process.env.ADMIN_PIN || '000000';

router.post('/request-verify', auth, adminOnly, async (req, res) => {
  res.json({ message: '请输入管理员PIN码' });
});

router.post('/verify-and-login', auth, adminOnly, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: '请输入PIN码' });
  if (code !== ADMIN_PIN) return res.status(400).json({ error: 'PIN码错误' });

  const adminToken = jwt.sign({ id: req.user.id, admin: true }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ adminToken, message: '管理员验证通过' });
});

router.get('/users', auth, adminOnly, async (req, res) => {
  const users = (await db('users').all()).map(u => {
    const { password: _, ...safe } = u;
    return safe;
  });
  res.json({ users, superAdminId: 1, currentUserId: req.user.id, currentUserIsSuper: isSuperAdmin(req.user) });
});

router.put('/users/:id/ban', auth, adminOnly, async (req, res) => {
  const userId = parseInt(req.params.id);
  const { minutes } = req.body;
  const target = await db('users').getById(userId);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  if (!canManageUser(req.user, target)) return res.status(403).json({ error: '无权操作此用户' });

  const until = new Date(Date.now() + (minutes || 60) * 60 * 1000).toISOString();
  await db('users').update(userId, { banned_until: until });
  res.json({ message: `已封禁至 ${new Date(until).toLocaleString()}` });
});

router.put('/users/:id/unban', auth, adminOnly, async (req, res) => {
  const userId = parseInt(req.params.id);
  const target = await db('users').getById(userId);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  if (!canManageUser(req.user, target)) return res.status(403).json({ error: '无权操作此用户' });

  await db('users').update(userId, { banned_until: null });
  res.json({ message: '已解封' });
});

router.delete('/users/:id', auth, adminOnly, async (req, res) => {
  const userId = parseInt(req.params.id);
  const target = await db('users').getById(userId);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  if (!canManageUser(req.user, target)) return res.status(403).json({ error: '无权删除此用户' });

  await db('users').delete(userId);

  const userArticles = await db('articles').find({ author_id: userId });
  for (const a of userArticles) await db('articles').delete(a.id);

  const userComments = await db('comments').find({ user_id: userId });
  for (const c of userComments) await db('comments').delete(c.id);

  const allFriends = await db('friends').all();
  const userFriends = allFriends.filter(f => f.user_id === userId || f.friend_id === userId);
  for (const f of userFriends) await db('friends').delete(f.id);

  const allMessages = await db('messages').all();
  const userMessages = allMessages.filter(m => m.sender_id === userId || m.receiver_id === userId);
  for (const m of userMessages) await db('messages').delete(m.id);

  res.json({ message: '用户已删除' });
});

router.post('/users/:id/promote-admin', auth, superAdminOnly, async (req, res) => {
  const userId = parseInt(req.params.id);
  const target = await db('users').getById(userId);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  if (target.role === 'admin' && !target.created_by) return res.status(400).json({ error: '已是超级管理员' });
  if (target.role !== 'user' && target.role !== 'semi_admin') return res.status(400).json({ error: '无法升级此用户' });

  await db('users').update(userId, { role: 'admin', created_by: req.user.id });
  res.json({ message: `已将 ${target.username} 升级为管理员` });
});

router.post('/users/:id/promote-semi', auth, adminOnly, async (req, res) => {
  const userId = parseInt(req.params.id);
  const target = await db('users').getById(userId);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  if (target.role === 'admin') return res.status(400).json({ error: '管理员无法降级为半管理员' });
  if (target.role === 'semi_admin') return res.status(400).json({ error: '已是半管理员' });

  await db('users').update(userId, { role: 'semi_admin', created_by: req.user.id });
  res.json({ message: `已将 ${target.username} 设为半管理员` });
});

router.post('/users/:id/demote', auth, superAdminOnly, async (req, res) => {
  const userId = parseInt(req.params.id);
  const target = await db('users').getById(userId);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  if (target.role === 'admin' && !target.created_by) return res.status(400).json({ error: '不能降级超级管理员' });
  if (target.role === 'user') return res.status(400).json({ error: '已是普通用户' });
  if (target.created_by !== req.user.id) return res.status(403).json({ error: '只能降级自己授权的管理员' });

  await db('users').update(userId, { role: 'user', created_by: null });
  res.json({ message: `已取消 ${target.username} 的管理员权限` });
});

router.put('/users/:id/tag', auth, adminOnly, async (req, res) => {
  const userId = parseInt(req.params.id);
  const target = await db('users').getById(userId);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  const tag = (req.body.tag || '').trim().slice(0, 50);
  await db('users').update(userId, { tag });
  res.json({ message: '备注已更新', tag });
});

router.post('/upload-apply', auth, async (req, res) => {
  if (req.user.can_upload_images || req.user.role === 'admin' || req.user.role === 'semi_admin') {
    return res.status(400).json({ error: '你已有上传权限' });
  }
  const existing = await db('upload_applies').findOne({ user_id: req.user.id, status: 'pending' });
  if (existing) return res.json({ message: '已申请过，请等待管理员审核' });
  await db('upload_applies').insert({
    user_id: req.user.id,
    status: 'pending',
    created_at: new Date().toISOString()
  });
  res.json({ message: '申请已提交' });
});

router.get('/upload-applies', auth, adminOnly, async (req, res) => {
  try {
    const applies = await db('upload_applies').all();
    const results = await Promise.all(
      applies.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(async function(a) {
        const user = await db('users').getById(a.user_id);
        return { ...a, user: user ? { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar, can_upload_images: user.can_upload_images } : null };
      })
    );
    res.json({ applies: results });
  } catch (e) {
    res.json({ applies: [] });
  }
});

router.post('/upload-apply/:id/approve', auth, adminOnly, async (req, res) => {
  const applyId = parseInt(req.params.id);
  const apply = await db('upload_applies').getById(applyId);
  if (!apply) return res.status(404).json({ error: '申请不存在' });
  await db('upload_applies').update(applyId, { status: 'approved' });
  await db('users').update(apply.user_id, { can_upload_images: true });
  res.json({ message: '已批准' });
});

router.post('/upload-apply/:id/reject', auth, adminOnly, async (req, res) => {
  const applyId = parseInt(req.params.id);
  const apply = await db('upload_applies').getById(applyId);
  if (!apply) return res.status(404).json({ error: '申请不存在' });
  await db('upload_applies').update(applyId, { status: 'rejected' });
  res.json({ message: '已拒绝' });
});

router.post('/users/:id/grant-upload', auth, adminOnly, async (req, res) => {
  const userId = parseInt(req.params.id);
  const target = await db('users').getById(userId);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  await db('users').update(userId, { can_upload_images: true });
  res.json({ message: '已开通上传权限' });
});

router.post('/users/:id/revoke-upload', auth, adminOnly, async (req, res) => {
  const userId = parseInt(req.params.id);
  const target = await db('users').getById(userId);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  await db('users').update(userId, { can_upload_images: false });
  res.json({ message: '已取消上传权限' });
});

module.exports = router;
