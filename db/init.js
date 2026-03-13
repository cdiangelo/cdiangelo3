const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'compplan.sqlite');
let db = null;
let dbReady = null;

// Wrapper that mimics better-sqlite3 API on top of sql.js
function wrapDb(sqlDb) {
  function saveToFile() {
    const data = sqlDb.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  // Auto-save every 5 seconds if there are changes
  let dirty = false;
  setInterval(() => {
    if (dirty) { saveToFile(); dirty = false; }
  }, 5000);

  return {
    exec(sql) {
      sqlDb.exec(sql);
      dirty = true;
    },
    prepare(sql) {
      return {
        get(...params) {
          const stmt = sqlDb.prepare(sql);
          stmt.bind(params);
          let result = null;
          if (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            result = {};
            cols.forEach((c, i) => { result[c] = vals[i]; });
          }
          stmt.free();
          return result;
        },
        all(...params) {
          const results = [];
          const stmt = sqlDb.prepare(sql);
          stmt.bind(params);
          while (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            const row = {};
            cols.forEach((c, i) => { row[c] = vals[i]; });
            results.push(row);
          }
          stmt.free();
          return results;
        },
        run(...params) {
          sqlDb.run(sql, params);
          dirty = true;
          const lastId = sqlDb.exec("SELECT last_insert_rowid() as id")[0]?.values[0]?.[0];
          const changes = sqlDb.getRowsModified();
          return { lastInsertRowid: lastId, changes };
        }
      };
    },
    save() { saveToFile(); },
    close() { saveToFile(); sqlDb.close(); }
  };
}

async function initDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  // Load existing DB file or create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = wrapDb(new SQL.Database(fileBuffer));
  } else {
    db = wrapDb(new SQL.Database());
  }

  // Run schema
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);

  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON');

  // Clean stale presence rows on startup
  db.exec('DELETE FROM presence');

  db.save();
  return db;
}

// Start initialization immediately
dbReady = initDb();

function getDb() {
  if (!db) throw new Error('Database not initialized yet. Await initDb() first.');
  return db;
}

module.exports = { getDb, initDb, dbReady };
