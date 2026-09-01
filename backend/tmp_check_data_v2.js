const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    where: { email: { in: ['arvind@gmail.com', 'rahulkumar@gmail.com'] } },
    include: { 
      student: {
        include: {
          feeAccount: true,
          branch: true,
          attendanceSummaries: { include: { subject: { select: { name: true } } } }
        }
      } 
    }
  });

  users.forEach(u => {
    console.log(`Email: ${u.email}`);
    console.log(`Student Name: ${u.student?.name}`);
    console.log(`Roll No: ${u.student?.rollNo}`);
    console.log(`Branch: ${u.student?.branch?.name}`);
    console.log(`Fee: Payable: ${u.student?.feeAccount?.totalPayable}, Paid: ${u.student?.feeAccount?.totalPaid}`);
    console.log(`Attendance: ${u.student?.attendanceSummaries.map(s => s.subject.name + ': ' + s.totalAttended + '/' + s.totalConducted).join(', ')}`);
    console.log('---');
  });
}

check().catch(e => console.error(e)).finally(() => prisma.$disconnect());
