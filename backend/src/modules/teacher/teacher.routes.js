// src/modules/teacher/teacher.routes.js
const router       = require('express').Router();
const asyncHandler = require('../../middlewares/asyncHandler');
const { verifyToken } = require('../../middlewares/verifyToken');
const { verifyRole }  = require('../../middlewares/checkPermission');
const db = require('../../config/db');

router.use(verifyToken, verifyRole('TEACHER'));

// ── PROFILE ───────────────────────────────────────────────────────────────────
router.get('/profile', asyncHandler(async (req, res) => {
  const teacher = await db.teacher.findUnique({
    where: { id: req.user.sub },
    include: { user: { select: { email: true } } }
  });
  res.json({ success: true, data: teacher });
}));

router.put('/profile', asyncHandler(async (req, res) => {
  const { name, department, phone, profilePhoto } = req.body;
  const teacher = await db.teacher.update({
    where: { id: req.user.sub },
    data: { name, department, phone, profilePhoto, profileLocked: true }
  });
  res.json({ success: true, data: teacher });
}));

// ── MENTEES ───────────────────────────────────────────────────────────────────
router.get('/mentees', asyncHandler(async (req, res) => {
  const mentees = await db.student.findMany({
    where: { mentorId: req.user.sub },
    select: {
      id: true, rollNo: true, name: true, currentSem: true,
      batch: { select: { year: true } },
      profileLocked: true,
      classGroups: { include: { group: { select: { groupName: true } } } },
      feeProfile: { select: { ledgers: { select: { baseFeeDue: true, hostelFeeDue: true, busFeeDue: true, totalPaid: true, scholarshipVerified: true } } } }
    },
    orderBy: { rollNo: 'asc' }
  });

  const formatted = mentees.map(m => {
    m.section = m.classGroups?.[0]?.group?.groupName || 'N/A';
    delete m.classGroups;
    if (m.feeProfile) {
      let payable = 0, paid = 0;
      m.feeProfile.ledgers.forEach(l => {
        payable += Number(l.baseFeeDue) + Number(l.hostelFeeDue) + Number(l.busFeeDue);
        paid += Number(l.totalPaid) + Number(l.scholarshipVerified);
      });
      m.feeAccount = { totalPayable: payable, totalPaid: paid };
      delete m.feeProfile;
    }
    return m;
  });

  res.json({ success: true, data: formatted });
}));

// ── REGISTRATION PINS (New Per-Student System) ────────────────────────────────

// Generate unique 6-digit PIN for every mentee (idempotent)
router.post('/generate-pins', asyncHandler(async (req, res) => {
  const teacherId = req.user.sub;

  // Find open active semester
  const activeSem = await db.activeSemester.findFirst({
    where: { registrationOpen: true },
    orderBy: { createdAt: 'desc' }
  });
  if (!activeSem) return res.status(400).json({ success: false, message: 'No active registration window open' });

  // Get all mentees
  const mentees = await db.student.findMany({
    where: { mentorId: teacherId },
    select: { id: true, rollNo: true, name: true }
  });
  if (mentees.length === 0) return res.json({ success: true, message: 'No mentees found', data: [] });

  const generated = [];
  const skipped = [];

  for (const student of mentees) {
    // Skip if PIN already exists for this student + semester
    const existing = await db.studentRegistrationPin.findUnique({
      where: { studentId_activeSemId: { studentId: student.id, activeSemId: activeSem.id } }
    });
    if (existing) { skipped.push(student.rollNo); continue; }

    // Generate unique 6-digit PIN
    let pin, attempts = 0;
    do {
      pin = String(Math.floor(100000 + Math.random() * 900000));
      const conflict = await db.studentRegistrationPin.findUnique({ where: { pin } });
      if (!conflict) break;
      attempts++;
    } while (attempts < 10);

    await db.studentRegistrationPin.create({
      data: { studentId: student.id, activeSemId: activeSem.id, pin, generatedBy: teacherId }
    });
    generated.push({ rollNo: student.rollNo, name: student.name, pin });
  }

  res.json({ success: true, message: `PINs generated for ${generated.length} students, ${skipped.length} already had PINs`, data: { generated, skipped } });
}));

