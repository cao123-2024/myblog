const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = process.env.VERCEL === '1'
  ? path.join('/tmp', 'data')
  : path.join(__dirname, 'data');
const UPLOADS_DIR = process.env.VERCEL === '1'
  ? path.join('/tmp', 'uploads', 'downloads')
  : path.join(__dirname, '..', 'uploads', 'downloads');

const FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  articles: path.join(DATA_DIR, 'articles.json'),
  comments: path.join(DATA_DIR, 'comments.json'),
  friends: path.join(DATA_DIR, 'friends.json'),
  messages: path.join(DATA_DIR, 'messages.json'),
  downloads: path.join(DATA_DIR, 'downloads.json'),
  verifyCodes: path.join(DATA_DIR, 'verifyCodes.json')
};

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function readJSON(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch { return []; }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

const tables = {};

function makeFilter(predicate) {
  if (typeof predicate === 'function') return predicate;
  const keys = Object.keys(predicate);
  return (record) => keys.every(k => record[k] === predicate[k]);
}

function table(name) {
  if (!tables[name]) {
    const filePath = FILES[name];
    if (!fs.existsSync(filePath)) writeJSON(filePath, []);
    tables[name] = {
      _data: readJSON(filePath),
      _path: filePath,
      _save() { writeJSON(this._path, this._data); },
      _nextId() {
        const max = this._data.reduce((m, r) => Math.max(m, r.id || 0), 0);
        return max + 1;
      },
      all() { this._data = readJSON(this._path); return this._data; },
      getById(id) { this.all(); return this._data.find(r => r.id === id) || null; },
      find(predicate) { this.all(); return this._data.filter(makeFilter(predicate)); },
      findOne(predicate) { this.all(); return this._data.find(makeFilter(predicate)) || null; },
      insert(record) {
        this.all();
        record.id = this._nextId();
        this._data.push(record);
        this._save();
        return record;
      },
      update(id, updates) {
        this.all();
        const idx = this._data.findIndex(r => r.id === id);
        if (idx === -1) return null;
        this._data[idx] = { ...this._data[idx], ...updates };
        this._save();
        return this._data[idx];
      },
      delete(id) {
        this.all();
        const idx = this._data.findIndex(r => r.id === id);
        if (idx === -1) return false;
        this._data.splice(idx, 1);
        this._save();
        return true;
      }
    };
  }
  return tables[name];
}

function initDb() {
  const admin = table('users').findOne({ username: 'admin' });
  if (!admin) {
    table('users').insert({
      username: 'admin',
      password: bcrypt.hashSync('******', 10),
      nickname: '超级管理员',
      avatar: '',
      bg_image: '',
      bio: '站点超级管理员',
      role: 'admin',
      tag: '',
      created_by: null,
      banned_until: null,
      created_at: new Date().toISOString()
    });
  }
}

module.exports = { table, initDb };
