const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany();
  const batches = await prisma.batch.findMany();
  console.log('Branches:', branches.map(b => b.name));
  console.log('Batches:', batches.map(b => b.year));
}

main().catch(console.error).finally(() => prisma.$disconnect());
