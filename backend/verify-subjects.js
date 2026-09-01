const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function check() {
  const subjects = await db.subject.findMany();
  console.log("Subjects in DB:");
  console.log(subjects.map(s => s.code));
  await db.$disconnect();
}
check();
