const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const masters = await prisma.feeMaster.findMany({ include: { batch: true, branch: true } });
  console.log('MASTERS_JSON_START');
  console.log(JSON.stringify(masters, null, 2));
  console.log('MASTERS_JSON_END');

  const student = await prisma.student.findFirst({
    where: { name: { contains: 'Riya' } },
    include: { batch: true, branch: true }
  });
  console.log('STUDENT_JSON_START');
  console.log(JSON.stringify(student, null, 2));
  console.log('STUDENT_JSON_END');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
