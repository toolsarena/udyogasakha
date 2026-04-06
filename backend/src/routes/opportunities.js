const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { getDB } = require('../models/db');
const { authenticate, authorize, requireTrustLevel } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const router = express.Router();

// List published opportunities (public, with filters)
router.get('/', (req, res) => {
  const { module, category_id, search, page = 1, limit = 20 } = req.query;
  const db = getDB();
  try {
    let sql = `SELECT o.*, u.full_name as requester_name, u.organization_name, c.name as category_name
      FROM opportunities o
      JOIN users u ON o.requester_id = u.id
      LEFT JOIN categories c ON o.category_id = c.id
      WHERE o.status = 'published'`;
    const params = [];
    if (module) { sql += ' AND o.module = ?'; params.push(module); }
    if (category_id) { sql += ' AND o.category_id = ?'; params.push(category_id); }
    if (search) { sql += ' AND (o.title LIKE ? OR o.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY o.published_at DESC LIMIT ? OFFSET ?';
    params.push(+limit, (+page - 1) * +limit);

    const rows = db.prepare(sql).all(...params);
    const total = db.prepare(`SELECT COUNT(*) as count FROM opportunities WHERE status = 'published'`).get().count;
    res.json({ data: rows, total, page: +page, limit: +limit });
  } finally {
    db.close();
  }
});

// Get single opportunity
router.get('/:id', (req, res) => {
  const db = getDB();
  try {
    const opp = db.prepare(`SELECT o.*, u.full_name as requester_name, u.organization_name, u.trust_level as requester_trust_level, c.name as category_name
      FROM opportunities o JOIN users u ON o.requester_id = u.id LEFT JOIN categories c ON o.category_id = c.id WHERE o.id = ?`).get(req.params.id);
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });
    res.json(opp);
  } finally {
    db.close();
  }
});

// Create opportunity (providers/admins)
router.post('/', authenticate, authorize('provider', 'admin'), [
  body('title').notEmpty(),
  body('description').notEmpty(),
  body('module').isIn(['employment', 'service_engagement']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, module, category_id, location, engagement_type, compensation_info, required_trust_level, expires_at } = req.body;
  const db = getDB();
  try {
    const result = db.prepare(
      `INSERT INTO opportunities (requester_id, title, description, module, category_id, location, engagement_type, compensation_info, required_trust_level, status, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_moderation', ?)`
    ).run(req.user.id, title, description, module, category_id || null, location || null, engagement_type || null, compensation_info || null, required_trust_level || 0, expires_at || null);

    auditLog(req.user.id, 'CREATE_OPPORTUNITY', 'opportunity', result.lastInsertRowid, { module, title });
    res.status(201).json({ id: result.lastInsertRowid, status: 'pending_moderation', message: 'Opportunity submitted for moderation' });
  } finally {
    db.close();
  }
});

// Update own opportunity
router.put('/:id', authenticate, (req, res) => {
  const db = getDB();
  try {
    const opp = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(req.params.id);
    if (!opp) return res.status(404).json({ error: 'Not found' });
    if (opp.requester_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });

    const { title, description, location, engagement_type, compensation_info, required_trust_level, expires_at } = req.body;
    db.prepare(`UPDATE opportunities SET title = COALESCE(?, title), description = COALESCE(?, description),
      location = COALESCE(?, location), engagement_type = COALESCE(?, engagement_type),
      compensation_info = COALESCE(?, compensation_info), required_trust_level = COALESCE(?, required_trust_level),
      expires_at = COALESCE(?, expires_at), updated_at = datetime('now'), status = 'pending_moderation' WHERE id = ?`)
      .run(title, description, location, engagement_type, compensation_info, required_trust_level, expires_at, req.params.id);

    auditLog(req.user.id, 'UPDATE_OPPORTUNITY', 'opportunity', req.params.id, null);
    res.json({ message: 'Updated, re-submitted for moderation' });
  } finally {
    db.close();
  }
});

// Moderate opportunity (admin/moderator)
router.post('/:id/moderate', authenticate, authorize('admin', 'moderator'), [
  body('action').isIn(['approve', 'reject']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  try {
    const opp = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(req.params.id);
    if (!opp) return res.status(404).json({ error: 'Not found' });

    const newStatus = req.body.action === 'approve' ? 'published' : 'cancelled';
    const publishedAt = req.body.action === 'approve' ? new Date().toISOString() : null;

    db.prepare('UPDATE opportunities SET status = ?, moderated_by = ?, moderation_notes = ?, published_at = COALESCE(?, published_at), updated_at = datetime("now") WHERE id = ?')
      .run(newStatus, req.user.id, req.body.notes || null, publishedAt, req.params.id);

    db.prepare('INSERT INTO moderation_log (target_type, target_id, action, reason, performed_by) VALUES (?, ?, ?, ?, ?)')
      .run('opportunity', req.params.id, req.body.action, req.body.notes || null, req.user.id);

    auditLog(req.user.id, `MODERATE_${req.body.action.toUpperCase()}`, 'opportunity', req.params.id, null);
    res.json({ message: `Opportunity ${req.body.action}d` });
  } finally {
    db.close();
  }
});

// Close opportunity
router.post('/:id/close', authenticate, (req, res) => {
  const db = getDB();
  try {
    const opp = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(req.params.id);
    if (!opp) return res.status(404).json({ error: 'Not found' });
    if (opp.requester_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });

    db.prepare("UPDATE opportunities SET status = 'closed', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    auditLog(req.user.id, 'CLOSE_OPPORTUNITY', 'opportunity', req.params.id, null);
    res.json({ message: 'Opportunity closed' });
  } finally {
    db.close();
  }
});

// My opportunities (requester view)
router.get('/my/listings', authenticate, (req, res) => {
  const db = getDB();
  try {
    const rows = db.prepare('SELECT * FROM opportunities WHERE requester_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json(rows);
  } finally {
    db.close();
  }
});

module.exports = router;
