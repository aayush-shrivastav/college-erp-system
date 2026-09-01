// src/modules/accounts/accounts.routes.js
const router       = require('express').Router();
const asyncHandler = require('../../middlewares/asyncHandler');
const { verifyToken } = require('../../middlewares/verifyToken');
const { verifyRole }  = require('../../middlewares/checkPermission');
const db = require('../../config/db');

router.use(verifyToken, verifyRole('ACCOUNTS'));

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
router.get('/dashboard', asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0,0,0,0);

  const [
    todayCol, allCol, unpaidFines, totalStudents, profilesSetup, recentPayments
  ] = await Promise.all([
    db.transaction.aggregate({ where: { paymentDate: { gte: today } }, _sum: { amount: true }, _count: true }),
    db.transaction.aggregate({ _sum: { amount: true } }),
    db.fine.aggregate({ where: { isPaid: false }, _sum: { amount: true }, _count: true }),
    db.student.count({ where: { user: { isDeleted: false } } }),
    db.studentFeeProfile.count(),
    db.transaction.findMany({ 
      take: 5, 
      orderBy: { createdAt: 'desc' }, 
      include: { ledger: { include: { studentFeeProfile: { include: { student: { select: { name: true, rollNo: true } } } } } } } 
    })
  ]);

  res.json({
    success: true,
    data: {
      todayCollection: todayCol._sum.amount || 0,
      todayPaymentCount: todayCol._count || 0,
      totalCollection: allCol._sum.amount || 0,
      unpaidFinesAmount: unpaidFines._sum.amount || 0,
      unpaidFinesCount: unpaidFines._count || 0,
      totalStudents,
      accountsSetup: profilesSetup,
      noAccount: Math.max(0, totalStudents - profilesSetup),
      recentPayments
    }
  });
}));

// ── FEE MASTERS ────────────────────────────────────────────────────────────
router.get('/fee-masters', asyncHandler(async (req, res) => {
  const masters = await db.feeMaster.findMany({ 
    include: { batch: true, branch: true },
    orderBy: [{ batch: { year: 'desc' } }, { semester: 'asc' }]
  });
  res.json({ success: true, data: masters });
}));

router.post('/fee-masters', asyncHandler(async (req, res) => {
  const { batchId, branchId, semester, tuitionFee, developmentFee, examFee, hostelFee, busFee, messFee, otherFee } = req.body;
  if (!batchId || !branchId || semester === undefined) throw { status: 400, code: 'MISSING_FIELDS' };
  
  const totalFee = Number(tuitionFee||0) + Number(developmentFee||0) + Number(examFee||0) + 
                 Number(hostelFee||0) + Number(busFee||0) + Number(messFee||0) + Number(otherFee||0);
  
  const master = await db.feeMaster.upsert({
    where: { batchId_branchId_semester: { batchId, branchId, semester: parseInt(semester) } },
    create: { 
      batchId, branchId, semester: parseInt(semester), 
      tuitionFee: Number(tuitionFee||0), 
      developmentFee: Number(developmentFee||0), 
      examFee: Number(examFee||0),
      hostelFee: Number(hostelFee||0),
      busFee: Number(busFee||0),
      messFee: Number(messFee||0),
      otherFee: Number(otherFee||0),
      totalFee 
    },
    update: { 
      tuitionFee: Number(tuitionFee||0), 
      developmentFee: Number(developmentFee||0), 
      examFee: Number(examFee||0),
      hostelFee: Number(hostelFee||0),
      busFee: Number(busFee||0),
      messFee: Number(messFee||0),
      otherFee: Number(otherFee||0),
      totalFee 
    }
  });
  res.status(201).json({ success: true, data: master });
}));

router.delete('/fee-masters/:id', asyncHandler(async (req, res) => {
  await db.feeMaster.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Fee master deleted' });
}));

// ── HOSTEL & BUS MASTERS ─────────────────────────────────────────────────────
router.get('/hostels', asyncHandler(async (req, res) => {
  const hostels = await db.hostelRoom.findMany();
  res.json({ success: true, data: hostels });
}));
router.post('/hostels', asyncHandler(async (req, res) => {
  const { roomType, feeAmount, capacity } = req.body;
  res.status(201).json({ success: true, data: await db.hostelRoom.create({ data: { roomType, feeAmount: Number(feeAmount), capacity: parseInt(capacity) || 3 } }) });
}));

