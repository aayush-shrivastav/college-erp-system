// src/modules/admin/exam.admin.routes.js
const router       = require('express').Router()
const asyncHandler = require('../../middlewares/asyncHandler')
const { verifyToken } = require('../../middlewares/verifyToken')
const { verifyRole }  = require('../../middlewares/checkPermission')
const db = require('../../config/db')

router.use(verifyToken, verifyRole('ADMIN'))

// ── MARKS FORMULA ─────────────────────────────────────────────────────────────
// 3 exams × 24 marks (SecA=8, SecB=8, SecC=8)
// Best 2 of 3 → (best1 + best2) / 2 = max 12
// + Assignment = max 10
// + Attendance = max 6
// Grand Total  = max 28

function calcExamAvg(exams) {
  if (!exams || exams.length === 0) return 0
  const totals = exams
    .map(e => Number(e.secA || 0) + Number(e.secB || 0) + Number(e.secC || 0))
    .sort((a, b) => b - a)
  if (totals.length === 1) return totals[0] / 2
  return (totals[0] + totals[1]) / 2
}

function calcAttMarks(pct) {
  if (pct >= 90) return 6
  if (pct >= 80) return 5
  if (pct >= 75) return 4
  if (pct >= 65) return 3
  return 0
}

// ── 1. EXAM DASHBOARD ─────────────────────────────────────────────────────────
// GET /api/v1/admin/exams/dashboard?academicYear=&semester=
router.get('/dashboard', asyncHandler(async (req, res) => {
  const { academicYear, semester } = req.query

  const where = {}
  if (academicYear) where.academicYear = academicYear
  if (semester)     where.semester     = parseInt(semester)

  const [exams, totalResults] = await Promise.all([
    db.exam.findMany({
      where,
      include: {
        subject: { select: { name: true, code: true } },
        _count: { select: { results: true } }
      },
      orderBy: [{ subject: { name: 'asc' } }, { examNo: 'asc' }]
    }),
    db.examResult.count()
  ])

  const locked   = exams.filter(e => e.isLocked).length
  const unlocked = exams.filter(e => !e.isLocked).length
  const pending  = exams.filter(e => e._count.results === 0).length

  res.json({
    success: true,
    data: {
      exams,
      stats: { total: exams.length, locked, unlocked, pending, totalResults }
    }
  })
}))

// ── 2. EXAM SCHEDULE — CREATE/EDIT ───────────────────────────────────────────
// POST /api/v1/admin/exams/schedule
router.post('/schedule', asyncHandler(async (req, res) => {
  const { subjectId, className, academicYear, semester, examNo, examDate, startTime, venue } = req.body

  const exam = await db.exam.upsert({
    where: {
      subjectId_className_academicYear_semester_examNo: {
        subjectId, className, academicYear,
        semester: parseInt(semester), examNo: parseInt(examNo)
      }
    },
    create: {
      subjectId, className, academicYear,
      semester: parseInt(semester), examNo: parseInt(examNo),
      examDate: examDate ? new Date(examDate) : null,
      maxMarks: 24
    },
    update: { examDate: examDate ? new Date(examDate) : null }
  })

  res.json({ success: true, data: exam })
}))

// PATCH /api/v1/admin/exams/:id/schedule
router.patch('/:id/schedule', asyncHandler(async (req, res) => {
  const { examDate } = req.body
  const exam = await db.exam.update({
    where: { id: req.params.id },
    data: { examDate: examDate ? new Date(examDate) : null }
  })
  res.json({ success: true, data: exam })
}))

// ── 3. LOCK / UNLOCK ──────────────────────────────────────────────────────────
// PATCH /api/v1/admin/exams/:id/lock
router.patch('/:id/lock', asyncHandler(async (req, res) => {
  const { lock = true } = req.body
  const exam = await db.exam.update({
    where: { id: req.params.id },
    data: { isLocked: !!lock }
  })
  res.json({ success: true, message: lock ? 'Exam locked' : 'Exam unlocked', data: exam })
}))

