'use strict';

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

const ROOT = path.join(__dirname, '..');
const PORT = parseInt(process.env.PORT || '3000');
const NODE_EXE = process.execPath;

/* ─── ANSI ─── */
const R = '\x1b[0m';
const B = '\x1b[1m';
const D = '\x1b[2m';
const HI = '\x1b[?25l';
const SH = '\x1b[?25h';
const CL = '\x1b[2J\x1b[H';
const f = (n) => '\x1b[38;5;' + n + 'm';
const BL = f(33);
const CY = f(51);
const GN = f(46);
const RD = f(196);
const YL = f(226);
const GR = f(240);
const WT = f(255);

const write = (s) => process.stdout.write(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ─── 剥离 ANSI ─── */
function strip(s) { return s.replace(/\x1b\[[0-9;]*m/g, ''); }

/* ─── 显示宽度 ─── */
function dw(s) {
  let w = 0;
  for (const ch of strip(s)) {
    const c = ch.codePointAt(0);
    w += (c <= 0x7F || (c >= 0x2500 && c <= 0x257F)) ? 1 : 2;
  }
  return w;
}

/* ─── 画框 ─── */
function box(lines) {
  const maxW = Math.max(...lines.map(l => dw(l)));
  const W = maxW + 6;
  const hr = BL + '┌' + '─'.repeat(W) + '┐' + R;
  const er = BL + '│' + R + ' '.repeat(W) + BL + '│' + R;
  const fr = BL + '└' + '─'.repeat(W) + '┘' + R;
  const mid = lines.map(l => {
    const p = W - 3 - dw(l);
    return BL + '│' + R + '   ' + D + l + R + ' '.repeat(Math.max(0, p)) + BL + '│' + R;
  });
  return ['  ' + hr, '  ' + er, ...mid.map(m => '  ' + m), '  ' + er, '  ' + fr].join('\n');
}

/* ─── 端口 ─── */
function isPortFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => { s.close(); resolve(true); });
    s.listen(port);
  });
}

function killPort(port) {
  try {
    const out = execSync('netstat -ano', { encoding: 'utf8', windowsHide: true, timeout: 3000 });
    for (const l of out.split('\n')) {
      if (l.includes(':' + port) && l.includes('LISTENING')) {
        const pid = l.trim().split(/\s+/).pop();
        if (pid && /^\d+$/.test(pid))
          execSync('taskkill /F /PID ' + pid, { windowsHide: true, stdio: 'ignore', timeout: 3000 });
      }
    }
  } catch (_) {}
}

/* ─── 旋转符 ─── */
function spinner(text) {
  const sym = ['◌', '○', '◔', '◑', '◕', '●'];
  let i = 0;
  const t = setInterval(() => {
    write('\r  ' + CY + sym[i % sym.length] + R + '  ' + D + text + R + '\x1b[K');
    i++;
  }, 100);
  return () => { clearInterval(t); };
}

/* ─── 询问：回车=重启, Q=退出 ─── */
function askPrompt() {
  return new Promise((resolve) => {
    const prompt = [
      B + CY + 'LUMINA' + R + '  ' + WT + '服务已停止' + R,
      '',
      WT + 'Enter   ' + D + '重启服务' + R,
      WT + 'Q       ' + D + '退出' + R,
    ];
    write(box(prompt) + '\n');
    write('  ' + D + '→ ' + R);

    const wasRaw = process.stdin.isRaw;

    try { process.stdin.setRawMode(true); } catch (_) {}
    process.stdin.resume();

    const handler = (buf) => {
      const key = buf.toString().toLowerCase();
      if (key === '\r' || key === '\n') {
        cleanup();
      } else if (key === 'q' || key === '\x03') {
        cleanup();
        write('\n' + GR + '  已退出' + R + '\n\n');
        process.exit(0);
      }
    };

    const cleanup = () => {
      process.stdin.removeListener('data', handler);
      try { process.stdin.setRawMode(wasRaw); } catch (_) {}
      process.stdin.pause();
      resolve();
    };

    process.stdin.on('data', handler);

    setTimeout(() => {
      cleanup();
      write('\n' + GR + '  超时自动退出' + R + '\n');
      process.exit(0);
    }, 300000);
  });
}

