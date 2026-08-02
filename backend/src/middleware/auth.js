const jwt = require('jsonwebtoken');

function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.JWT_KEY || 'dev-only-secret';
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (!token || scheme !== 'Bearer') {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    req.user = {
      id: payload.sub,
      email: payload.email
    };
    return next();
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
}

module.exports = { authMiddleware };

