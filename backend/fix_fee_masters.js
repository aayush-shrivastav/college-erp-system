const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Get all existing fee masters
  const existing = await p.feeMaster.findMany({
    select: { batchId: true, branchId: true, semester: true }
  });
  const existingKeys = new Set(existing.map(m => `${m.batchId}_${m.branchId}_${m.semester}`));

  // Get all unique student batch/branch/semester combos
  const students = await p.student.findMany({
    where: { user: { isDeleted: false } },
    select: { batchId: true, branchId: true, currentSem: true, batch: { select: { year: true } }, branch: { select: { name: true } } }
  });

  const unique = new Map();
  students.forEach(s => {
    const key = `${s.batchId}_${s.branchId}_${s.currentSem}`;
    if (!unique.has(key)) unique.set(key, s);
  });

  // Find combos that have no fee master
  const missing = [...unique.values()].filter(c => !existingKeys.has(`${c.batchId}_${c.branchId}_${c.currentSem}`));
  
  if (missing.length === 0) {
    console.log('All fee masters already exist. Nothing to create.');
    return;
  }

  console.log(`Creating ${missing.length} missing fee masters (with 0 fees as placeholder):`);
  for (const s of missing) {
    await p.feeMaster.create({
      data: {
        batchId: s.batchId,
        branchId: s.branchId,
        semester: s.currentSem,
        tuitionFee: 0,
        developmentFee: 0,
        examFee: 0,
        otherFee: 0,
        totalFee: 0
      }
    });
    console.log(`  Created: Batch ${s.batch.year} / ${s.branch.name} / Sem ${s.currentSem}`);
  }
  console.log('Done!');
}

main().catch(console.error).finally(() => p.$disconnect());