router.delete('/hostels/:id', asyncHandler(async (req, res) => {
  const linked = await db.studentFeeProfile.count({ where: { hostelRoomId: req.params.id } });
  if (linked > 0) throw { status: 400, message: `Cannot delete: ${linked} students are currently assigned to this hostel.` };
  await db.hostelRoom.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Hostel deleted' });
}));

router.get('/buses', asyncHandler(async (req, res) => {
  const buses = await db.busRoute.findMany();
  res.json({ success: true, data: buses });
}));
router.post('/buses', asyncHandler(async (req, res) => {
  const { routeName, feeAmount, stops } = req.body;
  res.status(201).json({ success: true, data: await db.busRoute.create({ data: { routeName, feeAmount: Number(feeAmount), stops } }) });
}));

router.delete('/buses/:id', asyncHandler(async (req, res) => {
  const linked = await db.studentFeeProfile.count({ where: { busRouteId: req.params.id } });
  if (linked > 0) throw { status: 400, message: `Cannot delete: ${linked} students are currently using this bus route.` };
  await db.busRoute.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Bus route deleted' });
}));

router.get('/mess', asyncHandler(async (req, res) => {
  const mess = await db.messPlan.findMany();
  res.json({ success: true, data: mess });
}));
router.post('/mess', asyncHandler(async (req, res) => {
  const { planName, feeAmount, description } = req.body;
  res.status(201).json({ success: true, data: await db.messPlan.create({ data: { planName, feeAmount: Number(feeAmount), description } }) });
}));

router.delete('/mess/:id', asyncHandler(async (req, res) => {
  const linked = await db.studentFeeProfile.count({ where: { messPlanId: req.params.id } });
  if (linked > 0) throw { status: 400, message: `Cannot delete: ${linked} students are currently on this mess plan.` };
  await db.messPlan.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Mess plan deleted' });
}));

// ── STUDENT FEE PROFILES ──────────────────────────────────────────────────────
router.get('/students/search', asyncHandler(async (req, res) => {
  const { q, batchId } = req.query;
  const where = {
    user: { isDeleted: false },
    ...(batchId && { batchId })
  };
  
  if (q && q.length >= 2) {
    where.OR = [
      { name:   { contains: q, mode: 'insensitive' } },
      { rollNo: { contains: q, mode: 'insensitive' } }
    ];
  }

  const students = await db.student.findMany({
    where,
    take: 50,
    select: {
      id: true, rollNo: true, name: true, batch: { select: { year: true } }, currentSem: true,
      user: { select: { email: true } },
      feeProfile: { 
        select: { 
          id: true, 
          ledgers: { 
            // Select ledger for current semester to show balance in sidebar
            orderBy: { semester: 'desc' },
            take: 5 // Get some history too
          } 
        } 
      }
    },
    take: 50
  });

  const formatted = students.map(s => {
    const currentLedger = s.feeProfile?.ledgers?.find(l => l.semester === s.currentSem);
    const netDue = currentLedger ? Number(currentLedger.netDue) : null;
    return { ...s, currentNetDue: netDue };
  });

  res.json({ success: true, data: formatted });
}));

