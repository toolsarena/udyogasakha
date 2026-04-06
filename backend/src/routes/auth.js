const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../models/db');
const { authenticate, SECRET } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { embedUser } = require('../services/ranker');

const router = express.Router();

// CV upload config
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  cb(null, ['.pdf', '.doc', '.docx', '.txt'].includes(ext));
}});

// Register
router.post('/register', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('full_name').notEmpty(),
  body('role').isIn(['talent', 'recruiter']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, full_name, phone, role, organization_name, headline, skills, experience_years, education, preferred_locations, preferred_job_types } = req.body;
  const db = getDB();
  try {
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(email))
      return res.status(409).json({ error: 'Email already registered' });

    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      `INSERT INTO users (email, password_hash, full_name, phone, role, organization_name, headline, skills, experience_years, education, preferred_locations, preferred_job_types)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(email, hash, full_name, phone || null, role, organization_name || null,
      headline || null, JSON.stringify(skills || []), experience_years || 0,
      education || null, JSON.stringify(preferred_locations || []), JSON.stringify(preferred_job_types || []));

    auditLog(result.lastInsertRowid, 'REGISTER', 'user', result.lastInsertRowid, { role });

    // Generate embedding async
    embedUser(result.lastInsertRowid).catch(console.error);

    const token = jwt.sign({ id: result.lastInsertRowid, email, role, trust_level: 0 }, SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: result.lastInsertRowid, email, full_name, role, trust_level: 0 } });
  } finally {
    db.close();
  }
});

// Login
router.post('/login', [body('email').isEmail(), body('password').notEmpty()], (req, res) => {
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
    const user = db.prepare('SELECT id, email, full_name, phone, role, trust_level, organization_name, headline, skills, experience_years, education, preferred_locations, preferred_job_types, cv_filename, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.skills = JSON.parse(user.skills || '[]');
    user.preferred_locations = JSON.parse(user.preferred_locations || '[]');
    user.preferred_job_types = JSON.parse(user.preferred_job_types || '[]');
    res.json(user);
  } finally {
    db.close();
  }
});

// Update profile
router.put('/me', authenticate, (req, res) => {
  const { full_name, phone, organization_name, headline, skills, experience_years, education, preferred_locations, preferred_job_types } = req.body;
  const db = getDB();
  try {
    db.prepare(`UPDATE users SET
      full_name = COALESCE(?, full_name), phone = COALESCE(?, phone),
      organization_name = COALESCE(?, organization_name), headline = COALESCE(?, headline),
      skills = COALESCE(?, skills), experience_years = COALESCE(?, experience_years),
      education = COALESCE(?, education), preferred_locations = COALESCE(?, preferred_locations),
      preferred_job_types = COALESCE(?, preferred_job_types), updated_at = datetime('now')
      WHERE id = ?`).run(
      full_name, phone, organization_name, headline,
      skills ? JSON.stringify(skills) : null, experience_years,
      education, preferred_locations ? JSON.stringify(preferred_locations) : null,
      preferred_job_types ? JSON.stringify(preferred_job_types) : null, req.user.id);

    // Re-generate embedding
    embedUser(req.user.id).catch(console.error);
    res.json({ message: 'Profile updated' });
  } finally {
    db.close();
  }
});

// Upload CV
router.post('/me/cv', authenticate, upload.single('cv'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const db = getDB();
  try {
    // Simple keyword extraction from filename for now
    const keywords = req.file.originalname.replace(/\.[^.]+$/, '').split(/[\s_-]+/);
    db.prepare('UPDATE users SET cv_filename = ?, cv_keywords = ?, updated_at = datetime("now") WHERE id = ?')
      .run(req.file.originalname, JSON.stringify(keywords), req.user.id);

    embedUser(req.user.id).catch(console.error);
    res.json({ message: 'CV uploaded', filename: req.file.originalname });
  } finally {
    db.close();
  }
});

module.exports = router;
