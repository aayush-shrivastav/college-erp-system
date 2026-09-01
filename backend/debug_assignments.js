const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const subject = await prisma.subject.findFirst({ where: { name: 'English' } });
  if (!subject) return console.log('English subject not found');

  console.log('Subject:', subject.name, 'ID:', subject.id);

  const assignments = await prisma.classAssignment.findMany({
    where: { subjectId: subject.id },
    include: {
      class: { include: { branch: true, batch: true } },
      teacher: true,
      group: true
    }
  });

  console.log('Assignments count:', assignments.length);
  assignments.forEach((a, i) => {
    console.log(`Assignment #${i}:`, {
      teacher: a.teacher?.name,
      class: a.class ? true : false,
      branch: a.class?.branch?.name,
      batch: a.class?.batch?.year
    });
  });
}

run().then(() => prisma.$disconnect());
