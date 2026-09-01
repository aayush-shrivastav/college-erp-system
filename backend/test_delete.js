const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDelete() {
  try {
    // 1. Get a student (active)
    const student = await prisma.student.findFirst({
        where: { user: { isDeleted: false } },
        include: { user: true }
    });

    if (!student) {
        console.log("No active student found to test delete");
        return;
    }

    console.log(`Testing delete for student: ${student.name} (ID: ${student.id})`);

    // 2. Attempt soft delete logic (similar to students.service.js)
    const result = await prisma.$transaction(async (tx) => {
        const u = await tx.user.update({
            where: { id: student.id },
            data: { isDeleted: true, isActive: false }
        });
        
        // Use a dummy admin ID for audit log if needed, or skip it
        // The real code uses req.user.sub. Let's see if we can find an admin.
        const admin = await tx.user.findFirst({ where: { role: 'ADMIN' } });
        if (admin) {
            await tx.auditLog.create({
                data: { userId: admin.id, action: 'STUDENT_DELETED_TEST', entityType: 'students', entityId: student.id,
                        newValue: { status: 'DELETED (SOFT)' } }
            });
        }
        return u;
    });

    console.log("Delete successful in test script!");
    
    // 3. Revert it back so we don't mess up data
    await prisma.user.update({
        where: { id: student.id },
        data: { isDeleted: false, isActive: true }
    });
    console.log("Reverted successfully!");

  } catch (error) {
    console.error("Delete test FAILED:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testDelete();
