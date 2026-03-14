const express = require('express');
const { getDb } = require('../db/init');

const router = express.Router({ mergeParams: true });

const COLORS = ['#3a7d44', '#2563eb', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#c026d3', '#854d0e'];

// Create or rejoin user profile
router.post('/', async (req, res, next) => {
  try {
    const { displayName } = req.body;
    if (!displayName || !displayName.trim()) {
      return res.status(400).json({ error: 'Display name is required' });
    }

    const db = getDb();
    const session = await db.prepare('SELECT id FROM sessions WHERE code = ?').get(req.params.code.toUpperCase());
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Check if user already exists (rejoin)
    const existing = await db.prepare(
      'SELECT id, display_name, color FROM users WHERE session_id = ? AND display_name = ?'
    ).get(session.id, displayName.trim());

    if (existing) {
      await db.prepare('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(existing.id);
      return res.json({ id: existing.id, displayName: existing.display_name, color: existing.color });
    }

    // Assign color based on user count
    const countRow = await db.prepare('SELECT COUNT(*) as cnt FROM users WHERE session_id = ?').get(session.id);
    const color = COLORS[countRow.cnt % COLORS.length];

    const result = await db.prepare(
      'INSERT INTO users (session_id, display_name, color, last_seen) VALUES (?, ?, ?, CURRENT_TIMESTAMP)'
    ).run(session.id, displayName.trim(), color);

    res.json({ id: result.lastInsertRowid, displayName: displayName.trim(), color });
  } catch (err) {
    next(err);
  }
});

// List users in session
router.get('/', async (req, res, next) => {
  try {
    const db = getDb();
    const session = await db.prepare('SELECT id FROM sessions WHERE code = ?').get(req.params.code.toUpperCase());
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const users = await db.prepare(
      'SELECT id, display_name, color, last_seen FROM users WHERE session_id = ?'
    ).all(session.id);

    res.json(users);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
