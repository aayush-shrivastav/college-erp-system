// src/modules/admin/admin.routes.js
const router       = require('express').Router();
const multer       = require('multer');
const asyncHandler = require('../../middlewares/asyncHandler');
const { verifyToken }      = require('../../middlewares/verifyToken');
const { verifyRole }       = require('../../middlewares/checkPermission');
const {
  createStudent, listStudents, getStudent,
  updateStudent, softDeleteStudent,
  assignMentorsRange
} = require('./students/students.service');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Some shared routes need multiple roles
router.use(verifyToken);
const { createBranch, createBatch, getBranches, getBatches, deleteBranch } = require('./foundation.controller');

// Expose read-only foundation data to ACCOUNTS
router.get('/branches', verifyRole('ADMIN', 'ACCOUNTS'), getBranches);
router.get('/batches', verifyRole('ADMIN', 'ACCOUNTS'), getBatches);
router.delete('/branches/:id', verifyRole('ADMIN'), deleteBranch);

// All other admin routes require STRICTLY ADMIN role
router.use(verifyRole('ADMIN'));

const { createClass, getClasses, getClassStudents } = require('./class.controller');
const { createGroup, assignGroupRange, assignGroupIndividual, removeGroupStudent, getGroupStudents, getGroups } = require('./classGroup.controller');
const { createSubject, getSubjects, assignBatchSyllabus } = require('./subject.controller');
const { assignTeacher, getAssignments, deleteAssignment } = require('./assignment.controller');
const db = require('../../config/db');

// ── DASHBOARD STATS ───────────────────────────────────────────────────────────
router.get('/dashboard-stats', asyncHandler(async (req, res) => {
  const [
    totalStudents,
    totalTeachers,
    branchesCount,
    batchesCount,
    totalClasses,
    totalCollectionAggr,
    totalDefaultersAggr
  ] = await Promise.all([
    db.student.count({ where: { user: { isDeleted: false } } }),
    db.teacher.count({ where: { user: { isDeleted: false } } }),
    db.branch.count(),
    db.batch.count(),
    db.class.count(),
    db.transaction.aggregate({ _sum: { amount: true } }),
    db.studentLedger.aggregate({ where: { netDue: { gt: 0 } }, _sum: { netDue: true }, _count: true })
  ]);

  // For charts: last 6 months collection data roughly
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const rawTxns = await db.transaction.findMany({
    where: { paymentDate: { gte: sixMonthsAgo } },
    select: { amount: true, paymentDate: true }
  });

  const monthlyDataMap = {};
  rawTxns.forEach(t => {
    const month = new Date(t.paymentDate).toLocaleString('default', { month: 'short', year: '2-digit' });
    if (!monthlyDataMap[month]) monthlyDataMap[month] = 0;
    monthlyDataMap[month] += Number(t.amount);
  });

  const monthlyCollection = Object.keys(monthlyDataMap).map(k => ({
    name: k,
    amount: monthlyDataMap[k]
  })).reverse(); // Basic ordering (might need proper sort but fine for now)

  // Students by Branch
  const branches = await db.branch.findMany({
    include: { _count: { select: { students: true } } }
  });
  
  const studentDistribution = branches.map(b => ({
    name: b.name,
    value: b._count.students
  }));

  // Top Defaulters Quick List
  const topDefaulters = await db.studentLedger.findMany({
    where: { netDue: { gt: 0 } },
    orderBy: { netDue: 'desc' },
    take: 5,
    include: { studentFeeProfile: { include: { student: { select: { name: true, rollNo: true, branch: { select: { name: true } } } } } } }
  });

  res.json({
    success: true,
    data: {
      stats: {
        totalStudents,
        totalTeachers,
        branchesCount,
        batchesCount,
        totalClasses,
        totalCollection: totalCollectionAggr._sum.amount || 0,
        defaultersCount: totalDefaultersAggr._count || 0,
        defaultersAmount: totalDefaultersAggr._sum.netDue || 0
      },
      monthlyCollection,
      studentDistribution,
      topDefaulters: topDefaulters.map(d => ({
        rollNo: d.studentFeeProfile.student.rollNo,
        name: d.studentFeeProfile.student.name,
        branch: d.studentFeeProfile.student.branch?.name,
        semester: d.semester,
        due: Number(d.netDue)
      }))
    }
  });
}));

