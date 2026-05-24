const fs = require('fs');
const path = require('path');
const app = require('../server');

if (process.env.VERCEL === '1') {
  const dirs = ['/tmp/uploads', '/tmp/data', '/tmp/uploads/downloads'];
  dirs.forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });
}

module.exports = app;
