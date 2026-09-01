// src/modules/admin/structure.routes.js
// Real-world: Course → Batch → Section → Students → Teacher Assignment → Promotion
const router       = require('express').Router()
const asyncHandler = require('../../middlewares/asyncHandler')
const { verifyToken } = require('../../middlewares/verifyToken')
const { verifyRole }  = require('../../middlewares/checkPermission')
const db = require('../../config/db')

router.use(verifyToken, verifyRole('ADMIN'))
const subjectController = require('./subject.controller')

// ══════════════════════════════════════════════════
// 1. COURSES
// ══════════════════════════════════════════════════
router.get('/courses', asyncHandler(async (req, res) => {
  const courses = await db.course.findMany({
    where: { isActive: true },
    include: { _count: { select: { batches: true } } },
    orderBy: { name: 'asc' }
  })
  res.json({ success: true, data: courses })
}))

router.post('/courses', asyncHandler(async (req, res) => {
  const { name, code, duration = 4, totalSems = 8, description } = req.body
  if (!name || !code) throw { status: 400, code: 'MISSING_FIELDS' }
  const course = await db.course.create({
    data: { name, code: code.toUpperCase(), duration: parseInt(duration), totalSems: parseInt(totalSems), description }
  })
  res.status(201).json({ success: true, data: course })
}))

router.patch('/courses/:id', asyncHandler(async (req, res) => {
  const course = await db.course.update({ where: { id: req.params.id }, data: req.body })
  res.json({ success: true, data: course })
}))

// ══════════════════════════════════════════════════
// 2. BATCHES
// ══════════════════════════════════════════════════
router.get('/batches', asyncHandler(async (req, res) => {
  const { courseId } = req.query
  const batches = await db.batch.findMany({
    where: { isActive: true, ...(courseId && { courseId }) },
    include: {
      course: { select: { name: true, code: true, totalSems: true } },
      syllabusVersion: { select: { versionName: true } },
      _count: { select: { sections: true, students: true } }
    },
    orderBy: [{ batchYear: 'desc' }]
  })
  res.json({ success: true, data: batches })
}))

router.get('/batches/:id', asyncHandler(async (req, res) => {
  const batch = await db.batch.findUnique({
    where: { id: req.params.id },
    include: {
      course: true,
      syllabusVersion: true,
      sections: {
        where: { isActive: true },
        include: { _count: { select: { students: true } } }
      },
      promotions: { orderBy: { promotedAt: 'desc' }, take: 5 }
    }
  })
  if (!batch) throw { status: 404, code: 'BATCH_NOT_FOUND' }
  res.json({ success: true, data: batch })
}))

router.post('/batches', asyncHandler(async (req, res) => {
  const { courseId, batchYear, syllabusVersionId, totalStudents, currentAcadYear } = req.body
  if (!courseId || !batchYear) throw { status: 400, code: 'MISSING_FIELDS' }
  const batch = await db.batch.create({
    data: {
      courseId, batchYear: parseInt(batchYear),
      syllabusVersionId: syllabusVersionId || null,
      totalStudents: parseInt(totalStudents) || 0,
      currentAcadYear: currentAcadYear || `${batchYear}-${parseInt(batchYear)+1}`,
      currentSemester: 1
    },
    include: { course: { select: { name: true, code: true } } }
  })
  res.status(201).json({ success: true, data: batch })
}))

router.patch('/batches/:id', asyncHandler(async (req, res) => {
  const batch = await db.batch.update({ where: { id: req.params.id }, data: req.body })
  res.json({ success: true, data: batch })
}))

// ── PROMOTE BATCH (most important real-world action) ──────────────────────────
// Moves entire batch from Semester N to Semester N+1
// Happens every 6 months in real college
router.post('/batches/:id/promote', asyncHandler(async (req, res) => {
  const { toAcadYear } = req.body
  const batch = await db.batch.findUnique({
    where: { id: req.params.id },
    include: { course: true, _count: { select: { students: true } } }
  })
  if (!batch) throw { status: 404, code: 'BATCH_NOT_FOUND' }

  const maxSem = batch.course.totalSems
  if (batch.currentSemester >= maxSem) {
    throw { status: 400, code: 'ALREADY_FINAL_SEM',
            message: `Batch is already in final semester (${maxSem})` }
  }

  const fromSemester = batch.currentSemester
  const toSemester   = fromSemester + 1
  const fromAcadYear = batch.currentAcadYear
  const nextAcadYear = toAcadYear || (
    // Auto calculate: Odd sems (1,3,5,7) = same year, Even (2,4,6,8) = next
    toSemester % 2 === 0 ? fromAcadYear : (() => {
      const [y1] = fromAcadYear.split('-').map(Number)
      return `${y1+1}-${y1+2}`
    })()
  )

  await db.$transaction(async (tx) => {
    // 1. Update batch semester
    await tx.batch.update({
      where: { id: req.params.id },
      data: { currentSemester: toSemester, currentAcadYear: nextAcadYear }
    })

    // 2. Update all students in this batch
    await tx.student.updateMany({
      where: { batchId: req.params.id, isDeleted: false },
      data: { currentSem: toSemester }
    })

    // 3. Log the promotion
    await tx.batchPromotion.create({
      data: {
        batchId: req.params.id,
        fromSemester, toSemester,
        fromAcadYear, toAcadYear: nextAcadYear,
        promotedBy: req.user.sub,
        studentsCount: batch._count.students
      }
    })

    // 4. Notify all students
    const students = await tx.student.findMany({
      where: { batchId: req.params.id, isDeleted: false },
      select: { id: true }
    })
    await tx.notification.createMany({
      data: students.map(s => ({
        userId: s.id,
        title: `Promoted to Semester ${toSemester}`,
        message: `Congratulations! You have been promoted to Semester ${toSemester} (${nextAcadYear}).`,
        type: 'PROMOTION',
        actionUrl: '/student/registration'
      }))
    })
  })

  res.json({
    success: true,
    message: `Batch promoted from Semester ${fromSemester} to ${toSemester}`,
    data: { fromSemester, toSemester, fromAcadYear, toAcadYear: nextAcadYear, studentsPromoted: batch._count.students }
  })
}))

