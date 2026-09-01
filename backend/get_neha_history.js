const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const ledgers = await prisma.studentLedger.findMany({ 
    where: { 
      studentFeeProfile: { 
        student: { rollNo: '250002' } 
      } 
    }, 
    orderBy: { semester: 'asc' } 
  });
  console.log(JSON.stringify(ledgers, null, 2));
}
run().finally(() => prisma.$disconnect());
