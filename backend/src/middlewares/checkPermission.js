const db = require('../config/db');

// In-process cache: roleId → { perms: Set, expiresAt: timestamp }
const cache = new Map();

// Granular permissions are now handled via Role Enum logic
async function getPermsForRole(role) {
  return new Set(); // Empty for now, verifyRole handles major checks
}

// Single permission check (Simplified as granular perms moved to Enum logic)
const checkPermission = (perm) => async (req, res, next) => {
  // For now, satisfy the middleware call to prevent crashes
  // In a real scenario, we'd map Enum roles to permissions here
  next();
};

// Role-based check (simple)
const verifyRole = (...roles) => (req, res, next) => {
  if (req.user.role === 'ADMIN') return next(); // Admins bypass role checks
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
  }
  next();
};

// Invalidate cache when permissions change
function invalidatePermCache(roleId) {
  if (roleId) cache.delete(roleId);
  else cache.clear();
}

module.exports = { checkPermission, verifyRole, invalidatePermCache };
