const prisma = require("../../config/db");

// ══════════════════════════════════════════════
//  ACCOUNTS: POST /api/accounts/fee-structure
//  Body: { batchYear, branch, totalFee }
// ══════════════════════════════════════════════
const createFeeStructure = async (req, res) => {
  try {
    const { batchYear, branch, totalFee } = req.body;

    if (!batchYear || !branch || totalFee == null) {
      return res.status(400).json({ message: "batchYear, branch, and totalFee are required." });
    }

    const year = parseInt(batchYear);
    const fee = parseFloat(totalFee);

    if (isNaN(year) || isNaN(fee)) {
      return res.status(400).json({ message: "Invalid batchYear or totalFee. Must be numeric." });
    }

    const structure = await prisma.feeStructure.upsert({
      where: { batchYear_branch: { batchYear: year, branch } },
      update: { totalFee: fee },
      create: {
        batchYear: year,
        branch,
        totalFee: fee,
      },
    });

    return res.status(201).json({ message: "Fee structure saved.", data: structure });
  } catch (error) {
    console.error("createFeeStructure error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ══════════════════════════════════════════════
//  ACCOUNTS: POST /api/accounts/student-fee
//  Body: { studentId, paymentType, hostelOpted, busOpted }
// ══════════════════════════════════════════════
const assignStudentFee = async (req, res) => {
  try {
    const { studentId, paymentType, hostelOpted, busOpted } = req.body;

    if (!studentId || !paymentType) {
      return res.status(400).json({ message: "studentId and paymentType are required." });
    }

    const validPaymentTypes = ["CASH", "SCHOLARSHIP", "DRCC"];
    if (!validPaymentTypes.includes(paymentType)) {
      return res.status(400).json({ message: `Invalid paymentType. Allowed: ${validPaymentTypes.join(", ")}` });
    }

    // --- find student to get batch/branch ---
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    // --- find applicable fee structure ---
    const structure = await prisma.feeStructure.findUnique({
      where: {
        batchYear_branch: {
          batchYear: student.batchYear,
          branch: student.branch,
        },
      },
    });

    if (!structure) {
      return res.status(404).json({ message: `No fee structure found for ${student.batchYear} ${student.branch}.` });
    }

    const fee = await prisma.studentFee.create({
      data: {
        studentId,
        totalFee: structure.totalFee,
        dueAmount: structure.totalFee,
        paymentType,
        hostelOpted: !!hostelOpted,
        busOpted: !!busOpted,
      },
    });

    return res.status(201).json({ message: "Fee assigned to student.", data: fee });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Fee already assigned to this student." });
    }
    console.error("assignStudentFee error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ══════════════════════════════════════════════
//  ACCOUNTS: POST /api/accounts/payment
//  Body: { studentId, amount, method, remark }
// ══════════════════════════════════════════════
const addPayment = async (req, res) => {
  try {
    const { studentId, amount, method, remark } = req.body;

    if (!studentId || !amount || !method) {
      return res.status(400).json({ message: "studentId, amount, and method are required." });
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than zero." });
    }

    const validMethods = ["CASH", "UPI", "BANK"];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ message: `Invalid method. Allowed: ${validMethods.join(", ")}` });
    }

    // --- transaction: add payment + update student fee ---
    const result = await prisma.$transaction(async (tx) => {
      const fee = await tx.studentFee.findUnique({ where: { studentId } });
      if (!fee) throw new Error("Fee record not found for student.");

      if (payAmount > fee.dueAmount) {
        throw new Error(`Payment exceeds due amount. Maximum allowed: ${fee.dueAmount}`);
      }

      const payment = await tx.payment.create({
        data: { studentId, amount: payAmount, method, remark },
      });

      const updatedFee = await tx.studentFee.update({
        where: { studentId },
        data: {
          paidAmount: { increment: payAmount },
          dueAmount: Math.max(0, fee.dueAmount - payAmount),
        },
      });

      return { payment, updatedFee };
    });

    return res.status(200).json({ message: "Payment recorded successfully.", data: result });
  } catch (error) {
    if (error.message.includes("not found")) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes("Maximum allowed")) {
      return res.status(400).json({ message: error.message });
    }
    console.error("addPayment error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ══════════════════════════════════════════════
//  ACCOUNTS: POST /api/accounts/fine
//  Body: { studentId, amount, reason }
// ══════════════════════════════════════════════
const addFine = async (req, res) => {
  try {
    const { studentId, amount, reason } = req.body;

    if (!studentId || !amount || !reason) {
      return res.status(400).json({ message: "studentId, amount, and reason are required." });
    }

    const fineAmount = parseFloat(amount);
    if (isNaN(fineAmount) || fineAmount <= 0) {
      return res.status(400).json({ message: "Fine amount must be greater than zero." });
    }

    // --- transaction: add fine + update student fee due ---
    const result = await prisma.$transaction(async (tx) => {
      const fee = await tx.studentFee.findUnique({ where: { studentId } });
      if (!fee) throw new Error("Fee record not found for student.");

      const fine = await tx.fine.create({
        data: { studentId, amount: fineAmount, reason },
      });

      const updatedFee = await tx.studentFee.update({
        where: { studentId },
        data: {
          dueAmount: { increment: fineAmount },
        },
      });

      return { fine, updatedFee };
    });

    return res.status(200).json({ message: "Fine added successfully.", data: result });
  } catch (error) {
    if (error.message.includes("not found")) {
      return res.status(404).json({ message: error.message });
    }
    console.error("addFine error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ══════════════════════════════════════════════
//  STUDENT: GET /api/student/fee
// ══════════════════════════════════════════════
const getStudentFeeStatus = async (req, res) => {
  try {
    const studentId = req.user.id;

    const fee = await prisma.studentFee.findUnique({
      where: { studentId },
      include: {
        student: { select: { name: true, rollNo: true, branch: true } },
      },
    });

    if (!fee) {
      return res.status(404).json({ message: "Fee status not found." });
    }

    // --- fetch history ---
    const [payments, fines] = await Promise.all([
      prisma.payment.findMany({ 
        where: { studentId }, 
        orderBy: { createdAt: "desc" } 
      }),
      prisma.fine.findMany({ 
        where: { studentId }, 
        orderBy: { createdAt: "desc" } 
      }),
    ]);

    return res.status(200).json({
      data: {
        feeStatus: fee,
        paymentHistory: payments,
        fineHistory: fines,
      },
    });
  } catch (error) {
    console.error("getStudentFeeStatus error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = {
  createFeeStructure,
  assignStudentFee,
  addPayment,
  addFine,
  getStudentFeeStatus,
};
