const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function run() {
  const classes = await db.timetableSlot.findMany({ select: { className: true, day: true, period: true, teacherId: true, subject: { select: { code: true } } } });
  console.log(JSON.stringify(classes.slice(0, 10), null, 2));
}

run().finally(() => db.$disconnect());
