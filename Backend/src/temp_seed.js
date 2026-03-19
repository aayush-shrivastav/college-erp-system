const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log("Existing users:", users.length);
  
  const adminEmail = "admin@college.com";
  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  
  if (!admin) {
    console.log("No admin found. Seeding...");
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        role: "ADMIN"
      }
    });
    console.log("Admin seeded: admin@college.com / admin123");
  } else {
    console.log("Admin already exists!");
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
