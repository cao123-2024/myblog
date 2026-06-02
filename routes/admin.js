const express = require('express');
const { db, MODE } = require('../database/db');
const { auth, adminOnly, superAdminOnly, isSuperAdmin, canManageUser, canEditArticle, JWT_SECRET } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

const router = express.Router();

const R = '\x1b[0m', B = '\x1b[1m', D = '\x1b[2m';
const CY = '\x1b[38;5;51m';
function writeLine(s) { console.log('  ' + CY + '◌' + R + ' ' + s); }

const isVercel = process.env.VERCEL === '1';
const ADMIN_PIN = process.env.ADMIN_PIN || '000000';

var _uploadTableOk = false;
async function ensureUploadTable() {
  if (_uploadTableOk) return true;
  try {
    await db('upload_applies').all();
    _uploadTableOk = true;
    return true;
  } catch(e) {
    return false;
  }
}

router.post('/request-verify', auth, adminOnly, async (req, res) => {
  if (isVercel) return res.json({ message: '请输入管理员PIN码' });

  var code = String(Math.floor(Math.random() * 900000 + 100000));
  await db('verifyCodes').insert({
    code: code,
    used: 0,
    created_at: new Date().toISOString()
  });

  writeLine(B + '管理员验证码' + R + '  ' + D + code + R + '  (5分钟有效)');

  res.json({ message: '验证码: ' + code, code: code });
});

router.post('/verify-and-login', auth, adminOnly, async (req, res) => {
  var code = (req.body.code || '').trim();
  if (!code) return res.status(400).json({ error: '请输入验证码' });

  if (!isVercel) {
    var allCodes = await db('verifyCodes').all();
    allCodes.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    var latest = allCodes.find(function(c) { return c.used === 0; });
    if (!latest) return res.status(400).json({ error: '无效或过期的验证码，请重新请求' });
    var age = Date.now() - new Date(latest.created_at).getTime();
    if (age > 5 * 60 * 1000) return res.status(400).json({ error: '验证码已过期（5分钟），请重新请求' });
    if (code !== latest.code) return res.status(400).json({ error: '验证码错误，请核对终端显示的验证码' });
    await db('verifyCodes').update(latest.id, { used: 1 });
  } else {
    if (code !== ADMIN_PIN) return res.status(400).json({ error: 'PIN码错误' });
  }

  var adminToken = jwt.sign({ id: req.user.id, admin: true }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ adminToken: adminToken, message: '管理员验证通过' });
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

  const min = Math.max(1, parseInt(req.body.minutes) || 60);
  const until = new Date(Date.now() + min * 60 * 1000).toISOString();
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
  const tag = String(req.body.tag || '').trim().slice(0, 50);
  await db('users').update(userId, { tag });
  res.json({ message: '备注已更新', tag });
});

router.post('/upload-apply', auth, async (req, res) => {
  if (req.user.can_upload_images || req.user.role === 'admin' || req.user.role === 'semi_admin') {
    return res.status(400).json({ error: '你已有上传权限' });
  }
  try {
    if (!(await ensureUploadTable())) return res.status(503).json({ error: '数据库表未创建，请管理员在Supabase SQL Editor中执行建表语句' });
    const existing = await db('upload_applies').findOne({ user_id: req.user.id, status: 'pending' });
    if (existing) return res.json({ message: '已申请过，请等待管理员审核' });
    await db('upload_applies').insert({
      user_id: req.user.id,
      status: 'pending',
      created_at: new Date().toISOString()
    });
    res.json({ message: '申请已提交' });
  } catch(e) {
    res.status(500).json({ error: '申请失败，表可能未创建: ' + e.message });
  }
});

