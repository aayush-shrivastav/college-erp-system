const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findUnique({ where: { email: 'admin@college.edu' } });
  if (!user) return console.log('USER_NOT_FOUND');
  console.log('USER:', { id: user.id, role: user.role, isActive: user.isActive });

  const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET);
  console.log('GENERATED_TOKEN:', token);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('VERIFY_LOCAL_OK:', decoded);
  } catch (e) {
    console.error('VERIFY_LOCAL_FAIL:', e.message);
  }
}
check().catch(console.error).finally(() => prisma.$disconnect());
