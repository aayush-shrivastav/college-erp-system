// src/modules/student/student.routes.js
const router       = require('express').Router();
const asyncHandler = require('../../middlewares/asyncHandler');
const { verifyToken } = require('../../middlewares/verifyToken');
const { verifyRole }  = require('../../middlewares/checkPermission');
const db = require('../../config/db');

router.use(verifyToken, verifyRole('STUDENT'));

// ── PROFILE ───────────────────────────────────────────────────────────────────
router.get('/profile', asyncHandler(async (req, res) => {
  const student = await db.student.findUnique({
    where: { id: req.user.sub },
    include: { user: { select: { email: true } }, mentor: { select: { name: true, phone: true } } }
  });
  res.json({ success: true, data: student });
}));

router.put('/profile', asyncHandler(async (req, res) => {
  const student = await db.student.findUnique({ where: { id: req.user.sub } });
  if (student.profileLocked) throw { status: 403, code: 'PROFILE_LOCKED' };

  const { phone, address, fatherName, fatherPhone, motherName, motherPhone, tenthPercent, twelfthPercent } = req.body;
  const updated = await db.student.update({
    where: { id: req.user.sub },
    data: { phone, address, fatherName, fatherPhone, motherName, motherPhone,
            tenthPercent: tenthPercent ? Number(tenthPercent) : null,
            twelfthPercent: twelfthPercent ? Number(twelfthPercent) : null,
            profileLocked: true }
  });
  res.json({ success: true, message: 'Profile saved and locked', data: updated });
}));

// ── REGISTRATION ──────────────────────────────────────────────────────────────
router.get('/available-subjects', asyncHandler(async (req, res) => {
  const student = await db.student.findUnique({ where: { id: req.user.sub } });
  const nextSem = student.currentSem + 1;

  // 1. Find if there's a specialized Branch-Batch Syllabus Assignment
  const branchAssignment = await db.batchSyllabus.findUnique({
    where: { batchId_branchId: { batchId: student.batchId, branchId: student.branchId } }
  });

  // 2. Fallback to Global Batch Assignment
  const batch = await db.batch.findUnique({ where: { id: student.batchId } });
  
  const syllabusVersionId = branchAssignment?.syllabusVersionId || batch?.syllabusVersionId;

  // 3. Filter subjects by branch, semester AND syllabusVersion (if assigned)
  const subjects = await db.subject.findMany({
    where: {
      branchId: student.branchId,
      semester: nextSem,
      isDeleted: false,
      ...(syllabusVersionId && { syllabusVersionId })
    },
    include: { syllabusVersion: { select: { versionName: true } } },
    orderBy: { code: 'asc' }
  });

  res.json({ success: true, data: subjects });
}));

router.get('/registration-status', asyncHandler(async (req, res) => {
  const reg = await db.semesterRegistration.findFirst({
    where: { studentId: req.user.sub },
    orderBy: { registeredAt: 'desc' },
    include: { activeSem: true }
  });
  res.json({ success: true, data: reg });
}));

