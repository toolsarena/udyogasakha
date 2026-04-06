const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'udyogasakha_secret_key_change_in_production';

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

function requireTrustLevel(minLevel) {
  return (req, res, next) => {
    if (req.user.trust_level < minLevel) return res.status(403).json({ error: `Trust Level ${minLevel} required` });
    next();
  };
}

module.exports = { authenticate, authorize, requireTrustLevel, SECRET };