router.get('/students/:id/fee-account', asyncHandler(async (req, res) => {
  const profile = await db.studentFeeProfile.findUnique({
    where: { studentId: req.params.id },
    include: {
      student: { select: { rollNo: true, name: true, batchId: true, branchId: true, currentSem: true, batch: { select: { year: true } } } },
      hostelRoom: true,
      busRoute: true,
      messPlan: true,
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
    const messPlanObj = (profile.usesMess && profile.messPlanId) ? await db.messPlan.findUnique({ where: { id: profile.messPlanId } }) : null;

    const hostelFee = hostelRoom ? Number(hostelRoom.feeAmount) : 0;
    const busFee = busRouteObj ? Number(busRouteObj.feeAmount) : 0;
    const messFee = messPlanObj ? Number(messPlanObj.feeAmount) : 0;

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
        hostelRoom: true, busRoute: true, messPlan: true,
        ledgers: { include: { transactions: { orderBy: { createdAt: 'desc' } } } }
      }
    });
    profile.ledgers = updatedProfile.ledgers;
  }

  let totalPayable = 0, totalPaid = 0;
  profile.ledgers.forEach(l => {
    totalPayable += Number(l.baseFeeDue) + Number(l.hostelFeeDue) + Number(l.busFeeDue) + Number(l.messFeeDue);
    totalPaid += Number(l.totalPaid) + Number(l.scholarshipVerified);
  });

  const fines = await db.fine.findMany({ where: { studentId: req.params.id }, orderBy: { createdAt: 'desc' } });
  const unpaidFines = fines.filter(f => !f.isPaid).reduce((s,f) => s + Number(f.amount), 0);
  
  res.json({ success: true, data: {
    ...profile,
    totalPayable,
    totalPaid,
    outstanding: totalPayable - totalPaid + unpaidFines,
    fines,
    transactions: profile.ledgers.flatMap(l => l.transactions.map(t => ({ ...t, semester: l.semester }))).sort((a,b) => b.createdAt - a.createdAt)
  }});
}));

router.post('/students/:id/fee-account', asyncHandler(async (req, res) => {
  const { category, isHosteller, hostelRoomId, usesBus, busRouteId, usesMess, messPlanId, hasScholarship, scholarshipName } = req.body;
  
  const profile = await db.studentFeeProfile.upsert({
    where: { studentId: req.params.id },
    create: { 
      studentId: req.params.id, category: category || 'GENERAL',
      isHosteller: !!isHosteller, hostelRoomId: isHosteller ? hostelRoomId : null,
      usesBus: !!usesBus, busRouteId: usesBus ? busRouteId : null,
      usesMess: !!usesMess, messPlanId: usesMess ? messPlanId : null,
      hasScholarship: !!hasScholarship, scholarshipName: hasScholarship ? scholarshipName : null
    },
    update: { 
      category: category || 'GENERAL',
      isHosteller: !!isHosteller, hostelRoomId: isHosteller ? hostelRoomId : null,
      usesBus: !!usesBus, busRouteId: usesBus ? busRouteId : null,
      usesMess: !!usesMess, messPlanId: usesMess ? messPlanId : null,
      hasScholarship: !!hasScholarship, scholarshipName: hasScholarship ? scholarshipName : null
    }
  });

  // Calculate ledgers for all 8 semesters automatically
  const student = await db.student.findUnique({ where: { id: req.params.id } });
  
  const courseMaster = await db.feeMaster.findUnique({
    where: { batchId_branchId_semester: { batchId: student.batchId, branchId: student.branchId, semester: 0 } }
  });

  const hostelRoom = (isHosteller && hostelRoomId) ? await db.hostelRoom.findUnique({ where: { id: hostelRoomId } }) : null;
  const busRouteObj = (usesBus && busRouteId) ? await db.busRoute.findUnique({ where: { id: busRouteId } }) : null;
  const messPlanObj = (usesMess && messPlanId) ? await db.messPlan.findUnique({ where: { id: messPlanId } }) : null;

  const hostelFee = hostelRoom ? Number(hostelRoom.feeAmount) : 0;
  const busFee = busRouteObj ? Number(busRouteObj.feeAmount) : 0;
  const messFee = messPlanObj ? Number(messPlanObj.feeAmount) : 0;

  for (let sem = 1; sem <= 8; sem++) {
    let feeMaster = await db.feeMaster.findUnique({
      where: { batchId_branchId_semester: { batchId: student.batchId, branchId: student.branchId, semester: sem } }
    });

    if (!feeMaster && courseMaster) {
      feeMaster = {
        totalFee: (Number(courseMaster.totalFee) / 8),
        semester: sem
      };
    }

    if (feeMaster) {
      const existingLedger = await db.studentLedger.findUnique({
        where: { studentFeeProfileId_semester: { studentFeeProfileId: profile.id, semester: sem } }
      });

      const totalPaid = existingLedger ? Number(existingLedger.totalPaid) : 0;
      const verifiedSchol = existingLedger ? Number(existingLedger.scholarshipVerified) : 0;
      const targetNetDue = Number(feeMaster.totalFee) + hostelFee + busFee + messFee - totalPaid - verifiedSchol;

      await db.studentLedger.upsert({
        where: { studentFeeProfileId_semester: { studentFeeProfileId: profile.id, semester: sem } },
        create: {
          studentFeeProfileId: profile.id, semester: sem,
          baseFeeDue: feeMaster.totalFee, hostelFeeDue: hostelFee, busFeeDue: busFee, messFeeDue: messFee,
          netDue: targetNetDue
        },
        update: {
          baseFeeDue: feeMaster.totalFee, hostelFeeDue: hostelFee, busFeeDue: busFee, messFeeDue: messFee,
          netDue: targetNetDue
        }
      });
    }
  }

  res.json({ success: true, data: profile });
}));

