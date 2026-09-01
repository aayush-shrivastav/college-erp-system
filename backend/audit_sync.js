const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const subjects = await prisma.subject.findMany({
    where: { name: { contains: 'English' } }
  });
  console.log('--- Subjects ---');
  subjects.forEach(s => console.log(`ID: ${s.id} | Name: ${s.name} | Code: ${s.code}`));

  const assignments = await prisma.classAssignment.findMany({
    where: { subjectId: { in: subjects.map(s => s.id) } },
    include: { subject: true, teacher: true }
  });
  console.log('\n--- Class Assignments ---');
  assignments.forEach(a => console.log(`Subject: ${a.subject.name} (Code: ${a.subject.code}) | Teacher: ${a.teacher.name} | SubjID: ${a.subjectId}`));

  const sectionTeachers = await prisma.sectionSubjectTeacher.findMany({
    where: { subjectId: { in: subjects.map(s => s.id) } },
    include: { subject: true, teacher: true }
  });
  console.log('\n--- Section Teachers ---');
  sectionTeachers.forEach(a => console.log(`Subject: ${a.subject.name} | Teacher: ${a.teacher.name}`));

  const coordinators = await prisma.subjectCoordinator.findMany({
    where: { subjectId: { in: subjects.map(s => s.id) } },
    include: { subject: true, teacher: true }
  });
  console.log('\n--- Coordinators ---');
  coordinators.forEach(c => console.log(`Subject: ${c.subject.name} | Teacher: ${c.teacher.name} | SubjID: ${c.subjectId} | Active: ${c.isActive}`));
}

run().finally(() => prisma.$disconnect());
