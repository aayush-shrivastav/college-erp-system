// src/modules/auth/auth.routes.js
const router      = require('express').Router();
const asyncHandler = require('../../middlewares/asyncHandler');
const { verifyToken } = require('../../middlewares/verifyToken');
const { login, refreshToken, logout, changePassword, forgotPassword, resetPassword } = require('./auth.service');

// POST /api/v1/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS' } });
  }
  const data = await login(email, password);
  res.json({ success: true, message: 'Login successful', data });
}));

// POST /api/v1/auth/refresh
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken: rt } = req.body;
  if (!rt) return res.status(400).json({ success: false, error: { code: 'MISSING_REFRESH_TOKEN' } });
  const data = await refreshToken(rt);
  res.json({ success: true, data });
}));

// POST /api/v1/auth/logout
router.post('/logout', verifyToken, asyncHandler(async (req, res) => {
  await logout(req.user.sub);
  res.json({ success: true, message: 'Logged out' });
}));

// POST /api/v1/auth/change-password
router.post('/change-password', verifyToken, asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(422).json({ success: false, error: { code: 'PASSWORD_TOO_SHORT' } });
  }
  await changePassword(req.user.sub, oldPassword, newPassword);
  res.json({ success: true, message: 'Password changed successfully' });
}));

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: { code: 'EMAIL_REQUIRED' } });
  await forgotPassword(email); // always silent (security)
  res.json({ success: true, message: 'If this email is registered, a reset link has been sent.' });
}));

// POST /api/v1/auth/reset-password
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(422).json({ success: false, error: { code: 'PASSWORD_TOO_SHORT' } });
  }
  await resetPassword(token, newPassword);
  res.json({ success: true, message: 'Password reset successfully. You can now login.' });
}));

module.exports = router;
