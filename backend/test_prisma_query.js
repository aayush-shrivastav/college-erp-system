const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const subjectId = '7f3ac6a4-c3ea-449e-9aab-41763f0edcd0';
  const session = '2024-25';

  const assignments = await prisma.classAssignment.findMany({
    where: { subjectId },
    include: {
      class: { include: { branch: true, batch: true } },
      teacher: { select: { id: true, name: true, employeeId: true, department: true } },
      group: true
    }
  });

  const sectionAssignments = await prisma.sectionSubjectTeacher.findMany({
    where: { subjectId, isActive: true, academicYear: session },
    include: {
      section: { include: { batch: true } },
      teacher: { select: { id: true, name: true, employeeId: true, department: true } },
      labGroup: true
    }
  });

  console.log(JSON.stringify({ assignments, sectionAssignments }, null, 2));
}
run().finally(() => prisma.$disconnect());