router.post('/students/bulk-fee-profile', asyncHandler(async (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    throw { status: 400, code: 'INVALID_DATA', message: 'Students array required' };
  }

  // Pre-fetch all facilities to resolve IDs quickly in memory
  const [dbHostels, dbBuses, dbMess] = await Promise.all([
    db.hostelRoom.findMany(),
    db.busRoute.findMany(),
    db.messPlan.findMany()
  ]);

  let successCount = 0;
  const errors = [];

  for (const row of students) {
    try {
      if (!row['Roll No']) {
        errors.push({ row, error: 'Roll No is required' });
        continue;
      }

      const rollNo = row['Roll No'].toString().trim();
      const student = await db.student.findUnique({ where: { rollNo } });
      if (!student) {
        errors.push({ rollNo, error: 'Student not found in database' });
        continue;
      }

      const category = row['Fee Category'] || 'GENERAL';
      const hostelName = row['Hostel Room Type']?.toString().trim();
      const busName = row['Bus Route Name']?.toString().trim();
      const messName = row['Mess Plan Name']?.toString().trim();

      const matchedHostel = hostelName ? dbHostels.find(h => h.roomType.toLowerCase() === hostelName.toLowerCase()) : null;
      const matchedBus = busName ? dbBuses.find(b => b.routeName.toLowerCase() === busName.toLowerCase()) : null;
      const matchedMess = messName ? dbMess.find(m => m.planName.toLowerCase() === messName.toLowerCase()) : null;

      // Ensure profile exists
      const profile = await db.studentFeeProfile.upsert({
        where: { studentId: student.id },
        create: {
          studentId: student.id, category,
          isHosteller: !!matchedHostel, hostelRoomId: matchedHostel ? matchedHostel.id : null,
          usesBus: !!matchedBus, busRouteId: matchedBus ? matchedBus.id : null,
          usesMess: !!matchedMess, messPlanId: matchedMess ? matchedMess.id : null,
          hasScholarship: false
        },
        update: {
          category,
          isHosteller: !!matchedHostel, hostelRoomId: matchedHostel ? matchedHostel.id : null,
          usesBus: !!matchedBus, busRouteId: matchedBus ? matchedBus.id : null,
          usesMess: !!matchedMess, messPlanId: matchedMess ? matchedMess.id : null
        }
      });

      // Calculate ledgers for all 8 semesters automatically
      const courseMaster = await db.feeMaster.findUnique({
        where: { batchId_branchId_semester: { batchId: student.batchId, branchId: student.branchId, semester: 0 } }
      });

      const hostelFee = matchedHostel ? Number(matchedHostel.feeAmount) : 0;
      const busFee = matchedBus ? Number(matchedBus.feeAmount) : 0;
      const messFee = matchedMess ? Number(matchedMess.feeAmount) : 0;

      for (let sem = 1; sem <= 8; sem++) {
        let feeMaster = await db.feeMaster.findUnique({
          where: { batchId_branchId_semester: { batchId: student.batchId, branchId: student.branchId, semester: sem } }
        });

        if (!feeMaster && courseMaster) {
          feeMaster = {
            totalFee: (Number(courseMaster.totalFee) / 8),
            semester: sem
          };
        }

        if (feeMaster) {
          const existingLedger = await db.studentLedger.findUnique({
            where: { studentFeeProfileId_semester: { studentFeeProfileId: profile.id, semester: sem } }
          });

          const totalPaid = existingLedger ? Number(existingLedger.totalPaid) : 0;
          const verifiedSchol = existingLedger ? Number(existingLedger.scholarshipVerified) : 0;
          const targetNetDue = Number(feeMaster.totalFee) + hostelFee + busFee + messFee - totalPaid - verifiedSchol;
          
          await db.studentLedger.upsert({
            where: { studentFeeProfileId_semester: { studentFeeProfileId: profile.id, semester: sem } },
            create: {
              studentFeeProfileId: profile.id, semester: sem,
              baseFeeDue: feeMaster.totalFee, hostelFeeDue: hostelFee, busFeeDue: busFee, messFeeDue: messFee,
              netDue: targetNetDue
            },
            update: {
              baseFeeDue: feeMaster.totalFee, hostelFeeDue: hostelFee, busFeeDue: busFee, messFeeDue: messFee,
              netDue: targetNetDue
            }
          });
        }
      }

      successCount++;
    } catch (err) {
      errors.push({ row, error: err.message });
    }
  }

  res.json({ success: true, meta: { totalProcessed: students.length, successCount, failCount: errors.length, errors } });
}));

