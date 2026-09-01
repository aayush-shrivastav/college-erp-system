const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const student = await prisma.student.findUnique({ 
    where: { rollNo: '250002' }, 
    include: { 
      feeProfile: { 
        include: { ledgers: true } 
      } 
    } 
  });
  console.log(JSON.stringify(student, null, 2));
}
run().finally(() => prisma.$disconnect());