router.get('/upload-applies', auth, adminOnly, async (req, res) => {
  try {
    if (!(await ensureUploadTable())) return res.json({ applies: [] });
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
  if (!(await ensureUploadTable())) return res.status(503).json({ error: '服务正在初始化' });
  const applyId = parseInt(req.params.id);
  const apply = await db('upload_applies').getById(applyId);
  if (!apply) return res.status(404).json({ error: '申请不存在' });
  await db('upload_applies').update(applyId, { status: 'approved' });
  await db('users').update(apply.user_id, { can_upload_images: true });
  res.json({ message: '已批准' });
});

router.post('/upload-apply/:id/reject', auth, adminOnly, async (req, res) => {
  if (!(await ensureUploadTable())) return res.status(503).json({ error: '服务正在初始化' });
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
  var updated = await db('users').update(userId, { can_upload_images: true });
  res.json({ message: '已开通上传权限', user: { id: updated.id, can_upload_images: updated.can_upload_images } });
});

router.post('/users/:id/revoke-upload', auth, adminOnly, async (req, res) => {
  const userId = parseInt(req.params.id);
  const target = await db('users').getById(userId);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  var updated = await db('users').update(userId, { can_upload_images: false });
  if (!updated || updated.can_upload_images !== false) {
    return res.status(500).json({ error: '取消失败，数据库未保存。请检查users表是否有can_upload_images列' });
  }
  res.json({ message: '已取消上传权限', user: { id: updated.id, can_upload_images: updated.can_upload_images } });
});

/* ===== BAN APPEAL ===== */

router.post('/ban-appeal', auth, async (req, res) => {
  if (!req.user.banned_until) return res.status(400).json({ error: '你的账号未被封禁' });
  var existing = await db('ban_appeals').findOne({ user_id: req.user.id, status: 'pending' });
  if (existing) return res.status(400).json({ error: '你已提交过申诉，请等待管理员处理' });
  await db('ban_appeals').insert({
    user_id: req.user.id,
    reason: String(req.body.reason || '').trim().slice(0, 500),
    status: 'pending',
    created_at: new Date().toISOString()
  });
  res.json({ message: '申诉已提交，请等待管理员处理' });
});

router.get('/ban-appeals', auth, adminOnly, async (req, res) => {
  try {
    var all = await db('ban_appeals').all();
    all.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    var result = [];
    for (var i = 0; i < all.length; i++) {
      var user = await db('users').getById(all[i].user_id);
      if (user) { var p = user.password; delete user.password; result.push(Object.assign({}, all[i], { user: user })); }
    }
    res.json({ appeals: result });
  } catch (e) {
    res.json({ appeals: [] });
  }
});

router.post('/ban-appeal/:id/approve', auth, adminOnly, async (req, res) => {
  if (!isSuperAdmin(req.user)) return res.status(403).json({ error: '只有超级管理员可以处理申诉' });
  var appeal = await db('ban_appeals').getById(parseInt(req.params.id));
  if (!appeal) return res.status(404).json({ error: '申诉不存在' });
  var user = await db('users').getById(appeal.user_id);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  var reduceMinutes = Math.max(0, parseInt(req.body.reduce_minutes) || 0);
  var msg = String(req.body.admin_msg || '').trim().slice(0, 200);

  await db('ban_appeals').update(appeal.id, {
    status: 'approved',
    admin_msg: msg,
    reduced_minutes: reduceMinutes
  });

  if (user.banned_until) {
    var remainingMs = new Date(user.banned_until).getTime() - Date.now();
    if (remainingMs > 0 && reduceMinutes > 0) {
      var newUntil = new Date(new Date(user.banned_until).getTime() - reduceMinutes * 60 * 1000);
      if (newUntil.getTime() <= Date.now()) {
        await db('users').update(user.id, { banned_until: null });
      } else {
        await db('users').update(user.id, { banned_until: newUntil.toISOString() });
      }
    } else if (reduceMinutes <= 0) {
      await db('users').update(user.id, { banned_until: null });
    }
  }

  res.json({ message: '已处理申诉' });
});

router.post('/ban-appeal/:id/reject', auth, adminOnly, async (req, res) => {
  if (!isSuperAdmin(req.user)) return res.status(403).json({ error: '只有超级管理员可以处理申诉' });
  var appeal = await db('ban_appeals').getById(parseInt(req.params.id));
  if (!appeal) return res.status(404).json({ error: '申诉不存在' });
  var msg = (req.body.admin_msg || '').trim().slice(0, 200);
  await db('ban_appeals').update(appeal.id, { status: 'rejected', admin_msg: msg });
  res.json({ message: '已驳回申诉' });
});

module.exports = router;
