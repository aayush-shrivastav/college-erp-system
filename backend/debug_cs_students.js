const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
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
  
  console.log(students.map(s => ({ rollNo: s.rollNo, name: s.name, isDeleted: s.user?.isDeleted })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
