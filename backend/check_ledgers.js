const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const ledgers = await prisma.studentLedger.findMany({
    include: {
      studentFeeProfile: { include: { student: { select: { rollNo: true, name: true, user: { select: { isDeleted: true } } } } } }
    }
  });
  for (const l of ledgers) {
    const s = l.studentFeeProfile.student;
    const del = s.user?.isDeleted ? '[DELETED]' : '';
    console.log(`${s.rollNo} ${del} | sem=${l.semester} | baseFee=${l.baseFeeDue} | paid=${l.totalPaid} | netDue=${l.netDue}`);
  }
}
run().finally(() => prisma.$disconnect());
