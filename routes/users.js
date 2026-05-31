const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../database/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

const isVercel = process.env.VERCEL === '1';
const storage = multer.diskStorage({
  destination: isVercel
    ? '/tmp/uploads'
    : path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const prefix = file.fieldname === 'bg_image' ? 'bg' : 'avatar';
    cb(null, prefix + '-' + req.user.id + '-' + Date.now() + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/:id', auth, async (req, res) => {
  const user = await db('users').getById(parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: '用户不存在' });
  const { password: _, ...safe } = user;

  const articles = (await db('articles').find({ author_id: user.id }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(a => ({ ...a, images: JSON.parse(a.images || '[]') }));

  const allFriends = await db('friends').all();
  const friendRecord = allFriends.find(f =>
    (f.user_id === req.user.id && f.friend_id === user.id) ||
    (f.user_id === user.id && f.friend_id === req.user.id)
  );

  res.json({
    user: safe,
    articles,
    friendStatus: friendRecord ? friendRecord.status : 'none'
  });
});

router.put('/profile', auth, upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'bg_image', maxCount: 1 }
]), async (req, res) => {
  const { nickname, bio, avatar_data } = req.body;
  const updates = {};
  if (nickname) updates.nickname = nickname;
  if (bio !== undefined) updates.bio = bio;
  if (avatar_data) {
    updates.avatar = avatar_data;
  } else if (req.files && req.files.avatar) {
    updates.avatar = '/uploads/' + req.files.avatar[0].filename;
  }
  if (req.files && req.files.bg_image) {
    updates.bg_image = '/uploads/' + req.files.bg_image[0].filename;
  }

  const updated = await db('users').update(req.user.id, updates);
  const { password: _, ...safe } = updated;
  res.json({ user: safe });
});

module.exports = router;
