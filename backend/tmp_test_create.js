const { createStudent } = require('./src/modules/admin/students/students.service');
const db = require('./src/config/db');
const fs = require('fs');

async function test() {
  try {
    const branch = await db.branch.findFirst({ where: { name: 'Computer Science' }});
    
    // Use unique email/roll to avoid unique constraint if prev run somehow succeeded
    const result = await createStudent({
      name: 'rahul kumar',
      rollNo: '2500101_v3',
      email: 'rahulkumar_v3@gmail.com',
      batchYear: 2025,
      branchId: branch.id,
      currentSem: 2
    });
    console.log('Success!');
  } catch (err) {
    fs.writeFileSync('error_out.json', JSON.stringify({
      message: err.message,
      stack: err.stack,
      code: err.code
    }, null, 2));
    console.log("Wrote error to error_out.json");
  } finally {
    await db.$disconnect();
  }
}

test();
