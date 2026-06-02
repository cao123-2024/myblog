const express = require('express');
const path = require('path');
const fs = require('fs');
const { initDb, MODE } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3000;
const isVercel = process.env.VERCEL === '1';

if (isVercel) {
  fs.mkdirSync('/tmp/uploads', { recursive: true });
} else {
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.json({ limit: isVercel ? '5mb' : '500mb' }));
app.use(express.urlencoded({ limit: isVercel ? '5mb' : '500mb', extended: true }));

/* Serve static files IMMEDIATELY — no DB needed */
app.use(express.static(path.join(__dirname, 'public')));
if (isVercel) {
  app.use('/uploads', express.static('/tmp/uploads'));
} else {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

/* Global error handler for multer / body-too-large */
app.use(function(err, req, res, next) {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: '单个文件超过 10MB，图片已在上传前自动压缩，请选择较小的图片' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: '请求体太大，Vercel 限制 4.5MB，图片已在上传前自动压缩，请重试' });
  }
  if (err && err.status === 413) {
    return res.status(413).json({ error: '文件太大，图片已在上传前自动压缩，请重试' });
  }
  next(err);
});

/* Kick off DB connect in background */
let _ready = false;
let _dbFailed = false;
let _dbInit = initDb().then(function(){ _ready = true; }).catch(function(err){
  console.error('DB init failed, retrying in degraded mode:', err.message);
  _ready = true; _dbFailed = true;
});

/* API routes — wait for DB */
app.use('/api', async function(req, res, next){
  if (_ready) return next();
  try {
    await _dbInit;
    _ready = true;
    next();
  } catch(err){
    res.status(503).json({ error: '数据库连接中，请稍候...' });
  }
});

const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const commentRoutes = require('./routes/comments');
const friendRoutes = require('./routes/friends');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const messageRoutes = require('./routes/messages');
const downloadRoutes = require('./routes/downloads');
const announcementRoutes = require('./routes/announcements');
const wallpaperRoutes = require('./routes/wallpapers');
const gameRoutes = require('./routes/game');

app.use('/api', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/downloads', downloadRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/wallpapers', wallpaperRoutes);
app.use('/api/game', gameRoutes);

app.get('*', function(req, res){
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (!isVercel) {
  _dbInit.then(function(){
    app.listen(PORT, function(){});
  }).catch(function(err){
    console.error('FATAL:', err.message);
    process.exit(1);
  });
}

process.on('uncaughtException', function(err){
  console.error('[LUMINA] Uncaught Exception:', err.message);
  console.error(err.stack);
});
process.on('unhandledRejection', function(reason){
  console.error('[LUMINA] Unhandled Rejection:', reason);
});

module.exports = app;
