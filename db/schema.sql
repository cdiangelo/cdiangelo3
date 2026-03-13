CREATE TABLE IF NOT EXISTS sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL DEFAULT '',
  admin_hash  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id   INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#8b2020',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen    TEXT,
  UNIQUE(session_id, display_name)
);

CREATE TABLE IF NOT EXISTS versions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  state_data  TEXT NOT NULL,
  created_by  INTEGER REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(session_id, name)
);

CREATE TABLE IF NOT EXISTS presence (
  user_id           INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  session_id        INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  active_version_id INTEGER REFERENCES versions(id),
  connected_at      TEXT NOT NULL DEFAULT (datetime('now')),
  last_ping         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_versions_session ON versions(session_id);
CREATE INDEX IF NOT EXISTS idx_users_session ON users(session_id);
CREATE INDEX IF NOT EXISTS idx_presence_session ON presence(session_id);
