const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', '..', 'udyogasakha.db');

function initDB() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    -- Users: seekers, providers, admins, moderators
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL CHECK(role IN ('seeker','provider','admin','moderator')),
      trust_level INTEGER DEFAULT 0 CHECK(trust_level BETWEEN 0 AND 4),
      organization_name TEXT,
      bio TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Document verification records (L1)
    CREATE TABLE IF NOT EXISTS verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      doc_type TEXT NOT NULL,
      doc_reference TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      reviewed_by INTEGER REFERENCES users(id),
      reviewed_at TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Foundation screening records (L2)
    CREATE TABLE IF NOT EXISTS screenings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      screening_type TEXT NOT NULL,
      outcome TEXT CHECK(outcome IN ('passed','failed','pending')),
      screened_by INTEGER REFERENCES users(id),
      conflict_declaration TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Opportunity categories
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      module TEXT NOT NULL CHECK(module IN (
        'employment','service_engagement','project_tender',
        'consultancy','vendor_marketplace','training',
        'startup_innovation','volunteer'
      )),
      description TEXT,
      min_trust_level INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    -- Opportunities (jobs, service roles, etc.)
    CREATE TABLE IF NOT EXISTS opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id INTEGER NOT NULL REFERENCES users(id),
      category_id INTEGER REFERENCES categories(id),
      module TEXT NOT NULL CHECK(module IN (
        'employment','service_engagement','project_tender',
        'consultancy','vendor_marketplace','training',
        'startup_innovation','volunteer'
      )),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      location TEXT,
      engagement_type TEXT,
      compensation_info TEXT,
      required_trust_level INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft' CHECK(status IN (
        'draft','pending_moderation','approved','published',
        'closed','cancelled','expired'
      )),
      moderated_by INTEGER REFERENCES users(id),
      moderation_notes TEXT,
      published_at TEXT,
      expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Applications / Expressions of Interest
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER NOT NULL REFERENCES opportunities(id),
      provider_id INTEGER NOT NULL REFERENCES users(id),
      cover_note TEXT,
      status TEXT DEFAULT 'submitted' CHECK(status IN (
        'submitted','shortlisted','engaged','withdrawn',
        'rejected','completed'
      )),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Moderation actions audit log
    CREATE TABLE IF NOT EXISTS moderation_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_type TEXT NOT NULL CHECK(target_type IN ('opportunity','user','application')),
      target_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      reason TEXT,
      performed_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Audit trail
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Feedback / reputation
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL REFERENCES users(id),
      to_user_id INTEGER NOT NULL REFERENCES users(id),
      opportunity_id INTEGER REFERENCES opportunities(id),
      rating INTEGER CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Complaints
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL REFERENCES users(id),
      target_type TEXT NOT NULL CHECK(target_type IN ('user','opportunity','application')),
      target_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved','dismissed')),
      resolved_by INTEGER REFERENCES users(id),
      resolution_notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT
    );
  `);

  // Seed default categories
  const insertCat = db.prepare(`INSERT OR IGNORE INTO categories (name, module, description, min_trust_level) VALUES (?, ?, ?, ?)`);
  const categories = [
    ['Full-time Employment', 'employment', 'Full-time job roles across industries', 1],
    ['Part-time Employment', 'employment', 'Part-time job roles', 1],
    ['Contract Employment', 'employment', 'Contractual engagements', 1],
    ['Internship', 'employment', 'Internship and apprenticeship programs', 0],
    ['Advisory Role', 'employment', 'Advisory and fractional roles', 2],
    ['Remote/Hybrid', 'employment', 'Remote or hybrid engagements', 1],
    ['Pujari / Ritual Specialist', 'service_engagement', 'Religious and ritual services', 2],
    ['Traditional Cook', 'service_engagement', 'Vadika chefs and traditional cooking', 1],
    ['Event Coordinator', 'service_engagement', 'Event-based service coordination', 1],
    ['Caretaker', 'service_engagement', 'Caretaker and support roles', 1],
    ['Skilled Service Provider', 'service_engagement', 'Skilled informal sector roles', 1],
  ];
  const seedTx = db.transaction(() => {
    for (const c of categories) insertCat.run(...c);
  });
  seedTx();

  // Seed admin user
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@udyogasakha.org');
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`INSERT INTO users (email, password_hash, full_name, role, trust_level) VALUES (?, ?, ?, ?, ?)`).run(
      'admin@udyogasakha.org', hash, 'System Admin', 'admin', 4
    );
  }

  console.log('Database initialized successfully at', DB_PATH);
  db.close();
}

initDB();
module.exports = { DB_PATH };
