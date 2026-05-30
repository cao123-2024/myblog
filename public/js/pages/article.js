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
    if (!a) { wrap.innerHTML = '<div class="text-center p-6">Article not found</div>'; return; }

    const commentsData = await API.get('/comments/article/' + articleId);
    const hasCover = a.cover_image;
    const otherImages = (a.images || []).filter(function(img){ return img !== a.cover_image; });
    var authorAv = (a.author && a.author.avatar) || '';
    var authorName = a.author ? (a.author.nickname || a.author.username) : 'Unknown';
    var roleLabel = '';
    if (a.author) {
      if (a.author.role === 'admin' && !a.author.created_by) roleLabel = 'Super Admin';
      else if (a.author.role === 'admin') roleLabel = 'Admin';
      else if (a.author.role === 'semi_admin') roleLabel = 'Moderator';
    }

    wrap.innerHTML = ''
      + '<div class="stagger">'
      + (hasCover ? '<div class="article-detail-cover" style="background-image:url(' + a.cover_image + ')"></div>' : '')
      + '<h1 class="article-detail-title">' + escapeHtml(a.title) + '</h1>'
      + '<div class="article-author-card card-glass">'
      + '<div class="article-author-avatar" style="background-image:url(' + authorAv + ')" onclick="navigate(\'profile\',' + (a.author?.id||'') + ')"></div>'
      + '<div class="article-author-info">'
      + '<div class="article-author-name" onclick="navigate(\'profile\',' + (a.author?.id||'') + ')">' + escapeHtml(authorName) + (roleLabel ? ' <span class="article-author-role">' + roleLabel + '</span>' : '') + '</div>'
      + '<div class="article-author-meta">' + formatDate(a.created_at) + (a.updated_at !== a.created_at ? ' (edited)' : '') + '</div>'
      + '</div>'
      + (canEditArticle(a) ? '<div class="article-author-actions"><button class="btn btn-glass btn-sm" onclick="editArticle('+a.id+')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit</button><button class="btn btn-glass btn-sm" onclick="deleteArticleFromDetail('+a.id+')" style="margin-left:6px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg> Delete</button></div>' : '')
      + '</div>'
      + '<div class="article-detail-content card-glass">' + escapeHtml(a.content) + '</div>'
      + (otherImages.length > 0 ? '<div class="article-extra-images">' + otherImages.map(function(img){ return '<img src="'+img+'" loading="lazy" />'; }).join('') + '</div>' : '')
      + '</div>'
      + '<div class="mt-8">'
      + '<h3 class="mb-4" style="font-size:1.1rem;font-weight:600">Comments (' + commentsData.comments.length + ')</h3>'
      + '<div id="comment-list">' + renderComments(commentsData.comments) + '</div>'
      + (Store.user ? ''
        + '<div class="card-glass mt-4" style="padding:20px">'
        + '<textarea class="input input-glass textarea mb-3" id="comment-input" placeholder="Write a comment..." rows="3"></textarea>'
        + '<div class="flex items-center gap-3">'
        + '<button class="btn btn-primary" onclick="submitComment(' + articleId + ')">Submit</button>'
        + (Store.isAdmin() ? '<label class="text-sm flex items-center gap-1"><input type="checkbox" id="comment-admin-name" checked> Show admin name</label>' : '')
        + '</div></div>'
        : '<p class="text-sm text-secondary text-center mt-4">Please <a href="javascript:void(0)" onclick="navigate(\'login\')" style="color:var(--blue)">login</a> to comment</p>')
      + '</div>';
  } catch (e) {
    wrap.innerHTML = '<div class="text-center p-6 text-secondary">Load failed: ' + e.message + '</div>';
  }
}

async function deleteArticleFromDetail(id) {
  showConfirm('Delete Article', 'Are you sure?', async () => {
    await API.delete('/articles/' + id);
    toast('Deleted', 'success');
    navigate('home');
  });
}

function renderComments(comments) {
  if (comments.length === 0) return '<p class="text-sm text-secondary">No comments yet</p>';
  return comments.map(c => ''
    + '<div class="comment-item">'
    + '<div class="comment-avatar" style="background-image:url('+(c.author?.avatar||'')+')" onclick="navigate(\'profile\','+c.author?.id+')"></div>'
    + '<div class="comment-body">'
    + '<div class="flex items-center justify-between">'
    + '<span class="comment-author" onclick="navigate(\'profile\','+c.author?.id+')">'+escapeHtml(c.author?.nickname||c.author?.username||'Unknown')+'</span>'
    + ((c.user_id === Store.user?.id || Store.isAdmin()) ? '<button class="text-xs" style="background:none;border:none;cursor:pointer;color:var(--text-tertiary)" onclick="deleteComment('+c.id+')">Delete</button>' : '')
    + '</div>'
    + '<div class="comment-text">'+escapeHtml(c.content)+'</div>'
    + '<div class="comment-time">'+formatDate(c.created_at)+'</div>'
    + '</div></div>'
  ).join('');
}

async function submitComment(articleId) {
  var input = $('#comment-input');
  var content = input.value.trim();
  if (!content) return toast('Comment cannot be empty', 'error');
  var showAdmin = $('#comment-admin-name');
  var showName = showAdmin ? (showAdmin.checked ? 1 : 0) : 1;
  try {
    await API.post('/comments/article/' + articleId, { content, show_admin_name: showName });
    toast('Posted', 'success');
    navigate('article', articleId);
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteComment(id) {
  try {
    await API.delete('/comments/' + id);
    toast('Deleted', 'success');
    var articleId = Store.lastPageData;
    if (articleId) navigate('article', articleId);
    else navigate('home');
  } catch (e) { toast(e.message, 'error'); }
}
