const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const coordinators = await prisma.subjectCoordinator.findMany({
    include: { subject: true, teacher: true }
  });
  
  console.log('Coordinators:', JSON.stringify(coordinators, null, 2));
}

run().finally(() => prisma.$disconnect());
