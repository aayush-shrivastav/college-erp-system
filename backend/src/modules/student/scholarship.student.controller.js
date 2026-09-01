const db = require('../../config/db');
const asyncHandler = require('../../middlewares/asyncHandler');
const multer = require('multer');
const path = require('path');

// Multer setup for document upload (using memory/local later)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/scholarships/') // Make sure this dir exists in production
  },
  filename: function (req, file, cb) {
    cb(null, req.user.sub + '-' + Date.now() + path.extname(file.originalname))
  }
});
exports.upload = multer({ storage: storage });

// ── STUDENT: ELIGIBILITY ENGINE ─────────────────────────────────────

exports.getEligibleScholarships = asyncHandler(async (req, res) => {
  const studentId = req.user.sub;
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: { 
      feeProfile: true, 
      attendanceSummaries: true,
      examResults: {
        include: {
          exam: {
            include: { subject: true }
          }
        }
      }
    }
  });

  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

  // 1. Formalized CGPA Calculation
  let totalWeightedGP = 0; let totalCredits = 0;
  student.examResults.forEach(er => {
     const obtained = Number(er.secA) + Number(er.secB) + Number(er.secC);
     const max = Number(er.exam.maxMarks || 24);
     const credits = Number(er.exam.subject?.credits || 3);
     const gp = (obtained / max) * 10;
     totalWeightedGP += (gp * credits);
     totalCredits += credits;
  });
  const currentCgpa = totalCredits ? (totalWeightedGP / totalCredits).toFixed(2) : 0;

  // 2. Average Attendance Calculation
  let tConducted = 0; let tAttended = 0;
  student.attendanceSummaries.forEach(as => {
     tConducted += as.totalConducted;
     tAttended += as.totalAttended;
  });
  const avgAttendance = tConducted ? (tAttended / tConducted) * 100 : 0;

  const scholarships = await db.scholarship.findMany({
    where: { isActive: true }
  });

  // Evaluate
  const eligible = [];
  const notEligible = [];

  scholarships.forEach(sch => {
    let reasons = [];
    
    // Check Date
    if (sch.applicationDeadline && new Date() > sch.applicationDeadline) {
      reasons.push('Application deadline has passed.');
    }

    if (!sch.skipMarksFilter) {
      // Check 10th/12th
      if (sch.minTenthPercent && student.tenthPercent && Number(student.tenthPercent) < Number(sch.minTenthPercent)) {
        reasons.push(`Requires ${sch.minTenthPercent}% in 10th.`);
      }
      if (sch.minTwelfthPercent && student.twelfthPercent && Number(student.twelfthPercent) < Number(sch.minTwelfthPercent)) {
        reasons.push(`Requires ${sch.minTwelfthPercent}% in 12th.`);
      }
      // Check CGPA
      if (sch.minCgpa && Number(currentCgpa) < Number(sch.minCgpa)) {
        reasons.push(`Requires CGPA of ${sch.minCgpa}.`);
      }
      // Check Attendance
      if (sch.minAttendancePercent && Number(avgAttendance) < Number(sch.minAttendancePercent)) {
        reasons.push(`Requires ${sch.minAttendancePercent}% attendance (Current: ${avgAttendance.toFixed(1)}%).`);
      }
    }

    // Check Category
    if (sch.category && student.feeProfile?.category !== sch.category) {
      reasons.push(`Only available for ${sch.category} category.`);
    }

    // Check Family Income
    if (sch.familyIncomeLimit && student.familyIncome && Number(student.familyIncome) > Number(sch.familyIncomeLimit)) {
      // Note: If familyIncome field is missing in student model, we might need a profile check
      // For now, checking if student has it
      reasons.push(`Income limit exceeded (Max: ₹${sch.familyIncomeLimit.toLocaleString()}).`);
    }

    if (reasons.length === 0) {
      eligible.push(sch);
    } else {
      notEligible.push({ ...sch, reasons });
    }
  });

  res.json({ success: true, data: { eligible, notEligible, studentMetrics: { currentCgpa, category: student.feeProfile?.category } } });
});

// ── STUDENT: APPLY & TRACK ──────────────────────────────────────────

exports.applyForScholarship = asyncHandler(async (req, res) => {
  const { scholarshipId, academicYear, semester } = req.body;
  const studentId = req.user.sub;

  const existingApp = await db.scholarshipApplication.findUnique({
    where: {
      studentId_scholarshipId_academicYear_semester: {
        studentId, scholarshipId, academicYear, semester: parseInt(semester)
      }
    }
  });

  if (existingApp) {
    return res.status(400).json({ success: false, message: 'You have already applied for this scholarship in this semester.' });
  }

  // Prevent multiple active scholarships in same semester if business rule applies
  const activeApps = await db.scholarshipApplication.count({
    where: { studentId, academicYear, semester: parseInt(semester), status: { in: ['APPROVED', 'PENDING'] } }
  });

  // Example Policy: Only 1 active scholarship per semester 
  if (activeApps >= 1) {
    return res.status(400).json({ success: false, message: 'You already have an active or pending scholarship for this semester.' });
  }

  let documentUrl = null;
  if (req.file) {
    documentUrl = '/uploads/scholarships/' + req.file.filename;
  }

  const app = await db.scholarshipApplication.create({
    data: {
      studentId, scholarshipId, academicYear, semester: parseInt(semester), documentUrl
    }
  });

  res.status(201).json({ success: true, message: 'Application submitted successfully', data: app });
});

exports.getMyApplications = asyncHandler(async (req, res) => {
  const apps = await db.scholarshipApplication.findMany({
    where: { studentId: req.user.sub },
    include: { scholarship: true },
    orderBy: { appliedAt: 'desc' }
  });
  
  res.json({ success: true, data: apps });
});

exports.appealApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body; // could save reason somewhere or add a message log

  const app = await db.scholarshipApplication.findUnique({ where: { id, studentId: req.user.sub } });
  if (!app) return res.status(404).json({ success: false, message: 'Not found' });
  if (app.status !== 'REJECTED') return res.status(400).json({ success: false, message: 'Can only appeal rejected applications' });

  await db.scholarshipApplication.update({
    where: { id },
    data: { status: 'APPEALED', actionAt: new Date() }
  });

  res.json({ success: true, message: 'Appeal submitted.' });
});
