function render_announcements() {
  var isSuper = Store.isSuperAdmin();
  var wrap = document.createElement('div');

  var header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:24px';
  header.innerHTML = '<h2 style="font-size:1.4rem;font-weight:700">系统公告</h2>';
  if (isSuper) {
    header.innerHTML += '<button class="btn btn-primary" onclick="showCreateAnnouncement()">+ 发布公告</button>';
  }
  wrap.appendChild(header);

  var list = document.createElement('div');
  list.id = 'ann-list';
  list.innerHTML = '<div class="text-center text-secondary p-6">加载中...</div>';
  wrap.appendChild(list);

  loadAnnouncements(list);
  return wrap;
}

async function loadAnnouncements(container) {
  try {
    var d = await API.get('/announcements');
    var list = d.announcements || [];
    if (list.length === 0) {
      container.innerHTML = '<div class="text-center text-secondary p-6">暂无公告</div>';
      return;
    }
    var isSuper = Store.isSuperAdmin();
    var html = '';
    list.forEach(function(a) {
      var dt = new Date(a.created_at);
      var dateStr = dt.getFullYear() + '-' +
        String(dt.getMonth()+1).padStart(2,'0') + '-' +
        String(dt.getDate()).padStart(2,'0') + ' ' +
        String(dt.getHours()).padStart(2,'0') + ':' +
        String(dt.getMinutes()).padStart(2,'0');
      html += '<div class="card-glass mb-4">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
        + '<h3>'+escapeHtml(a.title)+'</h3>'
        + (isSuper ? '<span style="display:flex;gap:8px">'
          + '<button class="btn btn-glass btn-sm btn-icon" onclick="editAnnouncement('+a.id+')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>'
          + '<button class="btn btn-glass btn-sm btn-icon" onclick="deleteAnnouncement('+a.id+')" style="color:var(--red,#ef4444)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>'
          + '</span>' : '')
        + '</div>'
        + '<p style="font-weight:700;color:var(--blue);margin-bottom:12px;font-size:0.9rem">'+dateStr+'</p>'
        + '<div style="white-space:pre-wrap;line-height:1.7;color:var(--text-primary)">'+escapeHtml(a.content)+'</div>'
        + '</div>';
    });
    container.innerHTML = html;
  } catch(e) {
    container.innerHTML = '<div class="text-center text-secondary p-6">加载失败: '+e.message+'</div>';
  }
}

function showCreateAnnouncement(){
  var html = ''
    + '<div class="form-group"><label>标题</label><input class="input input-glass" id="ann-title" placeholder="公告标题"></div>'
    + '<div class="form-group"><label>内容</label><textarea class="input input-glass textarea" id="ann-content" placeholder="公告内容" rows="6"></textarea></div>';
  showModal('发布公告', html, async function(){
    var title = document.getElementById('ann-title').value.trim();
    var content = document.getElementById('ann-content').value.trim();
    if(!title) throw new Error('标题不能为空');
    if(!content) throw new Error('内容不能为空');
    await API.post('/announcements', {title: title, content: content});
    toast('公告已发布','success');
    navigate('announcements');
  }, '发布');
}

function editAnnouncement(id){
  API.get('/announcements').then(function(d){
    var ann = (d.announcements||[]).find(function(a){ return a.id === id; });
    if(!ann){ toast('公告不存在','error'); return; }
    var html = ''
      + '<div class="form-group"><label>标题</label><input class="input input-glass" id="ann-title" value="'+escapeHtml(ann.title)+'"></div>'
      + '<div class="form-group"><label>内容</label><textarea class="input input-glass textarea" id="ann-content" rows="6">'+escapeHtml(ann.content)+'</textarea></div>';
    showModal('编辑公告', html, async function(){
      var title = document.getElementById('ann-title').value.trim();
      var content = document.getElementById('ann-content').value.trim();
      if(!title) throw new Error('标题不能为空');
      if(!content) throw new Error('内容不能为空');
      await API.put('/announcements/'+id, {title: title, content: content});
      toast('公告已更新','success');
      navigate('announcements');
    }, '保存');
  });
}

function deleteAnnouncement(id){
  showConfirm('删除公告', '确定要删除这条公告吗？', async function(){
    await API.delete('/announcements/'+id);
    toast('公告已删除','success');
    navigate('announcements');
  });
}
