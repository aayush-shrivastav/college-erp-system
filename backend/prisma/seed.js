// prisma/seed.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const db = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const defaultUsers = [
    { email: 'admin@college.edu',    password: 'Admin@123',    role: 'ADMIN'    },
    { email: 'teacher@college.edu',  password: 'Teacher@123',  role: 'TEACHER'  },
    { email: 'student@college.edu',  password: 'Student@123',  role: 'STUDENT'  },
    { email: 'accounts@college.edu', password: 'Accounts@123', role: 'ACCOUNTS' },
  ];

  for (const u of defaultUsers) {
    const hash = await bcrypt.hash(u.password, 12);
    
    // Using upsert to prevent duplicates if some users already exist
    const user = await db.user.upsert({
      where: { email: u.email },
      create: { 
        email: u.email, 
        password: hash, 
        role: u.role 
      },
      update: {
        password: hash,
        role: u.role
      }
    });

    console.log(`✅ User ${u.email} (${u.role}) created/updated`);

    // Create Teacher record if role is TEACHER
    if (u.role === 'TEACHER') {
      await db.teacher.upsert({
        where: { id: user.id },
        create: { id: user.id, name: 'Demo Teacher', department: 'Computer Science' },
        update: { name: 'Demo Teacher', department: 'Computer Science' }
      });
    }

    // Create Student record if role is STUDENT
    if (u.role === 'STUDENT') {
      // We need a Branch and Batch first for a Student
      const branch = await db.branch.upsert({
        where: { name: 'Computer Science' },
        create: { name: 'Computer Science' },
        update: {}
      });

      const batch = await db.batch.upsert({
        where: { year: 2024 },
        create: { year: 2024 },
        update: {}
      });

      await db.student.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          rollNo: 'CS2024-001',
          branchId: branch.id,
          batchId: batch.id,
          currentSem: 1
        },
        update: {
          rollNo: 'CS2024-001',
          branchId: branch.id,
          batchId: batch.id,
          currentSem: 1
        }
      });
    }
  }

  console.log('\n🎉 Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Login credentials:');
  console.log('  Admin:    admin@college.edu    / Admin@123');
  console.log('  Teacher:  teacher@college.edu  / Teacher@123');
  console.log('  Student:  student@college.edu  / Student@123');
  console.log('  Accounts: accounts@college.edu / Accounts@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch(e => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
