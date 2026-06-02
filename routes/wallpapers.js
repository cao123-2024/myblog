const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db, MODE } = require('../database/db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

const isVercel = process.env.VERCEL === '1';

const WP_DIR = isVercel
  ? path.join('/tmp', 'wallpapers')
  : path.join(__dirname, '..', 'public', 'img', 'wallpapers');
if (!fs.existsSync(WP_DIR)) fs.mkdirSync(WP_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: WP_DIR,
    filename: function(req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname.replace(/[()\s]/g, '-'));
    }
  }),
  limits: { fileSize: isVercel ? 50 * 1024 * 1024 : 200 * 1024 * 1024 }
});

router.get('/', auth, async function(req, res) {
  try {
    var all = await db('wallpapers').all();
    all.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    res.json({ wallpapers: all });
  } catch (e) {
    res.json({ wallpapers: [] });
  }
});

router.post('/set', auth, async function(req, res) {
  var url = String(req.body.url || '').trim();
  try {
    var updated = await db('users').update(req.user.id, { wallpaper: url });
    var safe = Object.assign({}, updated);
    delete safe.password;
    return res.json({ user: safe });
  } catch (e) {
    if (MODE !== 'json' && e.message && (e.message.includes('wallpaper') || e.message.includes('column') || e.message.includes('42703'))) {
      return res.status(500).json({ error: '数据库缺少 wallpaper 列，请在 Supabase SQL Editor 中执行: ALTER TABLE users ADD COLUMN IF NOT EXISTS wallpaper TEXT; 然后重试。' });
    }
    if (MODE === 'json') {
      return res.status(500).json({ error: '设置壁纸失败: ' + (e.message || '未知错误') });
    }
    return res.status(500).json({ error: '设置壁纸失败，请刷新后重试。如在 Vercel 部署，请在 Supabase SQL Editor 执行: ALTER TABLE users ADD COLUMN IF NOT EXISTS wallpaper TEXT;' });
  }
});

router.post('/upload', auth, adminOnly, upload.single('file'), async function(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file selected' });
  try {
    var url = isVercel
      ? '/api/wallpapers/img/' + req.file.filename
      : '/img/wallpapers/' + req.file.filename;
    var w = await db('wallpapers').insert({
      name: req.file.originalname,
      url: url,
      created_at: new Date().toISOString()
    });
    res.json({ wallpaper: w });
  } catch (e) {
    res.status(500).json({ error: '上传失败: ' + e.message });
  }
});

router.get('/img/:filename', function(req, res) {
  var fp = path.join(WP_DIR, req.params.filename);
  if (!fs.existsSync(fp)) return res.status(404).end();
  res.sendFile(fp);
});

router.delete('/:id', auth, adminOnly, async function(req, res) {
  try {
    await db('wallpapers').delete(parseInt(req.params.id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
