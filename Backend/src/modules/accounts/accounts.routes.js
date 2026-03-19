const express = require("express");
const router = express.Router();
const { authenticate, authorise } = require("../../middlewares/auth.middleware");
const {
  createFeeStructure,
  assignStudentFee,
  addPayment,
  addFine,
  getStudentFeeStatus,
} = require("./accounts.controller");

// ── Accounts routes (Management) ──
router.post("/fee-structure", authenticate, authorise("ACCOUNTS"), createFeeStructure);
router.post("/student-fee", authenticate, authorise("ACCOUNTS"), assignStudentFee);
router.post("/payment", authenticate, authorise("ACCOUNTS"), addPayment);
router.post("/fine", authenticate, authorise("ACCOUNTS"), addFine);

// ── Student route (Personal view) ──
// Note: As per request, this is for the Student system, but implemented here
router.get("/my-fee", authenticate, authorise("STUDENT"), getStudentFeeStatus);

module.exports = router;
