const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const router = express.Router();

// Apply to an opportunity
router.post('/', authenticate, authorize('seeker', 'admin'), [
  body('opportunity_id').isInt(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  try {
    const opp = db.prepare("SELECT * FROM opportunities WHERE id = ? AND status = 'published'").get(req.body.opportunity_id);
    if (!opp) return res.status(404).json({ error: 'Opportunity not found or not published' });
    if (req.user.trust_level < opp.required_trust_level)
      return res.status(403).json({ error: `Trust Level ${opp.required_trust_level} required` });

    const existing = db.prepare('SELECT id FROM applications WHERE opportunity_id = ? AND provider_id = ?').get(opp.id, req.user.id);
    if (existing) return res.status(409).json({ error: 'Already applied' });

    const result = db.prepare('INSERT INTO applications (opportunity_id, provider_id, cover_note) VALUES (?, ?, ?)')
      .run(opp.id, req.user.id, req.body.cover_note || null);

    auditLog(req.user.id, 'APPLY', 'application', result.lastInsertRowid, { opportunity_id: opp.id });
    res.status(201).json({ id: result.lastInsertRowid, message: 'Application submitted' });
  } finally {
    db.close();
  }
});

// My applications (seeker view)
router.get('/my', authenticate, (req, res) => {
  const db = getDB();
  try {
    const rows = db.prepare(`SELECT a.*, o.title as opportunity_title, o.module, o.status as opportunity_status
      FROM applications a JOIN opportunities o ON a.opportunity_id = o.id
      WHERE a.provider_id = ? ORDER BY a.created_at DESC`).all(req.user.id);
    res.json(rows);
  } finally {
    db.close();
  }
});

// Applications for an opportunity (requester view)
router.get('/opportunity/:oppId', authenticate, (req, res) => {
  const db = getDB();
  try {
    const opp = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(req.params.oppId);
    if (!opp) return res.status(404).json({ error: 'Not found' });
    if (opp.requester_id !== req.user.id && !['admin', 'moderator'].includes(req.user.role))
      return res.status(403).json({ error: 'Not authorized' });

    const rows = db.prepare(`SELECT a.*, u.full_name, u.email, u.trust_level, u.bio
      FROM applications a JOIN users u ON a.provider_id = u.id
      WHERE a.opportunity_id = ? ORDER BY a.created_at DESC`).all(req.params.oppId);
    res.json(rows);
  } finally {
    db.close();
  }
});

// Update application status (requester/admin)
router.put('/:id/status', authenticate, [
  body('status').isIn(['shortlisted', 'engaged', 'rejected', 'completed']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  try {
    const app = db.prepare(`SELECT a.*, o.requester_id FROM applications a JOIN opportunities o ON a.opportunity_id = o.id WHERE a.id = ?`).get(req.params.id);
    if (!app) return res.status(404).json({ error: 'Not found' });
    if (app.requester_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });

    db.prepare("UPDATE applications SET status = ?, updated_at = datetime('now') WHERE id = ?").run(req.body.status, req.params.id);
    auditLog(req.user.id, 'UPDATE_APPLICATION_STATUS', 'application', req.params.id, { status: req.body.status });
    res.json({ message: 'Application status updated' });
  } finally {
    db.close();
  }
});

// Withdraw application (seeker)
router.post('/:id/withdraw', authenticate, (req, res) => {
  const db = getDB();
  try {
    const app = db.prepare('SELECT * FROM applications WHERE id = ? AND provider_id = ?').get(req.params.id, req.user.id);
    if (!app) return res.status(404).json({ error: 'Not found' });

    db.prepare("UPDATE applications SET status = 'withdrawn', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    auditLog(req.user.id, 'WITHDRAW_APPLICATION', 'application', req.params.id, null);
    res.json({ message: 'Application withdrawn' });
  } finally {
    db.close();
  }
});

module.exports = router;
