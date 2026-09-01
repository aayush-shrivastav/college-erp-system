const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function test() {
  try {
    console.log('Checking for students without fee profile...');
    const students = await db.student.findMany({
      take: 100,
      select: {
        id: true, rollNo: true, name: true, currentSem: true,
        feeProfile: { select: { id: true } }
      }
    });

    const withoutProfile = students.filter(s => !s.feeProfile);
    console.log(`Found ${withoutProfile.length} students without fee profile`);
    
    if (withoutProfile.length > 0) {
      console.log('Sample without profile:', withoutProfile[0]);
      
      // Test formatting logic
      const formatted = withoutProfile.map(s => {
        const currentLedger = s.feeProfile?.ledgers?.find(l => l.semester === s.currentSem);
        const netDue = currentLedger ? Number(currentLedger.netDue) : null;
        return { ...s, currentNetDue: netDue };
      });
      console.log('Formatted without profile successfully');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.$disconnect();
  }
}

test();
