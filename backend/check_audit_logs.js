const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const logs = await prisma.auditLog.findMany({ 
    where: { 
      OR: [
        { action: { contains: 'FEE' } }, 
        { action: { contains: 'STUDENT' } }
      ] 
    }, 
    take: 50, 
    orderBy: { createdAt: 'desc' } 
  });
  console.log(JSON.stringify(logs, null, 2));
}
run().finally(() => prisma.$disconnect());