// Get mentees list with their PINs
router.get('/mentee-pins', asyncHandler(async (req, res) => {
  const teacherId = req.user.sub;

  const activeSem = await db.activeSemester.findFirst({
    where: { registrationOpen: true },
    orderBy: { createdAt: 'desc' }
  });

  const mentees = await db.student.findMany({
    where: { mentorId: teacherId },
    select: { 
      id: true, rollNo: true, name: true, currentSem: true,
      classGroups: { include: { group: { select: { groupName: true } } } }
    },
    orderBy: { rollNo: 'asc' }
  });

  if (!activeSem) {
    return res.json({ success: true, data: { activeSem: null, mentees: mentees.map(m => ({ ...m, pin: null, isUsed: false })) } });
  }

  const pins = await db.studentRegistrationPin.findMany({
    where: { activeSemId: activeSem.id, studentId: { in: mentees.map(m => m.id) } }
  });
  const pinMap = {};
  for (const p of pins) pinMap[p.studentId] = p;

  const result = mentees.map(m => ({
    ...m,
    section: m.classGroups?.[0]?.group?.groupName || 'N/A',
    pin: pinMap[m.id]?.pin || null,
    isUsed: pinMap[m.id]?.isUsed || false
  }));

  // Remove classGroups from final result to keep it clean
  result.forEach(r => delete r.classGroups);

  res.json({ success: true, data: { activeSem, mentees: result } });
}));

// Keep old route for backward compat
router.get('/registration-code', asyncHandler(async (req, res) => {
  res.json({ success: true, data: null });
}));


router.get('/registrations/pending', asyncHandler(async (req, res) => {
  const mentees = await db.student.findMany({
    where: { mentorId: req.user.sub },
    select: { id: true }
  });
  const studentIds = mentees.map(m => m.id);
  const regs = await db.semesterRegistration.findMany({
    where: { studentId: { in: studentIds }, status: 'PENDING' },
    include: {
      student: { select: { rollNo: true, name: true } },
      activeSem: true
    },
    orderBy: { registeredAt: 'desc' }
  });

  // Resolve subject names for each registration
  const allSubIds = [...new Set(regs.flatMap(r => {
    try {
      const subs = typeof r.selectedSubjects === 'string' ? JSON.parse(r.selectedSubjects) : r.selectedSubjects;
      return Array.isArray(subs) ? subs : [];
    } catch { return [] }
  }))];

  const subjects = await db.subject.findMany({
    where: { id: { in: allSubIds } },
    select: { id: true, name: true, code: true }
  });
  const subMap = {};
  subjects.forEach(s => { subMap[s.id] = `${s.name} (${s.code})`; });

  const formatted = regs.map(r => {
    const sIds = typeof r.selectedSubjects === 'string' ? JSON.parse(r.selectedSubjects) : r.selectedSubjects;
    const sNames = (Array.isArray(sIds) ? sIds : []).map(id => subMap[id] || id);
    return { ...r, selectedSubjectNames: sNames };
  });

  res.json({ success: true, data: formatted });
}));

router.post('/registrations/:id/approve', asyncHandler(async (req, res) => {
  const reg = await db.semesterRegistration.findUnique({
    where: { id: req.params.id },
    include: { student: true, activeSem: true }
  });
  if (!reg) throw { status: 404, code: 'NOT_FOUND' };
  if (reg.status !== 'PENDING') throw { status: 409, code: 'NOT_PENDING' };
  if (reg.student.mentorId !== req.user.sub) throw { status: 403, code: 'NOT_YOUR_MENTEE' };

  const subjects = JSON.parse(reg.selectedSubjects);
  await db.$transaction(async (tx) => {
    await tx.semesterRegistration.update({
      where: { id: reg.id },
      data: { status: 'APPROVED', reviewedBy: req.user.sub, reviewedAt: new Date() }
    });
    if (subjects.length > 0) {
      await tx.studentSubjectEnrollment.createMany({
        data: subjects.map(sid => ({
          studentId: reg.studentId, subjectId: sid,
          academicYear: reg.activeSem.academicYear,
          semester: reg.activeSem.semester,
          registrationId: reg.id
        })),
        skipDuplicates: true
      });
    }
    await tx.student.update({
      where: { id: reg.studentId },
      data: { currentSem: reg.activeSem.semester }
    });
    await tx.notification.create({
      data: {
        userId: reg.studentId,
        title: 'Registration Approved!',
        message: `Semester ${reg.activeSem.semester} registration approved by your mentor.`,
        type: 'PROMOTION',
        actionUrl: '/student/timetable'
      }
    });
  });
  res.json({ success: true, message: 'Registration approved' });
}));

router.post('/registrations/:id/reject', asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const reg = await db.semesterRegistration.findUnique({ where: { id: req.params.id }, include: { student: true } });
  if (!reg || reg.student.mentorId !== req.user.sub) throw { status: 403, code: 'NOT_YOUR_MENTEE' };
  await db.semesterRegistration.update({
    where: { id: req.params.id },
    data: { status: 'REJECTED', rejectionNote: reason, reviewedBy: req.user.sub, reviewedAt: new Date() }
  });
  await db.notification.create({
    data: { userId: reg.studentId, title: 'Registration Rejected', message: reason || 'Contact your mentor.', type: 'PROMOTION' }
  });
  res.json({ success: true, message: 'Registration rejected' });
}));

