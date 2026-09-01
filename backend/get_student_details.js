const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const rollNo = '250001';
  const student = await prisma.student.findUnique({
    where: { rollNo },
    include: {
      user: true,
      feeProfile: { include: { ledgers: { include: { transactions: true } } } },
      semRegistrations: true,
      fines: true,
      enrollments: true,
      attendanceRecords: true,
      examResults: true
    }
  });

  if (!student) {
    console.log(`Student with roll number ${rollNo} not found.`);
    return;
  }

  console.log('--- STUDENT DETAILS ---');
  console.log('ID:', student.id);
  console.log('Name:', student.name);
  console.log('Roll No:', student.rollNo);
  
  console.log('\n--- RELATIONS CHECK ---');
  console.log('Fee Profile exists:', !!student.feeProfile);
  if (student.feeProfile) {
    console.log('Number of Ledgers:', student.feeProfile.ledgers.length);
    const transCount = student.feeProfile.ledgers.reduce((acc, l) => acc + l.transactions.length, 0);
    console.log('Number of Transactions:', transCount);
  }
  console.log('Semester Registrations count:', student.semRegistrations.length);
  console.log('Fines count:', student.fines.length);
  console.log('Enrollments count:', student.enrollments.length);
  console.log('Attendance Records count:', student.attendanceRecords.length);
  console.log('Exam Results count:', student.examResults.length);
}

check().catch(e => console.error(e)).finally(() => prisma.$disconnect());
