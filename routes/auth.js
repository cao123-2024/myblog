const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { table } = require('../database/init');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { username, password, nickname } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
  if (username.length < 2 || username.length > 20) return res.status(400).json({ error: '用户名长度2-20位' });
  if (password.length < 3) return res.status(400).json({ error: '密码至少3位' });
  if (table('users').findOne({ username })) return res.status(400).json({ error: '用户名已被注册' });

  const user = table('users').insert({
    username,
    password: bcrypt.hashSync(password, 10),
    nickname: nickname || username,
    avatar: '',
    bg_image: '',
    bio: '',
    role: 'user',
    tag: '',
    created_by: null,
    banned_until: null,
    created_at: new Date().toISOString()
  });

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...safe } = user;
  res.json({ token, user: safe });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });

  const user = table('users').findOne({ username });
  if (!user) return res.status(401).json({ error: '用户名或密码错误' });
  if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: '用户名或密码错误' });
  if (user.banned_until) {
    const until = new Date(user.banned_until);
    if (until > new Date()) return res.status(403).json({ error: `账号已被封禁至 ${until.toLocaleString()}` });
    table('users').update(user.id, { banned_until: null });
  }

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...safe } = user;
  res.json({ token, user: safe });
});

router.get('/me', require('../middleware/auth').auth, (req, res) => {
  const { password: _, ...safe } = req.user;
  res.json({ user: safe });
});

router.get('/users/search', require('../middleware/auth').auth, (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ users: [] });
  const users = table('users').all()
    .filter(u => u.username.toLowerCase().includes(q) || (u.nickname && u.nickname.toLowerCase().includes(q)))
    .slice(0, 5)
    .map(u => {
      const { password: _, ...safe } = u;
      return safe;
    });
  res.json({ users });
});

module.exports = router;
