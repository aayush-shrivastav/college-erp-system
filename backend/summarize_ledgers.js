const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const ledgers = await prisma.studentLedger.findMany({ 
    include: { 
      studentFeeProfile: { 
        include: { 
          student: true 
        } 
      } 
    } 
  });
  const summary = {};
  ledgers.forEach(l => {
    const val = l.baseFeeDue.toString();
    if (!summary[val]) summary[val] = 0;
    summary[val]++;
  });
  console.log('--- LEDGER BASE FEE SUMMARY ---');
  console.log(JSON.stringify(summary, null, 2));
}
run().finally(() => prisma.$disconnect());
