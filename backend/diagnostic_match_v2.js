const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.student.findFirst({
    where: { name: { contains: 'Riya' } },
    include: { batch: true, branch: true }
  });
  
  if (!student) {
    console.log('Student Riya not found');
    return;
  }

  const courseMasters = await prisma.feeMaster.findMany({
    where: { semester: 0 }
  });

  courseMasters.forEach(m => {
    const batchMatch = m.batchId === student.batchId;
    const branchMatch = m.branchId === student.branchId;
    console.log(`Master:${m.id}|Total:${m.totalFee}|BatchIdMatch:${batchMatch}|BranchIdMatch:${branchMatch}`);
    if (!batchMatch) console.log(`  MasterBatch:${m.batchId} vs StudentBatch:${student.batchId}`);
    if (!branchMatch) console.log(`  MasterBranch:${m.branchId} vs StudentBranch:${student.branchId}`);
  });
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
