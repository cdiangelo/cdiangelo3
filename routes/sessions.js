const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/init');

const router = express.Router();

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode() {
  const db = getDb();
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    const existing = db.prepare('SELECT id FROM sessions WHERE code = ?').get(code);
    if (!existing) return code;
  }
  throw new Error('Failed to generate unique session code');
}

// Create session (admin only)
const ADMIN_PASSWORD = 'alphabetsoup';

router.post('/', async (req, res) => {
  const { code: customCode, name, adminPassword } = req.body;
  if (!adminPassword || adminPassword !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Invalid admin password' });
  }
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Session name is required' });
  }

  const db = getDb();
  // Use custom code if provided, otherwise generate one
  let code;
  if (customCode && customCode.trim().length >= 3) {
    code = customCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const existing = db.prepare('SELECT id FROM sessions WHERE code = ?').get(code);
    if (existing) {
      return res.status(409).json({ error: 'A session with that code already exists' });
    }
  } else {
    code = generateCode();
  }
  const hash = bcrypt.hashSync(adminPassword, 10);

  const result = db.prepare(
    'INSERT INTO sessions (code, name, admin_hash) VALUES (?, ?, ?)'
  ).run(code, name.trim(), hash);

  res.json({ id: result.lastInsertRowid, code, name: name.trim() });
});

// Look up session by code
router.get('/:code', (req, res) => {
  const db = getDb();
  const session = db.prepare(
    'SELECT id, code, name, created_at FROM sessions WHERE code = ?'
  ).get(req.params.code.toUpperCase());

  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

module.exports = router;
