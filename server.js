const express = require('express');
const path = require('path');
const { initDb } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3000;
const isVercel = process.env.VERCEL === '1';

app.use(express.json());

/* Serve static files IMMEDIATELY — no DB needed */
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

app.use('/api', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/downloads', downloadRoutes);
app.use('/api/announcements', announcementRoutes);

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