// ── FOUNDATION & CLASSES ──────────────────────────────────────────────────────
router.post('/create-branch', createBranch);
router.post('/create-batch', createBatch);

router.post('/create-class', createClass);
router.get('/classes', getClasses);
router.get('/class-students', getClassStudents);

// ── CLASS GROUPS ──────────────────────────────────────────────────────────────
router.post('/create-group', createGroup);
router.post('/assign-group-range', assignGroupRange);
router.post('/assign-group-individual', assignGroupIndividual);
router.delete('/remove-group-student/:id', removeGroupStudent);
router.get('/group-students/:groupId', getGroupStudents);
router.get('/groups', getGroups);

// ── SCHOLARSHIPS ──────────────────────────────────────────────────────────────
router.use('/scholarships', require('./scholarship.admin.routes'));

// ── TEACHER ASSIGNMENTS ───────────────────────────────────────────────────────
router.post('/assign-teacher', assignTeacher);
router.get('/assignments', getAssignments);
router.delete('/delete-assignment/:id', deleteAssignment);

// ── STUDENTS ──────────────────────────────────────────────────────────────────
router.get('/students', asyncHandler(async (req, res) => {
  const result = await listStudents(req.query);
  res.json({ success: true, ...result });
}));

router.post('/students', asyncHandler(async (req, res) => {
  const student = await createStudent(req.body);
  res.status(201).json({ success: true, message: 'Student created', data: student });
}));

router.get('/students/:id', asyncHandler(async (req, res) => {
  const student = await getStudent(req.params.id);
  res.json({ success: true, data: student });
}));

router.patch('/students/:id', asyncHandler(async (req, res) => {
  const student = await updateStudent(req.params.id, req.body);
  res.json({ success: true, message: 'Student updated', data: student });
}));

router.delete('/students/:id', asyncHandler(async (req, res) => {
  await softDeleteStudent(req.params.id, req.user.sub);
  res.json({ success: true, message: 'Student deleted' });
}));

router.post('/students/assign-mentors-range', asyncHandler(async (req, res) => {
  const { teacherId, branchId, batchYear, currentSem, fromRollNo, toRollNo } = req.body;
  
  if (!teacherId || !branchId || !batchYear || !currentSem || !fromRollNo || !toRollNo) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }
  
  const result = await assignMentorsRange({ teacherId, branchId, batchYear, currentSem, fromRollNo, toRollNo });
  res.json({ success: true, message: `Successfully assigned mentor to ${result.count} students`, data: result });
}));

// Bulk import
router.post('/students/bulk', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: { code: 'NO_FILE' } });
  const xlsx = require('xlsx');
  const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
  const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });

  // Normalize headers: lowercase and remove special chars/spaces
  const normalize = (key) => key.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const rows = rawRows.map(row => {
    const normalizedRow = {};
    Object.keys(row).forEach(key => {
      normalizedRow[normalize(key)] = row[key];
    });
    return normalizedRow;
  });

  const dbBranches = await db.branch.findMany();
  const dbBatches  = await db.batch.findMany();
  const success = [], failed = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      // Mapping flexible headers
      const name      = (row.name || row.fullname || row.studentname)?.toString().trim();
      const rollNo    = (row.rollno || row.rollnumber || row.enrollmentno || row.id)?.toString().trim();
      const email     = (row.email || row.emailid || row.useremail)?.toString().trim();
      const batchIn   = row.batchyear || row.batch || row.year;
      const branchIn  = row.branchname || row.branch || row.department;
      const sem       = row.semester || row.sem || 1;

      if (!name || !rollNo || !email || !batchIn) {
        let missing = [];
        if(!name) missing.push('Name');
        if(!rollNo) missing.push('Roll No');
        if(!email) missing.push('Email');
        if(!batchIn) missing.push('Batch Year');
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
      }

      // 1. Resolve Batch
      const batchYear = parseInt(batchIn);
      const matchedBatch = dbBatches.find(b => b.year === batchYear);
      if (!matchedBatch) throw new Error(`Batch Year "${batchIn}" not found in database. Create it first.`);

      // 2. Resolve Branch
      let branchId = row.branchid;
      if (!branchId && branchIn) {
        const matchedBranch = dbBranches.find(b => 
          b.name.toLowerCase().trim() === branchIn.toString().toLowerCase().trim() ||
          normalize(b.name) === normalize(branchIn.toString())
        );
        if (matchedBranch) branchId = matchedBranch.id;
        else throw new Error(`Branch "${branchIn}" not found in database`);
      }

      if (!branchId) throw new Error('Branch Name or Branch ID is required');

      await createStudent({ 
        name, 
        rollNo, 
        email, 
        batchYear: batchYear.toString(),
        branchId,
        currentSem: parseInt(sem) || 1
      });
      success.push(rollNo);
    } catch (err) {
      failed.push({ row: i + 2, roll_no: row.rollno || row.rollnumber || 'NA', reason: err.message || err.code || 'Internal Error' });
    }
  }
  const status = failed.length === 0 ? 201 : success.length === 0 ? 400 : 207;
  res.status(status).json({
    success: true,
    data: { created: success.length, failed: failed.length, errors: failed }
  });
}));