// ── ATTENDANCE ─────────────────────────────────────────────────────────────────
router.post('/attendance/sessions', asyncHandler(async (req, res) => {
  const { classAssignmentId, sessionDate, startTime } = req.body;
  
  // Verify assignment
  const assignment = await db.classAssignment.findUnique({
    where: { id: classAssignmentId },
    include: { class: true }
  });
  if (!assignment) throw { status: 404, code: 'ASSIGNMENT_NOT_FOUND' };
  if (assignment.teacherId !== req.user.sub) throw { status: 403, code: 'UNAUTHORIZED' };

  const classNameStr = `${assignment.classId}:${assignment.groupId || 'FULL'}`;
  const sDate = new Date(sessionDate);

  let session = await db.attendanceSession.findUnique({
    where: {
      className_subjectId_sessionDate: {
        className: classNameStr,
        subjectId: assignment.subjectId,
        sessionDate: sDate
      }
    }
  });

  if (session) {
    return res.status(200).json({ success: true, message: 'Existing session loaded', data: { session } });
  }

  session = await db.attendanceSession.create({
    data: {
      subjectId:   assignment.subjectId,
      teacherId:   req.user.sub,
      className:   classNameStr,
      sessionDate: sDate,
      startTime:   startTime || '00:00',
      status:      'CONDUCTED'
    }
  });

  // Fetch enrolled students for this EXACT branch/batch/semester
  const enrollments = await db.studentSubjectEnrollment.findMany({
    where: {
      subjectId:  assignment.subjectId,
      student: {
        branchId: assignment.class.branchId,
        batchId:  assignment.class.batchId,
        currentSem: assignment.class.semester,
        profileLocked: true,
        user: { isDeleted: false }
      },
      isActive: true
    },
    select: { studentId: true }
  });

  // If there's a group, further filter by Group ID
  let targetStudentIds = enrollments.map(e => e.studentId);
  if (assignment.groupId) {
    const groupStudents = await db.groupStudent.findMany({
      where: { groupId: assignment.groupId, studentId: { in: targetStudentIds } },
      select: { studentId: true }
    });
    targetStudentIds = groupStudents.map(gs => gs.studentId);
  }

  if (targetStudentIds.length > 0) {
    await db.attendanceRecord.createMany({
      data: targetStudentIds.map(sid => ({
        sessionId: session.id,
        studentId: sid,
        status:    'ABSENT',
        markedBy:  req.user.sub
      })),
      skipDuplicates: true
    });
  }

  res.status(201).json({ success: true, data: { session, studentCount: targetStudentIds.length } });
}));

router.get('/attendance/sessions/:id/records', asyncHandler(async (req, res) => {
  const records = await db.attendanceRecord.findMany({
    where: { 
      sessionId: req.params.id,
      student: { profileLocked: true, user: { isDeleted: false } }
    },
    include: {
      student: {
        select: { id: true, name: true, rollNo: true }
      }
    },
    orderBy: { student: { rollNo: 'asc' } }
  });
  
  const formatted = records.map(r => ({
    id:        r.studentId,
    name:      r.student.name,
    rollNo:    r.student.rollNo,
    status:    r.status
  }));

  res.json({ success: true, data: formatted });
}));

router.post('/attendance/sessions/:id/mark', asyncHandler(async (req, res) => {
  const { records } = req.body; // [{ studentId, status }]
  await db.$transaction(
    records.map(r => db.attendanceRecord.update({
      where: { sessionId_studentId: { sessionId: req.params.id, studentId: r.studentId } },
      data: { status: r.status, markedAt: new Date() }
    }))
  );
  // Update summary for each student
  for (const r of records) {
    await updateAttendanceSummary(req.params.id, r.studentId);
  }
  res.json({ success: true, message: `${records.length} records updated` });
}));

router.patch('/attendance/sessions/:id/skip', asyncHandler(async (req, res) => {
  const { status, label } = req.body; // SKIPPED or HOLIDAY
  await db.$transaction([
    db.attendanceSession.update({ where: { id: req.params.id }, data: { status, label } }),
    db.attendanceRecord.deleteMany({ where: { sessionId: req.params.id } })
  ]);
  res.json({ success: true, message: `Session marked as ${status}` });
}));

