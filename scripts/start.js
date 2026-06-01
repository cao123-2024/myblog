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
const GR = f(240);
const WT = f(255);

const write = (s) => process.stdout.write(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ─── 剥离 ANSI ─── */
function strip(s) { return s.replace(/\x1b\[[0-9;]*m/g, ''); }

/* ─── 显示宽度：CJK=2, ASCII/制表符=1 ─── */
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

/* ─── 单个旋转符 ─── */
function spinner(text, ms) {
  const sym = ['◌', '○', '◔', '◑', '◕', '●'];
  let i = 0;
  const t = setInterval(() => {
    write('\r  ' + CY + sym[i % sym.length] + R + '  ' + D + text + R + '\x1b[K');
    i++;
  }, 100);
  return () => { clearInterval(t); };
}

/* ══════════════════════════════════ MAIN ═══════════════════════════════ */

async function main() {
  write(HI + CL);

  write('\n');
  write('  ' + B + CY + 'LUMINA' + R + '  ' + D + GR + '液态玻璃博客系统' + R + '\n');
  write('\n');

  /* ─── 一条旋转线 ─── */
  let stop = spinner('正在启动...', 0);

  /* 后台准备 */
  for (const d of ['uploads', 'database/data'].map(p => path.join(ROOT, p)))
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });

  if (!(await isPortFree(PORT))) {
    stop();
    write('\r  ' + GR + '释放端口 ' + PORT + '...' + R + '\x1b[K');
    killPort(PORT); await sleep(600);
    const s2 = spinner('正在启动...', 0);
    await sleep(300);
    stop = s2;
  }
  await sleep(300);

  stop();
  write('\r\x1b[2K');  /* 清除旋转行 */

  const info = [
    B + CY + 'LUMINA' + R + '  ' + D + '启动成功' + R,
    '',
    WT + 'http://localhost:' + PORT + R,
    '',
    D + 'Ctrl+C 停止 ' + '·' + ' Node.js ' + process.version + R,
  ];
  write(box(info) + '\n\n');
  write(SH);

  /* 启动 server，日志自然流出 */
  const child = spawn(NODE_EXE, ['server.js'], {
    cwd: ROOT, stdio: 'inherit', env: { ...process.env, FORCE_COLOR: '1' },
  });

  const cleanup = () => { child.kill(); setTimeout(() => process.exit(0), 500); };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  child.on('exit', (code) => {
    write('\n' + GR + '  服务已停止 (code ' + (code || 0) + ')' + R + '\n');
    process.exit(code || 0);
  });
}

/* ─── 错误：框内显示 → 按任意键退出 ─── */
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

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.once('data', () => { process.stdin.setRawMode(false); process.exit(1); });
  setTimeout(() => process.exit(1), 60000);
});
