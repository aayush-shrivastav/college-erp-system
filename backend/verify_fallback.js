const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('--- VERIFYING FALLBACK LOGIC ---');
  
  // 1. Get Neha Verma
  const student = await prisma.student.findUnique({ where: { rollNo: '250002' } });
  
  // 2. Clear current ledger to force update (or just rely on upsert)
  // 3. Simulate the new logic
  let feeMaster = await prisma.feeMaster.findUnique({
    where: { batchId_branchId_semester: { batchId: student.batchId, branchId: student.branchId, semester: student.currentSem } }
  });

  console.log('Current Semester Master:', feeMaster ? 'Found' : 'Not Found');

  if (!feeMaster) {
    const courseMaster = await prisma.feeMaster.findUnique({
      where: { batchId_branchId_semester: { batchId: student.batchId, branchId: student.branchId, semester: 0 } }
    });
    if (courseMaster) {
      console.log('Course Master Found. Tuition:', courseMaster.tuitionFee);
      feeMaster = {
        ...courseMaster,
        tuitionFee: (Number(courseMaster.tuitionFee) / 8),
        totalFee: (Number(courseMaster.totalFee) / 8)
      };
      console.log('Calculated Semester Tuition:', feeMaster.tuitionFee);
    }
  }

  if (feeMaster) {
     console.log('SUCCESS: FeeMaster resolved (via fallback or direct)');
  } else {
     console.log('FAILURE: FeeMaster not resolved');
  }
}

verify().finally(() => prisma.$disconnect());
