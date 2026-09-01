// src/modules/auth/auth.service.js
const bcrypt  = require('bcrypt');
const crypto  = require('crypto');
const jwt     = require('jsonwebtoken');
const db      = require('../../config/db');
const redis   = require('../../config/redis');
const { sendPasswordResetEmail } = require('../../config/mailer');

async function login(email, password) {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() }
  });
  if (!user) {
    throw { status: 401, code: 'INVALID_CREDENTIALS' };
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) throw { status: 401, code: 'INVALID_CREDENTIALS' };

  const payload      = { sub: user.id, role: user.role };
  const accessToken  = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ sub: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

  // Store hashed refresh token in Redis
  try {
    const rtHash = await bcrypt.hash(refreshToken, 6);
    await redis.set(`rt:${user.id}`, rtHash, 'EX', 604800);
  } catch (e) {
    // Redis unavailable — continue without refresh token storage
    console.warn('Redis unavailable, refresh token not stored');
  }

  await db.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } }); // Using lastLogin now that it is in the schema
  return { accessToken, refreshToken, role: user.role, userId: user.id };
}

async function refreshToken(incomingRT) {
  let decoded;
  try {
    decoded = jwt.verify(incomingRT, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw { status: 401, code: 'INVALID_REFRESH_TOKEN' };
  }
  try {
    const stored = await redis.get(`rt:${decoded.sub}`);
    if (!stored) throw new Error('not found');
    const valid = await bcrypt.compare(incomingRT, stored);
    if (!valid) throw new Error('invalid');
  } catch {
    throw { status: 401, code: 'SESSION_EXPIRED' };
  }
  const user  = await db.user.findUnique({ where: { id: decoded.sub } });
  const token = jwt.sign({ sub: user.id, role: user.role },
    process.env.JWT_SECRET, { expiresIn: '15m' });
  return { accessToken: token };
}

async function logout(userId) {
  try { await redis.del(`rt:${userId}`); } catch {}
}

async function changePassword(userId, oldPassword, newPassword) {
  const user = await db.user.findUnique({ where: { id: userId } });
  const match = await bcrypt.compare(oldPassword, user.password);
  if (!match) throw { status: 400, code: 'WRONG_OLD_PASSWORD' };
  const hash = await bcrypt.hash(newPassword, 12);
  await db.user.update({ where: { id: userId }, data: { password: hash } });
}

async function forgotPassword(email) {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  // Security: always respond with same message (don't reveal if email exists)
  if (!user || user.isDeleted) return;

  // Generate secure random token
  const rawToken  = crypto.randomBytes(32).toString('hex');
  const expiry    = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.user.update({
    where: { id: user.id },
    data:  { resetToken: rawToken, resetTokenExpiry: expiry }
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink   = `${frontendUrl}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(email, resetLink);
}

async function resetPassword(token, newPassword) {
  if (!token) throw { status: 400, code: 'INVALID_TOKEN' };

  const user = await db.user.findFirst({
    where: { resetToken: token }
  });

  if (!user) throw { status: 400, code: 'INVALID_TOKEN' };
  if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    throw { status: 400, code: 'TOKEN_EXPIRED' };
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await db.user.update({
    where: { id: user.id },
    data:  { password: hash, resetToken: null, resetTokenExpiry: null }
  });
}

module.exports = { login, refreshToken, logout, changePassword, forgotPassword, resetPassword };
