const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rollNo = '250010';
  const student = await prisma.student.findUnique({ 
    where: { rollNo },
    include: { batch: true, branch: true }
  });
  console.log('Student:', JSON.stringify(student, null, 2));

  if (student) {
    const masters = await prisma.feeMaster.findMany({
      where: { batchId: student.batchId, branchId: student.branchId, semester: student.currentSem }
    });
    console.log('Matching Fee Masters:', JSON.stringify(masters, null, 2));
    
    const profile = await prisma.studentFeeProfile.findUnique({
      where: { studentId: student.id },
      include: { ledgers: true }
    });
    console.log('Fee Profile & Ledgers:', JSON.stringify(profile, null, 2));
  }
}

main().finally(() => prisma.$disconnect());
