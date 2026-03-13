const express = require('express');
const { getDb } = require('../db/init');

const router = express.Router({ mergeParams: true });

function getSession(code) {
  const db = getDb();
  return db.prepare('SELECT id FROM sessions WHERE code = ?').get(code.toUpperCase());
}

// List versions
router.get('/', (req, res) => {
  const session = getSession(req.params.code);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const db = getDb();
  const versions = db.prepare(
    `SELECT v.id, v.name, v.updated_at, v.created_at, v.created_by,
            u.display_name as created_by_name
     FROM versions v
     LEFT JOIN users u ON u.id = v.created_by
     WHERE v.session_id = ?
     ORDER BY v.updated_at DESC`
  ).all(session.id);

  res.json(versions);
});

// Create version
router.post('/', (req, res) => {
  const session = getSession(req.params.code);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { name, stateData, userId } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Version name is required' });
  if (!stateData) return res.status(400).json({ error: 'State data is required' });

  const db = getDb();

  // Check for duplicate name
  const existing = db.prepare(
    'SELECT id FROM versions WHERE session_id = ? AND name = ?'
  ).get(session.id, name.trim());
  if (existing) return res.status(409).json({ error: 'A version with that name already exists' });

  const result = db.prepare(
    'INSERT INTO versions (session_id, name, state_data, created_by) VALUES (?, ?, ?, ?)'
  ).run(session.id, name.trim(), stateData, userId || null);

  res.json({ id: result.lastInsertRowid, name: name.trim() });
});

// Load version state
router.get('/:id', (req, res) => {
  const session = getSession(req.params.code);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const db = getDb();
  const version = db.prepare(
    'SELECT id, name, state_data, updated_at FROM versions WHERE id = ? AND session_id = ?'
  ).get(req.params.id, session.id);

  if (!version) return res.status(404).json({ error: 'Version not found' });
  res.json(version);
});

// Update version state (auto-save target)
router.put('/:id', (req, res) => {
  const session = getSession(req.params.code);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { stateData } = req.body;
  if (!stateData) return res.status(400).json({ error: 'State data is required' });

  const db = getDb();
  const result = db.prepare(
    'UPDATE versions SET state_data = ?, updated_at = datetime(\'now\') WHERE id = ? AND session_id = ?'
  ).run(stateData, req.params.id, session.id);

  if (result.changes === 0) return res.status(404).json({ error: 'Version not found' });
  res.json({ ok: true });
});

// Rename version
router.put('/:id/rename', (req, res) => {
  const session = getSession(req.params.code);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

  const db = getDb();

  // Check for duplicate
  const existing = db.prepare(
    'SELECT id FROM versions WHERE session_id = ? AND name = ? AND id != ?'
  ).get(session.id, name.trim(), req.params.id);
  if (existing) return res.status(409).json({ error: 'A version with that name already exists' });

  const result = db.prepare(
    'UPDATE versions SET name = ?, updated_at = datetime(\'now\') WHERE id = ? AND session_id = ?'
  ).run(name.trim(), req.params.id, session.id);

  if (result.changes === 0) return res.status(404).json({ error: 'Version not found' });
  res.json({ ok: true });
});

// Duplicate version
router.post('/:id/duplicate', (req, res) => {
  const session = getSession(req.params.code);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { name, userId } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

  const db = getDb();

  // Check for duplicate name
  const dupName = db.prepare(
    'SELECT id FROM versions WHERE session_id = ? AND name = ?'
  ).get(session.id, name.trim());
  if (dupName) return res.status(409).json({ error: 'A version with that name already exists' });

  const source = db.prepare(
    'SELECT state_data FROM versions WHERE id = ? AND session_id = ?'
  ).get(req.params.id, session.id);
  if (!source) return res.status(404).json({ error: 'Source version not found' });

  const result = db.prepare(
    'INSERT INTO versions (session_id, name, state_data, created_by) VALUES (?, ?, ?, ?)'
  ).run(session.id, name.trim(), source.state_data, userId || null);

  res.json({ id: result.lastInsertRowid, name: name.trim() });
});

// Delete version
router.delete('/:id', (req, res) => {
  const session = getSession(req.params.code);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const db = getDb();

  // Don't allow deleting the last version
  const count = db.prepare('SELECT COUNT(*) as cnt FROM versions WHERE session_id = ?').get(session.id).cnt;
  if (count <= 1) return res.status(400).json({ error: 'Cannot delete the last version' });

  const result = db.prepare(
    'DELETE FROM versions WHERE id = ? AND session_id = ?'
  ).run(req.params.id, session.id);

  if (result.changes === 0) return res.status(404).json({ error: 'Version not found' });
  res.json({ ok: true });
});

module.exports = router;