// ══════════════════════════════════════════════════
// 3. SECTIONS (Permanent divisions of a batch)
// ══════════════════════════════════════════════════
router.get('/batches/:batchId/sections', asyncHandler(async (req, res) => {
  const sections = await db.section.findMany({
    where: { batchId: req.params.batchId, isActive: true },
    include: {
      _count: { select: { students: true, subjectTeachers: true } },
      batch: { include: { course: { select: { code: true } } } }
    },
    orderBy: { name: 'asc' }
  })
  res.json({ success: true, data: sections })
}))

router.get('/sections/:id', asyncHandler(async (req, res) => {
  const section = await db.section.findUnique({
    where: { id: req.params.id },
    include: {
      batch: { include: { course: true, syllabusVersion: true } },
      students: {
        where: { isDeleted: false },
        select: { id: true, rollNo: true, name: true, currentSem: true, profileLocked: true,
                  feeAccount: { select: { totalPayable: true, totalPaid: true } } },
        orderBy: { rollNo: 'asc' }
      },
      subjectTeachers: {
        where: { isActive: true },
        include: {
          subject: { select: { name: true, code: true, type: true, semester: true } },
          teacher: { select: { name: true, employeeId: true } },
          labGroup: { select: { name: true } }
        },
        orderBy: [{ semester: 'asc' }, { subject: { name: 'asc' } }]
      },
      labGroups: {
        where: { isActive: true },
        include: {
          subject: { select: { name: true, code: true } },
          teacherAssignment: { include: { teacher: { select: { name: true } } } }
        }
      }
    }
  })
  if (!section) throw { status: 404, code: 'SECTION_NOT_FOUND' }
  res.json({ success: true, data: section })
}))

// Create sections for a batch (e.g. A, B, C)
router.post('/batches/:batchId/sections', asyncHandler(async (req, res) => {
  const { sections = ['A', 'B'], maxStrength = 60 } = req.body
  const batch = await db.batch.findUnique({
    where: { id: req.params.batchId },
    include: { course: true }
  })
  if (!batch) throw { status: 404, code: 'BATCH_NOT_FOUND' }

  const created = []
  for (const sectionName of sections) {
    const displayName = `${batch.course.code}${batch.batchYear}-${sectionName}` // e.g. CSE2023-A
    const sec = await db.section.upsert({
      where: { batchId_name: { batchId: req.params.batchId, name: sectionName } },
      create: { batchId: req.params.batchId, name: sectionName, displayName, maxStrength: parseInt(maxStrength) },
      update: {}
    })
    created.push(sec)
  }

  res.status(201).json({ success: true, data: created, message: `${created.length} sections created` })
}))

// Assign students to a section
router.post('/sections/:id/assign-students', asyncHandler(async (req, res) => {
  const { studentIds } = req.body
  if (!studentIds?.length) throw { status: 400, code: 'NO_STUDENTS' }

  const section = await db.section.findUnique({
    where: { id: req.params.id },
    include: { batch: true }
  })
  if (!section) throw { status: 404, code: 'SECTION_NOT_FOUND' }

  await db.student.updateMany({
    where: { id: { in: studentIds } },
    data: {
      sectionId: req.params.id,
      batchId:   section.batchId,
      currentSem: section.batch.currentSemester
    }
  })

  res.json({ success: true, message: `${studentIds.length} students assigned to ${section.displayName}` })
}))

// Remove student from section
router.delete('/sections/:id/students/:studentId', asyncHandler(async (req, res) => {
  await db.student.update({
    where: { id: req.params.studentId },
    data: { sectionId: null }
  })
  res.json({ success: true, message: 'Student removed from section' })
}))

