const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const allAssignments = await prisma.classAssignment.findMany({
    include: { subject: true }
  });
  
  console.log('Total Assignments:', allAssignments.length);
  allAssignments.forEach(a => {
    console.log(`- Subject: ${a.subject?.name} (ID: ${a.subjectId}) taught by TeacherID: ${a.teacherId}`);
  });

  const allCoords = await prisma.subjectCoordinator.findMany({
      include: { subject: true }
  });
  console.log('Coordinated Subjects:');
  allCoords.forEach(c => {
      console.log(`- Subject: ${c.subject?.name} (ID: ${c.subjectId}) coord by TeacherID: ${c.teacherId}`);
  });
}

run().finally(() => prisma.$disconnect());
