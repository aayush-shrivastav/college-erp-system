const prisma = require("../../config/db");
const { calculateFinalMarks } = require("../../utils/marks.utils");

// ══════════════════════════════════════════════
//  TEACHER: POST /api/marks/exam
//  Body: { studentId, subjectId, examNo, secA, secB, secC }
// ══════════════════════════════════════════════
const addExamMarks = async (req, res) => {
  try {
    const { studentId, subjectId, examNo, secA, secB, secC } = req.body;

    if (!studentId || !subjectId || !examNo || secA == null || secB == null || secC == null) {
      return res.status(400).json({ message: "All fields required: studentId, subjectId, examNo, secA, secB, secC." });
    }

    const exam = parseInt(examNo);
    if (![1, 2, 3].includes(exam)) {
      return res.status(400).json({ message: "examNo must be 1, 2, or 3." });
    }

    if (isNaN(parseFloat(secA)) || isNaN(parseFloat(secB)) || isNaN(parseFloat(secC))) {
      return res.status(400).json({ message: "secA, secB, secC must be valid numbers." });
    }

    const mark = await prisma.examMark.upsert({
      where: {
        studentId_subjectId_examNo: { studentId, subjectId, examNo: exam },
      },
      update: {
        secA: parseFloat(secA),
        secB: parseFloat(secB),
        secC: parseFloat(secC),
      },
      create: {
        studentId,
        subjectId,
        examNo: exam,
        secA: parseFloat(secA),
        secB: parseFloat(secB),
        secC: parseFloat(secC),
      },
    });

    return res.status(200).json({ message: "Exam marks saved.", data: mark });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Duplicate exam mark entry." });
    }
    console.error("addExamMarks error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ══════════════════════════════════════════════
//  TEACHER: POST /api/marks/assignment
//  Body: { studentId, subjectId, marks }
// ══════════════════════════════════════════════
const addAssignmentMarks = async (req, res) => {
  try {
    const { studentId, subjectId, marks } = req.body;

    if (!studentId || !subjectId || marks == null) {
      return res.status(400).json({ message: "All fields required: studentId, subjectId, marks." });
    }

    const m = parseFloat(marks);
    if (isNaN(m) || m < 0 || m > 10) {
      return res.status(400).json({ message: "marks must be a number between 0 and 10." });
    }

    const mark = await prisma.assignmentMark.upsert({
      where: {
        studentId_subjectId: { studentId, subjectId },
      },
      update: { marks: m },
      create: { studentId, subjectId, marks: m },
    });

    return res.status(200).json({ message: "Assignment marks saved.", data: mark });
  } catch (error) {
    console.error("addAssignmentMarks error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ══════════════════════════════════════════════
//  TEACHER: POST /api/marks/attendance
//  Body: { studentId, subjectId, marks }
// ══════════════════════════════════════════════
const addAttendanceMarks = async (req, res) => {
  try {
    const { studentId, subjectId, marks } = req.body;

    if (!studentId || !subjectId || marks == null) {
      return res.status(400).json({ message: "All fields required: studentId, subjectId, marks." });
    }

    const m = parseFloat(marks);
    if (isNaN(m) || m < 0 || m > 6) {
      return res.status(400).json({ message: "marks must be a number between 0 and 6." });
    }

    const mark = await prisma.attendanceMark.upsert({
      where: {
        studentId_subjectId: { studentId, subjectId },
      },
      update: { marks: m },
      create: { studentId, subjectId, marks: m },
    });

    return res.status(200).json({ message: "Attendance marks saved.", data: mark });
  } catch (error) {
    console.error("addAttendanceMarks error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ══════════════════════════════════════════════
//  STUDENT: GET /api/marks/:subjectId
//  Returns exam breakdown + calculated final marks
// ══════════════════════════════════════════════
const getMarks = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const studentId = req.user.id;

    // --- fetch all marks in parallel ---
    const [exams, assignment, attendance] = await Promise.all([
      prisma.examMark.findMany({
        where: { studentId, subjectId },
        orderBy: { examNo: "asc" },
      }),
      prisma.assignmentMark.findFirst({
        where: { studentId, subjectId },
      }),
      prisma.attendanceMark.findFirst({
        where: { studentId, subjectId },
      }),
    ]);

    // --- build exam breakdown ---
    const examBreakdown = exams.map((e) => ({
      examNo: e.examNo,
      secA: e.secA,
      secB: e.secB,
      secC: e.secC,
      total: parseFloat((e.secA + e.secB + e.secC).toFixed(2)),
    }));

    const examTotals = examBreakdown.map((e) => e.total);
    const assignmentMarks = assignment ? assignment.marks : 0;
    const attendanceMarks = attendance ? attendance.marks : 0;

    // --- calculate only if all 3 exams exist ---
    let finalCalculation = null;
    if (examTotals.length === 3) {
      finalCalculation = calculateFinalMarks(examTotals, assignmentMarks, attendanceMarks);
    }

    return res.status(200).json({
      data: {
        subjectId,
        examBreakdown,
        assignmentMarks,
        attendanceMarks,
        finalCalculation,
      },
    });
  } catch (error) {
    console.error("getMarks error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = { addExamMarks, addAssignmentMarks, addAttendanceMarks, getMarks };
