CREATE TABLE IF NOT EXISTS sessions (
  id          SERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL DEFAULT '',
  admin_hash  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  session_id   INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#8b2020',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen    TIMESTAMPTZ,
  UNIQUE(session_id, display_name)
);

CREATE TABLE IF NOT EXISTS versions (
  id          SERIAL PRIMARY KEY,
  session_id  INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  state_data  TEXT NOT NULL,
  created_by  INTEGER REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, name)
);

CREATE TABLE IF NOT EXISTS presence (
  user_id           INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  session_id        INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  active_version_id INTEGER REFERENCES versions(id),
  connected_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_ping         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_versions_session ON versions(session_id);
CREATE INDEX IF NOT EXISTS idx_users_session ON users(session_id);
CREATE INDEX IF NOT EXISTS idx_presence_session ON presence(session_id);

-- ═══ PLAN FILES (new collaboration model) ═══
CREATE TABLE IF NOT EXISTS accounts (
  id         SERIAL PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  initials   TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#3a7d44',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS plan_files (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  year           INTEGER NOT NULL,
  scenario_type  TEXT NOT NULL CHECK (scenario_type IN ('budget','forecast','actual')),
  description    TEXT DEFAULT '',
  state_data     TEXT NOT NULL DEFAULT '{}',
  created_by     INTEGER REFERENCES accounts(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plan_access (
  plan_file_id INTEGER NOT NULL REFERENCES plan_files(id) ON DELETE CASCADE,
  account_id   INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'editor',
  granted_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (plan_file_id, account_id)
);

CREATE TABLE IF NOT EXISTS plan_presence (
  account_id   INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  plan_file_id INTEGER NOT NULL REFERENCES plan_files(id) ON DELETE CASCADE,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_ping    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plan_access_account ON plan_access(account_id);
CREATE INDEX IF NOT EXISTS idx_plan_presence_plan ON plan_presence(plan_file_id);
