function render_article(articleId) {
  const wrap = document.createElement('div');
  wrap.className = 'article-detail';
  wrap.id = 'article-detail-wrap';
  wrap.innerHTML = '<div class="text-center p-6"><div class="skeleton" style="height:300px;width:100%"></div></div>';
  loadArticle(wrap, articleId);
  return wrap;
}

async function loadArticle(wrap, articleId) {
  try {
    const data = await API.get('/articles/' + articleId);
    const a = data.article;
    if (!a) { wrap.innerHTML = '<div class="text-center p-6">文章不存在</div>'; return; }

    const commentsData = await API.get('/comments/article/' + articleId);

    const hasCover = a.cover_image;
    const otherImages = (a.images || []).filter(function(img){ return img !== a.cover_image; });
    wrap.innerHTML = `
      <div class="stagger">
        ${hasCover ? `<div class="article-detail-cover" style="background-image:url(${a.cover_image})"></div>` : ''}
        <h1>${escapeHtml(a.title)}</h1>
        <div class="flex items-center gap-3 mb-4 text-sm text-secondary">
          <span>${a.author ? escapeHtml(a.author.nickname || a.author.username) : '未知'}</span>
          <span>${formatDate(a.created_at)}</span>
          ${a.updated_at !== a.created_at ? `<span>(已编辑)</span>` : ''}
          ${canEditArticle(a) ? `
            <button class="btn btn-glass btn-sm" onclick="editArticle(${a.id})">编辑</button>
            <button class="btn btn-glass btn-sm" onclick="deleteArticleFromDetail(${a.id})">删除</button>
          ` : ''}
        </div>
        <div class="article-detail-content card-glass">${escapeHtml(a.content)}</div>
        ${otherImages.length > 0 ? `
          <div class="flex flex-col gap-4 mt-6">
            ${otherImages.map(img => `<img src="${img}" style="max-width:100%;border-radius:var(--radius-lg)" />`).join('')}
          </div>
        ` : ''}
      </div>
      <div class="mt-8">
        <h3 class="mb-4">评论 (${commentsData.comments.length})</h3>
        <div id="comment-list">${renderComments(commentsData.comments)}</div>
        ${Store.user ? `
          <div class="card-glass mt-4" style="padding:20px">
            <textarea class="input input-glass textarea mb-3" id="comment-input" placeholder="写下你的评论..." rows="3"></textarea>
            <div class="flex items-center gap-3">
              <button class="btn btn-primary" onclick="submitComment(${articleId})">发表评论</button>
              ${Store.isAdmin() ? `<label class="text-sm flex items-center gap-1"><input type="checkbox" id="comment-admin-name" checked> 显示管理员昵称</label>` : ''}
            </div>
          </div>
        ` : `<p class="text-sm text-secondary text-center mt-4">请<a href="javascript:void(0)" onclick="navigate('login')" style="color:var(--blue)">登录</a>后评论</p>`}
      </div>
    `;
  } catch (e) {
    wrap.innerHTML = `<div class="text-center p-6 text-secondary">加载失败: ${e.message}</div>`;
  }
}

function renderComments(comments) {
  if (comments.length === 0) return '<p class="text-sm text-secondary">暂无评论</p>';
  return comments.map(c => `
    <div class="comment-item">
      <div class="comment-avatar" style="background-image:url(${c.author?.avatar || ''})" onclick="navigate('profile',${c.author?.id})"></div>
      <div class="comment-body">
        <div class="flex items-center justify-between">
          <span class="comment-author" onclick="navigate('profile',${c.author?.id})">${escapeHtml(c.author?.nickname || c.author?.username || '未知')}</span>
          ${(c.user_id === Store.user?.id || Store.isAdmin()) ? `<button class="text-xs text-tertiary" style="background:none;border:none;cursor:pointer" onclick="deleteComment(${c.id})">删除</button>` : ''}
        </div>
        <div class="comment-text">${escapeHtml(c.content)}</div>
        <div class="comment-time">${formatDate(c.created_at)}</div>
      </div>
    </div>
  `).join('');
}

async function submitComment(articleId) {
  const input = $('#comment-input');
  const content = input.value.trim();
  if (!content) return toast('评论内容不能为空', 'error');
  const showAdmin = $('#comment-admin-name');
  const showName = showAdmin ? (showAdmin.checked ? 1 : 0) : 1;
  try {
    await API.post('/comments/article/' + articleId, { content, show_admin_name: showName });
    toast('评论成功', 'success');
    navigate('article', articleId);
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteComment(id) {
  try {
    await API.delete('/comments/' + id);
    toast('评论已删除', 'success');
    const articleId = Store.lastPageData;
    if (articleId) navigate('article', articleId);
    else navigate('home');
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteArticleFromDetail(id) {
  showConfirm('删除文章', '确定要删除这篇文章吗？', async () => {
    await API.delete('/articles/' + id);
    toast('文章已删除', 'success');
    navigate('home');
  });
}
