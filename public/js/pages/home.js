function render_home() {
  const wrap = document.createElement('div');
  wrap.className = 'stagger';

  const carousel = document.createElement('div');
  carousel.className = 'carousel';
  carousel.id = 'home-carousel';

  const slides = [
    { img: '/img/slide-1.png', title: 'Liquid Glass Design', desc: 'Win11 Blue · 14-layer depth shadow · physical spring-damper animation on every interaction' },
    { img: '/img/slide-2.jpg', title: 'Full-Stack Blog System', desc: 'Rich text articles · comment threads · file downloads · real-time messaging with unread badges' },
    { img: '/img/slide-3.jpg', title: 'Self-Hosted & Serverless', desc: 'Powered by Vercel edge functions · Supabase PostgreSQL · zero-cost deployment with automatic HTTPS' }
  ];

  var slideHTML = slides.map(function(s) {
    return '<div class="carousel-slide" style="background-image:url(' + s.img + ')"><div class="carousel-slide-content"><h2>' + s.title + '</h2><p>' + s.desc + '</p></div></div>';
  }).join('');

  carousel.innerHTML = '<div class="carousel-track" id="carousel-track">' + slideHTML + '</div>'
    + '<div class="carousel-dots" id="carousel-dots"></div>'
    + '<button class="carousel-btn prev" onclick="carouselMove(-1)" title="Previous">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>'
    + '</button>'
    + '<button class="carousel-btn next" onclick="carouselMove(1)" title="Next">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'
    + '</button>';
  wrap.appendChild(carousel);

  if (Store.isAdmin() && Store.adminToken) {
    const createBtn = document.createElement('div');
    createBtn.style.cssText = 'margin-bottom:24px';
    createBtn.innerHTML = '<button class="btn btn-primary btn-lg" onclick="showCreateArticle()">+ 发布文章</button>';
    wrap.appendChild(createBtn);
  }

  const listWrap = document.createElement('div');
  listWrap.id = 'home-article-list';
  listWrap.innerHTML = '<div class="text-center text-secondary p-6">加载中...</div>';
  wrap.appendChild(listWrap);

  loadArticles(listWrap);
  setTimeout(initCarousel, 100);
  return wrap;
}

function afterRender_home() { initCarousel(); }

let carouselIdx = 0;
const carouselTotal = 3;

function initCarousel() {
  const track = $('#carousel-track');
  const dots = $('#carousel-dots');
  if (!track || !dots) return;
  dots.innerHTML = '';
  for (let i = 0; i < carouselTotal; i++) {
    const dot = document.createElement('div');
    dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
    dot.onclick = () => { carouselIdx = i; updateCarousel(); };
    dots.appendChild(dot);
  }
}

function carouselMove(dir) {
  carouselIdx = (carouselIdx + dir + carouselTotal) % carouselTotal;
  updateCarousel();
}

function updateCarousel() {
  const track = $('#carousel-track');
  if (track) track.style.transform = `translateX(-${carouselIdx * 100}%)`;
  const dots = $$('#carousel-dots .carousel-dot');
  dots.forEach((d, i) => d.classList.toggle('active', i === carouselIdx));
}

var _articlePage = 1;
var _articleTotalPages = 1;

async function loadArticles(container) {
  try {
    var data = await API.get('/articles?page='+_articlePage+'&pageSize=5');
    var articles = data.articles || [];
    _articleTotalPages = data.totalPages || 1;

    var html = '';
    if(articles.length === 0){
      html = '<div class="text-center text-secondary p-6 mt-6"><div class="card-glass">暂无文章</div></div>';
    } else {
      articles.forEach(function(a){
        var hasImg = a.cover_image;
        var dl = a.download_id ? '<a class="btn btn-glass btn-sm" style="padding:2px 8px;font-size:0.7rem;margin-left:auto" href="#downloads" onclick="navigate(\'downloads\')">📎 相关下载</a>' : '';
        html += '<div class="card-glass article-card mb-4" onclick="var e=arguments[0];if(e&&e.target.closest(\'.article-card-actions,a,.btn\'))return;navigate(\'article\','+a.id+')">'
          + (hasImg ? '<div class="article-card-img" style="background-image:url('+a.cover_image+')"></div>' : '')
          + '<div class="article-card-body" style="'+(hasImg?'':'padding-left:0')+'">'
          + '<div style="display:flex;align-items:center;justify-content:space-between">'
          + '<h3>'+escapeHtml(a.title)+'</h3>'
          + dl
          + '</div>'
          + '<p>'+escapeHtml(a.summary||'')+'</p>'
          + '<div class="article-card-meta">'
          + '<span>'+ (a.author ? escapeHtml(a.author.nickname) : '未知') + '</span>'
          + '<span>'+formatDate(a.created_at)+'</span>'
          + '</div>'
          + '</div>'
          + (canEditArticle(a) ? ('<div class="article-card-actions" onclick="event.stopPropagation()">'
            + '<button class="btn btn-glass btn-sm btn-icon" onclick="editArticle('+a.id+')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>'
            + '<button class="btn btn-glass btn-sm btn-icon" onclick="deleteArticle('+a.id+')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>'
            + '</div>') : '')
          + '</div>';
      });
    }
    container.innerHTML = html;

    /* Pagination */
    if(_articleTotalPages > 1){
      var pager = document.createElement('div');
      pager.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:8px;margin-top:20px';
      var phtml = '<button class="btn btn-glass btn-sm" onclick="changePage('+(_articlePage-1)+')" '+( _articlePage<=1?'disabled':'')+'>上一页</button>';
      phtml += '<span class="text-sm text-secondary">第 '+_articlePage+' / '+_articleTotalPages+' 页</span>';
      phtml += '<button class="btn btn-glass btn-sm" onclick="changePage('+(_articlePage+1)+')" '+( _articlePage>=_articleTotalPages?'disabled':'')+'>下一页</button>';
      pager.innerHTML = phtml;
      container.appendChild(pager);
    }
  } catch (e) {
    container.innerHTML = '<div class="text-center text-secondary p-6">加载失败: '+e.message+'</div>';
  }
}

