const { pool } = require('./init');

function db(tableName) {
  return {
    async all() {
      const r = await pool.query(`SELECT * FROM ${tableName} ORDER BY id`);
      return r.rows;
    },
    async getById(id) {
      const r = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
      return r.rows[0] || null;
    },
    async findOne(where) {
      const keys = Object.keys(where);
      const conds = keys.map((k, i) => `"${k}" = $${i + 1}`);
      const r = await pool.query(`SELECT * FROM ${tableName} WHERE ${conds.join(' AND ')} LIMIT 1`, keys.map(k => where[k]));
      return r.rows[0] || null;
    },
    async find(where) {
      const keys = Object.keys(where);
      if (keys.length === 0) return this.all();
      const conds = keys.map((k, i) => `"${k}" = $${i + 1}`);
      const r = await pool.query(`SELECT * FROM ${tableName} WHERE ${conds.join(' AND ')} ORDER BY id`, keys.map(k => where[k]));
      return r.rows;
    },
    async insert(record) {
      const keys = Object.keys(record);
      const vals = keys.map(k => record[k]);
      const pls = keys.map((_, i) => '$' + (i + 1));
      const r = await pool.query(
        `INSERT INTO ${tableName} (${keys.map(k => `"${k}"`).join(',')}) VALUES (${pls.join(',')}) RETURNING *`,
        vals
      );
      return r.rows[0];
    },
    async update(id, updates) {
      const keys = Object.keys(updates);
      if (keys.length === 0) return null;
      const sets = keys.map((k, i) => `"${k}" = $${i + 2}`);
      const vals = keys.map(k => updates[k]);
      const r = await pool.query(
        `UPDATE ${tableName} SET ${sets.join(',')} WHERE id = $1 RETURNING *`,
        [id, ...vals]
      );
      return r.rows[0] || null;
    },
    async delete(id) {
      await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
    }
  };
}

module.exports = { db };
