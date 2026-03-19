const express = require("express");
const router = express.Router();
const { authenticate, authorise } = require("../../middlewares/auth.middleware");
const {
  addExamMarks,
  addAssignmentMarks,
  addAttendanceMarks,
  getMarks,
} = require("./marks.controller");

// ── Teacher routes: add marks ──
router.post("/exam", authenticate, authorise("TEACHER"), addExamMarks);
router.post("/assignment", authenticate, authorise("TEACHER"), addAssignmentMarks);
router.post("/attendance", authenticate, authorise("TEACHER"), addAttendanceMarks);

// ── Student route: view marks ──
router.get("/:subjectId", authenticate, authorise("STUDENT"), getMarks);

module.exports = router;