// ── 4. SUBJECT-WISE RESULT ────────────────────────────────────────────────────
// GET /api/v1/admin/exams/subject-result?subjectId=&academicYear=&semester=&className=
router.get('/subject-result', asyncHandler(async (req, res) => {
  const { subjectId, academicYear, semester, className } = req.query

  if (!subjectId) return res.status(400).json({ success: false, error: { code: 'SUBJECT_ID_REQUIRED' } })

  const examWhere = { subjectId }
  if (academicYear) examWhere.academicYear = academicYear
  if (semester)     examWhere.semester     = parseInt(semester)
  if (className)    examWhere.className    = className

  // Get all exams for this subject
  const exams = await db.exam.findMany({
    where: examWhere,
    include: {
      results: {
        include: { student: { select: { rollNo: true, name: true } } }
      }
    },
    orderBy: { examNo: 'asc' }
  })

  // Get enrolled students
  const enrollments = await db.studentSubjectEnrollment.findMany({
    where: {
      subjectId,
      ...(academicYear && { academicYear }),
      ...(semester && { semester: parseInt(semester) }),
      isActive: true
    },
    include: { student: { select: { id: true, rollNo: true, name: true } } }
  })

  // Build result per student
  const studentMap = {}
  for (const enr of enrollments) {
    studentMap[enr.studentId] = {
      studentId: enr.studentId,
      rollNo: enr.student.rollNo,
      name: enr.student.name,
      exams: {}
    }
  }

  // Fill exam results
  for (const exam of exams) {
    for (const result of exam.results) {
      if (studentMap[result.studentId]) {
        const total = Number(result.secA) + Number(result.secB) + Number(result.secC)
        studentMap[result.studentId].exams[exam.examNo] = {
          examId: exam.id, examNo: exam.examNo, examDate: exam.examDate,
          secA: Number(result.secA), secB: Number(result.secB), secC: Number(result.secC),
          total, isLocked: exam.isLocked
        }
      }
    }
  }

  // Calculate best 2 of 3 per student
  const result = Object.values(studentMap).map(s => {
    const examList = Object.values(s.exams)
    const examAvg  = calcExamAvg(examList.map(e => ({ secA: e.secA, secB: e.secB, secC: e.secC })))
    return { ...s, examList, examAvg: Math.round(examAvg * 100) / 100 }
  }).sort((a, b) => a.rollNo.localeCompare(b.rollNo))

  res.json({ success: true, data: result, meta: { total: result.length } })
}))

// ── 5. CONSOLIDATED RESULT SHEET ──────────────────────────────────────────────
// GET /api/v1/admin/exams/consolidated?academicYear=&semester=&className=
router.get('/consolidated', asyncHandler(async (req, res) => {
  const { academicYear, semester, className } = req.query

  if (!academicYear || !semester) {
    return res.status(400).json({ success: false, error: { code: 'ACADEMIC_YEAR_SEMESTER_REQUIRED' } })
  }

  // Get all enrolled students for this sem
  const enrollments = await db.studentSubjectEnrollment.findMany({
    where: {
      academicYear, semester: parseInt(semester), isActive: true
    },
    include: {
      student: { select: { id: true, rollNo: true, name: true } },
      subject: { select: { id: true, name: true, code: true } }
    }
  })

  // Get unique students and subjects
  const students = {}
  const subjects = {}
  for (const enr of enrollments) {
    students[enr.studentId] = { id: enr.studentId, rollNo: enr.student.rollNo, name: enr.student.name }
    subjects[enr.subjectId] = { id: enr.subjectId, name: enr.subject.name, code: enr.subject.code }
  }

  const studentIds = Object.keys(students)
  const subjectIds = Object.keys(subjects)

  // Get all exam results
  const allExams = await db.exam.findMany({
    where: { academicYear, semester: parseInt(semester), subjectId: { in: subjectIds } },
    include: { results: { where: { studentId: { in: studentIds } } } }
  })

  // Get all assignment marks
  const allAssignments = await db.assignmentSubmission.findMany({
    where: { academicYear, semester: parseInt(semester), studentId: { in: studentIds }, subjectId: { in: subjectIds } }
  })

  // Get all attendance summaries
  const allAttendance = await db.attendanceSummary.findMany({
    where: { academicYear, semester: parseInt(semester), studentId: { in: studentIds }, subjectId: { in: subjectIds } }
  })

  // Build lookup maps
  const assignMap = {}
  for (const a of allAssignments) {
    assignMap[`${a.studentId}_${a.subjectId}`] = Number(a.marksObtained)
  }
  const attMap = {}
  for (const a of allAttendance) {
    const pct = a.totalConducted > 0 ? (a.totalAttended / a.totalConducted) * 100 : 0
    attMap[`${a.studentId}_${a.subjectId}`] = { pct, marks: calcAttMarks(pct) }
  }
  const examMap = {}
  for (const exam of allExams) {
    for (const result of exam.results) {
      const key = `${result.studentId}_${exam.subjectId}`
      if (!examMap[key]) examMap[key] = []
      examMap[key].push({ secA: Number(result.secA), secB: Number(result.secB), secC: Number(result.secC) })
    }
  }

  // Build consolidated sheet
  const sheet = Object.values(students)
    .sort((a, b) => a.rollNo.localeCompare(b.rollNo))
    .map(student => {
      let grandTotal = 0
      const subjectMarks = subjectIds.map(subjectId => {
        const key    = `${student.id}_${subjectId}`
        const exams  = examMap[key] || []
        const examAvg   = Math.round(calcExamAvg(exams) * 100) / 100
        const assignMks = assignMap[key] || 0
        const attData   = attMap[key] || { pct: 0, marks: 0 }
        const total     = Math.round((examAvg + assignMks + attData.marks) * 100) / 100
        grandTotal += total
        return {
          subjectId, subjectCode: subjects[subjectId].code,
          subjectName: subjects[subjectId].name,
          examAvg, assignmentMarks: assignMks,
          attendancePct: Math.round(attData.pct * 100) / 100,
          attendanceMarks: attData.marks,
          total
        }
      })
      return {
        studentId: student.id, rollNo: student.rollNo, name: student.name,
        subjects: subjectMarks,
        grandTotal: Math.round(grandTotal * 100) / 100,
        maxPossible: subjectIds.length * 28
      }
    })

  res.json({
    success: true,
    data: {
      sheet,
      subjects: Object.values(subjects),
      meta: { academicYear, semester: parseInt(semester), studentCount: sheet.length, subjectCount: subjectIds.length }
    }
  })
}))