// ── TEACHERS ──────────────────────────────────────────────────────────────────

const bcrypt = require('bcrypt');

router.get('/teachers', asyncHandler(async (req, res) => {
  const teachers = await db.teacher.findMany({
    where: { user: { isDeleted: false } },
    include: { 
      user: { select: { email: true } },
      _count: { select: { mentees: true } }
    },
    orderBy: { name: 'asc' }
  });
  res.json({ success: true, data: teachers });
}));

router.post('/teachers', asyncHandler(async (req, res) => {
  const { name, employeeId, email, department, designation, phone } = req.body;
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return res.status(409).json({ success: false, error: { code: 'EMAIL_ALREADY_EXISTS' } });

  const password = employeeId || 'Teacher@123'; 
  const hash     = await bcrypt.hash(password, 12);

  const user = await db.$transaction(async (tx) => {
    const u = await tx.user.create({ data: { email: email.toLowerCase(), password: hash, role: 'TEACHER' } });
    await tx.teacher.create({ data: { id: u.id, name, employeeId, department, designation, phone } }); 
    return u;
  });
  console.log(`📧 New teacher: ${email} | Password (ID): ${password}`);
  res.status(201).json({ success: true, message: `Teacher created. Default password is ${password}`, data: { id: user.id, email, name, tempPassword: password } });
}));

router.post('/teachers/bulk', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: { code: 'NO_FILE' } });
  const xlsx = require('xlsx');
  const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
  const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });

  // Normalize headers
  const normalize = (key) => key.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const rows = rawRows.map(row => {
    const n = {};
    Object.keys(row).forEach(k => n[normalize(k)] = row[k]);
    return n;
  });

  const success = [], failed = [];
  const bcrypt = require('bcrypt');

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const name = (row.name || row.fullname || row.teachername)?.toString().trim();
      const empId = (row.employeeid || row.empid || row.id)?.toString().trim();
      const email = (row.email || row.emailid || row.useremail)?.toString().trim().toLowerCase();
      const dept = (row.department || row.dept)?.toString().trim();
      const designation = (row.designation || row.post || row.role || row.rank)?.toString().trim();
      const phone = (row.phone || row.mobile || row.contact)?.toString().trim();

      if (!name || !email) throw new Error('Name and Email are required');

      const existing = await db.user.findUnique({ where: { email } });
      if (existing) throw new Error(`Email ${email} already registered`);

      const password = empId || 'Teacher@123';
      const hash = await bcrypt.hash(password, 12);

      await db.$transaction(async (tx) => {
        const u = await tx.user.create({ data: { email, password: hash, role: 'TEACHER' } });
        await tx.teacher.create({ data: { id: u.id, name, employeeId: empId, department: dept, designation, phone } });
      });

      success.push(email);
    } catch (err) {
      failed.push({ row: i + 2, email: row.Email || 'NA', reason: err.message });
    }
  }

  const status = failed.length === 0 ? 201 : success.length === 0 ? 400 : 207;
  res.status(status).json({
    success: true,
    data: { created: success.length, failed: failed.length, errors: failed }
  });
}));

