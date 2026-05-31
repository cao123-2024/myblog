const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const MODE = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) ? 'supabase' : 'json';
module.exports.MODE = MODE;

/* ======== JSON MODE ======== */
let jsonTables = {};
const DATA_DIR = path.join(__dirname, 'data');

function jsonTable(name) {
  if (!jsonTables[name]) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const fp = path.join(DATA_DIR, name + '.json');
    if (!fs.existsSync(fp)) fs.writeFileSync(fp, '[]', 'utf8');
    jsonTables[name] = {
      _data: JSON.parse(fs.readFileSync(fp, 'utf8')),
      _path: fp,
      _save() { fs.writeFileSync(this._path, JSON.stringify(this._data, null, 2), 'utf8'); },
      _nextId() { const max = this._data.reduce((m, r) => Math.max(m, r.id || 0), 0); return max + 1; },
      all() { this._data = JSON.parse(fs.readFileSync(this._path, 'utf8')); return this._data; },
      getById(id) { this.all(); return this._data.find(r => r.id === id) || null; },
      findOne(w) { this.all(); const keys = Object.keys(w); return this._data.find(r => keys.every(k => r[k] === w[k])) || null; },
      find(w) { this.all(); const keys = Object.keys(w); return this._data.filter(r => keys.every(k => r[k] === w[k])); },
      insert(r) { this.all(); r.id = this._nextId(); this._data.push(r); this._save(); return r; },
      update(id, u) { this.all(); const i = this._data.findIndex(r => r.id === id); if (i === -1) return null; this._data[i] = { ...this._data[i], ...u }; this._save(); return this._data[i]; },
      delete(id) { this.all(); const i = this._data.findIndex(r => r.id === id); if (i === -1) return false; this._data.splice(i, 1); this._save(); return true; }
    };
  }
  return jsonTables[name];
}

function jsonInitDb() {
  const admin = jsonTable('users').findOne({ username: 'admin' });
  if (!admin) {
    jsonTable('users').insert({
      username: 'admin', password: bcrypt.hashSync('******', 10),
      nickname: '超级管理员', avatar: '', bg_image: '', bio: '站点超级管理员',
      role: 'admin', tag: '', created_by: null, banned_until: null, created_at: new Date().toISOString()
    });
  }
}

/* ======== SUPABASE MODE ======== */
const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
let supabaseReady = false;
let _sbClient = null;

function getSupabaseClient() {
  if (!_sbClient) {
    const { createClient } = require('@supabase/supabase-js');
    _sbClient = createClient(supabaseUrl, supabaseKey);
  }
  return _sbClient;
}

function supabaseApi(method, path, body) {
  const opts = {
    method,
    headers: { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }
  };
  if (body) opts.body = JSON.stringify(body);
  const url = supabaseUrl + path;
  return fetch(url, opts).then(r => {
    if (!r.ok) return r.text().then(t => { console.error('[DB] FAIL ' + r.status + ': ' + t.slice(0, 300)); throw new Error('DB error: ' + r.status); });
    if (r.status === 204) return [];
    return r.json();
  });
}

async function createAnnouncementsTable() {
  try {
    const sb = getSupabaseClient();
    const { error } = await sb.sql`CREATE TABLE IF NOT EXISTS announcements (id SERIAL PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())`;
    if (!error) {
      console.log('[DB] announcements table auto-created via supabase-js');
      return;
    }
    console.error('[DB] supabase-js sql error:', error);
  } catch(e) {
    console.error('[DB] supabase-js sql failed:', e.message);
  }

  try {
    const resp = await fetch(supabaseUrl + '/rest/v1/', {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': 'Bearer ' + supabaseKey,
        'Content-Type': 'application/sql',
        'Prefer': 'return=minimal'
      },
      body: 'CREATE TABLE IF NOT EXISTS announcements (id SERIAL PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())'
    });
    if (resp.ok) {
      console.log('[DB] announcements table auto-created via SQL API');
      return;
    }
  } catch(e) {
    console.error('[DB] SQL API failed:', e.message);
  }

  console.error('========================================');
  console.error('[DB] announcements 表创建失败！请在 Supabase SQL Editor 执行:');
  console.error('CREATE TABLE IF NOT EXISTS announcements (id SERIAL PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());');
  console.error('========================================');
}

async function execSql(sql) {
  try {
    const sb = getSupabaseClient();
    const { error } = await sb.sql(sql);
    if (!error) return true;
    console.error('[DB] sb.sql error:', JSON.stringify(error));
  } catch(e) {
    console.error('[DB] sb.sql failed:', e.message);
  }

  try {
    const resp = await fetch(supabaseUrl + '/rest/v1/', {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': 'Bearer ' + supabaseKey,
        'Content-Type': 'application/sql',
        'Prefer': 'return=minimal'
      },
      body: sql
    });
    if (resp.ok || resp.status === 204) return true;
    const txt = await resp.text();
    console.error('[DB] raw SQL failed:', resp.status, txt.slice(0, 200));
    return false;
  } catch(e) {
    console.error('[DB] raw SQL exception:', e.message);
    return false;
  }
}