// Helper: update attendance summary
async function updateAttendanceSummary(sessionId, studentId) {
  const session = await db.attendanceSession.findUnique({ where: { id: sessionId } });
  if (!session) return;

  const conducted = await db.attendanceRecord.count({
    where: {
      student: { id: studentId },
      session: { subjectId: session.subjectId, status: 'CONDUCTED' }
    }
  });
  const attended = await db.attendanceRecord.count({
    where: {
      studentId, status: { in: ['PRESENT', 'LATE'] },
      session: { subjectId: session.subjectId, status: 'CONDUCTED' }
    }
  });
  const absent = await db.attendanceRecord.count({
    where: { studentId, status: 'ABSENT', session: { subjectId: session.subjectId, status: 'CONDUCTED' } }
  });

  const currentYear = new Date().getFullYear();
  const academicYear = new Date().getMonth() >= 6 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;

  await db.attendanceSummary.upsert({
    where: {
      studentId_subjectId_academicYear_semester: {
        studentId, subjectId: session.subjectId, academicYear, semester: 1
      }
    },
    create: { studentId, subjectId: session.subjectId, academicYear, semester: 1, totalConducted: conducted, totalAttended: attended, totalAbsent: absent },
    update: { totalConducted: conducted, totalAttended: attended, totalAbsent: absent, lastUpdated: new Date() }
  });
}

// ── MARKS ─────────────────────────────────────────────────────────────────────
router.get('/my-assignments/:id/exam/:examNo', asyncHandler(async (req, res) => {
  const { id, examNo } = req.params;
  const assignment = await db.classAssignment.findUnique({
    where: { id },
    include: { class: true }
  });
  if (!assignment || (assignment.teacherId !== req.user.sub && req.user.role !== 'ADMIN')) throw { status: 403, code: 'UNAUTHORIZED' };

  const coordinator = await db.subjectCoordinator.findFirst({
    where: { subjectId: assignment.subjectId, teacherId: req.user.sub, isActive: true }
  });
  const isCoordinator = !!coordinator;

  const currentYear = new Date().getFullYear();
  const academicYear = new Date().getMonth() >= 6 ? `${currentYear}-${currentYear+1}` : `${currentYear-1}-${currentYear}`;
  const className = `${assignment.classId}:${assignment.groupId || 'FULL'}`;

  const exam = await db.exam.upsert({
    where: { subjectId_className_academicYear_semester_examNo: { subjectId: assignment.subjectId, className, academicYear, semester: assignment.class.semester, examNo: parseInt(examNo) } },
    create: { subjectId: assignment.subjectId, className, academicYear, semester: assignment.class.semester, examNo: parseInt(examNo) },
    update: {}
  });

  const enrollments = await db.studentSubjectEnrollment.findMany({
    where: {
      subjectId: assignment.subjectId,
      student: { branchId: assignment.class.branchId, batchId: assignment.class.batchId, currentSem: assignment.class.semester },
      isActive: true
    },
    include: { student: { select: { id: true, rollNo: true, name: true } } }
  });
  
  let targetStudents = enrollments.map(e => e.student);

  if (assignment.groupId) {
    const groupStudents = await db.groupStudent.findMany({
      where: { groupId: assignment.groupId, studentId: { in: targetStudents.map(s => s.id) } },
      select: { studentId: true }
    });
    const groupStudentIds = groupStudents.map(g => g.studentId);
    targetStudents = targetStudents.filter(s => groupStudentIds.includes(s.id));
  }
  
  const results = await db.examResult.findMany({
    where: { examId: exam.id, studentId: { in: targetStudents.map(s => s.id) } }
  });
  
  const resultMap = {};
  for (const r of results) {
    resultMap[r.studentId] = { secA: Number(r.secA), secB: Number(r.secB), secC: Number(r.secC) };
  }

  const data = {
    exam,
    isCoordinator,
    students: targetStudents.sort((a,b) => a.rollNo.localeCompare(b.rollNo)).map(s => ({
      ...s,
      marks: resultMap[s.id] || { secA: null, secB: null, secC: null }
    }))
  };

  res.json({ success: true, data });
}));

router.post('/exams', asyncHandler(async (req, res) => {
  const { subjectId, className, academicYear, semester, examNo, examDate } = req.body;
  const exam = await db.exam.upsert({
    where: { subjectId_className_academicYear_semester_examNo: { subjectId, className, academicYear, semester: parseInt(semester), examNo: parseInt(examNo) } },
    create: { subjectId, className, academicYear, semester: parseInt(semester), examNo: parseInt(examNo), examDate: examDate ? new Date(examDate) : null },
    update: {}
  });
  res.json({ success: true, data: exam });
}));

const upload = require('../../middlewares/upload');
const cloudinary = require('../../config/cloudinary');
const fs = require('fs');

router.post('/exams/:id/upload-paper', upload.single('paper'), asyncHandler(async (req, res) => {
  if (!req.file) throw { status: 400, message: 'Please select a question paper to upload.' };

  try {
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'auto',
      folder: 'college_erp/exam_papers'
    });

    // Update DB with URL
    const updatedExam = await db.exam.update({
      where: { id: req.params.id },
      data: { questionPaperUrl: result.secure_url }
    });

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    res.json({ success: true, data: updatedExam });
  } catch (err) {
    // Clean up temp file if upload fails
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    throw err;
  }
}));

