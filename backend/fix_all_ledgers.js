/**
 * DB Migration: Initializes all 8 semester ledgers for all students.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const students = await prisma.student.findMany({
    include: {
      feeProfile: { include: { ledgers: true } },
      user: { select: { isDeleted: true } }
    }
  });

  console.log(`Processing ${students.length} students...`);
  let updated = 0, skipped = 0;

  for (const student of students) {
    if (!student.feeProfile) { skipped++; continue; }
    
    const profile = student.feeProfile;
    
    const courseMaster = await prisma.feeMaster.findUnique({
      where: { batchId_branchId_semester: { batchId: student.batchId, branchId: student.branchId, semester: 0 } }
    });

    if (!courseMaster) { skipped++; continue; }

    const hostelFee = profile.isHosteller && profile.hostelRoomId ? await prisma.hostelRoom.findUnique({ where: { id: profile.hostelRoomId } }).then(r => Number(r?.feeAmount || 0)) : 0;
    const busFee = profile.usesBus && profile.busRouteId ? await prisma.busRoute.findUnique({ where: { id: profile.busRouteId } }).then(r => Number(r?.feeAmount || 0)) : 0;
    const messFee = profile.usesMess && profile.messPlanId ? await prisma.messPlan.findUnique({ where: { id: profile.messPlanId } }).then(r => Number(r?.feeAmount || 0)) : 0;

    for (let sem = 1; sem <= 8; sem++) {
      let feeMaster = await prisma.feeMaster.findUnique({
        where: { batchId_branchId_semester: { batchId: student.batchId, branchId: student.branchId, semester: sem } }
      });

      if (!feeMaster && courseMaster) {
        feeMaster = {
          totalFee: (Number(courseMaster.totalFee) / 8),
          semester: sem
        };
      }

      if (feeMaster) {
        const existing = await prisma.studentLedger.findUnique({
          where: { studentFeeProfileId_semester: { studentFeeProfileId: profile.id, semester: sem } }
        });

        const totalPaid = existing ? Number(existing.totalPaid) : 0;
        const verifiedSchol = existing ? Number(existing.scholarshipVerified) : 0;
        const targetNetDue = Number(feeMaster.totalFee) + hostelFee + busFee + messFee - totalPaid - verifiedSchol;

        await prisma.studentLedger.upsert({
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
    const delLabel = student.user?.isDeleted ? '[DEL] ' : '';
    console.log(`  ${delLabel}${student.rollNo} validated for 8 semesters.`);
    updated++;
  }

  console.log(`\nMigration completed. Updated: ${updated}, Skipped: ${skipped}`);
}

run().finally(() => prisma.$disconnect());
