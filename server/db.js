/* Postgres connection for the API.
   Reads DATABASE_URL (set by the Neon integration on Vercel), or
   POSTGRES_URL. One small pool per running function instance. */
const { Pool, types } = require('pg');

/* Return numbers and calendar dates as the API sends them */
types.setTypeParser(1700, (v) => (v === null ? null : Number(v))); /* numeric */
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));   /* bigint  */
types.setTypeParser(1082, (v) => v);                                 /* date    */

let pool = null;

function getPool() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    const err = new Error('The shop database is not connected yet. Connect a Neon database to this project in Vercel.');
    err.status = 503;
    err.publicCode = 'no_database';
    throw err;
  }
  if (!pool) pool = new Pool({ connectionString: url, max: 3, idleTimeoutMillis: 10000 });
  return pool;
}

module.exports = {
  async query(text, params) {
    const res = await getPool().query(text, params);
    return res.rows;
  },
  /* Run fn inside one transaction; fn receives q(text, params) → rows */
  async tx(fn) {
    const client = await getPool().connect();
    try {
      await client.query('begin');
      const out = await fn(async (text, params) => (await client.query(text, params)).rows);
      await client.query('commit');
      return out;
    } catch (e) {
      try { await client.query('rollback'); } catch (_) { /* connection may be gone */ }
      throw e;
    } finally {
      client.release();
    }
  }
};
