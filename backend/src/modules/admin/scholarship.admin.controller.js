const db = require('../../config/db');
const asyncHandler = require('../../middlewares/asyncHandler');

// ── ADMIN: SCHOLARSHIP SETUP ────────────────────────────────────────

exports.createScholarship = asyncHandler(async (req, res) => {
  const {
    name, description, providerType, defaultAmount, totalBudget,
    applicationDeadline, category, skipMarksFilter,
    minTenthPercent, minTwelfthPercent, minCgpa,
    minAttendancePercent, familyIncomeLimit
  } = req.body;

  const exists = await db.scholarship.findUnique({ where: { name } });
  if (exists) {
    return res.status(409).json({ success: false, message: 'Scholarship name already exists' });
  }

  const sch = await db.scholarship.create({
    data: {
      name, 
      description, 
      providerType: providerType || 'COLLEGE', 
      defaultAmount: Number(defaultAmount), 
      totalBudget: totalBudget ? Number(totalBudget) : null,
      applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
      category: category || null, 
      skipMarksFilter: skipMarksFilter || false,
      minTenthPercent: minTenthPercent ? Number(minTenthPercent) : null, 
      minTwelfthPercent: minTwelfthPercent ? Number(minTwelfthPercent) : null, 
      minCgpa: minCgpa ? Number(minCgpa) : null,
      minAttendancePercent: minAttendancePercent ? Number(minAttendancePercent) : null, 
      familyIncomeLimit: familyIncomeLimit ? Number(familyIncomeLimit) : null
    }
  });

  res.status(201).json({ success: true, message: 'Scholarship created', data: sch });
});

exports.getScholarships = asyncHandler(async (req, res) => {
  const scholarships = await db.scholarship.findMany({
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data: scholarships });
});

exports.updateScholarship = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };
  if (updateData.applicationDeadline) {
    updateData.applicationDeadline = new Date(updateData.applicationDeadline);
  }

  const sch = await db.scholarship.update({
    where: { id },
    data: updateData
  });
  res.json({ success: true, message: 'Scholarship updated', data: sch });
});

// ── ADMIN: APPLICATION VERIFICATION ─────────────────────────────────

exports.getApplications = asyncHandler(async (req, res) => {
  const applications = await db.scholarshipApplication.findMany({
    include: {
      student: { select: { id: true, name: true, rollNo: true, currentSem: true } },
      scholarship: { select: { name: true, providerType: true, defaultAmount: true } }
    },
    orderBy: { appliedAt: 'desc' }
  });
  res.json({ success: true, data: applications });
});

exports.approveApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approvedAmount } = req.body;
  const adminId = req.user.sub;

  const app = await db.scholarshipApplication.findUnique({
    where: { id },
    include: { scholarship: true, student: true }
  });

  if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
  if (app.status === 'APPROVED') return res.status(400).json({ success: false, message: 'Already approved' });

  const finalAmount = approvedAmount || app.scholarship.defaultAmount;

  // Run transaction to Approve -> Deduct Budget -> Update Student Ledger -> Add synthetic Transaction
  await db.$transaction(async (tx) => {
    // 1. Update Application status
    await tx.scholarshipApplication.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAmount: finalAmount,
        actionBy: adminId,
        actionAt: new Date()
      }
    });

    // 2. Update Scholarship disbursed amount constraint
    if (app.scholarship.totalBudget) {
      const budgetRemaining = Number(app.scholarship.totalBudget) - Number(app.scholarship.disbursedAmount);
      if (budgetRemaining < Number(finalAmount)) {
        throw new Error('Insufficient scholarship budget');
      }
    }

    await tx.scholarship.update({
      where: { id: app.scholarshipId },
      data: { disbursedAmount: { increment: finalAmount } }
    });

    // 3. Find Ledger for current academic year & semester
    const profile = await tx.studentFeeProfile.findUnique({
      where: { studentId: app.studentId },
      include: { ledgers: { where: { semester: app.semester } } }
    });

    if (profile && profile.ledgers.length > 0) {
      const ledger = profile.ledgers[0];
      
      // Update Verified Scholarship amount
      await tx.studentLedger.update({
        where: { id: ledger.id },
        data: { scholarshipVerified: { increment: finalAmount } }
      });

      // Insert virtual transaction for clear audit logs
      await tx.transaction.create({
        data: {
          ledgerId: ledger.id,
          amount: finalAmount,
          paymentMode: 'SCHOLARSHIP',
          receiptNo: `SCH-${app.id.substring(0,8).toUpperCase()}`,
          status: 'SUCCESS',
          remarks: `Scholarship Approved: ${app.scholarship.name}`,
          processedBy: adminId
        }
      });
    }

    // 4. Dispatch Notification
    await tx.notification.create({
      data: {
        userId: app.studentId, // ID of student's user account
        title: 'Scholarship Approved 🎉',
        message: `Your application for ${app.scholarship.name} has been approved for ₹${finalAmount}.`,
        type: 'SCHOLARSHIP'
      }
    });
  });

  res.json({ success: true, message: 'Application approved and ledger adjusted successfully' });
});

exports.rejectApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejectionReason } = req.body;
  
  if (!rejectionReason) {
    return res.status(400).json({ success: false, message: 'Rejection reason is required' });
  }

  const app = await db.scholarshipApplication.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejectionReason,
      actionBy: req.user.sub,
      actionAt: new Date()
    },
    include: { scholarship: true, student: true }
  });

  await db.notification.create({
    data: {
      userId: app.studentId,
      title: 'Scholarship Update',
      message: `Your application for ${app.scholarship.name} was rejected. Reason: ${rejectionReason}`,
      type: 'SCHOLARSHIP'
    }
  });

  res.json({ success: true, message: 'Application rejected' });
});

// ── ADMIN: ANALYTICS ────────────────────────────────────────────────

exports.getAnalytics = asyncHandler(async (req, res) => {
  const scholarships = await db.scholarship.findMany();
  let totalFund = 0, totalDisbursed = 0;
  
  scholarships.forEach(s => {
    totalFund += Number(s.totalBudget || 0);
    totalDisbursed += Number(s.disbursedAmount || 0);
  });

  const pendingApplications = await db.scholarshipApplication.count({
    where: { status: 'PENDING' }
  });

  const totalApplications = await db.scholarshipApplication.count();

  res.json({
    success: true,
    data: {
      totalFund,
      totalDisbursed,
      remainingFund: totalFund - totalDisbursed,
      pendingApplications,
      totalApplications
    }
  });
});
