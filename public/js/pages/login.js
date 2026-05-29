var currentPanel = 0;
var isAdminFlow = false;

function swipeTo(panelIdx) {
  currentPanel = panelIdx;
  var track = document.getElementById('login-track');
  if(!track) return;
  track.style.transform = 'translateX(-' + (panelIdx * 33.333) + '%)';

  document.querySelectorAll('.swipe-dot').forEach(function(d, i){
    d.classList.toggle('active', i === panelIdx && panelIdx < 2);
  });

  adjustTrackHeight(panelIdx);
}

function adjustTrackHeight(panelIdx) {
  var track = document.getElementById('login-track');
  var panel = document.querySelectorAll('.login-panel')[panelIdx];
  if(!track || !panel) return;
  track.style.height = panel.scrollHeight + 'px';
}

var swipeStartX = 0;
var swipeStartT = 0;
var isSwiping = false;

function forceSwipeEnd() {
  if(!isSwiping) return;
  isSwiping = false;
  var track = document.getElementById('login-track');
  if(track) track.classList.remove('dragging');
  swipeTo(currentPanel);
}

function onSwipeStart(e) {
  if(currentPanel === 2) return;
  if(e.target.closest('button, input, .eye-btn, .swipe-dot')) return;
  var t = e.touches ? e.touches[0] : e;
  swipeStartX = t.clientX;
  swipeStartT = 0;
  isSwiping = true;
  var track = document.getElementById('login-track');
  if(track) track.classList.add('dragging');
  e.preventDefault();
}

function onSwipeMove(e) {
  if(!isSwiping) return;
  var t = e.touches ? e.touches[0] : e;
  var dx = t.clientX - swipeStartX;
  if(Math.abs(dx) > 5 && !swipeStartT) swipeStartT = Date.now();

  var track = document.getElementById('login-track');
  if(!track) return;
  var base = -currentPanel * 33.333;
  var containerW = track.parentElement.offsetWidth;
  var percent = (dx / containerW) * 100;
  var target = base + percent;
  target = Math.max(-33.333, Math.min(0, target));
  track.style.transform = 'translateX(' + target + '%)';
}

function onSwipeEnd(e) {
  if(!isSwiping) return;
  isSwiping = false;
  var track = document.getElementById('login-track');
  if(!track) return;
  track.classList.remove('dragging');

  var t = e.changedTouches ? e.changedTouches[0] : e;
  var dx = t.clientX - swipeStartX;
  var dt = Date.now() - swipeStartT;
  var velocity = dt > 0 ? Math.abs(dx / dt) * 1000 : 0;

  if(Math.abs(dx) > 60 || velocity > 300) {
    if(currentPanel === 0 && dx < 0) { swipeTo(1); }
    else if(currentPanel === 1 && dx > 0) { swipeTo(0); }
    else { swipeTo(currentPanel); }
  } else {
    swipeTo(currentPanel);
  }
}

