const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Missing auth token' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('-passwordHash');

    if (!user) {
      return res.status(401).json({ message: 'Invalid auth token' });
    }

    if (user.active === false || ['blocked', 'inactive', 'deleted'].includes(user.status)) {
      return res.status(401).json({ message: user.status === 'blocked' ? 'Account is blocked' : 'Account is inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid auth token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  };
}

module.exports = { auth, requireRole };