// ── PAYMENTS ──────────────────────────────────────────────────────────────────
router.post('/payments', asyncHandler(async (req, res) => {
  const { ledgerId, studentId, amount, paymentMode, referenceNo, receiptNo, remarks } = req.body;
  if (!ledgerId || !amount || !receiptNo) throw { status: 400, code: 'MISSING_FIELDS' };

  const totalAmount = Number(amount);

  const txRows = await db.$transaction(async (tx) => {
    // Check for duplicate receipt
    const dup = await tx.transaction.findUnique({ where: { receiptNo } });
    if (dup) throw { status: 409, code: 'DUPLICATE_RECEIPT_NO' };

    let ledgersToPay = [];
    
    if (ledgerId === 'ALL') {
      if (!studentId) throw { status: 400, code: 'MISSING_STUDENT_ID' };
      const profile = await tx.studentFeeProfile.findUnique({
        where: { studentId },
        include: { ledgers: { orderBy: { semester: 'asc' } } }
      });
      if (!profile || profile.ledgers.length === 0) throw { status: 404, code: 'FEE_PROFILE_NOT_FOUND' };
      ledgersToPay = profile.ledgers;
    } else {
      const singleLedger = await tx.studentLedger.findUnique({ where: { id: ledgerId }, include: { studentFeeProfile: true } });
      if (!singleLedger) throw { status: 404, code: 'LEDGER_NOT_FOUND' };
      ledgersToPay = [singleLedger];
    }

    const createdTxns = [];
    let remainingAmount = totalAmount;

    for (let i = 0; i < ledgersToPay.length; i++) {
      const curLedger = ledgersToPay[i];
      if (remainingAmount <= 0) break;
      
      const due = Number(curLedger.netDue) > 0 ? Number(curLedger.netDue) : 0;
      let allocated = 0;

      if (ledgerId !== 'ALL' || i === ledgersToPay.length - 1) {
        // Dump all remaining money into the exact ledger (or the last ledger for advance credit)
        allocated = remainingAmount;
      } else {
        if (due <= 0) continue; // Skip fully paid semesters
        allocated = Math.min(due, remainingAmount);
      }

      if (allocated <= 0) continue;

      const effectiveReceiptNo = createdTxns.length === 0 ? receiptNo : `${receiptNo}-${createdTxns.length + 1}`;
      const effectiveRemarks = ledgerId === 'ALL' ? `Bulk Allocation (${receiptNo})` : remarks;

      const row = await tx.transaction.create({
        data: {
          ledgerId: curLedger.id, amount: allocated,
          paymentMode: paymentMode || 'CASH', referenceNo, receiptNo: effectiveReceiptNo, paymentDate: new Date(),
          processedBy: req.user.sub, remarks: effectiveRemarks
        }
      });
      createdTxns.push(row);
      
      await tx.studentLedger.update({
        where: { id: curLedger.id },
        data: { totalPaid: { increment: allocated }, netDue: { decrement: allocated } }
      });

      remainingAmount -= allocated;
    }

    const targetUserId = ledgerId === 'ALL' ? studentId : ledgersToPay[0].studentFeeProfile.studentId;
    await tx.notification.create({
      data: { userId: targetUserId, title: 'Fee Payment Confirmed', message: `Payment of ₹${totalAmount.toLocaleString()} received. Receipt: ${receiptNo}`, type: 'FEE', actionUrl: '/student/fee' }
    });

    return createdTxns;
  });
  
  res.status(201).json({ success: true, message: 'Payment recorded', data: txRows[0] || {} });
}));

