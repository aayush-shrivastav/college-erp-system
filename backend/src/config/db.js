const { PrismaClient } = require('@prisma/client');
const globalForPrisma = global;
const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
});
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
module.exports = db;
