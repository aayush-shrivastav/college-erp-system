const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findFirst({ where: { role: 'ADMIN' } }).then(u => {
  if (u) console.log('ADMIN_ID:' + u.id);
  else console.log('NO_ADMIN_FOUND');
}).finally(() => prisma.$disconnect());