async function createWallpapersTables() {
  var ok = true;
  if (!(await execSql('CREATE TABLE IF NOT EXISTS wallpapers (id SERIAL PRIMARY KEY, name TEXT, url TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())'))) ok = false;
  if (!(await execSql('CREATE TABLE IF NOT EXISTS upload_applies (id SERIAL PRIMARY KEY, user_id INTEGER, status TEXT DEFAULT \'pending\', created_at TIMESTAMPTZ DEFAULT NOW())'))) ok = false;
  if (!(await execSql('CREATE TABLE IF NOT EXISTS game_queue (id SERIAL PRIMARY KEY, user_id INTEGER, status TEXT DEFAULT \'waiting\', matched_with INTEGER, room_id INTEGER, created_at TIMESTAMPTZ DEFAULT NOW())'))) ok = false;
  if (!(await execSql('CREATE TABLE IF NOT EXISTS game_rooms (id SERIAL PRIMARY KEY, player1 INTEGER, player2 INTEGER, game_type TEXT DEFAULT \'gomoku\', turn INTEGER DEFAULT 1, board TEXT, status TEXT DEFAULT \'active\', winner INTEGER, p1_heartbeat TIMESTAMPTZ, p2_heartbeat TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW())'))) ok = false;
  if (!(await execSql('CREATE TABLE IF NOT EXISTS game_invites (id SERIAL PRIMARY KEY, from_user INTEGER, to_user INTEGER, status TEXT DEFAULT \'pending\', created_at TIMESTAMPTZ DEFAULT NOW())'))) ok = false;

  if (ok) {
    console.log('[DB] all extra tables ready');
    return;
  }

  console.error('========================================');
  console.error('[DB] 部分表可能未创建成功。请在 Supabase SQL Editor 执行:');
  console.error('CREATE TABLE IF NOT EXISTS upload_applies (id SERIAL PRIMARY KEY, user_id INTEGER, status TEXT DEFAULT \'pending\', created_at TIMESTAMPTZ DEFAULT NOW());');
  console.error('CREATE TABLE IF NOT EXISTS game_queue (id SERIAL PRIMARY KEY, user_id INTEGER, status TEXT DEFAULT \'waiting\', matched_with INTEGER, room_id INTEGER, created_at TIMESTAMPTZ DEFAULT NOW());');
  console.error('CREATE TABLE IF NOT EXISTS game_rooms (id SERIAL PRIMARY KEY, player1 INTEGER, player2 INTEGER, game_type TEXT DEFAULT \'gomoku\', turn INTEGER DEFAULT 1, board TEXT, status TEXT DEFAULT \'active\', winner INTEGER, p1_heartbeat TIMESTAMPTZ, p2_heartbeat TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW());');
  console.error('CREATE TABLE IF NOT EXISTS game_invites (id SERIAL PRIMARY KEY, from_user INTEGER, to_user INTEGER, status TEXT DEFAULT \'pending\', created_at TIMESTAMPTZ DEFAULT NOW());');
  console.error('========================================');
}

async function enableRlsOnAllTables() {
  const tables = ['users','articles','comments','friends','messages','downloads','verify_codes','announcements','wallpapers'];
  for (const t of tables) {
    try {
      const sb = getSupabaseClient();
      const { error } = await sb.sql('ALTER TABLE ' + t + ' ENABLE ROW LEVEL SECURITY');
      if (!error) {
        console.log('[DB] RLS enabled on ' + t);
      } else {
        console.error('[DB] RLS ' + t + ': ' + JSON.stringify(error));
      }
    } catch(e) {
      if (!e.message.includes('already enabled')) console.error('[DB] RLS ' + t + ': ' + e.message);
    }
  }
}

async function sbInitDb() {
  let d = await supabaseApi('GET', '/rest/v1/users?select=id&username=eq.admin&limit=1');
  if (!d || d.length === 0) {
    await supabaseApi('POST', '/rest/v1/users', {
      username: 'admin', password: bcrypt.hashSync('******', 10),
      nickname: '超级管理员', bio: '站点超级管理员', role: 'admin', created_at: new Date().toISOString()
    });
  }

  supabaseReady = true;

  createAnnouncementsTable().catch(function(e){ console.error('[DB] announcements:', e.message); });
  createWallpapersTables().catch(function(e){ console.error('[DB] wallpapers:', e.message); });
  enableRlsOnAllTables().catch(function(e){ console.error('[DB] RLS:', e.message); });
}

function db(tableName) {
  if (MODE === 'json') {
    const t = jsonTable(tableName);
    return {
      all: () => Promise.resolve(t.all()),
      getById: id => Promise.resolve(t.getById(id)),
      findOne: w => Promise.resolve(t.findOne(w)),
      find: w => Promise.resolve(t.find(w).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))),
      insert: r => Promise.resolve(t.insert(r)),
      update: (id, u) => Promise.resolve(t.update(id, u)),
      delete: id => Promise.resolve(t.delete(id))
    };
  }
  return {
    all: () => supabaseApi('GET', '/rest/v1/' + tableName + '?select=*&order=id.asc'),
    getById: id => supabaseApi('GET', '/rest/v1/' + tableName + '?select=*&id=eq.' + id).then(r => r && r.length ? r[0] : null),
    findOne: w => {
      const f = Object.keys(w).map(k => k + '=eq.' + encodeURIComponent(w[k])).join('&');
      return supabaseApi('GET', '/rest/v1/' + tableName + '?select=*&' + f + '&limit=1').then(r => r && r.length ? r[0] : null);
    },
    find: w => {
      const f = Object.keys(w).map(k => k + '=eq.' + encodeURIComponent(w[k])).join('&');
      return supabaseApi('GET', '/rest/v1/' + tableName + '?select=*&order=id.asc' + (f ? '&' + f : ''));
    },
    insert: r => supabaseApi('POST', '/rest/v1/' + tableName + '?select=*', r).then(d => d && d.length ? d[0] : null),
    update: (id, u) => supabaseApi('PATCH', '/rest/v1/' + tableName + '?id=eq.' + id + '&select=*', u).then(d => d && d.length ? d[0] : null),
    delete: id => supabaseApi('DELETE', '/rest/v1/' + tableName + '?id=eq.' + id)
  };
}

async function initDb() {
  if (MODE === 'json') { jsonInitDb(); return; }
  await sbInitDb();
}

module.exports = { db, initDb, MODE };
