const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

let pool = null;
let db = null;
let initPromise = null;

// Convert ? placeholders to $1, $2, ...
function pgify(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function wrapPool(p) {
  return {
    exec(sql) {
      return p.query(sql);
    },
    prepare(sql) {
      const pgSql = pgify(sql);
      return {
        async get(...params) {
          const res = await p.query(pgSql, params);
          return res.rows[0] || null;
        },
        async all(...params) {
          const res = await p.query(pgSql, params);
          return res.rows;
        },
        async run(...params) {
          // For INSERT statements, append RETURNING id to get lastInsertRowid
          const isInsert = /^\s*INSERT\s/i.test(pgSql);
          let finalSql = pgSql;
          if (isInsert && !/RETURNING/i.test(pgSql)) {
            finalSql = pgSql + ' RETURNING id';
          }
          const res = await p.query(finalSql, params);
          const lastInsertRowid = isInsert && res.rows[0] ? res.rows[0].id : null;
          return { lastInsertRowid, changes: res.rowCount };
        }
      };
    },
    save() { /* no-op — Postgres auto-persists */ },
    close() { return p.end(); }
  };
}

async function initDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    db = wrapPool(pool);
    console.log('Connected to PostgreSQL');

    // Run schema
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await db.exec(schema);

    // Clean stale presence rows on startup
    await db.exec('DELETE FROM presence');
    try{await db.exec('DELETE FROM plan_presence')}catch(e){}

    return db;
  })();

  return initPromise;
}

function getDb() {
  if (!db) throw new Error('Database not initialized yet. Await initDb() first.');
  return db;
}

module.exports = { getDb, initDb };