router.post('/register-semester', asyncHandler(async (req, res) => {
  const { pin, selectedSubjectIds } = req.body;
  const studentId = req.user.sub;

  // 1. Find PIN record for this student
  const pinRecord = await db.studentRegistrationPin.findFirst({
    where: { pin, studentId },
    include: { activeSem: true }
  });
  if (!pinRecord) return res.status(400).json({ success: false, message: 'Invalid PIN. Your PIN is different or incorrect.', code: 'INVALID_PIN' });
  if (pinRecord.isUsed) return res.status(409).json({ success: false, message: 'PIN already used. You have already submitted your registration.', code: 'PIN_ALREADY_USED' });
  if (!pinRecord.activeSem.registrationOpen) return res.status(400).json({ success: false, message: 'Registration window is closed.', code: 'REGISTRATION_CLOSED' });

  // 2. Student profile must be locked (complete)
  const student = await db.student.findUnique({ where: { id: studentId } });
  if (!student.profileLocked) return res.status(400).json({ success: false, message: 'Please complete your profile first.', code: 'COMPLETE_PROFILE_FIRST' });

  // 3. Check for duplicate registration
  const dup = await db.semesterRegistration.findFirst({
    where: { studentId, activeSemId: pinRecord.activeSemId }
  });
  if (dup) return res.status(409).json({ success: false, message: 'Already registered for this semester.', code: 'ALREADY_REGISTERED' });

  // 4. Create registration and mark PIN as used
  // We need a codeId — find or use the old shared code for compat, or make codeId optional
  // Actually, SemesterRegistration.codeId is required in schema. We will use the pin record id.
  // For now, find if teacher has an old code, otherwise we need to tweak.
  // Simpler: update schema to make codeId optional — but to avoid re-migration,
  // find if teacher's legacy code exists, or create a placeholder code
  const teacher = student.mentorId ? await db.teacher.findUnique({ where: { id: student.mentorId } }) : null;
  let codeRecord = teacher ? await db.registrationCode.findFirst({
    where: { teacherId: teacher.id, activeSemId: pinRecord.activeSemId }
  }) : null;

  // If no legacy code exists, create a placeholder one for this teacher+sem
  if (!codeRecord && teacher) {
    codeRecord = await db.registrationCode.upsert({
      where: { activeSemId_teacherId: { activeSemId: pinRecord.activeSemId, teacherId: teacher.id } },
      create: { activeSemId: pinRecord.activeSemId, teacherId: teacher.id, code: `LEGACY-${teacher.id.slice(0, 8)}`, maxUses: 9999, isActive: true },
      update: {}
    });
  }

  if (!codeRecord) return res.status(500).json({ success: false, message: 'Registration setup error. Contact admin.' });

  const reg = await db.$transaction(async (tx) => {
    const r = await tx.semesterRegistration.create({
      data: {
        studentId,
        activeSemId: pinRecord.activeSemId,
        codeId: codeRecord.id,
        selectedSubjects: JSON.stringify(selectedSubjectIds || []),
        status: 'PENDING'
      }
    });
    // Mark PIN as used
    await tx.studentRegistrationPin.update({
      where: { id: pinRecord.id },
      data: { isUsed: true }
    });
    // Notify mentor
    if (student.mentorId) {
      await tx.notification.create({
        data: {
          userId: student.mentorId,
          title: 'New Registration Request',
          message: `${student.name} (${student.rollNo}) has submitted their registration.`,
          type: 'PROMOTION',
          actionUrl: '/teacher/registrations/pending'
        }
      });
    }
    return r;
  });

  res.status(201).json({ success: true, message: 'Registration submitted! Please wait for your mentor\'s approval.', data: reg });
}));

// ── SCHOLARSHIPS ──────────────────────────────────────────────────────────────
router.use('/scholarships', require('./scholarship.student.routes'));

// ── ATTENDANCE ─────────────────────────────────────────────────────────────────
router.get('/attendance', asyncHandler(async (req, res) => {
  const summaries = await db.attendanceSummary.findMany({
    where: { studentId: req.user.sub },
    include: { subject: { select: { name: true, code: true } } },
    orderBy: { subject: { name: 'asc' } }
  });
  const result = summaries.map(s => ({
    subjectId: s.subjectId,
    subjectName: s.subject.name,
    subjectCode: s.subject.code,
    totalConducted: s.totalConducted,
    totalAttended: s.totalAttended,
    totalAbsent: s.totalAbsent,
    attendancePct: s.totalConducted > 0
      ? Math.round((s.totalAttended / s.totalConducted) * 100 * 100) / 100
      : 0
  }));
  res.json({ success: true, data: result });
}));

