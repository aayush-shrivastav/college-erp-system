const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.batch.upsert({
  where: { year: 2026 },
  create: { year: 2026 },
  update: {}
}).then(() => {
  console.log('Batch 2026 created');
  process.exit(0);
}).catch(console.error);