router.delete('/payments/:id', asyncHandler(async (req, res) => {
  const txn = await db.transaction.findUnique({ where: { id: req.params.id } });
  if (!txn) throw { status: 404, code: 'NOT_FOUND' };

  const today = new Date(); today.setHours(0,0,0,0);
  const txDate = new Date(txn.createdAt); txDate.setHours(0,0,0,0);
  if (txDate < today) throw { status: 403, code: 'CANNOT_CANCEL_OLD_PAYMENT' };

  await db.$transaction(async (tx) => {
    await tx.transaction.delete({ where: { id: req.params.id } });
    await tx.studentLedger.update({
      where: { id: txn.ledgerId },
      data: { totalPaid: { decrement: Number(txn.amount) }, netDue: { increment: Number(txn.amount) } }
    });
  });

  await db.auditLog.create({ 
    data: { userId: req.user.sub, action: 'PAYMENT_CANCELLED', entityType: 'transactions', entityId: req.params.id, newValue: { receiptNo: txn.receiptNo, amount: Number(txn.amount) } } 
  });
  res.json({ success: true, message: 'Payment cancelled' });
}));

// ── REPORTS ───────────────────────────────────────────────────────────────────
router.get('/reports/outstanding', asyncHandler(async (req, res) => {
  const { minBalance = 0, batchId } = req.query;

  const ledgers = await db.studentLedger.findMany({
    where: { 
      netDue: { gt: Number(minBalance) },
      studentFeeProfile: {
        student: { user: { isDeleted: false }, ...(batchId && { batchId }) }
      }
    },
    include: {
      studentFeeProfile: { 
        include: { 
          student: { select: { rollNo: true, name: true, mentor: { select: { name: true } } } } 
        } 
      }
    }
  });

  const result = ledgers.map(l => ({
    studentId: l.studentFeeProfile.studentId,
    rollNo: l.studentFeeProfile.student.rollNo,
    name: l.studentFeeProfile.student.name,
    mentor: l.studentFeeProfile.student.mentor?.name || '—',
    semester: l.semester,
    feeDue: Number(l.netDue)
  })).sort((a,b) => b.feeDue - a.feeDue);

  res.json({ success: true, data: result, meta: { total: result.length, totalOutstanding: result.reduce((s,r)=>s+r.feeDue,0) } });
}));

// ── FINES ─────────────────────────────────────────────────────────────────────
router.get('/fines', asyncHandler(async (req, res) => {
  const { isPaid, studentId, page = 1, limit = 50 } = req.query;
  const skip = (parseInt(page)-1)*parseInt(limit);
  const where = {};
  if (isPaid !== undefined) where.isPaid = isPaid === 'true';
  if (studentId) where.studentId = studentId;

  const [total, fines] = await Promise.all([
    db.fine.count({ where }),
    db.fine.findMany({
      where, skip, take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: { student: { select: { rollNo: true, name: true } } }
    })
  ]);
  res.json({ success: true, data: fines, meta: { total, page: parseInt(page) } });
}));

