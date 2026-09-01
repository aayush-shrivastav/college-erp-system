const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const subjects = await prisma.subject.findMany({
    where: { name: { contains: 'English' } }
  });
  console.log('--- English Subjects ---');
  subjects.forEach(s => console.log(`ID: ${s.id} | Name: ${s.name} | Code: ${s.code}`));

  const assignments = await prisma.classAssignment.findMany({
    include: { subject: true }
  });
  console.log('\n--- Assignments ---');
  assignments.filter(a => a.subject?.name?.includes('English')).forEach(a => {
    console.log(`SubjID in Assignment: ${a.subjectId} | Teacher: ${a.teacherId}`);
  });

  const coords = await prisma.subjectCoordinator.findMany({
    include: { subject: true }
  });
  console.log('\n--- Coordinators ---');
  coords.filter(c => c.subject?.name?.includes('English')).forEach(c => {
    console.log(`SubjID in Coord: ${c.subjectId} | Teacher: ${c.teacherId}`);
  });
}

run().finally(() => prisma.$disconnect());
