const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function restoreCSStudents() {
  const branch = await prisma.branch.findFirst({
    where: { name: { contains: 'Computer Science', mode: 'insensitive' } }
  });

  if (!branch) {
     console.log('CS Branch not found');
     return;
  }
  
  const students = await prisma.student.findMany({ 
    where: { branchId: branch.id },
    include: { user: true } 
  });

  let restoredCount = 0;
  for (const student of students) {
    if (student.user && student.user.isDeleted) {
      await prisma.user.update({
        where: { id: student.user.id },
        data: { isDeleted: false, isActive: true }
      });
      restoredCount++;
      console.log(`Restored ${student.name} (${student.rollNo})`);
    }
  }

  console.log(`\nSuccessfully restored ${restoredCount} Computer Science students.`);
}

restoreCSStudents()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