router.post('/fines', asyncHandler(async (req, res) => {
  const { studentId, reason, amount, fineDate } = req.body;
  if (!studentId || !reason || !amount) throw { status: 400, code: 'MISSING_FIELDS' };

  let student;
  if (studentId.includes('-')) {
    student = await db.student.findUnique({ where: { id: studentId }, select: { name: true, id: true } });
  } else {
    student = await db.student.findUnique({ where: { rollNo: studentId }, select: { name: true, id: true } });
  }
  
  if (!student) throw { status: 404, code: 'STUDENT_NOT_FOUND', message: 'Student with this ID or Roll No not found' };

  const fine = await db.fine.create({
    data: { studentId: student.id, reason, amount: Number(amount), fineDate: fineDate ? new Date(fineDate) : new Date(), raisedBy: req.user.sub }
  });
  await db.notification.create({
    data: { userId: student.id, title: 'Fine Added', message: `A fine of ₹${Number(amount).toLocaleString()} has been added: ${reason}`, type: 'FEE', actionUrl: '/student/fee' }
  });
  res.status(201).json({ success: true, data: fine });
}));

router.patch('/fines/:id/waive', asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason) throw { status: 400, code: 'REASON_REQUIRED' };
  const fine = await db.fine.update({
    where: { id: req.params.id },
    data: { isPaid: true, paidAt: new Date(), waivedBy: req.user.sub, waiverReason: reason }
  });
  res.json({ success: true, data: fine });
}));

router.patch('/fines/:id/pay', asyncHandler(async (req, res) => {
  const { paymentMode, referenceNo } = req.body;
  const fine = await db.fine.findUnique({ where: { id: req.params.id }, include: { student: true } });
  if (!fine) throw { status: 404, code: 'FINE_NOT_FOUND' };
  if (fine.isPaid) throw { status: 400, code: 'ALREADY_PAID' };

  // Find a ledger to attach the transaction (transaction requires ledgerId)
  const profile = await db.studentFeeProfile.findUnique({ 
    where: { studentId: fine.studentId }, 
    include: { ledgers: { orderBy: { semester: 'desc' }, take: 1 } } 
  });
  
  if (!profile || profile.ledgers.length === 0) {
     throw { status: 400, code: 'NO_LEDGER_FOR_TRANSACTION', message: 'Student needs at least one fee ledger to attach a transaction.' };
  }
  
  const ledgerObj = profile.ledgers[0];
  const receiptNo = `FN-${new Date().getFullYear()}-${String(Math.floor(10000 + Math.random() * 90000))}`;

  const txRow = await db.$transaction(async (tx) => {
    const txn = await tx.transaction.create({
      data: {
        ledgerId: ledgerObj.id,
        amount: fine.amount,
        paymentMode: paymentMode || 'CASH',
        referenceNo,
        receiptNo,
        status: 'SUCCESS',
        paymentDate: new Date(),
        processedBy: req.user.sub,
        remarks: `Fine Payment: ${fine.reason}`
      }
    });

    const updatedFine = await tx.fine.update({
      where: { id: fine.id },
      data: {
        isPaid: true,
        paidAt: new Date(),
        paymentTxId: txn.id
      }
    });

    return { txn, fine: updatedFine };
  });

  res.json({ success: true, data: txRow.fine, transaction: txRow.txn });
}));

// ── EXPORTS (EXCEL) ──────────────────────────────────────────────────────────
const xlsx = require('xlsx');

