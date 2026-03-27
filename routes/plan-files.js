const express = require('express');
const { getDb } = require('../db/init');

const router = express.Router();

// GET /api/plan-files?accountId=N
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const accountId = parseInt(req.query.accountId);
    if (!accountId) return res.status(400).json({ error: 'accountId required' });
    const plans = await db.prepare(`
      SELECT pf.id, pf.name, pf.year, pf.scenario_type as "scenarioType",
             pf.description, pf.created_at as "createdAt", pf.updated_at as "updatedAt",
             a.initials as "creatorInitials", a.email as "creatorEmail"
      FROM plan_files pf
      JOIN plan_access pa ON pa.plan_file_id = pf.id
      LEFT JOIN accounts a ON a.id = pf.created_by
      WHERE pa.account_id = ?
      ORDER BY pf.updated_at DESC
    `).all(accountId);
    res.json(plans);
  } catch (e) {
    console.error('List plans error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/plan-files
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { name, year, scenarioType, description, accountId } = req.body;
    if (!name || !year || !scenarioType || !accountId) return res.status(400).json({ error: 'name, year, scenarioType, accountId required' });
    const result = await db.prepare(
      'INSERT INTO plan_files (name, year, scenario_type, description, state_data, created_by) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, parseInt(year), scenarioType, description || '', '{}', parseInt(accountId));
    const planId = result.lastInsertRowid;
    await db.prepare('INSERT INTO plan_access (plan_file_id, account_id, role) VALUES (?, ?, ?) RETURNING plan_file_id').run(planId, parseInt(accountId), 'owner');
    res.json({ id: planId, name, year: parseInt(year), scenarioType });
  } catch (e) {
    console.error('Create plan error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/plan-files/:id
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const plan = await db.prepare('SELECT id, name, year, scenario_type as "scenarioType", state_data, updated_at as "updatedAt" FROM plan_files WHERE id = ?').get(parseInt(req.params.id));
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json(plan);
  } catch (e) {
    console.error('Load plan error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/plan-files/:id
router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { stateData } = req.body;
    if (!stateData) return res.status(400).json({ error: 'stateData required' });
    await db.prepare('UPDATE plan_files SET state_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(stateData, parseInt(req.params.id));
    res.json({ ok: true });
  } catch (e) {
    console.error('Save plan error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/plan-files/:id
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    await db.prepare('DELETE FROM plan_files WHERE id = ?').run(parseInt(req.params.id));
    res.json({ ok: true });
  } catch (e) {
    console.error('Delete plan error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/plan-files/:id/share
router.post('/:id/share', async (req, res) => {
  try {
    const db = getDb();
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });
    const cleanEmail = email.trim().toLowerCase();
    let account = await db.prepare('SELECT id FROM accounts WHERE email = ?').get(cleanEmail);
    if (!account) {
      const prefix = cleanEmail.split('@')[0] || '';
      const parts = prefix.split('.');
      const initials = parts.length >= 2 ? parts.map(p => p.charAt(0).toUpperCase()).join('.') : prefix.slice(0, 2).toUpperCase();
      const COLORS = ['#3a7d44','#2563eb','#dc2626','#9333ea','#ea580c','#0891b2','#c026d3','#854d0e'];
      const cnt = await db.prepare('SELECT COUNT(*) as cnt FROM accounts').get();
      const color = COLORS[(cnt?.cnt || 0) % COLORS.length];
      const r = await db.prepare('INSERT INTO accounts (email, initials, color) VALUES (?, ?, ?)').run(cleanEmail, initials, color);
      account = { id: r.lastInsertRowid };
    }
    try {
      await db.prepare('INSERT INTO plan_access (plan_file_id, account_id) VALUES (?, ?) RETURNING plan_file_id').run(parseInt(req.params.id), account.id);
    } catch (e) { /* duplicate - ok */ }
    res.json({ ok: true, accountId: account.id });
  } catch (e) {
    console.error('Share plan error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
