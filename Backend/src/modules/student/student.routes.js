const express = require("express");
const router = express.Router();
const { authenticate, authorise } = require("../../middlewares/auth.middleware");
const { getProfile, updateProfile } = require("./student.controller");

// ── All student routes require: JWT + STUDENT role ──
router.use(authenticate, authorise("STUDENT"));

// GET /api/student/profile
router.get("/profile", getProfile);

// PUT /api/student/profile
router.put("/profile", updateProfile);

module.exports = router;
