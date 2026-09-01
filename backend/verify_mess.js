const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    console.log('Checking MessPlan table...');
    const count = await prisma.messPlan.count();
    console.log('Current Mess Plans:', count);
    
    console.log('Checking StudentFeeProfile updates...');
    const sampleProfile = await prisma.studentFeeProfile.findFirst();
    if (sampleProfile && 'usesMess' in sampleProfile) {
      console.log('Success: usesMess field exists in StudentFeeProfile');
    } else {
      console.log('Info: StudentFeeProfile does not have usesMess yet (or no records exist)');
    }
    
    console.log('Verification Complete.');
  } catch (err) {
    console.error('Verification Failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
