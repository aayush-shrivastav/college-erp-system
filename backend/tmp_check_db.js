const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.branch.count();
  console.log(`BRANCH_COUNT: ${count}`);
  const branches = await prisma.branch.findMany({ select: { name: true } });
  console.log('BRANCHES:', branches);
}
main().catch(console.error).finally(() => prisma.$disconnect());
