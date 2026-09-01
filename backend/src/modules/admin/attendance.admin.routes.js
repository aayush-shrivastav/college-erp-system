// src/modules/admin/attendance.admin.routes.js
const router       = require('express').Router()
const asyncHandler = require('../../middlewares/asyncHandler')
const { verifyToken } = require('../../middlewares/verifyToken')
const { verifyRole }  = require('../../middlewares/checkPermission')
const db = require('../../config/db')

router.use(verifyToken, verifyRole('ADMIN'))

// ── 1. OVERVIEW DASHBOARD ─────────────────────────────────────────────────────
// GET /api/v1/admin/attendance/overview
router.get('/overview', asyncHandler(async (req, res) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

  const [todaySessions, totalStudents, defaulters, recentSessions] = await Promise.all([
    // Today's sessions
    db.attendanceSession.findMany({
      where: { sessionDate: { gte: today, lt: tomorrow } },
      include: {
        subject: { select: { name: true, code: true } },
        teacher: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    // Total active students
    db.student.count({ where: { user: { isDeleted: false } } }),
    // Defaulters (below 75%)
    db.attendanceSummary.findMany({
      where: {
        totalConducted: { gt: 0 },
      },
      include: {
        student: { select: { rollNo: true, name: true } },
        subject: { select: { name: true, code: true } }
      }
    }),
    // Last 7 days sessions count
    db.attendanceSession.groupBy({
      by: ['sessionDate'],
      _count: { id: true },
      where: {
        sessionDate: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        },
        status: 'CONDUCTED'
      },
      orderBy: { sessionDate: 'asc' }
    })
  ])

  const defaulterList = defaulters.filter(d =>
    d.totalConducted > 0 &&
    (d.totalAttended / d.totalConducted) * 100 < 75
  )

  // Average attendance across all summaries
  const allSummaries = defaulters // reusing the query
  const avgAttendance = allSummaries.length > 0
    ? allSummaries.reduce((sum, s) =>
        sum + (s.totalConducted > 0 ? (s.totalAttended / s.totalConducted) * 100 : 0), 0
      ) / allSummaries.length
    : 0

  res.json({
    success: true,
    data: {
      todaySessions,
      todaySessionCount: todaySessions.length,
      totalStudents,
      defaulterCount: defaulterList.length,
      avgAttendance: Math.round(avgAttendance * 100) / 100,
      last7DaysSessions: recentSessions
    }
  })
}))

// ── 2. CLASS-WISE REPORT ──────────────────────────────────────────────────────
// GET /api/v1/admin/attendance/class-wise?className=CS-3A&academicYear=2024-25&semester=3
router.get('/class-wise', asyncHandler(async (req, res) => {
  const { className, academicYear, semester, fromDate, toDate } = req.query

  const sessionWhere = { status: 'CONDUCTED' }
  if (className)    sessionWhere.className   = className
  if (fromDate)     sessionWhere.sessionDate = { ...(sessionWhere.sessionDate||{}), gte: new Date(fromDate) }
  if (toDate)       sessionWhere.sessionDate = { ...(sessionWhere.sessionDate||{}), lte: new Date(toDate) }

  const summaryWhere = {}
  if (academicYear) summaryWhere.academicYear = academicYear
  if (semester)     summaryWhere.semester     = parseInt(semester)

  // Get all summaries for students in this class
  const enrollments = await db.studentSubjectEnrollment.findMany({
    where: {
      ...(academicYear && { academicYear }),
      ...(semester && { semester: parseInt(semester) }),
      isActive: true
    },
    select: { studentId: true, subjectId: true },
    distinct: ['studentId']
  })

  const studentIds = [...new Set(enrollments.map(e => e.studentId))]

  const summaries = await db.attendanceSummary.findMany({
    where: {
      studentId: { in: studentIds },
      ...summaryWhere
    },
    include: {
      student: { select: { rollNo: true, name: true } },
      subject: { select: { name: true, code: true } }
    },
    orderBy: [{ student: { rollNo: 'asc' } }, { subject: { name: 'asc' } }]
  })

  // Group by subject
  const bySubject = {}
  for (const s of summaries) {
    const key = s.subjectId
    if (!bySubject[key]) {
      bySubject[key] = {
        subjectId: s.subjectId,
        subjectName: s.subject.name,
        subjectCode: s.subject.code,
        students: []
      }
    }
    const pct = s.totalConducted > 0
      ? Math.round((s.totalAttended / s.totalConducted) * 100 * 100) / 100
      : 0
    bySubject[key].students.push({
      studentId: s.studentId,
      rollNo: s.student.rollNo,
      name: s.student.name,
      attended: s.totalAttended,
      conducted: s.totalConducted,
      absent: s.totalAbsent,
      pct,
      display: `${s.totalAttended}/${s.totalConducted}`,
      isDefaulter: pct < 75
    })
  }

  res.json({ success: true, data: Object.values(bySubject) })
}))

// ── 3. SUBJECT-WISE REPORT ────────────────────────────────────────────────────
// GET /api/v1/admin/attendance/subject-wise?subjectId=xxx&academicYear=2024-25&semester=3
router.get('/subject-wise', asyncHandler(async (req, res) => {
  const { subjectId, academicYear, semester } = req.query

  if (!subjectId) return res.status(400).json({ success: false, error: { code: 'SUBJECT_ID_REQUIRED' } })

  const where = { subjectId }
  if (academicYear) where.academicYear = academicYear
  if (semester)     where.semester     = parseInt(semester)

  const summaries = await db.attendanceSummary.findMany({
    where,
    include: { student: { select: { rollNo: true, name: true } } },
    orderBy: { student: { rollNo: 'asc' } }
  })

  const result = summaries.map(s => {
    const pct = s.totalConducted > 0
      ? Math.round((s.totalAttended / s.totalConducted) * 100 * 100) / 100
      : 0
    return {
      studentId: s.studentId,
      rollNo: s.student.rollNo,
      name: s.student.name,
      attended: s.totalAttended,
      conducted: s.totalConducted,
      absent: s.totalAbsent,
      pct,
      display: `${s.totalAttended}/${s.totalConducted}`,
      isDefaulter: pct < 75
    }
  })

  const avg = result.length > 0
    ? result.reduce((s, r) => s + r.pct, 0) / result.length
    : 0

  res.json({
    success: true,
    data: result,
    meta: {
      total: result.length,
      defaulters: result.filter(r => r.isDefaulter).length,
      avgPct: Math.round(avg * 100) / 100
    }
  })
}))

// ── 4. STUDENT-WISE REPORT ────────────────────────────────────────────────────
// GET /api/v1/admin/attendance/student-wise?studentId=xxx
router.get('/student-wise', asyncHandler(async (req, res) => {
  const { studentId, academicYear, semester } = req.query

  if (!studentId) return res.status(400).json({ success: false, error: { code: 'STUDENT_ID_REQUIRED' } })

  const where = { studentId }
  if (academicYear) where.academicYear = academicYear
  if (semester)     where.semester     = parseInt(semester)

  const [student, summaries] = await Promise.all([
    db.student.findUnique({
      where: { id: studentId },
      select: { rollNo: true, name: true, currentSem: true, batchYear: true }
    }),
    db.attendanceSummary.findMany({
      where,
      include: { subject: { select: { name: true, code: true } } },
      orderBy: { subject: { name: 'asc' } }
    })
  ])

  if (!student) return res.status(404).json({ success: false, error: { code: 'STUDENT_NOT_FOUND' } })

  const result = summaries.map(s => {
    const pct = s.totalConducted > 0
      ? Math.round((s.totalAttended / s.totalConducted) * 100 * 100) / 100
      : 0
    return {
      subjectId: s.subjectId,
      subjectName: s.subject.name,
      subjectCode: s.subject.code,
      attended: s.totalAttended,
      conducted: s.totalConducted,
      absent: s.totalAbsent,
      pct,
      display: `${s.totalAttended}/${s.totalConducted}`,
      isDefaulter: pct < 75
    }
  })

  const overall = result.length > 0
    ? {
        totalAttended: result.reduce((s, r) => s + r.attended, 0),
        totalConducted: result.reduce((s, r) => s + r.conducted, 0),
        avgPct: Math.round(result.reduce((s, r) => s + r.pct, 0) / result.length * 100) / 100
      }
    : { totalAttended: 0, totalConducted: 0, avgPct: 0 }

  res.json({ success: true, data: { student, subjects: result, overall } })
}))

// ── 5. DEFAULTER LIST ─────────────────────────────────────────────────────────
// GET /api/v1/admin/attendance/defaulters?threshold=75&academicYear=2024-25&semester=3
router.get('/defaulters', asyncHandler(async (req, res) => {
  const { threshold = 75, academicYear, semester } = req.query

  const where = { totalConducted: { gt: 0 } }
  if (academicYear) where.academicYear = academicYear
  if (semester)     where.semester     = parseInt(semester)

  const summaries = await db.attendanceSummary.findMany({
    where,
    include: {
      student: { select: { rollNo: true, name: true, mentor: { select: { name: true } } } },
      subject: { select: { name: true, code: true } }
    },
    orderBy: { student: { rollNo: 'asc' } }
  })

  // Filter defaulters
  const defaulters = summaries
    .map(s => ({
      studentId: s.studentId,
      rollNo: s.student.rollNo,
      name: s.student.name,
      mentor: s.student.mentor?.name || '—',
      subjectCode: s.subject.code,
      subjectName: s.subject.name,
      attended: s.totalAttended,
      conducted: s.totalConducted,
      absent: s.totalAbsent,
      pct: s.totalConducted > 0
        ? Math.round((s.totalAttended / s.totalConducted) * 100 * 100) / 100
        : 0,
      display: `${s.totalAttended}/${s.totalConducted}`
    }))
    .filter(d => d.pct < parseFloat(threshold))
    .sort((a, b) => a.pct - b.pct)

  // Group by student
  const byStudent = {}
  for (const d of defaulters) {
    if (!byStudent[d.studentId]) {
      byStudent[d.studentId] = {
        studentId: d.studentId, rollNo: d.rollNo,
        name: d.name, mentor: d.mentor, defaultSubjects: []
      }
    }
    byStudent[d.studentId].defaultSubjects.push({
      subjectCode: d.subjectCode, subjectName: d.subjectName,
      attended: d.attended, conducted: d.conducted,
      pct: d.pct, display: d.display
    })
  }

  res.json({
    success: true,
    data: Object.values(byStudent),
    meta: { total: Object.keys(byStudent).length, threshold: parseFloat(threshold) }
  })
}))

// ── 6. ADMIN OVERRIDE ─────────────────────────────────────────────────────────
// PATCH /api/v1/admin/attendance/override
router.patch('/override', asyncHandler(async (req, res) => {
  const { sessionId, studentId, status, reason } = req.body

  if (!['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].includes(status)) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS' } })
  }

  // Update record
  const record = await db.attendanceRecord.update({
    where: { sessionId_studentId: { sessionId, studentId } },
    data: { status, markedBy: req.user.sub, markedAt: new Date() }
  })

  // Recalculate summary
  const session = await db.attendanceSession.findUnique({ where: { id: sessionId } })
  const currentYear = new Date().getFullYear()
  const academicYear = new Date().getMonth() >= 6
    ? `${currentYear}-${currentYear + 1}`
    : `${currentYear - 1}-${currentYear}`

  const conducted = await db.attendanceRecord.count({
    where: { session: { subjectId: session.subjectId, status: 'CONDUCTED' }, studentId }
  })
  const attended = await db.attendanceRecord.count({
    where: { studentId, status: { in: ['PRESENT', 'LATE', 'EXCUSED'] }, session: { subjectId: session.subjectId, status: 'CONDUCTED' } }
  })
  const absent = conducted - attended

  await db.attendanceSummary.updateMany({
    where: { studentId, subjectId: session.subjectId },
    data: { totalConducted: conducted, totalAttended: attended, totalAbsent: absent, lastUpdated: new Date() }
  })

  // Audit log
  await db.auditLog.create({
    data: {
      userId: req.user.sub, action: 'ATTENDANCE_OVERRIDE',
      entityType: 'attendance_records', entityId: record.id,
      newValue: { status, reason, sessionId, studentId }
    }
  })

  res.json({ success: true, message: 'Attendance updated', data: record })
}))

// ── 7. DATE RANGE SESSIONS ────────────────────────────────────────────────────
// GET /api/v1/admin/attendance/sessions?fromDate=&toDate=&subjectId=&className=
router.get('/sessions', asyncHandler(async (req, res) => {
  const { fromDate, toDate, subjectId, className, teacherId } = req.query

  const where = {}
  if (fromDate)   where.sessionDate = { ...(where.sessionDate||{}), gte: new Date(fromDate) }
  if (toDate)     where.sessionDate = { ...(where.sessionDate||{}), lte: new Date(toDate) }
  if (subjectId)  where.subjectId   = subjectId
  if (className)  where.className   = className
  if (teacherId)  where.teacherId   = teacherId

  const sessions = await db.attendanceSession.findMany({
    where,
    include: {
      subject: { select: { name: true, code: true } },
      teacher: { select: { name: true, employeeId: true } },
      _count: { select: { records: true } }
    },
    orderBy: { sessionDate: 'desc' }
  })

  res.json({ success: true, data: sessions, meta: { total: sessions.length } })
}))

module.exports = router
