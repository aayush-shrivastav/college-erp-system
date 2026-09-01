const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const coords = await prisma.subjectCoordinator.findMany({
    include: { subject: true, teacher: true }
  });
  console.log('All coordinators:', coords.map(c => ({
    id: c.id,
    subject: c.subject.name,
    teacher: c.teacher.name,
    teacherId: c.teacherId
  })));

  // Pick a coordinator subject
  const subjectId = coords[0]?.subjectId;
  if (!subjectId) return;

  const assignments = await prisma.classAssignment.findMany({
    where: { subjectId },
    include: {
      class: { include: { branch: true, batch: true } },
      teacher: true,
      group: true
    }
  });

  console.log('ClassAssignments for the coordinated subject:', assignments.map(a =>({
      classStr: a.class ? `${a.class.branch?.name} ${a.class.batch?.year} (Sem ${a.class.semester})` : 'NO CLASS',
      teacher: a.teacher?.name,
      teacherId: a.teacher?.employeeId,
      dept: a.teacher?.department,
      group: a.group?.groupName || 'Full Class',
      type: 'Dynamic'
  })));
  
}

check().then(() => prisma.$disconnect());
