const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findUnique({
    where: { email: 'arvind@gmail.com' },
    include: { 
      student: {
        include: {
          branch: true,
          batch: true
        }
      } 
    }
  });

  console.log(JSON.stringify(user, null, 2));
}

check().catch(e => console.error(e)).finally(() => prisma.$disconnect());