document.addEventListener('DOMContentLoaded', function(){
  var swiper = document.getElementById('login-swiper');
  if(!swiper) return;

  swiper.addEventListener('mousedown', onSwipeStart);

  /* Mouse events on window to catch drags that leave the card */
  window.addEventListener('mousemove', onSwipeMove);
  window.addEventListener('mouseup', onSwipeEnd);
  window.addEventListener('mouseleave', forceSwipeEnd);

  swiper.addEventListener('touchstart', onSwipeStart, {passive: false});
  window.addEventListener('touchmove', onSwipeMove, {passive: false});
  window.addEventListener('touchend', onSwipeEnd);

  document.querySelectorAll('.swipe-dot').forEach(function(d){
    d.addEventListener('click', function(e){
      e.stopPropagation();
      swipeTo(parseInt(d.dataset.dot));
    });
  });

  /* Login panel */
  var loginBtn = document.getElementById('login-submit-btn');
  var loginPwd = document.getElementById('login-password');
  loginBtn.addEventListener('click', handleLoginSubmit);
  loginPwd.addEventListener('keydown', function(e){ if(e.key==='Enter') handleLoginSubmit(); });
  document.getElementById('login-username').addEventListener('keydown', function(e){
    if(e.key==='Enter') loginPwd.focus();
  });

  /* Register panel */
  var regBtn = document.getElementById('reg-submit-btn');
  var regConfirm = document.getElementById('reg-confirm');
  regBtn.addEventListener('click', handleRegisterSubmit);
  regConfirm.addEventListener('keydown', function(e){ if(e.key==='Enter') handleRegisterSubmit(); });

  /* Admin verify panel */
  var verifyBtn = document.getElementById('admin-verify-btn');
  var verifyCode = document.getElementById('admin-verify-code');
  verifyBtn.addEventListener('click', handleAdminVerify);
  verifyCode.addEventListener('keydown', function(e){ if(e.key==='Enter') handleAdminVerify(); });

  /* Clear errors on input */
  ['login-username','login-password'].forEach(function(id){
    document.getElementById(id).addEventListener('input', clearFieldErrors);
  });
  ['reg-username','reg-password','reg-confirm'].forEach(function(id){
    document.getElementById(id).addEventListener('input', clearFieldErrors);
  });
  document.getElementById('admin-verify-code').addEventListener('input', clearFieldErrors);

  /* Guest */
  document.getElementById('guest-btn').addEventListener('click', function(){
    triggerBloomAndEnter(null, null);
  });
});

/* ---- Field Errors ---- */
function clearFieldErrors() {
  ['err-username','err-password','err-confirm','err-reg-username','err-reg-password','err-verify-code'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.classList.remove('show');
  });
  ['login-username','login-password','reg-username','reg-password','reg-confirm','admin-verify-code'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.classList.remove('error');
  });
}

function showFieldError(fieldId, msg) {
  var input = document.getElementById(fieldId);
  var errEl;
  if(fieldId === 'admin-verify-code') errEl = document.getElementById('err-verify-code');
  else errEl = document.getElementById('err-' + fieldId.replace('reg-',''));
  if(!errEl) errEl = document.getElementById('err-' + fieldId);
  if(input) input.classList.add('error');
  if(errEl){ errEl.textContent = msg; errEl.classList.add('show'); }
}

function togglePassword(inputId, eyeId) {
  var inp = document.getElementById(inputId);
  var eye = document.getElementById(eyeId);
  if(inp.type === 'password'){
    inp.type = 'text';
    eye.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  } else {
    inp.type = 'password';
    eye.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  }
}

/* ---- Reset ---- */
function resetLoginForm() {
  isAdminFlow = false;
  clearFieldErrors();
  swipeTo(0);
  document.getElementById('login-submit-btn').textContent = '登 录';
  ['login-username','login-password','reg-username','reg-nickname','reg-password','reg-confirm','admin-verify-code'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.value = '';
  });
  ['login-password','reg-password','reg-confirm'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.type = 'password';
  });
  ['eye-password','eye-reg-password','eye-confirm'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  });
}

/* ---- Login Submit ---- */
async function handleLoginSubmit(){
  if(isAdminFlow) return;
  clearFieldErrors();
  var username = document.getElementById('login-username').value.trim();
  var password = document.getElementById('login-password').value.trim();
  if(!username){ showFieldError('login-username','请输入用户名'); return; }
  if(!password){ showFieldError('login-password','请输入密码'); return; }
  if(password.length < 3){ showFieldError('login-password','密码至少3位'); return; }

  try{
    var data = await API.post('/login',{username,password});
    if(data.user.role==='admin' && !data.user.created_by){
      /* Only super admin needs terminal verify code */
      try{
        API.setToken(data.token);
        await API.post('/admin/request-verify');
        Store._pendingLogin = {token:data.token, user:data.user};
        swipeTo(2);
        setTimeout(function(){
          document.getElementById('admin-verify-code').focus();
        }, 600);
        toast('请输入管理员PIN码','info');
        return;
      }catch(e){ toast(e.message,'error'); return; }
    }
    triggerBloomAndEnter(data.token, data.user);
  }catch(e){
    showFieldError('login-username','用户名或密码错误');
    showFieldError('login-password','用户名或密码错误');
  }
}

