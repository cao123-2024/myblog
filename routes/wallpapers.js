const express = require('express');
const { db } = require('../database/db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const all = await db('wallpapers').all();
    all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ wallpapers: all });
  } catch (e) {
    res.json({ wallpapers: [] });
  }
});

router.post('/set', auth, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: '请提供壁纸URL' });
  await db('users').update(req.user.id, { bg_image: url });
  const updated = await db('users').getById(req.user.id);
  const { password: _, ...safe } = updated;
  res.json({ user: safe });
});

router.post('/upload', auth, adminOnly, async (req, res) => {
  const { name, url } = req.body;
  if (!url) return res.status(400).json({ error: '请提供壁纸URL' });
  try {
    const w = await db('wallpapers').insert({
      name: name || 'wallpaper',
      url: url,
      created_at: new Date().toISOString()
    });
    res.json({ wallpaper: w });
  } catch (e) {
    res.status(500).json({ error: '添加壁纸失败: ' + e.message });
  }
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await db('wallpapers').delete(parseInt(req.params.id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
