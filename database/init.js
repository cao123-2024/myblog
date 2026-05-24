const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

let dbReady = false;

async function initDb() {
  const admin = await supabase.from('users').select('id').eq('username', 'admin').maybeSingle();
  if (!admin.data) {
    await supabase.from('users').insert({
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

module.exports = { supabase, initDb, dbReady };
