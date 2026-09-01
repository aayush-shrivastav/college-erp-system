const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const masters = await prisma.feeMaster.findMany({ include: { batch: true, branch: true } });
  console.log(JSON.stringify(masters, null, 2));
}
run().finally(() => prisma.$disconnect());