router.get('/reports/outstanding/export', asyncHandler(async (req, res) => {
  const { batchId } = req.query;
  const ledgers = await db.studentLedger.findMany({
    where: { 
      netDue: { gt: 0 },
      studentFeeProfile: { student: { user: { isDeleted: false }, ...(batchId && { batchId }) } }
    },
    include: {
      studentFeeProfile: { include: { student: { select: { rollNo: true, name: true, branch: { select: { name: true } } } } } }
    }
  });

  const data = ledgers.map(l => ({
    'Roll No': l.studentFeeProfile.student.rollNo,
    'Name': l.studentFeeProfile.student.name,
    'Branch': l.studentFeeProfile.student.branch?.name || '',
    'Semester': l.semester,
    'Base Fee': Number(l.baseFeeDue),
    'Hostel Fee': Number(l.hostelFeeDue),
    'Bus Fee': Number(l.busFeeDue),
    'Mess Fee': Number(l.messFeeDue),
    'Total Paid': Number(l.totalPaid) + Number(l.scholarshipVerified),
    'Outstanding Due': Number(l.netDue)
  }));

  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Outstanding');
  const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

  res.setHeader('Content-Disposition', 'attachment; filename="outstanding_report.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
}));

router.get('/reports/collection/export', asyncHandler(async (req, res) => {
  const { fromDate, toDate, semester, paymentType } = req.query;
  
  const where = {};
  if (fromDate && toDate) where.paymentDate = { gte: new Date(fromDate), lte: new Date(toDate + 'T23:59:59.999Z') };
  else if (fromDate) where.paymentDate = { gte: new Date(fromDate) };
  else if (toDate) where.paymentDate = { lte: new Date(toDate + 'T23:59:59.999Z') };

  if (semester) where.ledger = { semester: parseInt(semester) };
  if (paymentType) where.paymentMode = paymentType;

  const transactions = await db.transaction.findMany({
    where,
    orderBy: { paymentDate: 'desc' },
    include: {
      ledger: {
        include: {
          studentFeeProfile: {
            include: { student: { select: { rollNo: true, name: true, branch: { select: { name: true } } } } }
          }
        }
      }
    }
  });

  const data = transactions.map(t => ({
    'Date': new Date(t.paymentDate).toLocaleDateString('en-IN'),
    'Time': new Date(t.paymentDate).toLocaleTimeString('en-IN'),
    'Receipt No': t.receiptNo,
    'Roll No': t.ledger?.studentFeeProfile?.student?.rollNo || '-',
    'Student Name': t.ledger?.studentFeeProfile?.student?.name || '-',
    'Branch': t.ledger?.studentFeeProfile?.student?.branch?.name || '-',
    'Semester': t.ledger?.semester || '-',
    'Payment Mode': t.paymentMode,
    'Reference No': t.referenceNo || '-',
    'Remarks': t.remarks || '-',
    'Amount Paid (₹)': Number(t.amount)
  }));

  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Transactions');
  const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

  res.setHeader('Content-Disposition', 'attachment; filename="collection_history.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
}));

// ── RECEIPTS (PDF) ────────────────────────────────────────────────────────────
const PDFDocument = require('pdfkit');

router.get('/payments/:id/receipt', asyncHandler(async (req, res) => {
  const txn = await db.transaction.findUnique({
    where: { id: req.params.id },
    include: {
      ledger: {
        include: {
          studentFeeProfile: {
            include: { student: { include: { branch: true, batch: true } } }
          }
        }
      }
    }
  });

  if (!txn) throw { status: 404, code: 'NOT_FOUND', message: 'Transaction not found for receipt generation' };

  const student = txn.ledger.studentFeeProfile.student;

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Disposition', `attachment; filename="Receipt_${txn.receiptNo}.pdf"`);
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);

  // Header
  doc.fontSize(20).text('COLLEGE ERP', { align: 'center' });
  doc.fontSize(12).text('FEE RECEIPT', { align: 'center' }).moveDown(2);

  // Student Details
  doc.fontSize(12).text(`Receipt No: ${txn.receiptNo}`);
  doc.text(`Date: ${new Date(txn.paymentDate).toLocaleDateString()}`).moveDown(1);
  doc.text(`Roll No: ${student.rollNo}`);
  doc.text(`Name: ${student.name}`);
  doc.text(`Batch: ${student.batch?.year || ''} | Branch: ${student.branch?.name || ''}`);
  doc.text(`Semester: ${txn.ledger.semester}`).moveDown(2);

  // Payment Details
  doc.rect(50, doc.y, 500, 2).fill('#ccc').moveDown(1);
  doc.fillColor('black').text(`Payment Mode: ${txn.paymentMode} (${txn.referenceNo || 'N/A'})`);
  doc.text(`Amount Paid: Rs. ${Number(txn.amount).toLocaleString()}`);
  doc.moveDown(1);
  doc.rect(50, doc.y, 500, 2).fill('#ccc').moveDown(2);

  // Footer
  doc.fontSize(10).text('This is a computer generated receipt and does not require a physical signature.', { align: 'center' });

  doc.end();
}));

module.exports = router;