/* ---- Register Submit ---- */
async function handleRegisterSubmit(){
  clearFieldErrors();
  var username = document.getElementById('reg-username').value.trim();
  var nickname = document.getElementById('reg-nickname').value.trim() || username;
  var password = document.getElementById('reg-password').value.trim();
  var confirm = document.getElementById('reg-confirm').value.trim();

  if(!username){ showFieldError('reg-username','请输入用户名'); return; }
  if(username.length < 2){ showFieldError('reg-username','用户名至少2个字符'); return; }
  if(!password){ showFieldError('reg-password','请输入密码'); return; }
  if(password.length < 3){ showFieldError('reg-password','密码至少3位'); return; }
  if(!confirm){ showFieldError('reg-confirm','请确认密码'); return; }
  if(password !== confirm){ showFieldError('reg-confirm','两次密码不一致'); return; }

  try{
    await API.post('/register',{username,password,nickname});
    toast('注册成功！请登录','success');
    resetLoginForm();
  }catch(e){ toast(e.message,'error'); }
}

/* ---- Admin Verify ---- */
async function handleAdminVerify(){
  clearFieldErrors();
  var code = document.getElementById('admin-verify-code').value.trim();
  if(!code){ showFieldError('admin-verify-code','请输入验证码'); return; }
  try{
    API.setToken(Store._pendingLogin.token);
    var vData = await API.post('/admin/verify-and-login',{code});
    triggerBloomAndEnter(Store._pendingLogin.token, Store._pendingLogin.user, vData.adminToken);
  }catch(e){
    showFieldError('admin-verify-code','验证码错误或已过期');
  }
}

function triggerBloomAndEnter(token, user, adminToken){
  if(token){ Store.login(token, user); }
  if(adminToken){ Store.loginAdmin(adminToken); }

  /* App is already rendered behind login screen. Animate mask reveal. */
  var btn = document.getElementById('admin-verify-btn') || document.getElementById('login-submit-btn') || document.getElementById('reg-submit-btn');
  var rect = btn.getBoundingClientRect();
  var cx = rect.left + rect.width/2;
  var cy = rect.top + rect.height/2;
  var maxR = Math.hypot(window.innerWidth, window.innerHeight);

  var loginScr = document.getElementById('login-screen');
  if(!loginScr) return;

  /* Remove CSS class that hides the app */
  var appEl = document.getElementById('app');
  if(appEl) { appEl.classList.remove('hidden-init'); appEl.style.display = ''; }

  /* Disable pointer events on login card during animation */
  var swiper = document.getElementById('login-swiper');
  if(swiper) swiper.style.pointerEvents = 'none';

  var start = performance.now();
  var dur = 750;

  function step(t) {
    var p = Math.min((t - start) / dur, 1);
    /* easeOutQuart — fast start, smooth deceleration */
    var ep = 1 - Math.pow(1 - p, 4);
    var r = ep * maxR * 1.2;

    loginScr.style.webkitMaskImage = 'radial-gradient(circle at ' + cx + 'px ' + cy + 'px, transparent ' + r + 'px, black ' + (r + 1) + 'px)';
    loginScr.style.maskImage = 'radial-gradient(circle at ' + cx + 'px ' + cy + 'px, transparent ' + r + 'px, black ' + (r + 1) + 'px)';

    if(p < 1) {
      requestAnimationFrame(step);
    } else {
      loginScr.style.display = 'none';
      loginScr.style.webkitMaskImage = '';
      loginScr.style.maskImage = '';
      if(swiper) swiper.style.pointerEvents = '';
      /* Refresh page with user context */
      updateNav();
      navigate('home');
    }
  }

  requestAnimationFrame(step);
}
