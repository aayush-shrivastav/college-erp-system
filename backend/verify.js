const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function clean() {
  const subjects = await db.subject.findMany();
  console.log(`Found ${subjects.length} subjects in DB.`);
  
  let deleted = 0;
  for (const s of subjects) {
    try {
      await db.subject.delete({ where: { id: s.id } });
      deleted++;
    } catch(e) {
      console.log(`Could not delete ${s.code}: potentially linked to students.`);
    }
  }
  
  console.log(`Successfully deleted ${deleted} subjects. You can now fresh upload.`);
}

clean().then(() => db.$disconnect());