// ── MARKS ─────────────────────────────────────────────────────────────────────
router.get('/marks', asyncHandler(async (req, res) => {
  const student = await db.student.findUnique({ where: { id: req.user.sub } });
  const currentYear = new Date().getFullYear();
  const academicYear = new Date().getMonth() >= 6 ? `${currentYear}-${currentYear+1}` : `${currentYear-1}-${currentYear}`;

  const enrollments = await db.studentSubjectEnrollment.findMany({
    where: { studentId: req.user.sub, isActive: true },
    include: { subject: true }
  });

  const marksCard = [];
  for (const enr of enrollments) {
    const isLab = enr.subject.type === 'LAB';

    if (isLab) {
      // LAB subjects: only practical marks (reused from assignmentSubmission), max 25
      const practical = await db.assignmentSubmission.findUnique({
        where: { studentId_subjectId_academicYear_semester: { studentId: req.user.sub, subjectId: enr.subjectId, academicYear, semester: enr.semester } }
      });
      const practicalMarks = practical ? Number(practical.marksObtained) : 0;
      marksCard.push({
        subjectId: enr.subjectId, subjectName: enr.subject.name, subjectCode: enr.subject.code,
        subjectType: 'LAB',
        exams: [], examAvg: 0,
        practicalMarks, maxPractical: 25,
        assignmentMarks: 0, attendanceMarks: 0,
        grandTotal: practicalMarks, maxTotal: 25
      });
      continue;
    }

    // THEORY / ELECTIVE subjects: MST + Assignment + Attendance = 28
    const exams = await db.exam.findMany({
      where: { subjectId: enr.subjectId, semester: enr.semester },
      include: { results: { where: { studentId: req.user.sub } } }
    });
    const examData = exams.map(e => {
      const r = e.results[0];
      return r ? { examNo: e.examNo, secA: Number(r.secA), secB: Number(r.secB), secC: Number(r.secC), total: Number(r.secA)+Number(r.secB)+Number(r.secC) } : null;
    }).filter(Boolean);

    const totals = examData.map(e => e.total).sort((a,b) => b-a);
    const examAvg = totals.length >= 2 ? ((totals[0]+totals[1])/2) : totals[0] || 0;

    const asgn = await db.assignmentSubmission.findUnique({
      where: { studentId_subjectId_academicYear_semester: { studentId: req.user.sub, subjectId: enr.subjectId, academicYear, semester: enr.semester } }
    });
    const asgnMarks = asgn ? Number(asgn.marksObtained) : 0;

    const attSum = await db.attendanceSummary.findUnique({
      where: { studentId_subjectId_academicYear_semester: { studentId: req.user.sub, subjectId: enr.subjectId, academicYear, semester: enr.semester } }
    });
    const pct = attSum && attSum.totalConducted > 0 ? (attSum.totalAttended / attSum.totalConducted) * 100 : 0;
    const attMarks = pct>=90?6 : pct>=80?5 : pct>=75?4 : pct>=65?3 : 0;

    marksCard.push({
      subjectId: enr.subjectId, subjectName: enr.subject.name, subjectCode: enr.subject.code,
      subjectType: enr.subject.type,
      exams: examData, examAvg: Math.round(examAvg*100)/100,
      assignmentMarks: asgnMarks, attendanceMarks: attMarks,
      grandTotal: Math.round((examAvg + asgnMarks + attMarks)*100)/100,
      maxTotal: 28
    });
  }
  res.json({ success: true, data: marksCard });
}));

