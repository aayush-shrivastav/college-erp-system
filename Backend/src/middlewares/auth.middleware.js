const jwt = require("jsonwebtoken");

// ──────────────────────────────────────────────
//  Verify JWT token
// ──────────────────────────────────────────────
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // { id, email, role }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

// ──────────────────────────────────────────────
//  Role-based access control
//  Usage: authorise("ADMIN", "TEACHER")
// ──────────────────────────────────────────────
const authorise = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied. Insufficient permissions." });
    }

    next();
  };
};

module.exports = { authenticate, authorise };
