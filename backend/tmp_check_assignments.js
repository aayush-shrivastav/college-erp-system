const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const subject = await prisma.subject.findFirst({
    where: { name: { contains: 'English' } }
  });

  if (!subject) return console.log('No English subject found');

  const cAssignments = await prisma.classAssignment.findMany({
    where: { subjectId: subject.id },
    include: { teacher: true }
  });

  const sAssignments = await prisma.sectionSubjectTeacher.findMany({
    where: { subjectId: subject.id },
    include: { teacher: true }
  });

  console.log('Subject ID:', subject.id);
  console.log('ClassAssignments:', cAssignments.length);
  cAssignments.forEach(a => console.log('CA =>', a.teacher.name));

  console.log('SectionTeachers:', sAssignments.length);
  sAssignments.forEach(a => console.log('ST =>', a.teacher.name));
}

check().then(() => prisma.$disconnect());
