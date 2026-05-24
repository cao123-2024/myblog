const express = require('express');
const multer = require('multer');
const path = require('path');
const { table } = require('../database/init');
const { auth, optionalAuth, adminOnly, canEditArticle } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: process.env.VERCEL === '1'
    ? '/tmp/uploads'
    : path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', optionalAuth, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 5;
  const allArticles = table('articles').all()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const total = allArticles.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const articles = allArticles.slice(start, start + pageSize);
  const result = articles.map(a => {
    const author = table('users').getById(a.author_id);
    return {
      ...a,
      images: JSON.parse(a.images || '[]'),
      download_id: a.download_id || null,
      author: author ? { id: author.id, username: author.username, nickname: author.nickname, avatar: author.avatar, role: author.role } : null
    };
  });
  res.json({ articles: result, page, pageSize, total, totalPages });
});

router.get('/:id', optionalAuth, (req, res) => {
  const article = table('articles').getById(parseInt(req.params.id));
  if (!article) return res.status(404).json({ error: '文章不存在' });
  const author = table('users').getById(article.author_id);
  article.images = JSON.parse(article.images || '[]');
  article.author = author ? { id: author.id, username: author.username, nickname: author.nickname, avatar: author.avatar, role: author.role } : null;
  res.json({ article });
});

router.post('/', auth, upload.array('images', 10), (req, res) => {
  const { title, content, summary, download_id } = req.body;
  if (!title || !content) return res.status(400).json({ error: '标题和内容不能为空' });

  const imageFiles = req.files || [];
  const imagePaths = imageFiles.map(f => '/uploads/' + f.filename);
  const coverImage = imagePaths.length > 0 ? imagePaths[0] : '';

  const article = table('articles').insert({
    author_id: req.user.id,
    title,
    content,
    summary: summary || content.slice(0, 150),
    cover_image: coverImage,
    images: JSON.stringify(imagePaths),
    download_id: download_id ? parseInt(download_id) : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  res.json({ article });
});

router.put('/:id', auth, upload.array('images', 10), (req, res) => {
  const article = table('articles').getById(parseInt(req.params.id));
  if (!article) return res.status(404).json({ error: '文章不存在' });
  if (!canEditArticle(req.user, article)) {
    return res.status(403).json({ error: '无权修改此文章' });
  }

  const { title, content, summary, download_id } = req.body;
  const updates = { updated_at: new Date().toISOString() };
  if (title !== undefined) updates.title = title;
  if (content !== undefined) { updates.content = content; updates.summary = content.slice(0, 150); }
  if (summary !== undefined) updates.summary = summary;
  if (download_id !== undefined) updates.download_id = download_id ? parseInt(download_id) : null;

  const imageFiles = req.files || [];
  if (imageFiles.length > 0) {
    const existingImages = JSON.parse(article.images || '[]');
    const newPaths = imageFiles.map(f => '/uploads/' + f.filename);
    updates.images = JSON.stringify([...existingImages, ...newPaths]);
    if (!article.cover_image) updates.cover_image = newPaths[0];
  }

  const updated = table('articles').update(article.id, updates);
  updated.images = JSON.parse(updated.images || '[]');
  res.json({ article: updated });
});

router.delete('/:id', auth, (req, res) => {
  const article = table('articles').getById(parseInt(req.params.id));
  if (!article) return res.status(404).json({ error: '文章不存在' });
  if (!canEditArticle(req.user, article)) {
    return res.status(403).json({ error: '无权删除此文章' });
  }
  table('articles').delete(article.id);
  table('comments').find({ article_id: article.id }).forEach(c => table('comments').delete(c.id));
  res.json({ success: true });
});

module.exports = router;
