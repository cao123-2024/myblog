const jwt = require('jsonwebtoken');
const { table } = require('../database/init');

const JWT_SECRET = process.env.JWT_SECRET || 'myblog_liquid_glass_secret_key_2024';

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '请先登录' });
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET);
    const user = table('users').getById(decoded.id);
    if (!user) return res.status(401).json({ error: '用户不存在' });
    if (user.banned_until) {
      const until = new Date(user.banned_until);
      if (until > new Date()) {
        return res.status(403).json({ error: `账号已被封禁至 ${until.toLocaleString()}` });
      } else {
        table('users').update(user.id, { banned_until: null });
      }
    }
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.slice(7), JWT_SECRET);
      req.user = table('users').getById(decoded.id) || null;
    } catch (e) { req.user = null; }
  } else {
    req.user = null;
  }
  next();
}

function adminOnly(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'semi_admin')) {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}

function superAdminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要超级管理员权限' });
  }
  next();
}

function isSuperAdmin(user) {
  return user && user.role === 'admin' && !user.created_by;
}

function canManageUser(actor, target) {
  if (!target) return false;
  if (target.id === actor.id) return false;
  if (target.role === 'admin' && !target.created_by) return false;
  if (actor.role === 'admin' || actor.role === 'semi_admin') return true;
  return false;
}

function canEditArticle(actor, article) {
  if (!article) return false;
  if (article.author_id === actor.id) return true;
  if (isSuperAdmin(actor)) return true;
  if (actor.role === 'admin' && article.author_id !== actor.id) {
    const author = table('users').getById(article.author_id);
    if (author && author.role === 'admin' && !author.created_by) return false;
    if (author && author.created_by === actor.id) return true;
    return true;
  }
  return false;
}

module.exports = { auth, optionalAuth, adminOnly, superAdminOnly, isSuperAdmin, canManageUser, canEditArticle, JWT_SECRET };
