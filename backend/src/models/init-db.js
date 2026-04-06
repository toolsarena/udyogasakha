const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', '..', 'udyogasakha.db');

function initDB() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL CHECK(role IN ('talent','recruiter','admin','moderator')),
      trust_level INTEGER DEFAULT 0 CHECK(trust_level BETWEEN 0 AND 4),
      organization_name TEXT,
      headline TEXT,
      skills TEXT DEFAULT '[]',
      experience_years INTEGER DEFAULT 0,
      education TEXT,
      preferred_locations TEXT DEFAULT '[]',
      preferred_job_types TEXT DEFAULT '[]',
      cv_filename TEXT,
      cv_keywords TEXT DEFAULT '[]',
      embedding TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

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

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      module TEXT NOT NULL,
      description TEXT,
      min_trust_level INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    -- Scraped jobs from external APIs
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT UNIQUE,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      company TEXT,
      description TEXT,
      location TEXT,
      job_type TEXT,
      salary TEXT,
      url TEXT,
      tags TEXT DEFAULT '[]',
      embedding TEXT,
      scraped_at TEXT DEFAULT (datetime('now')),
      posted_at TEXT,
      expires_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_scraped ON jobs(scraped_at);
    CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);

    -- User-created opportunities
    CREATE TABLE IF NOT EXISTS opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id INTEGER NOT NULL REFERENCES users(id),
      category_id INTEGER REFERENCES categories(id),
      module TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      location TEXT,
      engagement_type TEXT,
      compensation_info TEXT,
      required_trust_level INTEGER DEFAULT 0,
      embedding TEXT,
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

    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER,
      job_id INTEGER,
      provider_id INTEGER NOT NULL REFERENCES users(id),
      cover_note TEXT,
      status TEXT DEFAULT 'submitted' CHECK(status IN (
        'submitted','shortlisted','engaged','withdrawn',
        'rejected','completed'
      )),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS moderation_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      reason TEXT,
      performed_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL REFERENCES users(id),
      to_user_id INTEGER NOT NULL REFERENCES users(id),
      opportunity_id INTEGER,
      rating INTEGER CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL REFERENCES users(id),
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved','dismissed')),
      resolved_by INTEGER REFERENCES users(id),
      resolution_notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT
    );
  `);

  // Seed categories
  const insertCat = db.prepare('INSERT OR IGNORE INTO categories (name, module, description, min_trust_level) VALUES (?, ?, ?, ?)');
  const categories = [
    ['Full-time', 'opportunities', 'Full-time roles', 0],
    ['Part-time', 'opportunities', 'Part-time roles', 0],
    ['Contract', 'opportunities', 'Contract engagements', 0],
    ['Internship', 'opportunities', 'Internships & apprenticeships', 0],
    ['Advisory', 'opportunities', 'Advisory & fractional roles', 1],
    ['Remote', 'opportunities', 'Remote & hybrid roles', 0],
    ['Freelance', 'opportunities', 'Freelance projects', 0],
    ['Pujari / Ritual Specialist', 'service_connect', 'Religious & ritual services', 2],
    ['Traditional Cook', 'service_connect', 'Vadika chefs & traditional cooking', 1],
    ['Event Coordinator', 'service_connect', 'Event coordination', 1],
    ['Caretaker', 'service_connect', 'Caretaker & support roles', 1],
  ];
  db.transaction(() => { for (const c of categories) insertCat.run(...c); })();

  // Seed admin
  if (!db.prepare('SELECT id FROM users WHERE email = ?').get('admin@udyogasakha.org')) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (email, password_hash, full_name, role, trust_level) VALUES (?, ?, ?, ?, ?)').run(
      'admin@udyogasakha.org', hash, 'System Admin', 'admin', 4
    );
  }

  console.log('Database initialized at', DB_PATH);
  db.close();
}

initDB();
module.exports = { DB_PATH };
