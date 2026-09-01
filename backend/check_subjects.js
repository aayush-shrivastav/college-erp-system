const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const subjects = await db.subject.findMany({
    include: { branch: { select: { name: true } } },
    take: 20
  });
  console.log('Total subjects:', subjects.length);
  subjects.forEach(s => {
    console.log(`  [${s.code}] ${s.name} | Sem:${s.semester} | Branch:${s.branch?.name || 'NULL'} (branchId:${s.branchId})`);
  });

  const branches = await db.branch.findMany({ select: { id: true, name: true } });
  console.log('\nBranches in DB:');
  branches.forEach(b => console.log(`  [${b.id}] ${b.name}`));
}

main().catch(console.error).finally(() => db.$disconnect());
