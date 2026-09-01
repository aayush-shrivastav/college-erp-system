// src/app.js
require('dotenv').config();
const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// ── Security & Parsing ────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging (development) ─────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Health Check ──────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const db = require('./config/db');
  let dbOk = false;
  try { await db.$queryRaw`SELECT 1`; dbOk = true; } catch {}
  res.status(dbOk ? 200 : 503).json({
    ok: dbOk, uptime: Math.round(process.uptime()), env: process.env.NODE_ENV
  });
});

// ── API Routes ────────────────────────────────────────────────────
app.use('/api/v1/auth',     require('./modules/auth/auth.routes'));
app.use('/api/v1/admin',    require('./modules/admin/admin.routes'));
app.use('/api/v1/admin/structure', require('./modules/admin/structure.routes'));
app.use('/api/v1/timetable',   require('./modules/admin/timetable.routes'));
app.use('/api/v1/admin/attendance', require('./modules/admin/attendance.admin.routes'));
app.use('/api/v1/admin/exams',      require('./modules/admin/exam.admin.routes'));
app.use('/api/v1/teacher',  require('./modules/teacher/teacher.routes'));
app.use('/api/v1/student',  require('./modules/student/student.routes'));
app.use('/api/v1/accounts', require('./modules/accounts/accounts.routes'));

// Shared notifications (any logged-in user)
const { verifyToken } = require('./middlewares/verifyToken');
const asyncHandler    = require('./middlewares/asyncHandler');
const db              = require('./config/db');

app.get('/api/v1/notifications', verifyToken, asyncHandler(async (req, res) => {
  const notifs = await db.notification.findMany({
    where: { userId: req.user.sub }, orderBy: { createdAt: 'desc' }, take: 50
  });
  res.json({ success: true, data: notifs });
}));
app.get('/api/v1/notifications/unread-count', verifyToken, asyncHandler(async (req, res) => {
  const count = await db.notification.count({ where: { userId: req.user.sub, isRead: false } });
  res.json({ success: true, data: { count } });
}));
app.patch('/api/v1/notifications/read', verifyToken, asyncHandler(async (req, res) => {
  const { ids } = req.body;
  await db.notification.updateMany({
    where: { id: { in: ids }, userId: req.user.sub },
    data: { isRead: true, readAt: new Date() }
  });
  res.json({ success: true });
}));
app.patch('/api/v1/notifications/read-all', verifyToken, asyncHandler(async (req, res) => {
  await db.notification.updateMany({
    where: { userId: req.user.sub, isRead: false },
    data: { isRead: true, readAt: new Date() }
  });
  res.json({ success: true });
}));

// ── 404 ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
});

// ── Global Error Handler (MUST be last) ───────────────────────────
app.use(errorHandler);

module.exports = app;
