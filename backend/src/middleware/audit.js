const { getDB } = require('../models/db');

function auditLog(userId, action, entityType, entityId, details) {
  const db = getDB();
  try {
    db.prepare('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)').run(
      userId, action, entityType, entityId, typeof details === 'string' ? details : JSON.stringify(details)
    );
  } finally {
    db.close();
  }
}

module.exports = { auditLog };
