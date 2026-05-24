const express = require('express');
const path = require('path');
const { initDb } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3000;
const isVercel = process.env.VERCEL === '1';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

initDb();

const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const commentRoutes = require('./routes/comments');
const friendRoutes = require('./routes/friends');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const messageRoutes = require('./routes/messages');
const downloadRoutes = require('./routes/downloads');

app.use('/api', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/downloads', downloadRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`Blog server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
