const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { table } = require('../database/init');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

const UPLOAD_DIR = process.env.VERCEL === '1'
  ? path.join('/tmp', 'uploads', 'downloads')
  : path.join(__dirname, '..', 'uploads', 'downloads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const safeName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, Date.now() + '-' + safeName);
  }
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

/* List all downloads */
router.get('/', (req, res) => {
  const items = table('downloads').all()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ items });
});

/* Get single download */
router.get('/:id', (req, res) => {
  const item = table('downloads').getById(parseInt(req.params.id));
  if (!item) return res.status(404).json({ error: '文件不存在' });
  res.json({ item });
});

/* Upload (admin only) */
router.post('/', auth, adminOnly, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择文件' });
  const { title, description } = req.body;
  const item = table('downloads').insert({
    title: title || req.file.originalname,
    description: description || '',
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

/* Download file */
router.get('/:id/dl', (req, res) => {
  const item = table('downloads').getById(parseInt(req.params.id));
  if (!item) return res.status(404).json({ error: '文件不存在' });
  table('downloads').update(item.id, { download_count: (item.download_count || 0) + 1 });
  const filePath = path.join(UPLOAD_DIR, item.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: '文件已被删除' });
  res.download(filePath, item.originalName);
});

/* Delete (admin only) */
router.delete('/:id', auth, adminOnly, (req, res) => {
  const item = table('downloads').getById(parseInt(req.params.id));
  if (!item) return res.status(404).json({ error: '文件不存在' });
  const filePath = path.join(UPLOAD_DIR, item.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  table('downloads').delete(item.id);
  res.json({ message: '已删除' });
});

module.exports = router;
