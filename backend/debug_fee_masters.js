const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const count = await prisma.feeMaster.count();
  const all = await prisma.feeMaster.findMany();
  console.log('Total FeeMasters:', count);
  console.log(JSON.stringify(all, null, 2));
}
run().finally(() => prisma.$disconnect());
