const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../models/db');
const { authenticate, SECRET } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const router = express.Router();

// Register
router.post('/register', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('full_name').notEmpty(),
  body('role').isIn(['seeker', 'provider']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, full_name, phone, role, organization_name, bio } = req.body;
  const db = getDB();
  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, full_name, phone, role, organization_name, bio) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(email, hash, full_name, phone || null, role, organization_name || null, bio || null);

    auditLog(result.lastInsertRowid, 'REGISTER', 'user', result.lastInsertRowid, { role });

    const token = jwt.sign({ id: result.lastInsertRowid, email, role, trust_level: 0 }, SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: result.lastInsertRowid, email, full_name, role, trust_level: 0 } });
  } finally {
    db.close();
  }
});

// Login
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(req.body.email);
    if (!user || !bcrypt.compareSync(req.body.password, user.password_hash))
      return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, trust_level: user.trust_level }, SECRET, { expiresIn: '7d' });
    auditLog(user.id, 'LOGIN', 'user', user.id, null);
    res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, trust_level: user.trust_level } });
  } finally {
    db.close();
  }
});

// Get profile
router.get('/me', authenticate, (req, res) => {
  const db = getDB();
  try {
    const user = db.prepare('SELECT id, email, full_name, phone, role, trust_level, organization_name, bio, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } finally {
    db.close();
  }
});

// Update profile
router.put('/me', authenticate, (req, res) => {
  const { full_name, phone, organization_name, bio } = req.body;
  const db = getDB();
  try {
    db.prepare('UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), organization_name = COALESCE(?, organization_name), bio = COALESCE(?, bio), updated_at = datetime("now") WHERE id = ?')
      .run(full_name, phone, organization_name, bio, req.user.id);
    res.json({ message: 'Profile updated' });
  } finally {
    db.close();
  }
});

module.exports = router;
