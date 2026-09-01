const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { softDeleteStudent, listStudents } = require('./src/modules/admin/students/students.service');

async function verify() {
  const rollNo = '250001';
  const adminId = '286608f5-c555-4828-babe-f718f98526b2'; // valid admin ID

  console.log('--- BEFORE DELETION ---');
  const studentBefore = await prisma.student.findUnique({
    where: { rollNo },
    include: { user: true }
  });
  console.log('Student exists:', !!studentBefore);
  console.log('User isDeleted:', studentBefore?.user?.isDeleted);

  if (!studentBefore) return;

  console.log('\n--- PERFORMING SOFT DELETE ---');
  await softDeleteStudent(studentBefore.id, adminId);
  console.log('Soft delete executed.');

  console.log('\n--- AFTER DELETION ---');
  const studentAfter = await prisma.student.findUnique({
    where: { rollNo },
    include: { user: true }
  });
  console.log('Student still exists in DB:', !!studentAfter);
  console.log('User isDeleted:', studentAfter?.user?.isDeleted);
  console.log('User isActive:', studentAfter?.user?.isActive);

  console.log('\n--- CHECKING LIST FILTERS ---');
  const list = await listStudents({ search: 'Amit' });
  const foundInList = list.data.some(s => s.rollNo === rollNo);
  console.log('Student found in listStudents():', foundInList);

  if (!foundInList && studentAfter?.user?.isDeleted) {
    console.log('\n✅ VERIFICATION SUCCESSFUL: Soft delete works and hides records from lists.');
  } else {
    console.log('\n❌ VERIFICATION FAILED.');
  }
}

verify().catch(e => console.error(e)).finally(() => prisma.$disconnect());
