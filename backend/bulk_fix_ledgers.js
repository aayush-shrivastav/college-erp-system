/**
 * Bulk Fix v2: Recalculate all student ledgers using Course Master fallback.
 * Sets baseFeeDue correctly and resets netDue = baseFeeDue + hostelFee + busFee + messFee - totalPaid - scholarshipVerified
 * Only processes active (non-deleted) students.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const students = await prisma.student.findMany({
    where: { user: { isDeleted: false } },
    include: {
      feeProfile: {
        include: { ledgers: true }
      }
    }
  });

  console.log(`Found ${students.length} active students.`);
  let updated = 0, skipped = 0, failed = 0;

  for (const student of students) {
    if (!student.feeProfile) {
      console.log(`  SKIP (no profile): ${student.rollNo}`);
      skipped++;
      continue;
    }

    // Try to get semester-specific master first
    let feeMaster = await prisma.feeMaster.findUnique({
      where: {
        batchId_branchId_semester: {
          batchId: student.batchId,
          branchId: student.branchId,
          semester: student.currentSem
        }
      }
    });

    // Fallback to Course Master (semester 0)
    if (!feeMaster) {
      const courseMaster = await prisma.feeMaster.findUnique({
        where: {
          batchId_branchId_semester: {
            batchId: student.batchId,
            branchId: student.branchId,
            semester: 0
          }
        }
      });

      if (courseMaster) {
        const divisor = 8;
        feeMaster = {
          tuitionFee: Number(courseMaster.tuitionFee) / divisor,
          totalFee:   Number(courseMaster.totalFee) / divisor,
        };
      }
    }

    if (!feeMaster) {
      console.log(`  SKIP (no master): ${student.rollNo}`);
      skipped++;
      continue;
    }

    try {
      // Fetch existing ledger to preserve actual payments
      const existing = await prisma.studentLedger.findUnique({
        where: {
          studentFeeProfileId_semester: {
            studentFeeProfileId: student.feeProfile.id,
            semester: student.currentSem
          }
        }
      });

      const baseFeeDue   = feeMaster.totalFee;
      const hostelFeeDue = existing ? Number(existing.hostelFeeDue) : 0;
      const busFeeDue    = existing ? Number(existing.busFeeDue) : 0;
      const messFeeDue   = existing ? Number(existing.messFeeDue) : 0;

      // Only use totalPaid if it's reasonable (< baseFeeDue * 2 as sanity check)
      const rawPaid      = existing ? Number(existing.totalPaid) : 0;
      const totalPaid    = rawPaid > baseFeeDue * 20 ? 0 : rawPaid; // reset corrupted payments
      const scholVerified = existing ? Number(existing.scholarshipVerified) : 0;

      const netDue = baseFeeDue + hostelFeeDue + busFeeDue + messFeeDue - totalPaid - scholVerified;

      await prisma.studentLedger.upsert({
        where: {
          studentFeeProfileId_semester: {
            studentFeeProfileId: student.feeProfile.id,
            semester: student.currentSem
          }
        },
        create: {
          studentFeeProfileId: student.feeProfile.id,
          semester: student.currentSem,
          baseFeeDue,
          hostelFeeDue,
          busFeeDue,
          messFeeDue,
          totalPaid,
          netDue
        },
        update: {
          baseFeeDue,
          totalPaid,
          netDue
        }
      });

      console.log(`  OK: ${student.rollNo} (${student.name}) | baseFee=${baseFeeDue} | paid=${totalPaid} | netDue=${netDue}`);
      updated++;
    } catch (err) {
      console.error(`  FAILED: ${student.rollNo} - ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. Updated=${updated}, Skipped=${skipped}, Failed=${failed}`);
}

run().finally(() => prisma.$disconnect());