router.put('/marks/:examId/:studentId', asyncHandler(async (req, res) => {
  const { secA, secB, secC } = req.body;
  const { examId, studentId } = req.params;

  if (Number(secA) > 8 || Number(secB) > 8 || Number(secC) > 8)
    throw { status: 422, code: 'MARKS_EXCEED_MAX', message: 'Max per section is 8' };

  const exam = await db.exam.findUnique({ where: { id: examId } });
  if (!exam) throw { status: 404, code: 'EXAM_NOT_FOUND' };
  if (exam.isLocked) throw { status: 403, code: 'EXAM_LOCKED' };

  const result = await db.examResult.upsert({
    where: { examId_studentId: { examId, studentId } },
    create: { examId, studentId, secA: Number(secA), secB: Number(secB), secC: Number(secC), enteredBy: req.user.sub },
    update: { secA: Number(secA), secB: Number(secB), secC: Number(secC), lastUpdated: new Date() }
  });
  const total = Number(secA) + Number(secB) + Number(secC);
  res.json({ success: true, data: { ...result, total } });
}));

router.patch('/exams/:id/lock', asyncHandler(async (req, res) => {
  await db.exam.update({ where: { id: req.params.id }, data: { isLocked: true } });
  res.json({ success: true, message: 'Exam locked' });
}));

router.put('/marks/:studentId/:subjectId/assignment', asyncHandler(async (req, res) => {
  const { marks, academicYear, semester } = req.body;
  // Check if subject is a LAB — allow up to 25, else max 10
  const subject = await db.subject.findUnique({ where: { id: req.params.subjectId }, select: { type: true } });
  const maxMarks = subject?.type === 'LAB' ? 25 : 10;
  if (Number(marks) > maxMarks) throw { status: 422, code: 'MARKS_EXCEED_MAX', message: `Max marks for this subject is ${maxMarks}` };
  const result = await db.assignmentSubmission.upsert({
    where: { studentId_subjectId_academicYear_semester: { studentId: req.params.studentId, subjectId: req.params.subjectId, academicYear, semester: parseInt(semester) } },
    create: { studentId: req.params.studentId, subjectId: req.params.subjectId, academicYear, semester: parseInt(semester), marksObtained: Number(marks), enteredBy: req.user.sub },
    update: { marksObtained: Number(marks) }
  });
  res.json({ success: true, data: result });
}));

router.get('/my-assignments/:id/assignment-marks', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const assignment = await db.classAssignment.findUnique({
    where: { id },
    include: { class: true }
  });
  if (!assignment || (assignment.teacherId !== req.user.sub && req.user.role !== 'ADMIN')) throw { status: 403, code: 'UNAUTHORIZED' };

  const currentYear = new Date().getFullYear();
  const academicYear = new Date().getMonth() >= 6 ? `${currentYear}-${currentYear+1}` : `${currentYear-1}-${currentYear}`;

  const enrollments = await db.studentSubjectEnrollment.findMany({
    where: {
      subjectId: assignment.subjectId,
      student: { branchId: assignment.class.branchId, batchId: assignment.class.batchId, currentSem: assignment.class.semester },
      isActive: true
    },
    include: { student: { select: { id: true, rollNo: true, name: true } } }
  });
  
  let targetStudents = enrollments.map(e => e.student);

  if (assignment.groupId) {
    const groupStudents = await db.groupStudent.findMany({
      where: { groupId: assignment.groupId, studentId: { in: targetStudents.map(s => s.id) } },
      select: { studentId: true }
    });
    const groupStudentIds = groupStudents.map(g => g.studentId);
    targetStudents = targetStudents.filter(s => groupStudentIds.includes(s.id));
  }
  
  const submissions = await db.assignmentSubmission.findMany({
    where: { 
      subjectId: assignment.subjectId, 
      academicYear, 
      semester: assignment.class.semester, 
      studentId: { in: targetStudents.map(s => s.id) } 
    }
  });
  
  const submissionMap = {};
  for (const s of submissions) {
    submissionMap[s.studentId] = Number(s.marksObtained);
  }

  const data = {
    students: targetStudents.sort((a,b) => a.rollNo.localeCompare(b.rollNo)).map(s => ({
      ...s,
      marks: submissionMap[s.id] ?? null
    }))
  };

  res.json({ success: true, data });
}));

