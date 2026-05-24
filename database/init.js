const bcrypt = require('bcryptjs');

const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

function supabaseApi(method, path, body) {
  var opts = {
    method,
    headers: {
      'apikey': supabaseKey,
      'Authorization': 'Bearer ' + supabaseKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  var url = supabaseUrl + path;
  console.log('[DB] ' + method + ' ' + url + ' key_len=' + (supabaseKey ? supabaseKey.length : 0));
  return fetch(url, opts).then(function(r) {
    if (!r.ok) return r.text().then(function(t) {
      console.error('[DB] FAIL ' + r.status + ': ' + t.slice(0, 200));
      throw new Error(t.slice(0, 200));
    });
    if (r.status === 204) return [];
    return r.json();
  });
}

let dbReady = false;

async function initDb() {
  var d = await supabaseApi('GET', '/rest/v1/users?select=id&username=eq.admin&limit=1');
  if (!d || d.length === 0) {
    await supabaseApi('POST', '/rest/v1/users', {
      username: 'admin',
      password: bcrypt.hashSync('******', 10),
      nickname: '超级管理员',
      bio: '站点超级管理员',
      role: 'admin',
      created_at: new Date().toISOString()
    });
  }
  dbReady = true;
  console.log('Database initialized successfully');
}

module.exports = { supabaseApi, initDb, dbReady };
