const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { code: 'MISSING_TOKEN' } });
  }
  try {
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.user = decoded; // { sub, role }
    next();
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    return res.status(401).json({ success: false, error: { code } });
  }
}

module.exports = { verifyToken };
