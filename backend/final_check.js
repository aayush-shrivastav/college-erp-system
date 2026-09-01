const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { listStudents } = require('./src/modules/admin/students/students.service');

async function check() {
  const rollNo = '250001';
  const student = await prisma.student.findUnique({
    where: { rollNo },
    include: { user: true }
  });

  const list = await listStudents({ search: 'Amit' });
  const foundInList = list.data.some(s => s.rollNo === rollNo);

  const result = {
    rollNo,
    existsInDB: !!student,
    isDeleted: student?.user?.isDeleted,
    isActive: student?.user?.isActive,
    foundInListStudents: foundInList
  };

  fs.writeFileSync('final_check.json', JSON.stringify(result, null, 2));
  console.log('Final check written to final_check.json');
}

check().catch(e => console.error(e)).finally(() => prisma.$disconnect());