// ── MY ASSIGNMENTS ────────────────────────────────────────────────────────────
router.get('/my-assignments', asyncHandler(async (req, res) => {
  const whereClause = req.user.role === 'ADMIN' ? {} : { teacherId: req.user.sub };
  const assignments = await db.classAssignment.findMany({
    where: whereClause,
    include: {
      class: { include: { branch: { select: { name: true } }, batch: { select: { year: true } } } },
      subject: { select: { name: true, code: true, type: true } },
      group: { select: { groupName: true } }
    },
    orderBy: { class: { semester: 'asc' } }
  });
  res.json({ success: true, data: assignments });
}));

// ── SESSIONS ──────────────────────────────────────────────────────────────────
const { createSession, getMySessions, updateSessionStatus } = require('./session.controller');

router.post('/create-session', createSession);
router.get('/my-sessions', getMySessions);
// ── ANALYSIS ──────────────────────────────────────────────────────────────────
router.get('/my-assignments/:id/analysis', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const assignment = await db.classAssignment.findUnique({
    where: { id },
    include: {
      class: { include: { branch: true, batch: true } },
      subject: true,
      group: true
    }
  });
  if (!assignment) {
    throw { status: 404, code: 'NOT_FOUND' };
  }

  // Find logically mapped students
  const classStudents = await db.student.findMany({
    where: {
      branchId: assignment.class.branchId,
      batchId: assignment.class.batchId,
      currentSem: assignment.class.semester
    },
    select: { id: true, rollNo: true, name: true }
  });

  let targetStudents = classStudents;
  if (assignment.groupId) {
    const groupStudents = await db.groupStudent.findMany({
      where: { groupId: assignment.groupId }
    });
    const gIds = groupStudents.map(g => g.studentId);
    targetStudents = classStudents.filter(s => gIds.includes(s.id));
  }

  // Enrollments
  const enrollments = await db.studentSubjectEnrollment.findMany({
    where: { 
      subjectId: assignment.subjectId,
      studentId: { in: targetStudents.map(s => s.id) },
      isActive: true
    }
  });
  const enrolledIds = new Set(enrollments.map(e => e.studentId));

  // Attendance
  const currentYear = new Date().getFullYear();
  const academicYear = new Date().getMonth() >= 6 ? `${currentYear}-${currentYear+1}` : `${currentYear-1}-${currentYear}`;

  const attendance = await db.attendanceSummary.findMany({
    where: {
      subjectId: assignment.subjectId,
      academicYear,
      studentId: { in: targetStudents.map(s => s.id) }
    }
  });
  const attMap = {};
  attendance.forEach(a => attMap[a.studentId] = a);

  // Exams
  const className = `${assignment.classId}:${assignment.groupId || 'FULL'}`;
  const exams = await db.exam.findMany({
    where: { subjectId: assignment.subjectId, className, academicYear, semester: assignment.class.semester },
    orderBy: { examNo: 'asc' },
    include: { results: { where: { studentId: { in: targetStudents.map(s => s.id) } } } }
  });

  const assignmentSubmissions = await db.assignmentSubmission.findMany({
    where: { subjectId: assignment.subjectId, academicYear, semester: assignment.class.semester, studentId: { in: targetStudents.map(s => s.id) } }
  });

  const studentsData = targetStudents.map(s => {
    const isEnrolled = enrolledIds.has(s.id);
    const att = attMap[s.id] || { totalConducted: 0, totalAttended: 0, totalAbsent: 0 };
    
    // Exam Marks
    const marksBreakdown = [];
    exams.forEach(ex => {
      const res = ex.results.find(r => r.studentId === s.id);
      if (res) {
        marksBreakdown.push({ examNo: ex.examNo, total: Number(res.secA) + Number(res.secB) + Number(res.secC) });
      } else {
        marksBreakdown.push({ examNo: ex.examNo, total: null });
      }
    });

    const assignMark = assignmentSubmissions.find(sub => sub.studentId === s.id);

    return {
      id: s.id,
      rollNo: s.rollNo,
      name: s.name,
      isEnrolled,
      attendance: {
        conducted: att.totalConducted,
        attended: att.totalAttended,
        percentage: att.totalConducted > 0 ? ((att.totalAttended / att.totalConducted) * 100).toFixed(1) : 0
      },
      exams: marksBreakdown,
      assignment: assignMark ? Number(assignMark.marksObtained) : null
    };
  });

  res.json({
    success: true,
    data: {
      assignmentInfo: {
        id: assignment.id,
        subjectName: assignment.subject.name,
        subjectCode: assignment.subject.code,
        className: `${assignment.class.branch.name} - ${assignment.class.batch.year}`,
        groupName: assignment.group ? assignment.group.groupName : 'Full Class',
        semester: assignment.class.semester
      },
      examHeaders: exams.map(e => e.examNo),
      students: studentsData.sort((a,b) => a.rollNo.localeCompare(b.rollNo))
    }
  });
}));

