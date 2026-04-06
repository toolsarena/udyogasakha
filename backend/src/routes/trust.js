const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const router = express.Router();

// Submit document for verification (L1)
router.post('/verify', authenticate, [
  body('doc_type').notEmpty(),
  body('doc_reference').notEmpty(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  try {
    const result = db.prepare('INSERT INTO verifications (user_id, doc_type, doc_reference) VALUES (?, ?, ?)')
      .run(req.user.id, req.body.doc_type, req.body.doc_reference);
    auditLog(req.user.id, 'SUBMIT_VERIFICATION', 'verification', result.lastInsertRowid, { doc_type: req.body.doc_type });
    res.status(201).json({ id: result.lastInsertRowid, message: 'Verification document submitted' });
  } finally {
    db.close();
  }
});

// Review verification (admin/moderator)
router.put('/verify/:id', authenticate, authorize('admin', 'moderator'), [
  body('status').isIn(['approved', 'rejected']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  try {
    const ver = db.prepare('SELECT * FROM verifications WHERE id = ?').get(req.params.id);
    if (!ver) return res.status(404).json({ error: 'Not found' });

    db.prepare("UPDATE verifications SET status = ?, reviewed_by = ?, reviewed_at = datetime('now'), notes = ? WHERE id = ?")
      .run(req.body.status, req.user.id, req.body.notes || null, req.params.id);

    // Upgrade trust level to L1 if approved
    if (req.body.status === 'approved') {
      db.prepare('UPDATE users SET trust_level = MAX(trust_level, 1), updated_at = datetime("now") WHERE id = ?').run(ver.user_id);
    }

    auditLog(req.user.id, `VERIFY_${req.body.status.toUpperCase()}`, 'verification', req.params.id, { user_id: ver.user_id });
    res.json({ message: `Verification ${req.body.status}` });
  } finally {
    db.close();
  }
});

// Submit screening request (L2)
router.post('/screen', authenticate, authorize('admin', 'moderator'), [
  body('user_id').isInt(),
  body('screening_type').notEmpty(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  try {
    const result = db.prepare('INSERT INTO screenings (user_id, screening_type, outcome, screened_by, conflict_declaration) VALUES (?, ?, ?, ?, ?)')
      .run(req.body.user_id, req.body.screening_type, 'pending', req.user.id, req.body.conflict_declaration || null);
    auditLog(req.user.id, 'INITIATE_SCREENING', 'screening', result.lastInsertRowid, { user_id: req.body.user_id });
    res.status(201).json({ id: result.lastInsertRowid, message: 'Screening initiated' });
  } finally {
    db.close();
  }
});

// Complete screening (admin/moderator)
router.put('/screen/:id', authenticate, authorize('admin', 'moderator'), [
  body('outcome').isIn(['passed', 'failed']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  try {
    const scr = db.prepare('SELECT * FROM screenings WHERE id = ?').get(req.params.id);
    if (!scr) return res.status(404).json({ error: 'Not found' });

    db.prepare('UPDATE screenings SET outcome = ?, notes = ? WHERE id = ?')
      .run(req.body.outcome, req.body.notes || null, req.params.id);

    if (req.body.outcome === 'passed') {
      db.prepare('UPDATE users SET trust_level = MAX(trust_level, 2), updated_at = datetime("now") WHERE id = ?').run(scr.user_id);
    }

    auditLog(req.user.id, `SCREENING_${req.body.outcome.toUpperCase()}`, 'screening', req.params.id, { user_id: scr.user_id });
    res.json({ message: `Screening ${req.body.outcome}` });
  } finally {
    db.close();
  }
});

// Pending verifications (admin view)
router.get('/verifications/pending', authenticate, authorize('admin', 'moderator'), (req, res) => {
  const db = getDB();
  try {
    const rows = db.prepare(`SELECT v.*, u.full_name, u.email FROM verifications v JOIN users u ON v.user_id = u.id WHERE v.status = 'pending' ORDER BY v.created_at`).all();
    res.json(rows);
  } finally {
    db.close();
  }
});

// Pending screenings (admin view)
router.get('/screenings/pending', authenticate, authorize('admin', 'moderator'), (req, res) => {
  const db = getDB();
  try {
    const rows = db.prepare(`SELECT s.*, u.full_name, u.email FROM screenings s JOIN users u ON s.user_id = u.id WHERE s.outcome = 'pending' ORDER BY s.created_at`).all();
    res.json(rows);
  } finally {
    db.close();
  }
});

module.exports = router;