router.delete('/teachers/:id', asyncHandler(async (req, res) => {
  const teacherId = req.params.id;
  const teacher = await db.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) throw { status: 404, code: 'TEACHER_NOT_FOUND' };

  await db.$transaction(async (tx) => {
    // Soft delete the user record
    await tx.user.update({
      where: { id: teacherId },
      data: { isDeleted: true, isActive: false }
    });

    // Create audit log
    await tx.auditLog.create({
      data: { 
        userId: req.user.sub, 
        action: 'TEACHER_DELETED', 
        entityType: 'teachers', 
        entityId: teacherId,
        newValue: { status: 'DELETED (SOFT)', name: teacher.name } 
      }
    });
  });

  res.json({ success: true, message: `Teacher "${teacher.name}" deleted` });
}));

// ── SYLLABUS ──────────────────────────────────────────────────────────────────
router.get('/syllabus-versions', asyncHandler(async (req, res) => {
  const versions = await db.syllabusVersion.findMany({ orderBy: { versionName: 'desc' } });
  res.json({ success: true, data: versions });
}));

router.post('/syllabus-versions', asyncHandler(async (req, res) => {
  const { versionName, description } = req.body;
  const version = await db.syllabusVersion.create({ data: { versionName, description } });
  res.status(201).json({ success: true, data: version });
}));

router.get('/subjects', getSubjects);
router.post('/create-subject', createSubject);

// ── PROMOTION ─────────────────────────────────────────────────────────────────
router.post('/promotion/open', asyncHandler(async (req, res) => {
  const { academicYear, semester, courseName } = req.body;
  const active = await db.activeSemester.upsert({
    where: { academicYear_semester_courseName: { academicYear, semester: parseInt(semester), courseName } },
    create: { academicYear, semester: parseInt(semester), courseName, registrationOpen: true, openedAt: new Date() },
    update: { registrationOpen: true, openedAt: new Date(), closedAt: null }
  });

  // Generate codes for all teachers
  const teachers = await db.teacher.findMany({ where: { user: { isDeleted: false } } });
  const codes = [];
  for (const t of teachers) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    await db.registrationCode.upsert({
      where: { activeSemId_teacherId: { activeSemId: active.id, teacherId: t.id } },
      create: { activeSemId: active.id, teacherId: t.id, code, isActive: true, usedCount: 0 },
      update: { code, isActive: true, usedCount: 0 }
    });
    codes.push({ teacher: t.name, code });
  }
  res.json({ success: true, message: 'Registration window opened', data: { active, codes } });
}));

