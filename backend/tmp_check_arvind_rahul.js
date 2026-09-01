const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const arvind = await prisma.user.findUnique({
    where: { email: 'arvind@gmail.com' },
    include: { student: true }
  });

  const rahul = await prisma.user.findUnique({
    where: { email: 'rahulkumar@gmail.com' },
    include: { student: true }
  });

  console.log('--- ARVIND ---');
  console.log(JSON.stringify(arvind, null, 2));
  console.log('--- RAHUL ---');
  console.log(JSON.stringify(rahul, null, 2));
}

check().catch(e => console.error(e)).finally(() => prisma.$disconnect());
