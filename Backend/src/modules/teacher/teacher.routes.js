const express = require("express");
const router = express.Router();
const { authenticate, authorise } = require("../../middlewares/auth.middleware");
const {
  getProfile,
  updateProfile,
  createSession,
  markAttendance,
  updateSession,
} = require("./teacher.controller");

// ── All teacher routes require: JWT + TEACHER role ──
router.use(authenticate, authorise("TEACHER"));

// ── Profile ──
router.get("/profile", getProfile);
router.put("/profile", updateProfile);

// ── Attendance ──
router.post("/attendance/session", createSession);
router.post("/attendance/mark", markAttendance);
router.patch("/attendance/session/:id", updateSession);

module.exports = router;
