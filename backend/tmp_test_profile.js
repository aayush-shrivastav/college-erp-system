const db = require('./src/config/db');
const fs = require('fs');

async function test() {
  try {
    const student = await db.student.findFirst({ where: { rollNo: '2500101' } });

    const payload = {
      phone: "9843253230",
      address: "vill-karwathi bazar",
      fatherName: "ravi ray",
      fatherPhone: "0987654321",
      motherName: "mukan ray",
      motherPhone: "0987654321",
      tenthPercent: "78",
      twelfthPercent: "89"
    };

    const updated = await db.student.update({
      where: { id: student.id },
      data: {
        phone: payload.phone,
        address: payload.address,
        fatherName: payload.fatherName,
        fatherPhone: payload.fatherPhone,
        motherName: payload.motherName,
        motherPhone: payload.motherPhone,
        tenthPercent: payload.tenthPercent ? Number(payload.tenthPercent) : null,
        twelfthPercent: payload.twelfthPercent ? Number(payload.twelfthPercent) : null,
        profileLocked: true
      }
    });

    console.log('Success!', updated);
  } catch (err) {
    fs.writeFileSync('error_out.json', JSON.stringify({ message: err.message }, null, 2));
  } finally {
    await db.$disconnect();
  }
}

test();
