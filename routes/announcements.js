const express = require('express');
const { db } = require('../database/db');
const { auth, superAdminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const all = await db('announcements').all();
  all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ announcements: all });
});

router.post('/', auth, superAdminOnly, async (req, res) => {
  const { title, content } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: '标题不能为空' });
  if (!content || !content.trim()) return res.status(400).json({ error: '内容不能为空' });

  try {
    const ann = await db('announcements').insert({
      title: title.trim(),
      content: content.trim(),
      created_at: new Date().toISOString()
    });
    res.json({ announcement: ann });
  } catch (e) {
    res.status(500).json({ error: '公告发布失败，请在 Supabase SQL Editor 中执行建表语句: CREATE TABLE IF NOT EXISTS announcements (id SERIAL PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());' });
  }
});

router.put('/:id', auth, superAdminOnly, async (req, res) => {
  const id = parseInt(req.params.id);
  const ann = await db('announcements').getById(id);
  if (!ann) return res.status(404).json({ error: '公告不存在' });

  const { title, content } = req.body;
  const updates = {};
  if (title !== undefined) updates.title = title.trim();
  if (content !== undefined) updates.content = content.trim();
  const updated = await db('announcements').update(id, updates);
  res.json({ announcement: updated });
});

router.delete('/:id', auth, superAdminOnly, async (req, res) => {
  const id = parseInt(req.params.id);
  await db('announcements').delete(id);
  res.json({ success: true });
});

module.exports = router;
