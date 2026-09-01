const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function shiftSubjects() {
  const oldBranchId = 'c85fce34-61fd-48c8-a735-0433de23a9ea';
  const newBranchId = '3a71f939-8cd1-4f79-a5f7-a4fa974d37e4';

  try {
    const updated = await db.subject.updateMany({
      where: { branchId: oldBranchId },
      data: { branchId: newBranchId }
    });
    console.log(`✅ Successfully moved ${updated.count} subjects to B.Tech CSE!`);
  } catch (error) {
    console.error('Error updating subjects:', error);
  } finally {
    await db.$disconnect();
  }
}

shiftSubjects();