// ── FEE ───────────────────────────────────────────────────────────────────────
router.get('/fee', asyncHandler(async (req, res) => {
  const profile = await db.studentFeeProfile.findUnique({
    where: { studentId: req.user.sub },
    include: {
      student: { select: { rollNo: true, name: true, batchId: true, branchId: true, currentSem: true, batch: { select: { year: true } } } },
      hostelRoom: true, busRoute: true,
      ledgers: { include: { transactions: { orderBy: { createdAt: 'desc' } } } }
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
    const messFee = 0; // default for student routes

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
      where: { studentId: req.user.sub },
      include: {
        student: { select: { rollNo: true, name: true, batchId: true, branchId: true, currentSem: true, batch: { select: { year: true } } } },
        hostelRoom: true, busRoute: true,
        ledgers: { include: { transactions: { orderBy: { createdAt: 'desc' } } } }
      }
    });
    profile.ledgers = updatedProfile.ledgers;
  }

  let totalPayable = 0, totalPaid = 0;
  profile.ledgers.forEach(l => {
    totalPayable += Number(l.baseFeeDue) + Number(l.hostelFeeDue) + Number(l.busFeeDue);
    totalPaid += Number(l.totalPaid) + Number(l.scholarshipVerified);
  });

  const unpaidFines = await db.fine.aggregate({
    where: { studentId: req.user.sub, isPaid: false },
    _sum: { amount: true }
  });
  const fines = await db.fine.findMany({
    where: { studentId: req.user.sub },
    orderBy: { createdAt: 'desc' }
  });

  const outstanding = totalPayable - totalPaid + Number(unpaidFines._sum.amount || 0);
  res.json({ success: true, data: {
    ...profile,
    totalPayable,
    totalPaid,
    outstanding,
    fines,
    transactions: profile.ledgers.flatMap(l => l.transactions.map(t => ({ ...t, semester: l.semester }))).sort((a,b) => b.createdAt - a.createdAt),
    // Payment type info for frontend display
    paymentTypes: [
      { type: 'CASH',        label: 'Cash',             desc: 'Physical cash at the counter' },
      { type: 'DD',          label: 'Demand Draft',      desc: 'Demand Draft from Bank' },
      { type: 'DRCC',        label: 'Debit/Credit Card', desc: 'Card swipe at the counter' },
      { type: 'SCHOLARSHIP', label: 'Scholarship',       desc: 'Government / College Scholarship' },
    ]
  }});
}));

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
router.get('/notifications', asyncHandler(async (req, res) => {
  const notifs = await db.notification.findMany({
    where: { userId: req.user.sub }, orderBy: { createdAt: 'desc' }, take: 50
  });
  res.json({ success: true, data: notifs });
}));
router.get('/notifications/unread-count', asyncHandler(async (req, res) => {
  const count = await db.notification.count({ where: { userId: req.user.sub, isRead: false } });
  res.json({ success: true, data: { count } });
}));
router.patch('/notifications/read', asyncHandler(async (req, res) => {
  const { ids } = req.body;
  await db.notification.updateMany({ where: { id: { in: ids }, userId: req.user.sub }, data: { isRead: true, readAt: new Date() } });
  res.json({ success: true });
}));

module.exports = router;

// ── MY ENROLLED SUBJECTS ──────────────────────────────────────────────────
router.get('/subjects', asyncHandler(async (req, res) => {
  const student = await db.student.findUnique({ where: { id: req.user.sub } });
  
  const enrollments = await db.studentSubjectEnrollment.findMany({
    where: { studentId: req.user.sub, isActive: true },
    include: {
      subject: {
        include: {
          syllabusVersion: { select: { versionName: true } }
        }
      }
    },
    orderBy: [{ semester: 'asc' }]
  });

  // Find class ID for the student's current sem (or the enrollment's sem)
  const assignments = await db.classAssignment.findMany({
    where: {
      class: { branchId: student.branchId, batchId: student.batchId }
    },
    include: { teacher: { select: { name: true } } }
  });

  const assignmentMap = {};
  for (const a of assignments) {
    if (!assignmentMap[a.subjectId]) {
      assignmentMap[a.subjectId] = a.teacher?.name || null;
    }
  }

  const result = enrollments.map(e => ({
    id:           e.subjectId,
    name:         e.subject.name,
    code:         e.subject.code,
    subjectType:  e.subject.type,
    semester:     e.subject.semester,
    credits:      e.subject.credits,
    syllabus:     e.subject.syllabusVersion?.versionName || '',
    teacherName:  assignmentMap[e.subjectId] || null,
    academicYear: e.academicYear,
    enrolledAt:   e.enrolledAt,
  }));

  res.json({ success: true, data: result });
}));