// ── 6. MARKS CARD — SINGLE STUDENT ───────────────────────────────────────────
// GET /api/v1/admin/exams/marks-card/:studentId?academicYear=&semester=
router.get('/marks-card/:studentId', asyncHandler(async (req, res) => {
  const { studentId } = req.params
  const { academicYear, semester } = req.query

  const student = await db.student.findUnique({
    where: { id: studentId },
    include: { user: { select: { isDeleted: true } } }
  })
  if (!student || student.user.isDeleted) return res.status(404).json({ success: false, error: { code: 'STUDENT_NOT_FOUND' } })

  const enrollments = await db.studentSubjectEnrollment.findMany({
    where: {
      studentId,
      ...(academicYear && { academicYear }),
      ...(semester && { semester: parseInt(semester) }),
      isActive: true
    },
    include: { subject: { select: { name: true, code: true, subjectType: true } } }
  })

  const currentYear = new Date().getFullYear()
  const ay = academicYear || (new Date().getMonth() >= 6
    ? `${currentYear}-${currentYear + 1}`
    : `${currentYear - 1}-${currentYear}`)
  const sem = semester ? parseInt(semester) : student.currentSem

  const marksCard = []
  for (const enr of enrollments) {
    // Exam results
    const exams = await db.exam.findMany({
      where: { subjectId: enr.subjectId, semester: enr.semester, academicYear: ay },
      include: { results: { where: { studentId } } },
      orderBy: { examNo: 'asc' }
    })
    const examData = exams.map(e => {
      const r = e.results[0]
      if (!r) return null
      return {
        examNo: e.examNo, examDate: e.examDate,
        secA: Number(r.secA), secB: Number(r.secB), secC: Number(r.secC),
        total: Number(r.secA) + Number(r.secB) + Number(r.secC),
        isLocked: e.isLocked
      }
    }).filter(Boolean)

    const examAvg = Math.round(calcExamAvg(exams.map(e => {
      const r = e.results[0]
      return r ? { secA: Number(r.secA), secB: Number(r.secB), secC: Number(r.secC) } : null
    }).filter(Boolean)) * 100) / 100

    // Best 2 info
    const totals = exams.map(e => {
      const r = e.results[0]
      return r ? { examNo: e.examNo, total: Number(r.secA)+Number(r.secB)+Number(r.secC) } : null
    }).filter(Boolean).sort((a, b) => b.total - a.total)
    const best2 = totals.slice(0, 2)

    // Assignment
    const asgn = await db.assignmentSubmission.findUnique({
      where: { studentId_subjectId_academicYear_semester: { studentId, subjectId: enr.subjectId, academicYear: ay, semester: enr.semester } }
    })
    const assignmentMarks = asgn ? Number(asgn.marksObtained) : 0

    // Attendance
    const attSum = await db.attendanceSummary.findUnique({
      where: { studentId_subjectId_academicYear_semester: { studentId, subjectId: enr.subjectId, academicYear: ay, semester: enr.semester } }
    })
    const attPct = attSum && attSum.totalConducted > 0
      ? (attSum.totalAttended / attSum.totalConducted) * 100
      : 0
    const attendanceMarks = calcAttMarks(attPct)
    const attendanceDisplay = attSum
      ? `${attSum.totalAttended}/${attSum.totalConducted}`
      : '0/0'

    const grandTotal = Math.round((examAvg + assignmentMarks + attendanceMarks) * 100) / 100

    marksCard.push({
      subjectId: enr.subjectId, subjectName: enr.subject.name,
      subjectCode: enr.subject.code, subjectType: enr.subject.subjectType,
      exams: examData,
      best2: best2.map(b => `Exam ${b.examNo}: ${b.total}/24`),
      examAvg,
      assignmentMarks, attendancePct: Math.round(attPct * 100) / 100,
      attendanceMarks, attendanceDisplay, grandTotal,
      maxMarks: 28
    })
  }

  const totalObtained = marksCard.reduce((s, m) => s + m.grandTotal, 0)
  const totalMax = marksCard.length * 28

  res.json({
    success: true,
    data: {
      student: { ...student, academicYear: ay, semester: sem },
      subjects: marksCard,
      summary: {
        totalObtained: Math.round(totalObtained * 100) / 100,
        totalMax,
        percentage: totalMax > 0 ? Math.round((totalObtained / totalMax) * 100 * 100) / 100 : 0
      }
    }
  })
}))

module.exports = router
