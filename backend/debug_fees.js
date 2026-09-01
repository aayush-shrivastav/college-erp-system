const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Fee Masters ---');
  const masters = await prisma.feeMaster.findMany({ include: { batch: true, branch: true } });
  masters.forEach(m => {
    console.log(`ID: ${m.id}, Batch: ${m.batch?.year}, Branch: ${m.branch?.name}, Sem: ${m.semester}, Total: ${m.totalFee}`);
  });

  console.log('\n--- Sample Student (Riya Jain) ---');
  const student = await prisma.student.findFirst({
    where: { name: { contains: 'Riya' } },
    include: { batch: true, branch: true }
  });
  if (student) {
    console.log(`Name: ${student.name}, BatchID: ${student.batchId}, BranchID: ${student.branchId}`);
  } else {
    console.log('Riya Jain not found');
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
