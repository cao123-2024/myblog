function render_downloads() {
  var wrap = document.createElement('div');
  wrap.className = 'stagger';

  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:20px';
  hdr.innerHTML = ''
    + '<h2 style="font-size:1.4rem;font-weight:700">下载中心</h2>'
    + (Store.isAdmin() ? '<button class="btn btn-primary btn-sm" onclick="showUploadModal()">+ 上传文件</button>' : '');
  wrap.appendChild(hdr);

  var list = document.createElement('div');
  list.id = 'downloads-list';
  list.innerHTML = '<div class="text-center text-secondary p-6">加载中...</div>';
  wrap.appendChild(list);

  setTimeout(loadDownloads, 50);
  return wrap;
}

async function loadDownloads() {
  try {
    var data = await API.get('/downloads');
    var items = data.items || [];
    var el = document.getElementById('downloads-list');
    if(!el) return;

    if(items.length === 0) {
      el.innerHTML = '<div class="card-glass text-center p-8 text-secondary">暂无下载文件</div>';
      return;
    }

    var html = '';
    items.forEach(function(f, i) {
      var sizeStr = f.size < 1024 ? f.size+'B' : f.size < 1048576 ? (f.size/1024).toFixed(1)+'KB' : (f.size/1048576).toFixed(1)+'MB';
      html += '<div class="card-glass" style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;margin-bottom:8px" id="dl-item-'+f.id+'">'
        + '<div class="flex items-center gap-3" style="flex:1;min-width:0">'
        + '<div style="width:44px;height:44px;border-radius:var(--radius-md);background:var(--bg-glass);display:flex;align-items:center;justify-content:center;flex-shrink:0">'
        + '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>'
        + '</div>'
        + '<div style="flex:1;min-width:0">'
        + '<div class="font-medium" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escapeHtml(f.title||f.originalName)+'</div>'
        + '<div class="text-xs text-secondary">'+sizeStr+' · '+f.download_count+'次下载 · '+formatDate(f.created_at)+'</div>'
        + '</div>'
        + '</div>'
        + '<div class="flex gap-2" style="flex-shrink:0">'
        + '<button class="btn btn-primary btn-sm" onclick="downloadFile('+f.id+')">下载</button>'
        + (Store.isAdmin() ? '<button class="btn btn-glass btn-sm" onclick="deleteDownload('+f.id+')">删除</button>' : '')
        + '</div>'
        + '</div>';
      if(f.description) {
        html += '<div class="text-xs text-secondary" style="margin:-4px 0 12px 64px">'+escapeHtml(f.description)+'</div>';
      }
    });
    el.innerHTML = html;
  } catch(e) {
    document.getElementById('downloads-list').innerHTML = '<div class="text-center p-6" style="color:#CF222E">加载失败: '+e.message+'</div>';
  }
}

function downloadFile(id) {
  window.open('/api/downloads/'+id+'/dl', '_blank');
}
async function deleteDownload(id) {
  showConfirm('删除下载','确定删除此文件吗？', async function(){
    await API.delete('/downloads/'+id);
    toast('已删除','success');
    loadDownloads();
  });
}

function showUploadModal() {
  var html = ''
    + '<div class="login-form-group"><label>文件</label><input type="file" class="input" id="dl-file" accept="image/*,.zip,.rar,.7z,.pdf,.doc,.docx,.txt,.mp3,.mp4"></div>'
    + '<div class="login-form-group" id="dl-compress-hint" style="display:none"><span class="text-xs" style="color:#eab308">图片较大时将自动压缩（Vercel 限制 4.5MB）</span></div>'
    + '<div class="login-form-group"><label>显示名称（可选）</label><input class="input input-glass" id="dl-title" placeholder="留空使用文件名"></div>'
    + '<div class="login-form-group"><label>简介（可选）</label><input class="input input-glass" id="dl-desc" placeholder="简短介绍"></div>';
  showModal('上传文件', html, async function(){
    var fileInput = document.getElementById('dl-file');
    var file = fileInput.files[0];
    if(!file) throw new Error('请选择文件');

    var uploadFile = file;
    var originalSize = (file.size / 1024 / 1024).toFixed(1);

    if (/^image\/(png|jpeg|jpg|webp|bmp)$/.test(file.type) && file.size > 500 * 1024) {
      showUploadingStatus('正在压缩图片...');
      try {
        uploadFile = await compressImage(file);
        var newSize = (uploadFile.size / 1024 / 1024).toFixed(1);
        showUploadingStatus('已压缩: ' + originalSize + 'MB → ' + newSize + 'MB');
      } catch(e) {
        showUploadingStatus('压缩失败，使用原文件');
        uploadFile = file;
      }
    }

    showUploadingStatus('正在上传...');
    var fd = new FormData();
    fd.append('file', uploadFile, uploadFile.name || file.name);
    fd.append('title', document.getElementById('dl-title').value.trim());
    fd.append('description', document.getElementById('dl-desc').value.trim());

    try {
      await API.upload('/downloads', fd);
      toast('上传成功','success');
      loadDownloads();
    } catch(e) {
      if (e.message && (e.message.includes('413') || e.message.includes('太大') || e.message.includes('too large') || e.message.includes('Payload'))) {
        throw new Error('文件太大 (' + (uploadFile.size/1024/1024).toFixed(1) + 'MB)，Vercel 限制 4.5MB。请尝试缩小图片后再上传');
      }
      throw e;
    }
  }, '上传');

  var fileInput = document.getElementById('dl-file');
  fileInput.addEventListener('change', function() {
    var f = fileInput.files[0];
    var hint = document.getElementById('dl-compress-hint');
    if (f && /^image\//.test(f.type) && f.size > 500 * 1024) {
      hint.style.display = 'block';
    } else {
      hint.style.display = 'none';
    }
  });
}

function showUploadingStatus(msg) {
  var footerEl = document.querySelector('.modal-content .flex.justify-between.mt-6');
  if (!footerEl) return;
  var statusEl = document.getElementById('dl-upload-status');
  if (!statusEl) {
    statusEl = document.createElement('div');
    statusEl.id = 'dl-upload-status';
    statusEl.style.cssText = 'text-align:center;font-size:0.85rem;color:var(--blue);margin-top:8px';
    var btn = footerEl.querySelector('.btn-primary');
    if (btn) btn.parentNode.insertBefore(statusEl, btn);
  }
  statusEl.textContent = msg;
}

function compressImage(file) {
  return new Promise(function(resolve, reject) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function() {
      URL.revokeObjectURL(url);
      var maxW = 1920;
      var maxH = 1920;
      var w = img.width;
      var h = img.height;
      if (w > maxW || h > maxH) {
        var ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      var ext = file.type === 'image/png' ? 'png' : 'jpeg';
      var mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      var quality = ext === 'png' ? undefined : 0.75;
      canvas.toBlob(function(blob) {
        if (blob && blob.size > 0) {
          var newName = file.name.replace(/\.\w+$/, '.' + (ext === 'png' ? 'png' : 'jpg'));
          var newFile = new File([blob], newName, { type: mime });
          resolve(newFile);
        } else {
          resolve(file);
        }
      }, mime, quality);
    };
    img.onerror = function() {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}
