const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../database/db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

const UPLOAD_DIR = process.env.VERCEL === '1'
  ? path.join('/tmp', 'uploads', 'downloads')
  : path.join(__dirname, '..', 'uploads', 'downloads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
 filename: (req, file, cb) => {
    const safeName = file.originalname;
   cb(null, Date.now() + '-' + safeName);
  }
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

router.get('/', async (req, res) => {
  const items = (await db('downloads').all())
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ items });
});

router.get('/:id', async (req, res) => {
  const item = await db('downloads').getById(parseInt(req.params.id));
  if (!item) return res.status(404).json({ error: '文件不存在' });
  res.json({ item });
});

router.post('/', auth, adminOnly, upload.single('file'), async (req, res) => {
  const { title, description, type, url } = req.body;
  var safeTitle = String(title || '').trim();

  if (type === 'link') {
    if (!url || !url.trim()) return res.status(400).json({ error: '请输入链接地址' });
    var item = await db('downloads').insert({
      title: title || url.trim().slice(0, 40),
      description: description || '',
      type: 'link',
      url: url.trim(),
      filename: '',
      originalName: '',
      size: 0,
      mimetype: '',
      path: '',
      download_count: 0,
      created_at: new Date().toISOString()
    });
    return res.json({ item });
  }

  if (!req.file) return res.status(400).json({ error: '请选择文件' });
  var item = await db('downloads').insert({
    title: title || req.file.originalname,
    description: description || '',
    type: 'file',
    url: '',
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
    path: '/uploads/downloads/' + req.file.filename,
    download_count: 0,
    created_at: new Date().toISOString()
  });
  res.json({ item });
});

router.get('/:id/dl', async (req, res) => {
  var item = await db('downloads').getById(parseInt(req.params.id));
  if (!item) return res.status(404).json({ error: '文件不存在' });
  await db('downloads').increment(item.id, 'download_count', 1);

  if (item.type === 'link' && item.url) {
    return res.redirect(item.url);
  }

  var filePath = path.join(UPLOAD_DIR, item.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: '文件已被删除' });
  res.download(filePath, item.originalName);
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  var item = await db('downloads').getById(parseInt(req.params.id));
  if (!item) return res.status(404).json({ error: '文件不存在' });
  if (item.type !== 'link') {
    var filePath = path.join(UPLOAD_DIR, item.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  await db('downloads').delete(item.id);
  res.json({ message: '已删除' });
});

module.exports = router;
