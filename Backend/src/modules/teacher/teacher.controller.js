const prisma = require("../../config/db");

// ══════════════════════════════════════════════
//  GET /api/teacher/profile
// ══════════════════════════════════════════════
const getProfile = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id: req.user.id },
      include: {
        user: { select: { id: true, email: true, role: true, createdAt: true } },
        subjects: true,
      },
    });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found." });
    }

    return res.status(200).json({ data: teacher });
  } catch (error) {
    console.error("getProfile error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ══════════════════════════════════════════════
//  PUT /api/teacher/profile
// ══════════════════════════════════════════════
const updateProfile = async (req, res) => {
  try {
    const { phone, qualification, designation } = req.body;

    if (!phone && !qualification && !designation) {
      return res.status(400).json({ message: "Provide at least one field to update: phone, qualification, designation." });
    }

    const data = {};
    if (phone) data.phone = phone;
    if (qualification) data.qualification = qualification;
    if (designation) data.designation = designation;

    const updated = await prisma.teacher.update({
      where: { id: req.user.id },
      data,
      include: {
        user: { select: { id: true, email: true, role: true } },
      },
    });

    return res.status(200).json({ message: "Profile updated successfully.", data: updated });
  } catch (error) {
    console.error("updateProfile error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ══════════════════════════════════════════════
//  POST /api/teacher/attendance/session
//  Body: { subjectId, date }
// ══════════════════════════════════════════════
const createSession = async (req, res) => {
  try {
    const { subjectId, date } = req.body;

    if (!subjectId || !date) {
      return res.status(400).json({ message: "subjectId and date are required." });
    }

    // --- validate date format ---
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format." });
    }

    // --- verify subject belongs to this teacher ---
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      return res.status(404).json({ message: "Subject not found." });
    }
    if (subject.teacherId !== req.user.id) {
      return res.status(403).json({ message: "You are not assigned to this subject." });
    }

    const session = await prisma.attendanceSession.create({
      data: {
        teacherId: req.user.id,
        subjectId,
        date: parsedDate,
      },
      include: { subject: true },
    });

    return res.status(201).json({ message: "Attendance session created.", data: session });
  } catch (error) {
    console.error("createSession error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ══════════════════════════════════════════════
//  POST /api/teacher/attendance/mark
//  Body: { sessionId, records: [{ studentId, status }] }
// ══════════════════════════════════════════════
const markAttendance = async (req, res) => {
  try {
    const { sessionId, records } = req.body;

    if (!sessionId || !records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "sessionId and records[] are required." });
    }

    // --- verify session belongs to this teacher ---
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { subject: true },
    });
    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }
    if (session.teacherId !== req.user.id) {
      return res.status(403).json({ message: "You do not own this session." });
    }
    if (session.status !== "ACTIVE") {
      return res.status(400).json({ message: `Session is already ${session.status}. Cannot mark attendance.` });
    }

    // --- validate statuses ---
    const validStatuses = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];
    for (const r of records) {
      if (!r.studentId || !r.status) {
        return res.status(400).json({ message: "Each record must have studentId and status." });
      }
      if (!validStatuses.includes(r.status)) {
        return res.status(400).json({ message: `Invalid status: ${r.status}. Allowed: ${validStatuses.join(", ")}` });
      }
    }

    // --- validate all studentIds exist and belong to subject's branch ---
    const studentIds = records.map((r) => r.studentId);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, branch: true },
    });

    if (students.length !== studentIds.length) {
      const foundIds = students.map((s) => s.id);
      const missing = studentIds.filter((id) => !foundIds.includes(id));
      return res.status(400).json({ message: `Student(s) not found: ${missing.join(", ")}` });
    }

    const wrongBranch = students.filter((s) => s.branch !== session.subject.branch);
    if (wrongBranch.length > 0) {
      return res.status(400).json({
        message: `Student(s) do not belong to ${session.subject.branch}: ${wrongBranch.map((s) => s.id).join(", ")}`,
      });
    }

    // --- transaction: insert records + mark session COMPLETED ---
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.attendanceRecord.createMany({
        data: records.map((r) => ({
          sessionId,
          studentId: r.studentId,
          status: r.status,
        })),
      });

      const updatedSession = await tx.attendanceSession.update({
        where: { id: sessionId },
        data: { status: "COMPLETED" },
      });

      return { recordsCreated: created.count, session: updatedSession };
    });

    return res.status(200).json({
      message: "Attendance marked successfully.",
      data: result,
    });
  } catch (error) {
    // handle unique constraint violation (duplicate student in session)
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Duplicate attendance record. A student already has attendance in this session." });
    }
    // handle foreign key violation
    if (error.code === "P2003") {
      return res.status(400).json({ message: "Invalid reference: one or more IDs do not exist." });
    }
    console.error("markAttendance error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ══════════════════════════════════════════════
//  PATCH /api/teacher/attendance/session/:id
//  Body: { status: "SKIPPED", skipReason: "Holiday" }
// ══════════════════════════════════════════════
const updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, skipReason } = req.body;

    if (!status) {
      return res.status(400).json({ message: "status is required." });
    }

    // --- only SKIPPED is allowed via this endpoint ---
    if (status !== "SKIPPED") {
      return res.status(400).json({ message: "Only SKIPPED status is allowed. COMPLETED is set automatically by marking attendance." });
    }

    // --- verify session belongs to this teacher ---
    const session = await prisma.attendanceSession.findUnique({ where: { id } });
    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }
    if (session.teacherId !== req.user.id) {
      return res.status(403).json({ message: "You do not own this session." });
    }

    // --- block updates on non-ACTIVE sessions ---
    if (session.status !== "ACTIVE") {
      return res.status(400).json({ message: `Cannot update session. Current status is ${session.status}.` });
    }

    // --- require reason ---
    if (!skipReason) {
      return res.status(400).json({ message: "skipReason is required when skipping a session." });
    }

    const updated = await prisma.attendanceSession.update({
      where: { id },
      data: { status: "SKIPPED", skipReason },
      include: { subject: true },
    });

    return res.status(200).json({ message: "Session skipped successfully.", data: updated });
  } catch (error) {
    console.error("updateSession error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = { getProfile, updateProfile, createSession, markAttendance, updateSession };
