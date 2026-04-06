const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const router = express.Router();

// Dashboard stats
router.get('/dashboard', authenticate, authorize('admin', 'moderator'), (req, res) => {
  const db = getDB();
  try {
    const stats = {
      users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      users_by_role: db.prepare('SELECT role, COUNT(*) as count FROM users GROUP BY role').all(),
      users_by_trust: db.prepare('SELECT trust_level, COUNT(*) as count FROM users GROUP BY trust_level').all(),
      opportunities_total: db.prepare('SELECT COUNT(*) as count FROM opportunities').get().count,
      opportunities_by_status: db.prepare('SELECT status, COUNT(*) as count FROM opportunities GROUP BY status').all(),
      opportunities_by_module: db.prepare('SELECT module, COUNT(*) as count FROM opportunities GROUP BY module').all(),
      applications_total: db.prepare('SELECT COUNT(*) as count FROM applications').get().count,
      applications_by_status: db.prepare('SELECT status, COUNT(*) as count FROM applications GROUP BY status').all(),
      pending_moderations: db.prepare("SELECT COUNT(*) as count FROM opportunities WHERE status = 'pending_moderation'").get().count,
      pending_verifications: db.prepare("SELECT COUNT(*) as count FROM verifications WHERE status = 'pending'").get().count,
      open_complaints: db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status IN ('open','reviewing')").get().count,
      jobs_total: db.prepare('SELECT COUNT(*) as count FROM jobs').get().count,
      jobs_by_source: db.prepare('SELECT source, COUNT(*) as count FROM jobs GROUP BY source').all(),
      jobs_embedded: db.prepare('SELECT COUNT(*) as count FROM jobs WHERE embedding IS NOT NULL').get().count,
    };
    res.json(stats);
  } finally {
    db.close();
  }
});

// List users
router.get('/users', authenticate, authorize('admin', 'moderator'), (req, res) => {
  const { role, trust_level, search, page = 1, limit = 20 } = req.query;
  const db = getDB();
  try {
    let sql = 'SELECT id, email, full_name, phone, role, trust_level, organization_name, is_active, created_at FROM users WHERE 1=1';
    const params = [];
    if (role) { sql += ' AND role = ?'; params.push(role); }
    if (trust_level !== undefined) { sql += ' AND trust_level = ?'; params.push(+trust_level); }
    if (search) { sql += ' AND (full_name LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(+limit, (+page - 1) * +limit);
    res.json(db.prepare(sql).all(...params));
  } finally {
    db.close();
  }
});

// Suspend/activate user
router.put('/users/:id/status', authenticate, authorize('admin'), [
  body('is_active').isIn([0, 1]),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  try {
    db.prepare('UPDATE users SET is_active = ?, updated_at = datetime("now") WHERE id = ?').run(req.body.is_active, req.params.id);
    db.prepare('INSERT INTO moderation_log (target_type, target_id, action, reason, performed_by) VALUES (?, ?, ?, ?, ?)')
      .run('user', req.params.id, req.body.is_active ? 'activate' : 'suspend', req.body.reason || null, req.user.id);
    auditLog(req.user.id, req.body.is_active ? 'ACTIVATE_USER' : 'SUSPEND_USER', 'user', req.params.id, null);
    res.json({ message: `User ${req.body.is_active ? 'activated' : 'suspended'}` });
  } finally {
    db.close();
  }
});

// Pending moderation queue
router.get('/moderation/queue', authenticate, authorize('admin', 'moderator'), (req, res) => {
  const db = getDB();
  try {
    const rows = db.prepare(`SELECT o.*, u.full_name as requester_name FROM opportunities o JOIN users u ON o.requester_id = u.id WHERE o.status = 'pending_moderation' ORDER BY o.created_at`).all();
    res.json(rows);
  } finally {
    db.close();
  }
});

// Complaints
router.post('/complaints', authenticate, [
  body('target_type').isIn(['user', 'opportunity', 'application']),
  body('target_id').isInt(),
  body('reason').notEmpty(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  try {
    const result = db.prepare('INSERT INTO complaints (reporter_id, target_type, target_id, reason) VALUES (?, ?, ?, ?)')
      .run(req.user.id, req.body.target_type, req.body.target_id, req.body.reason);
    auditLog(req.user.id, 'FILE_COMPLAINT', 'complaint', result.lastInsertRowid, null);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Complaint filed' });
  } finally {
    db.close();
  }
});

router.get('/complaints', authenticate, authorize('admin', 'moderator'), (req, res) => {
  const db = getDB();
  try {
    const rows = db.prepare(`SELECT c.*, u.full_name as reporter_name FROM complaints c JOIN users u ON c.reporter_id = u.id ORDER BY c.created_at DESC`).all();
    res.json(rows);
  } finally {
    db.close();
  }
});

router.put('/complaints/:id', authenticate, authorize('admin', 'moderator'), [
  body('status').isIn(['reviewing', 'resolved', 'dismissed']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  try {
    db.prepare("UPDATE complaints SET status = ?, resolved_by = ?, resolution_notes = ?, resolved_at = datetime('now') WHERE id = ?")
      .run(req.body.status, req.user.id, req.body.resolution_notes || null, req.params.id);
    auditLog(req.user.id, 'RESOLVE_COMPLAINT', 'complaint', req.params.id, { status: req.body.status });
    res.json({ message: 'Complaint updated' });
  } finally {
    db.close();
  }
});

// Categories
router.get('/categories', (req, res) => {
  const db = getDB();
  try {
    res.json(db.prepare('SELECT * FROM categories WHERE is_active = 1').all());
  } finally {
    db.close();
  }
});

// Audit log
router.get('/audit', authenticate, authorize('admin'), (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const db = getDB();
  try {
    const rows = db.prepare('SELECT a.*, u.full_name FROM audit_log a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT ? OFFSET ?')
      .all(+limit, (+page - 1) * +limit);
    res.json(rows);
  } finally {
    db.close();
  }
});

// Feedback
router.post('/feedback', authenticate, [
  body('to_user_id').isInt(),
  body('rating').isInt({ min: 1, max: 5 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  try {
    db.prepare('INSERT INTO feedback (from_user_id, to_user_id, opportunity_id, rating, comment) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, req.body.to_user_id, req.body.opportunity_id || null, req.body.rating, req.body.comment || null);
    res.status(201).json({ message: 'Feedback submitted' });
  } finally {
    db.close();
  }
});

module.exports = router;