router.patch('/update-session/:id', updateSessionStatus);

// ── COORDINATOR HUB ────────────────────────────────────────────────────────
router.get('/coordinated-subjects', asyncHandler(async (req, res) => {
  const coordinated = await db.subjectCoordinator.findMany({
    where: { teacherId: req.user.sub, isActive: true },
    include: {
      subject: true,
      batch: true,
      branch: true
    }
  });
  res.json({ success: true, data: coordinated });
}));

router.get('/coordinated-subject/:subjectId/team', asyncHandler(async (req, res) => {
  const { subjectId } = req.params;
  const { session = '2024-25' } = req.query;

  console.log('----------------------------------------------------');
  console.log('[TEAM_DEBUG] Request for SubjectID:', subjectId);
  console.log('[TEAM_DEBUG] Session Filter:', session);

  const assignments = await db.classAssignment.findMany({
    where: { subjectId },
    include: {
      class: { include: { branch: true, batch: true } },
      teacher: { select: { id: true, name: true, employeeId: true, department: true } },
      group: true
    }
  });

  console.log('[TEAM_DEBUG] Found ClassAssignments:', assignments.length);
  assignments.forEach((a, i) => {
    console.log(`[TEAM_DEBUG]  #${i}: Teacher: ${a.teacher?.name}, Class: ${a.class?.branch?.name} ${a.class?.batch?.year}`);
  });

  const sectionAssignments = await db.sectionSubjectTeacher.findMany({
    where: { subjectId, isActive: true, academicYear: session },
    include: {
      section: { include: { batch: true } },
      teacher: { select: { id: true, name: true, employeeId: true, department: true } },
      labGroup: true
    }
  });

  console.log('[TEAM_DEBUG] Found SectionAssignments:', sectionAssignments.length);
  console.log('----------------------------------------------------');

  res.json({ success: true, data: { assignments, sectionAssignments } });
}));

router.get('/coordinated-subject/:subjectId/marks-analysis', asyncHandler(async (req, res) => {
  const { subjectId } = req.params;
  const { semester, academicYear } = req.query;

  let sem = parseInt(semester);
  let ay = academicYear;

  if (!sem || !ay) {
    const subject = await db.subject.findUnique({ where: { id: subjectId } });
    if (!sem) sem = subject?.semester || 1;
    if (!ay) {
      const cy = new Date().getFullYear();
      ay = new Date().getMonth() >= 6 ? `${cy}-${cy+1}` : `${cy-1}-${cy}`;
    }
  }

  // 1. Aggregate all internal marks for this subject
  const submissions = await db.assignmentSubmission.findMany({
    where: { subjectId, semester: sem, academicYear: ay },
    include: {
      student: { select: { name: true, rollNo: true } }
    }
  });

  // 2. Aggregate all exam marks
  const exams = await db.exam.findMany({
    where: { subjectId, semester: sem, academicYear: ay },
    include: {
      results: { include: { student: { select: { name: true, rollNo: true } } } }
    }
  });

  // 3. Get all class assignments to map teachers and groups
  const classAssignments = await db.classAssignment.findMany({
    where: { subjectId },
    include: {
      teacher: { select: { name: true } },
      group: { select: { id: true, groupName: true } },
      class: { select: { id: true, branchId: true, batchId: true, semester: true } }
    }
  });

  // 4. Get all enrolled students to map their classes/groups
  const enrollments = await db.studentSubjectEnrollment.findMany({
    where: { subjectId, isActive: true },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          rollNo: true,
          branchId: true,
          batchId: true,
          currentSem: true,
          classGroups: {
            select: {
              groupId: true,
              group: { select: { groupName: true } }
            }
          }
        }
      }
    }
  });

  res.json({ success: true, data: { submissions, exams, classAssignments, enrollments } });
}));

router.post('/coordinated-subject/:subjectId/upload-paper', upload.single('paper'), asyncHandler(async (req, res) => {
  const { subjectId } = req.params;
  const { examNo, academicYear, semester, classNames } = req.body;

  if (!req.file) throw { status: 400, message: 'Please select a question paper to upload.' };

  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'auto',
      folder: 'college_erp/exam_papers'
    });

    const parsedClasses = JSON.parse(classNames || '[]');
    
    // Upsert exams for all mapped classes
    for (const className of parsedClasses) {
      await db.exam.upsert({
        where: { subjectId_className_academicYear_semester_examNo: { subjectId, className, academicYear, semester: parseInt(semester), examNo: parseInt(examNo) } },
        create: { subjectId, className, academicYear, semester: parseInt(semester), examNo: parseInt(examNo), questionPaperUrl: result.secure_url },
        update: { questionPaperUrl: result.secure_url }
      });
    }

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.json({ success: true, url: result.secure_url });
  } catch (err) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    throw err;
  }
}));

