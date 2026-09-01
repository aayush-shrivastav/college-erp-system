const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function run() {
  const allSub = await db.subject.findMany({});
  console.log("Total subjects overall:", allSub.length);
  const delSub = await db.subject.count({ where: { isDeleted: true } });
  console.log("Total deleted subjects:", delSub);
  
  if (delSub > 0) {
    console.log("Fixing isDeleted flag for all subjects...");
    const updated = await db.subject.updateMany({ data: { isDeleted: false } });
    console.log("Fixed", updated.count, "subjects.");
  }
}
run().catch(console.error).finally(()=>db.$disconnect());
