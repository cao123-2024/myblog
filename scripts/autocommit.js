'use strict';

const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function run(cmd, silent) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' }).trim();
  } catch (e) {
    if (!silent) console.error(e.message);
    return '';
  }
}

const status = run('git status --porcelain', true);
if (!status) { console.log('  没有改动，跳过提交'); process.exit(0); }

const files = status.split('\n').filter(Boolean);
const count = files.length;

const now = new Date();
const ts = now.getFullYear() + '-' +
  String(now.getMonth() + 1).padStart(2, '0') + '-' +
  String(now.getDate()).padStart(2, '0') + ' ' +
  String(now.getHours()).padStart(2, '0') + ':' +
  String(now.getMinutes()).padStart(2, '0');

const msg = 'auto: ' + ts + ' — ' + count + ' file' + (count > 1 ? 's' : '');

run('git add .');
run('git commit -m "' + msg.replace(/"/g, '\\"') + '"');
run('git push origin master');

console.log('  已提交并推送: ' + msg);
