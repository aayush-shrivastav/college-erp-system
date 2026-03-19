const express = require("express");
const router = express.Router();
const { authenticate, authorise } = require("../../middlewares/auth.middleware");
const { createStudent, createTeacher, unlockStudentProfile, assignSubject } = require("./admin.controller");

// ── All admin routes require: JWT + ADMIN role ──
router.use(authenticate, authorise("ADMIN"));

// POST /api/admin/create-student
router.post("/create-student", createStudent);

// POST /api/admin/create-teacher
router.post("/create-teacher", createTeacher);

// PUT /api/admin/unlock-student-profile/:studentId
router.put("/unlock-student-profile/:studentId", unlockStudentProfile);

// POST /api/admin/assign-subject
router.post("/assign-subject", assignSubject);

module.exports = router;
