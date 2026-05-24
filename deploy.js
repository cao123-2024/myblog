const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  const m = originalRequire.apply(this, arguments);
  if (id === 'os') {
    const origHostname = m.hostname;
    m.hostname = () => 'my-pc';
  }
  return m;
};
process.env.COMPUTERNAME = 'my-pc';
require('./node_modules/vercel/index.js');
require('child_process').spawnSync(
  process.execPath,
  [require.resolve('./node_modules/vercel/index.js'), '--version'],
  { stdio: 'inherit', env: { ...process.env, COMPUTERNAME: 'my-pc' } }
);
