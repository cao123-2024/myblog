const express = require('express');
const path = require('path');
const { initDb } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3000;
const isVercel = process.env.VERCEL === '1';

if (isVercel) {
  const fs = require('fs');
  fs.mkdirSync('/tmp/uploads', { recursive: true });
}

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

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
    return res.status(413).json({ error: '文件太大，请压缩后再上传（最大 500MB）' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: '请求体太大，Vercel 限制 4.5MB，请压缩图片或使用较小文件' });
  }
  if (err && err.status === 413) {
    return res.status(413).json({ error: '文件太大（Vercel 限制 4.5MB），请压缩后再上传' });
  }
  next(err);
});

/* Kick off DB connect in background */
let _ready = false;
let _dbInit = initDb().then(function(){ _ready = true; }).catch(function(err){
  console.error('DB init failed:', err);
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
    app.listen(PORT, function(){
      console.log('Blog server running at http://localhost:' + PORT);
    });
  });
}

module.exports = app;
