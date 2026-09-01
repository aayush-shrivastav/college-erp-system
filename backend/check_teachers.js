const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const teachers = await prisma.teacher.findMany({ select: { name: true, employeeId: true, designation: true } });
  console.log(JSON.stringify(teachers, null, 2));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
