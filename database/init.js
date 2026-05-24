const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connStr = process.env.POSTGRES_URL
  || process.env.POSTGRES_PRISMA_URL
  || process.env.DATABASE_URL
  || '';

const pool = new Pool({
  connectionString: connStr.includes('?sslmode=') || connStr.includes('&sslmode=') ? connStr : (connStr.includes('?') ? connStr + '&sslmode=require' : connStr + '?sslmode=require'),
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

let dbReady = false;

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nickname TEXT DEFAULT '',
        avatar TEXT DEFAULT '',
        bg_image TEXT DEFAULT '',
        bio TEXT DEFAULT '',
        role TEXT DEFAULT 'user',
        tag TEXT DEFAULT '',
        created_by INTEGER,
        banned_until TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY,
        author_id INTEGER REFERENCES users(id),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT DEFAULT '',
        cover_image TEXT DEFAULT '',
        images TEXT DEFAULT '[]',
        download_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        article_id INTEGER REFERENCES articles(id),
        user_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        admin_alias TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS friends (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        friend_id INTEGER REFERENCES users(id),
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id),
        receiver_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        "read" INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS downloads (
        id SERIAL PRIMARY KEY,
        title TEXT DEFAULT '',
        description TEXT DEFAULT '',
        filename TEXT NOT NULL,
        "originalName" TEXT DEFAULT '',
        size INTEGER DEFAULT 0,
        mimetype TEXT DEFAULT '',
        path TEXT DEFAULT '',
        download_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS verify_codes (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES users(id),
        code TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const admin = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
    if (admin.rows.length === 0) {
      await client.query(
        'INSERT INTO users (username, password, nickname, bio, role, created_by) VALUES ($1,$2,$3,$4,$5,$6)',
        ['admin', bcrypt.hashSync('******', 10), '超级管理员', '站点超级管理员', 'admin', null]
      );
    }

    dbReady = true;
    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb, dbReady };
