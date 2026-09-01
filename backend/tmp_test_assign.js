const { assignMentorsRange } = require('./src/modules/admin/students/students.service');
const db = require('./src/config/db');
const fs = require('fs');

async function test() {
  try {
    const branch = await db.branch.findFirst({ where: { name: 'Computer Science' }});
    const teacher = await db.teacher.findFirst();

    const res = await assignMentorsRange({
      teacherId: teacher.id,
      branchId: branch.id,
      batchYear: "2025",
      currentSem: "2",
      fromRollNo: "2500101",
      toRollNo: "2500150"
    });

    console.log('Success:', res);
  } catch (err) {
    fs.writeFileSync('error_out.json', JSON.stringify({ message: err.message, stack: err.stack }, null, 2));
  } finally {
    await db.$disconnect();
  }
}

test();