// ══════════════════════════════════════════════════
// 4. LAB GROUPS
// ══════════════════════════════════════════════════
router.post('/sections/:id/lab-groups', asyncHandler(async (req, res) => {
  const { subjectId, groupCount = 2, maxStrength = 20 } = req.body
  const section = await db.section.findUnique({ where: { id: req.params.id } })
  if (!section) throw { status: 404, code: 'SECTION_NOT_FOUND' }

  const created = []
  for (let i = 1; i <= parseInt(groupCount); i++) {
    const name = `${section.displayName}-L${i}` // CSE2023-A-L1
    const grp = await db.labGroup.upsert({
      where: { sectionId_subjectId_name: { sectionId: req.params.id, subjectId, name } },
      create: { sectionId: req.params.id, subjectId, name, maxStrength: parseInt(maxStrength) },
      update: {}
    })
    created.push(grp)
  }
  res.status(201).json({ success: true, data: created })
}))

// ══════════════════════════════════════════════════
// 5. TEACHER ASSIGNMENT (Section + Subject + Semester)
// ══════════════════════════════════════════════════
router.get('/sections/:id/teachers', asyncHandler(async (req, res) => {
  const { semester } = req.query
  const assignments = await db.sectionSubjectTeacher.findMany({
    where: {
      sectionId: req.params.id, isActive: true,
      ...(semester && { semester: parseInt(semester) })
    },
    include: {
      subject: { select: { name: true, code: true, type: true, semester: true } },
      teacher: { select: { name: true, employeeId: true, department: true } },
      labGroup: { select: { name: true } }
    },
    orderBy: [{ semester: 'asc' }, { subject: { name: 'asc' } }]
  })
  res.json({ success: true, data: assignments })
}))

router.post('/sections/:id/teachers', asyncHandler(async (req, res) => {
  const { subjectId, teacherId, assignmentType = 'THEORY', labGroupId, semester, academicYear } = req.body
  if (!subjectId || !teacherId || !semester || !academicYear) throw { status: 400, code: 'MISSING_FIELDS' }

  // Check if teacher already assigned for this subject+section+type+sem
  const existing = await db.sectionSubjectTeacher.findFirst({
    where: { sectionId: req.params.id, subjectId, assignmentType, semester: parseInt(semester), academicYear, isActive: true }
  })

  if (existing && !labGroupId) {
    const updated = await db.sectionSubjectTeacher.update({
      where: { id: existing.id },
      data: { teacherId },
      include: { teacher: { select: { name: true } }, subject: { select: { name: true, code: true } } }
    })
    return res.json({ success: true, data: updated, message: 'Teacher updated' })
  }

  const assignment = await db.sectionSubjectTeacher.create({
    data: {
      sectionId: req.params.id, subjectId, teacherId,
      assignmentType, semester: parseInt(semester),
      academicYear, labGroupId: labGroupId || null
    },
    include: {
      teacher: { select: { name: true, employeeId: true } },
      subject: { select: { name: true, code: true } },
      labGroup: { select: { name: true } }
    }
  })
  res.status(201).json({ success: true, data: assignment })
}))

router.delete('/teacher-assignments/:id', asyncHandler(async (req, res) => {
  await db.sectionSubjectTeacher.update({ where: { id: req.params.id }, data: { isActive: false } })
  res.json({ success: true, message: 'Assignment removed' })
}))

// ══════════════════════════════════════════════════
// 6. OVERVIEW — Admin dashboard for structure
// ══════════════════════════════════════════════════
router.get('/overview', asyncHandler(async (req, res) => {
  const [courses, batches, sections, students] = await Promise.all([
    db.course.count({ where: { isActive: true } }),
    db.batch.findMany({
      where: { isActive: true },
      include: {
        course: { select: { name: true, code: true } },
        _count: { select: { sections: true, students: true } }
      },
      orderBy: [{ batchYear: 'desc' }]
    }),
    db.section.count({ where: { isActive: true } }),
    db.student.count({ where: { isDeleted: false } })
  ])
  res.json({ success: true, data: { courses, batches, sections, students } })
}))

// ══════════════════════════════════════════════════
// 7. TEACHER — view own section assignments
// ══════════════════════════════════════════════════
// Override admin-only middleware for this one route
router.get('/my-sections', verifyToken, asyncHandler(async (req, res) => {
  const assignments = await db.sectionSubjectTeacher.findMany({
    where: { teacherId: req.user.sub, isActive: true },
    include: {
      section: { include: { batch: { include: { course: true } } } },
      subject: { select: { name: true, code: true, type: true, semester: true } },
      labGroup: { select: { name: true } }
    },
    orderBy: [{ semester: 'asc' }, { subject: { name: 'asc' } }]
  })
  res.json({ success: true, data: assignments })
}))

// ══════════════════════════════════════════════════
// 8. SUBJECT COORDINATORS
// ══════════════════════════════════════════════════
router.get('/coordinators', subjectController.getCoordinators)
router.post('/coordinators', subjectController.assignCoordinator)
router.delete('/coordinators/:id', subjectController.removeCoordinator)

module.exports = router
