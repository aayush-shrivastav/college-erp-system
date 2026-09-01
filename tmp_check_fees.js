const db = require('./backend/src/config/db.js');

async function checkFees() {
  try {
    const rollNo = '250010';
    console.log(`\n--- Checking Data for Roll No: ${rollNo} ---`);
    
    const student = await db.student.findUnique({
      where: { rollNo },
      include: {
        batch: true,
        branch: true,
        feeProfile: {
          include: {
            ledgers: {
              include: { transactions: true }
            }
          }
        }
      }
    });

    if (!student) {
      console.log("Student not found!");
      return;
    }

    console.log(`Student: ${student.name} | Batch: ${student.batch.year} | Branch: ${student.branch.name}`);
    console.log(`Current Sem: ${student.currentSem}`);
    
    if (student.feeProfile) {
      console.log(`\nLedger Records Found: ${student.feeProfile.ledgers.length}`);
      student.feeProfile.ledgers.forEach(l => {
        console.log(`  Sem ${l.semester}: BaseDue=${l.baseFeeDue}, NetDue=${l.netDue}, Paid=${l.totalPaid}`);
      });
    } else {
      console.log("No Fee Profile found for this student!");
    }

    console.log(`\n--- Checking Fee Master for Batch ${student.batch.year} / Branch ${student.branch.name} ---`);
    const masters = await db.feeMaster.findMany({
      where: {
        batchId: student.batchId,
        branchId: student.branchId
      },
      orderBy: { semester: 'asc' }
    });

    if (masters.length === 0) {
      console.log("No Fee Master records found for this batch/branch!");
    } else {
      console.log(`Fee Master Records Found: ${masters.length}`);
      masters.forEach(m => {
        console.log(`  Sem ${m.semester}: Total=${m.totalFee} (Tuition=${m.tuitionFee}, Hostel=${m.hostelFee}, etc.)`);
      });
      
      const grandTotal = masters.reduce((acc, m) => acc + Number(m.totalFee), 0);
      console.log(`\nGrand Total in Fee Master: ₹${grandTotal.toLocaleString()}`);
    }

  } catch (error) {
    console.error("Error querying DB:", error);
  } finally {
    await db.$disconnect();
    process.exit();
  }
}

checkFees();
