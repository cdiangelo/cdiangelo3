const express = require('express');
const { getDb } = require('../db/init');

const router = express.Router();
const COLORS = ['#3a7d44','#2563eb','#dc2626','#9333ea','#ea580c','#0891b2','#c026d3','#854d0e'];

function emailToInitials(email) {
  const prefix = (email || '').split('@')[0] || '';
  const parts = prefix.split('.');
  if (parts.length >= 2) return parts.map(p => p.charAt(0).toUpperCase()).join('.');
  if (prefix.length >= 2) return prefix.slice(0, 2).toUpperCase();
  return prefix.toUpperCase();
}

// POST /api/accounts/login
router.post('/login', async (req, res) => {
  try {
    const db = getDb();
    const { email } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' });
    const cleanEmail = email.trim().toLowerCase();
    const initials = emailToInitials(cleanEmail);

    const existing = await db.prepare('SELECT id, email, initials, color FROM accounts WHERE email = ?').get(cleanEmail);
    if (existing) {
      await db.prepare('UPDATE accounts SET last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(existing.id);
      return res.json(existing);
    }

    const countRow = await db.prepare('SELECT COUNT(*) as cnt FROM accounts').get();
    const color = COLORS[(countRow?.cnt || 0) % COLORS.length];
    const result = await db.prepare('INSERT INTO accounts (email, initials, color) VALUES (?, ?, ?)').run(cleanEmail, initials, color);
    res.json({ id: result.lastInsertRowid, email: cleanEmail, initials, color });
  } catch (e) {
    console.error('Account login error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