router.post('/promotion/close', asyncHandler(async (req, res) => {
  await db.activeSemester.updateMany({
    where: { registrationOpen: true },
    data: { registrationOpen: false, closedAt: new Date() }
  });
  await db.registrationCode.updateMany({ where: { isActive: true }, data: { isActive: false } });
  res.json({ success: true, message: 'Registration window closed' });
}));

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
router.get('/notifications', asyncHandler(async (req, res) => {
  const notifs = await db.notification.findMany({
    where: { userId: req.user.sub },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  res.json({ success: true, data: notifs });
}));

// ── DELETE SUBJECT (hard delete) ──────────────────────────────────────────
router.delete('/subjects/:id', asyncHandler(async (req, res) => {
  const subject = await db.subject.findUnique({ where: { id: req.params.id } });
  if (!subject) throw { status: 404, code: 'SUBJECT_NOT_FOUND' };

  // Check if any students are enrolled in this subject
  const enrolled = await db.studentSubjectEnrollment.count({
    where: { subjectId: req.params.id, isActive: true }
  });
  if (enrolled > 0) throw { status: 409, code: 'SUBJECT_HAS_ENROLLMENTS',
    message: `${enrolled} students are enrolled. Please unenroll them first.` };

  try {
    await db.subject.delete({
      where: { id: req.params.id }
    });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(409).json({ success: false, message: 'Cannot delete subject because it is linked to attendance, exams, or timetable slots.' });
    }
    throw error;
  }

  await db.auditLog.create({
    data: { userId: req.user.sub, action: 'SUBJECT_DELETED',
            entityType: 'subjects', entityId: req.params.id,
            newValue: { isDeleted: true, name: subject.name, code: subject.code } }
  });

  res.json({ success: true, message: `Subject "${subject.name}" deleted` });
}));

// ── BATCH SYLLABUS ASSIGNMENT ─────────────────────────────────────────────
router.post('/batch-syllabus', assignBatchSyllabus);

router.get('/batch-syllabus', asyncHandler(async (req, res) => {
  const assignments = await db.batchSyllabus.findMany({
    include: {
      batch:          { select: { year: true } },
      branch:         { select: { name: true } },
      syllabusVersion:{ select: { versionName: true } }
    },
    orderBy: [{ batch: { year: 'desc' } }, { branch: { name: 'asc' } }]
  });
  res.json({ success: true, data: assignments });
}));

router.delete('/batch-syllabus/:id', asyncHandler(async (req, res) => {
  await db.batchSyllabus.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Assignment removed' });
}));


// ── FEE REPORTS ───────────────────────────────────────────────────────────────
router.get('/fee-reports/status', asyncHandler(async (req, res) => {
  const { batchId, status = 'all' } = req.query;
  if (!batchId) throw { status: 400, code: 'BATCH_REQUIRED', message: 'Please select a batch' };

  const students = await db.student.findMany({
    where: { user: { isDeleted: false }, batchId },
    select: {
      id: true, rollNo: true, name: true, phone: true,
      user: { select: { email: true } },
      branch: { select: { name: true } },
      feeProfile: { select: { ledgers: { select: { baseFeeDue: true, hostelFeeDue: true, busFeeDue: true, totalPaid: true, scholarshipVerified: true } } } }
    },
    orderBy: { rollNo: 'asc' }
  });

  let report = students.map(s => {
    const isSetup = !!s.feeProfile;
    let payable = 0, paid = 0;
    if (isSetup) {
       s.feeProfile.ledgers.forEach(l => {
          payable += Number(l.baseFeeDue) + Number(l.hostelFeeDue) + Number(l.busFeeDue);
          paid += Number(l.totalPaid) + Number(l.scholarshipVerified);
       });
    }
    const outstanding = payable - paid;
    return {
      id: s.id, rollNo: s.rollNo, name: s.name,
      email: s.user?.email, phone: s.phone || '—',
      branch: s.branch?.name,
      isSetup, payable, paid, outstanding
    };
  });

  if (status === 'paid') report = report.filter(s => s.isSetup && s.outstanding <= 0);
  else if (status === 'defaulter') report = report.filter(s => !s.isSetup || s.outstanding > 0);

  res.json({ success: true, count: report.length, data: report });
}));

// ── ADMIN STUDENT FEE DETAILS ─────────────────────────────────────────────────
router.get('/students/:id/fee-account', asyncHandler(async (req, res) => {
  const profile = await db.studentFeeProfile.findUnique({
    where: { studentId: req.params.id },
    include: {
      student: { select: { name: true, rollNo: true } },
      hostelRoom: true, busRoute: true, messPlan: true,
      ledgers: { include: { transactions: { orderBy: { paymentDate: 'desc' } } } }
    }
  });
  
  if (!profile) return res.json({ success: true, data: null });
  const fines = await db.fine.findMany({ where: { studentId: req.params.id }, orderBy: { fineDate: 'desc' } });

  let totalPayable = 0, totalPaid = 0, totalScholarship = 0;
  let summaryBaseFee = 0, summaryHostelFee = 0, summaryBusFee = 0, summaryMessFee = 0;
  
  profile.ledgers.forEach(l => {
    summaryBaseFee += Number(l.baseFeeDue);
    summaryHostelFee += Number(l.hostelFeeDue);
    summaryBusFee += Number(l.busFeeDue);
    summaryMessFee += Number(l.messFeeDue);

    totalPayable += Number(l.baseFeeDue) + Number(l.hostelFeeDue) + Number(l.busFeeDue) + Number(l.messFeeDue);
    totalPaid += Number(l.totalPaid) + Number(l.scholarshipVerified);
    totalScholarship += Number(l.scholarshipVerified);
  });

  const feeStructure = {
    totalFee: summaryBaseFee,
    hostelFee: summaryHostelFee,
    busFee: summaryBusFee,
    messFee: summaryMessFee
  };

  res.json({ success: true, data: {
    ...profile,
    feeStructure,
    isHostel: profile.isHosteller,
    totalPayable, totalPaid, totalScholarship,
    transactions: profile.ledgers.flatMap(l => l.transactions).sort((a,b) => b.paymentDate - a.paymentDate),
    fines
  }});
}));

module.exports = router;
