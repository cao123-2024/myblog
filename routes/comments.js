const express = require('express');
const { table } = require('../database/init');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/article/:articleId', optionalAuth, (req, res) => {
  const articleId = parseInt(req.params.articleId);
  const comments = table('comments').find({ article_id: articleId })
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const result = comments.map(c => {
    const author = table('users').getById(c.user_id);
    const isAdmin = author && author.role === 'admin';
    return {
      ...c,
      author: author ? {
        id: author.id,
        username: author.username,
        nickname: (!isAdmin || c.show_admin_name) ? author.nickname : '管理员',
        avatar: author.avatar,
        role: author.role
      } : null
    };
  });
  res.json({ comments: result });
});

router.post('/article/:articleId', auth, (req, res) => {
  const articleId = parseInt(req.params.articleId);
  const article = table('articles').getById(articleId);
  if (!article) return res.status(404).json({ error: '文章不存在' });

  const { content, show_admin_name } = req.body;
  if (!content) return res.status(400).json({ error: '评论内容不能为空' });

  const comment = table('comments').insert({
    article_id: articleId,
    user_id: req.user.id,
    content,
    show_admin_name: show_admin_name !== undefined ? show_admin_name : 1,
    created_at: new Date().toISOString()
  });
  res.json({ comment });
});

router.delete('/:id', auth, (req, res) => {
  const comment = table('comments').getById(parseInt(req.params.id));
  if (!comment) return res.status(404).json({ error: '评论不存在' });
  if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '无权删除' });
  }
  table('comments').delete(comment.id);
  res.json({ success: true });
});

module.exports = router;
