const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    where: { name: { contains: 'Aayush', mode: 'insensitive' } },
    select: {
      name: true,
      rollNo: true,
      currentSem: true,
      batch: { select: { year: true } },
      branch: { select: { name: true } }
    }
  });
  console.log(JSON.stringify(students, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
