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

  console.log(`Student: ${student.name}`);
  console.log(`Student Batch ID: ${student.batchId}`);
  console.log(`Student Branch ID: ${student.branchId}`);

  const courseMasters = await prisma.feeMaster.findMany({
    where: { semester: 0 }
  });

  console.log(`Found ${courseMasters.length} Course Masters (Semester 0)`);
  courseMasters.forEach(m => {
    const batchMatch = m.batchId === student.batchId;
    const branchMatch = m.branchId === student.branchId;
    console.log(`Master ID: ${m.id} | BatchMatch: ${batchMatch} (${m.batchId}) | BranchMatch: ${branchMatch} (${m.branchId}) | Total: ${m.totalFee}`);
  });
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