function changePage(p){
  if(p<1 || p>_articleTotalPages) return;
  _articlePage = p;
  var list = document.getElementById('home-article-list');
  if(list){
    list.innerHTML = '<div class="text-center text-secondary p-6">加载中...</div>';
    loadArticles(list);
  }
}

function canEditArticle(article) {
  if (!Store.user) return false;
  if (article.author_id === Store.user.id) return true;
  if (Store.user.role === 'admin' && !Store.user.created_by) return true;
  if (Store.user.role === 'admin' && Store.adminToken) return true;
  return false;
}

async function showCreateArticle() {
  var isAdmin = Store.isAdmin();
  var dlOptions = '<option value="">无</option>';
  try {
    var dls = await API.get('/downloads');
    (dls.items||[]).forEach(function(d){ dlOptions += '<option value="'+d.id+'">'+escapeHtml(d.title||d.originalName)+'</option>'; });
  } catch(e){}
  var html = ''
    + '<div class="form-group"><label>标题</label><input class="input input-glass" id="art-title" placeholder="文章标题"></div>'
    + '<div class="form-group"><label>内容</label><textarea class="input input-glass textarea" id="art-content" placeholder="文章内容" rows="8"></textarea></div>'
    + (isAdmin ? '<div class="form-group"><label>摘要（可选）</label><input class="input input-glass" id="art-summary" placeholder="留空自动截取"></div>' : '')
    + '<div class="form-group"><label>关联下载（可选）</label><select class="input" id="art-dl" style="background:var(--bg-glass);color:var(--text-primary);border:1px solid var(--border-glass);border-radius:var(--radius-sm);padding:10px 14px;width:100%">'+dlOptions+'</select></div>'
    + '<div class="form-group"><label>配图' + (window._isLocal ? '' : '（自动压缩，每张最大约1MB）') + '</label><input type="file" class="input" id="art-images" multiple accept="image/*"></div>';
  showModal('发布文章', html, async function(){
    var title = document.getElementById('art-title').value.trim();
    var content = document.getElementById('art-content').value.trim();
    var dl = document.getElementById('art-dl').value;
    if(!title||!content) throw new Error('标题和内容不能为空');
    var fd = new FormData();
    fd.append('title',title);
    fd.append('content',content);
    if(dl) fd.append('download_id',dl);
    if(isAdmin){
      var summary = document.getElementById('art-summary');
      if(summary) fd.append('summary', summary.value.trim());
    }
    var files = document.getElementById('art-images').files;
    var total = files.length;
    for(var i=0;i<files.length;i++){
      var compressed = await compressImage(files[i], 1920, 1920, 0.75);
      fd.append('images', compressed);
      if (total > 1) {
        var progressText = '压缩中 ' + (i + 1) + '/' + total;
        document.getElementById('modal-confirm-btn').textContent = progressText;
      }
    }
    if (total > 1) document.getElementById('modal-confirm-btn').textContent = '发布';
    await API.upload('/articles', fd);
    toast('文章发布成功','success');
    navigate('home');
  },'发布');
}

async function editArticle(id) {
  try {
    const data = await API.get('/articles/' + id);
    const a = data.article;
    const html = `
      <div class="form-group"><label>标题</label><input class="input input-glass" id="art-title" value="${escapeHtml(a.title)}"></div>
      <div class="form-group"><label>内容</label><textarea class="input input-glass textarea" id="art-content" rows="8">${escapeHtml(a.content)}</textarea></div>
      <div class="form-group"><label>追加配图</label><input type="file" class="input" id="art-images" multiple accept="image/*"></div>
    `;
    showModal('编辑文章', html, async () => {
      const title = $('#art-title').value.trim();
      const content = $('#art-content').value.trim();
      const files = $('#art-images').files;
      if (!title || !content) throw new Error('标题和内容不能为空');
      const fd = new FormData();
      fd.append('title', title);
      fd.append('content', content);
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i], 1920, 1920, 0.75);
        fd.append('images', compressed);
      }
      await API.uploadPut('/articles/' + id, fd);
      toast('文章已更新', 'success');
      navigate('home');
    }, '保存');
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteArticle(id) {
  showConfirm('删除文章', '确定要删除这篇文章吗？此操作不可撤销。', async () => {
    await API.delete('/articles/' + id);
    toast('文章已删除', 'success');
    navigate('home');
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit' }) + ' ' +
         dt.toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit' });
}
