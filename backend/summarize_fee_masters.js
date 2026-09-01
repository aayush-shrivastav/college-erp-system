const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const masters = await prisma.feeMaster.findMany({ 
    include: { batch: true, branch: true },
    orderBy: { semester: 'asc' }
  });
  console.log('--- FEE MASTERS SUMMARY ---');
  masters.forEach(m => {
    console.log(`ID: ${m.id} | Batch: ${m.batch?.year} | Branch: ${m.branch?.name} | Sem: ${m.semester} | Total: ${m.totalFee}`);
  });
}
run().finally(() => prisma.$disconnect());
