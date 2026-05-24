const express = require('express');
const crypto = require('crypto');
const { table } = require('../database/init');
const { auth, adminOnly, superAdminOnly, isSuperAdmin, canManageUser, canEditArticle, JWT_SECRET } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.post('/request-verify', auth, adminOnly, (req, res) => {
  const code = crypto.randomInt(100000, 999999).toString();
  table('verifyCodes').insert({ code, used: 0, created_at: new Date().toISOString() });
  console.log('\n========================================');
  console.log('  管理员二次验证码: ' + code);
  console.log('========================================\n');
  res.json({ message: '验证码已生成，请查看终端输出' });
});

router.post('/verify-and-login', auth, adminOnly, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: '请输入验证码' });

  const allCodes = table('verifyCodes').all();
  const recent = allCodes
    .filter(c => !c.used)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const validCode = recent[0];
  if (!validCode) return res.status(400).json({ error: '请先生成验证码' });
  if (validCode.code !== code) return res.status(400).json({ error: '验证码错误' });

  const codeAge = Date.now() - new Date(validCode.created_at).getTime();
  if (codeAge > 5 * 60 * 1000) return res.status(400).json({ error: '验证码已过期（5分钟有效）' });

  table('verifyCodes').update(validCode.id, { used: 1 });
  const adminToken = jwt.sign({ id: req.user.id, admin: true }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ adminToken, message: '管理员验证通过' });
});

router.get('/users', auth, adminOnly, (req, res) => {
  const users = table('users').all().map(u => {
    const { password: _, ...safe } = u;
    return safe;
  });
  res.json({ users, superAdminId: 1, currentUserId: req.user.id, currentUserIsSuper: isSuperAdmin(req.user) });
});

router.put('/users/:id/ban', auth, adminOnly, (req, res) => {
  const userId = parseInt(req.params.id);
  const { minutes } = req.body;
  const target = table('users').getById(userId);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  if (!canManageUser(req.user, target)) return res.status(403).json({ error: '无权操作此用户' });

  const until = new Date(Date.now() + (minutes || 60) * 60 * 1000).toISOString();
  table('users').update(userId, { banned_until: until });
  res.json({ message: `已封禁至 ${new Date(until).toLocaleString()}` });
});

router.put('/users/:id/unban', auth, adminOnly, (req, res) => {
  const userId = parseInt(req.params.id);
  const target = table('users').getById(userId);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  if (!canManageUser(req.user, target)) return res.status(403).json({ error: '无权操作此用户' });

  table('users').update(userId, { banned_until: null });
  res.json({ message: '已解封' });
});

router.delete('/users/:id', auth, adminOnly, (req, res) => {
  const userId = parseInt(req.params.id);
  const target = table('users').getById(userId);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  if (!canManageUser(req.user, target)) return res.status(403).json({ error: '无权删除此用户' });

  table('users').delete(userId);
  table('articles').find({ author_id: userId }).forEach(a => table('articles').delete(a.id));
  table('comments').find({ user_id: userId }).forEach(c => table('comments').delete(c.id));
  table('friends').all().filter(f => f.user_id === userId || f.friend_id === userId)
    .forEach(f => table('friends').delete(f.id));
  table('messages').all().filter(m => m.sender_id === userId || m.receiver_id === userId)
    .forEach(m => table('messages').delete(m.id));
  res.json({ message: '用户已删除' });
});

router.post('/users/:id/promote-admin', auth, superAdminOnly, (req, res) => {
  const userId = parseInt(req.params.id);
  const target = table('users').getById(userId);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  if (target.role === 'admin' && !target.created_by) return res.status(400).json({ error: '已是超级管理员' });
  if (target.role !== 'user' && target.role !== 'semi_admin') return res.status(400).json({ error: '无法升级此用户' });

  table('users').update(userId, { role: 'admin', created_by: req.user.id });
  res.json({ message: `已将 ${target.username} 升级为管理员` });
});

router.post('/users/:id/promote-semi', auth, adminOnly, (req, res) => {
  const userId = parseInt(req.params.id);
  const target = table('users').getById(userId);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  if (target.role === 'admin') return res.status(400).json({ error: '管理员无法降级为半管理员' });
  if (target.role === 'semi_admin') return res.status(400).json({ error: '已是半管理员' });

  table('users').update(userId, { role: 'semi_admin', created_by: req.user.id });
  res.json({ message: `已将 ${target.username} 设为半管理员` });
});

router.post('/users/:id/demote', auth, superAdminOnly, (req, res) => {
  const userId = parseInt(req.params.id);
  const target = table('users').getById(userId);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  if (target.role === 'admin' && !target.created_by) return res.status(400).json({ error: '不能降级超级管理员' });
  if (target.role === 'user') return res.status(400).json({ error: '已是普通用户' });
  if (target.created_by !== req.user.id) return res.status(403).json({ error: '只能降级自己授权的管理员' });

  table('users').update(userId, { role: 'user', created_by: null });
  res.json({ message: `已取消 ${target.username} 的管理员权限` });
});

router.put('/users/:id/tag', auth, adminOnly, (req, res) => {
  const userId = parseInt(req.params.id);
  const target = table('users').getById(userId);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  const tag = (req.body.tag || '').trim().slice(0, 50);
  table('users').update(userId, { tag });
  res.json({ message: '备注已更新', tag });
});

module.exports = router;
