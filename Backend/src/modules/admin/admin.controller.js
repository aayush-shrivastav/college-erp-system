const crypto = require("crypto");
const bcrypt = require("bcrypt");
const prisma = require("../../config/db");

// ──────────────────────────────────────────────
//  Helper: generate random password (12 chars)
// ──────────────────────────────────────────────
const generatePassword = () => crypto.randomBytes(6).toString("hex"); // 12 hex chars

// ══════════════════════════════════════════════
//  POST /api/admin/create-student
// ══════════════════════════════════════════════
const createStudent = async (req, res) => {
  try {
    const { email, name, rollNo, branch, batchYear, currentSem } = req.body;

    // --- validation ---
    if (!email || !name || !rollNo || !branch || !batchYear || !currentSem) {
      return res.status(400).json({
        message: "All fields are required: email, name, rollNo, branch, batchYear, currentSem.",
      });
    }

    if (isNaN(parseInt(batchYear)) || isNaN(parseInt(currentSem))) {
      return res.status(400).json({ message: "batchYear and currentSem must be valid numbers." });
    }

    // --- check duplicate email ---
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "A user with this email already exists." });
    }

    // --- check duplicate rollNo ---
    const existingRoll = await prisma.student.findUnique({ where: { rollNo } });
    if (existingRoll) {
      return res.status(409).json({ message: "A student with this roll number already exists." });
    }

    // --- generate + hash password ---
    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // --- atomic transaction: create User + Student ---
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: "STUDENT",
        },
      });

      const student = await tx.student.create({
        data: {
          id: user.id,
          name,
          rollNo,
          branch,
          batchYear: parseInt(batchYear),
          currentSem: parseInt(currentSem),
          profileLocked: false,
        },
      });

      return { user, student };
    });

    return res.status(201).json({
      message: "Student created successfully.",
      data: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        generatedPassword: plainPassword,
        student: {
          name: result.student.name,
          rollNo: result.student.rollNo,
          branch: result.student.branch,
          batchYear: result.student.batchYear,
          currentSem: result.student.currentSem,
          profileLocked: result.student.profileLocked,
        },
      },
    });
  } catch (error) {
    console.error("createStudent error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ══════════════════════════════════════════════
//  POST /api/admin/create-teacher
// ══════════════════════════════════════════════
const createTeacher = async (req, res) => {
  try {
    const { email, name, department } = req.body;

    // --- validation ---
    if (!email || !name || !department) {
      return res.status(400).json({
        message: "All fields are required: email, name, department.",
      });
    }

    // --- check duplicate email ---
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "A user with this email already exists." });
    }

    // --- generate + hash password ---
    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // --- atomic transaction: create User + Teacher ---
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: "TEACHER",
        },
      });

      const teacher = await tx.teacher.create({
        data: {
          id: user.id,
          name,
          department,
        },
      });

      return { user, teacher };
    });

    return res.status(201).json({
      message: "Teacher created successfully.",
      data: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        generatedPassword: plainPassword,
        teacher: {
          name: result.teacher.name,
          department: result.teacher.department,
        },
      },
    });
  } catch (error) {
    console.error("createTeacher error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ══════════════════════════════════════════════
//  PUT /api/admin/unlock-student-profile/:studentId
// ══════════════════════════════════════════════
const unlockStudentProfile = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    if (!student.profileLocked) {
      return res.status(400).json({ message: "Profile is already unlocked." });
    }

    const updated = await prisma.student.update({
      where: { id: studentId },
      data: { profileLocked: false },
      select: { id: true, name: true, rollNo: true, profileLocked: true },
    });

    return res.status(200).json({
      message: "Student profile unlocked successfully.",
      data: updated,
    });
  } catch (error) {
    console.error("unlockStudentProfile error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ══════════════════════════════════════════════
//  POST /api/admin/assign-subject
// ══════════════════════════════════════════════
const assignSubject = async (req, res) => {
  try {
    const { name, code, branch, semester, teacherId } = req.body;

    if (!name || !code || !branch || !semester || !teacherId) {
      return res.status(400).json({
        message: "All fields required: name, code, branch, semester, teacherId.",
      });
    }

    if (isNaN(parseInt(semester))) {
      return res.status(400).json({ message: "semester must be a valid number." });
    }

    // --- verify teacher exists ---
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found." });
    }

    // --- check duplicate code ---
    const existing = await prisma.subject.findUnique({ where: { code } });
    if (existing) {
      return res.status(409).json({ message: "A subject with this code already exists." });
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        code,
        branch,
        semester: parseInt(semester),
        teacherId,
      },
    });

    return res.status(201).json({ message: "Subject assigned successfully.", data: subject });
  } catch (error) {
    console.error("assignSubject error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = { createStudent, createTeacher, unlockStudentProfile, assignSubject };
