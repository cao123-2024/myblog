const { supabase } = require('./init');

function db(tableName) {
  return {
    async all() {
      const { data, error } = await supabase.from(tableName).select('*').order('id', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    async getById(id) {
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data || null;
    },
    async findOne(where) {
      let q = supabase.from(tableName).select('*');
      Object.keys(where).forEach(k => { q = q.eq(k, where[k]); });
      const { data, error } = await q.limit(1).maybeSingle();
      if (error) throw error;
      return data || null;
    },
    async find(where) {
      if (Object.keys(where).length === 0) return this.all();
      let q = supabase.from(tableName).select('*').order('id', { ascending: true });
      Object.keys(where).forEach(k => { q = q.eq(k, where[k]); });
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    async insert(record) {
      const { data, error } = await supabase.from(tableName).insert(record).select('*').single();
      if (error) throw error;
      return data;
    },
    async update(id, updates) {
      const { data, error } = await supabase.from(tableName).update(updates).eq('id', id).select('*').single();
      if (error) throw error;
      return data || null;
    },
    async delete(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
    }
  };
}

module.exports = { db };
