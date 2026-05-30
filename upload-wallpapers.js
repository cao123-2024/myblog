const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log('\n先在 Vercel 复制环境变量后运行:');
  console.log('  $env:SUPABASE_URL="粘贴"; $env:SUPABASE_SERVICE_ROLE_KEY="粘贴"');
  console.log('  node upload-wallpapers.js\n');
  process.exit(1);
}

const urlBase = SUPABASE_URL.replace(/\/$/, '');

async function uploadFile(filePath, fileName) {
  const buf = fs.readFileSync(filePath);
  const resp = await fetch(`${urlBase}/storage/v1/object/wallpapers/${fileName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/octet-stream',
      'x-upsert': 'true'
    },
    body: buf
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Upload failed: ${resp.status} ${txt.slice(0,200)}`);
  }
  return `${urlBase}/storage/v1/object/public/wallpapers/${fileName}`;
}

async function addWallpaperRecord(name, url, dbToken) {
  const resp = await fetch(`${urlBase}/rest/v1/wallpapers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ name, url, created_at: new Date().toISOString() })
  });
  return resp.ok;
}

async function main() {
  const dir = path.join(__dirname, '111');
  const files = fs.readdirSync(dir).filter(f => /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(f));
  console.log(`\nFound ${files.length} images in 111/ folder`);

  let uploaded = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(dir, file);
    const sizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(1);
    const safeName = file.replace(/[()]/g, '').replace(/\s+/g, '-');
    process.stdout.write(`[${i+1}/${files.length}] ${file} (${sizeMB}MB) ... `);
    try {
      const url = await uploadFile(filePath, safeName);
      await addWallpaperRecord(safeName, url);
      console.log('OK');
      uploaded++;
    } catch(e) {
      console.log('FAIL: ' + e.message.slice(0, 80));
      failed++;
    }
  }

  console.log(`\nDone: ${uploaded} uploaded, ${failed} failed`);
}

main().catch(e => { console.error(e); process.exit(1); });