/* ─── 启动子进程 server.js ─── */
function startServer() {
  return new Promise((resolve) => {
    const child = spawn(NODE_EXE, ['server.js'], {
      cwd: ROOT, stdio: 'inherit', env: { ...process.env, FORCE_COLOR: '1' },
    });

    let resolved = false;

    /* Ctrl+C → 只杀子进程，父进程不退出 */
    const onSigint = () => {
      if (!child.killed) child.kill('SIGINT');
    };
    process.on('SIGINT', onSigint);
    process.on('SIGTERM', onSigint);

    child.on('exit', (code) => {
      process.removeListener('SIGINT', onSigint);
      process.removeListener('SIGTERM', onSigint);
      if (!resolved) { resolved = true; resolve(code); }
    });

    child.on('error', (err) => {
      process.removeListener('SIGINT', onSigint);
      process.removeListener('SIGTERM', onSigint);
      if (!resolved) { resolved = true; resolve(-1); }
    });
  });
}

/* ══════════════════════════════════ MAIN ═══════════════════════════════ */

async function main() {
  write(HI + CL);

  write('\n');
  write('  ' + B + CY + 'LUMINA' + R + '  ' + D + GR + '液态玻璃博客系统' + R + '\n');
  write('\n');

  /* ─── 启动动画 ─── */
  let stop = spinner('正在启动...');

  for (const d of ['uploads', 'database/data'].map(p => path.join(ROOT, p)))
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });

  if (!(await isPortFree(PORT))) {
    stop();
    write('\r  ' + GR + '释放端口 ' + PORT + '...' + R + '\x1b[K');
    killPort(PORT); await sleep(600);
    stop = spinner('正在启动...');
    await sleep(300);
  }
  await sleep(300);

  stop();
  write('\r\x1b[2K');

  const info = [
    B + CY + 'LUMINA' + R + '  ' + D + '启动成功' + R,
    '',
    WT + 'http://localhost:' + PORT + R,
    '',
    D + 'Ctrl+C 停止 ' + '·' + ' Node.js ' + process.version + R,
  ];
  write(box(info) + '\n\n');
  write(SH);

  /* ─── 自动提交 ─── */
  try {
    execSync('node scripts/autocommit.js', { cwd: ROOT, stdio: 'inherit' });
  } catch (_) {}

  /* ─── 循环：服务器退出后询问重启还是退出 ─── */
  await startServer(); /* 首次启动 */

  while (true) {
    await askPrompt();  /* 等待 Enter 或 Q */
    /* Enter → 清屏 → 快速重启，不重复动画 */
    write(HI + CL);
    write('\n');
    write('  ' + B + CY + 'LUMINA' + R + '  ' + D + GR + '正在重启' + R + '\n');
    write('\n');
    let st2 = spinner('重新启动中...');
    await sleep(400);
    st2();
    write('\r\x1b[2K');

    const info2 = [
      B + CY + 'LUMINA' + R + '  ' + D + '已重启' + R,
      '',
      WT + 'http://localhost:' + PORT + R,
      '',
      D + 'Ctrl+C 停止 ' + '·' + ' Node.js ' + process.version + R,
    ];
    write(box(info2) + '\n\n');
    write(SH);
    await startServer();
  }
}

/* ─── 错误处理 ─── */
main().catch((e) => {
  write(SH + '\n');
  const err = [
    RD + B + '启动失败' + R,
    '',
    D + (e.message || String(e)).replace(/\s+/g, ' ').trim() + R,
    '',
    D + '按任意键退出...' + R,
  ];
  write(box(err) + '\n\n');

  try { process.stdin.setRawMode(true); } catch (_) {}
  process.stdin.resume();
  process.stdin.once('data', () => { try { process.stdin.setRawMode(false); } catch (_) {} process.exit(1); });
  setTimeout(() => process.exit(1), 60000);
});
