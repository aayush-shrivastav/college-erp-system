const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const teachers = await prisma.teacher.findMany();
  let count = 0;
  
  for (const t of teachers) {
    // If name looks like an ID and employeeId looks like a name
    if (t.name.match(/^T\d+$/i) && t.employeeId && !t.employeeId.match(/^T\d+$/i)) {
      console.log(`Swapping: Name="${t.name}", ID="${t.employeeId}"`);
      await prisma.teacher.update({
        where: { id: t.id },
        data: {
          name: t.employeeId,
          employeeId: t.name
        }
      });
      count++;
    }
  }
  console.log(`Successfully fixed ${count} teacher records.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