module.exports = router;

// ── MY SUBJECTS ───────────────────────────────────────────────────────────────
router.get('/my-subjects', asyncHandler(async (req, res) => {
  const assignments = await db.classAssignment.findMany({
    where: { teacherId: req.user.sub },
    include: {
      subject: { select: { name: true, code: true, type: true, semester: true, credits: true } },
      class: { include: { branch: true, batch: true } },
      group: true
    },
    orderBy: [{ class: { semester: 'asc' } }, { subject: { name: 'asc' } }]
  });

  const result = assignments.map(a => ({
    id:          a.id,
    name:        a.subject.name,
    code:        a.subject.code,
    subjectType: a.subject.type,
    semester:    a.class.semester,
    credits:     a.subject.credits,
    className:   `${a.class.branch.name} · ${a.class.batch.year}${a.group ? ` · ${a.group.groupName}` : ''}`,
    academicYear:`Sem ${a.class.semester}`
  }));
  res.json({ success: true, data: result });
}));

// ── MENTEE FEE DETAILS ───────────────────────────────────────────────────────
router.get('/mentees/:id/fee-account', asyncHandler(async (req, res) => {
  const profile = await db.studentFeeProfile.findUnique({
    where: { studentId: req.params.id },
    include: {
      student: { select: { rollNo: true, name: true, batchId: true, branchId: true, currentSem: true, batch: { select: { year: true } } } },
      hostelRoom: true, busRoute: true,
      ledgers: { include: { transactions: { orderBy: { paymentDate: 'desc' } } } }
    }
  });
  
  if (!profile) return res.json({ success: true, data: null });

  // Auto-fill missing ledgers for all 8 semesters if any are missing
  if (profile.ledgers.length < 8) {
    const student = profile.student;
    
    const courseMaster = await db.feeMaster.findUnique({
      where: { batchId_branchId_semester: { batchId: student.batchId, branchId: student.branchId, semester: 0 } }
    });

    const hostelRoom = (profile.isHosteller && profile.hostelRoomId) ? await db.hostelRoom.findUnique({ where: { id: profile.hostelRoomId } }) : null;
    const busRouteObj = (profile.usesBus && profile.busRouteId) ? await db.busRoute.findUnique({ where: { id: profile.busRouteId } }) : null;

    const hostelFee = hostelRoom ? Number(hostelRoom.feeAmount) : 0;
    const busFee = busRouteObj ? Number(busRouteObj.feeAmount) : 0;
    const messFee = 0;

    for (let sem = 1; sem <= 8; sem++) {
      let feeMaster = await db.feeMaster.findUnique({
        where: { batchId_branchId_semester: { batchId: student.batchId, branchId: student.branchId, semester: sem } }
      });

      if (!feeMaster && courseMaster) {
        feeMaster = { totalFee: (Number(courseMaster.totalFee) / 8), semester: sem };
      }

      const baseFee = Number(feeMaster?.totalFee || 50000);

      const existingLedger = await db.studentLedger.findUnique({
        where: { studentFeeProfileId_semester: { studentFeeProfileId: profile.id, semester: sem } }
      });

      if (!existingLedger) {
        await db.studentLedger.create({
          data: {
            studentFeeProfileId: profile.id, semester: sem,
            baseFeeDue: baseFee, hostelFeeDue: hostelFee, busFeeDue: busFee, messFeeDue: messFee,
            netDue: baseFee + hostelFee + busFee + messFee
          }
        });
      }
    }

    // Re-fetch profile with new ledgers
    const updatedProfile = await db.studentFeeProfile.findUnique({
      where: { studentId: req.params.id },
      include: {
        student: { select: { rollNo: true, name: true, batchId: true, branchId: true, currentSem: true, batch: { select: { year: true } } } },
        hostelRoom: true, busRoute: true,
        ledgers: { include: { transactions: { orderBy: { paymentDate: 'desc' } } } }
      }
    });
    profile.ledgers = updatedProfile.ledgers;
  }
  const fines = await db.fine.findMany({ where: { studentId: req.params.id }, orderBy: { fineDate: 'desc' } });

  let totalPayable = 0, totalPaid = 0;
  profile.ledgers.forEach(l => {
    totalPayable += Number(l.baseFeeDue) + Number(l.hostelFeeDue) + Number(l.busFeeDue);
    totalPaid += Number(l.totalPaid) + Number(l.scholarshipVerified);
  });

  res.json({ success: true, data: {
    ...profile,
    totalPayable, totalPaid,
    transactions: profile.ledgers.flatMap(l => l.transactions.map(t => ({ ...t, semester: l.semester }))).sort((a,b) => b.paymentDate - a.paymentDate),
    fines
  }});
}));
