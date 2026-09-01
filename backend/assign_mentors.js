const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching active students and teachers...');
  const students = await prisma.student.findMany({
    where: { user: { isDeleted: false } },
    include: { branch: true }
  });
  
  console.log('Clearing existing mentor assignments...');
  await prisma.student.updateMany({
    data: { mentorId: null }
  });

  const teachers = await prisma.teacher.findMany({
    where: { 
      user: { isDeleted: false },
      NOT: { name: { contains: 'Demo Teacher' } }
    }
  });

  if (teachers.length === 0) {
    console.log('No teachers found to assign as mentors.');
    return;
  }

  // Map branches and divide students
  const studentsByBranch = {};
  for (const s of students) {
    const bName = s.branch.name;
    if (!studentsByBranch[bName]) studentsByBranch[bName] = [];
    studentsByBranch[bName].push(s);
  }

  console.log(`Found ${students.length} students across ${Object.keys(studentsByBranch).length} branches.`);
  console.log(`Found ${teachers.length} active teachers.`);

  let totalAssigned = 0;
  const teacherLoad = {}; // Maps teacher.id to count

  for (const branchName of Object.keys(studentsByBranch)) {
    const branchStudents = studentsByBranch[branchName];
    
    // Attempt to find teachers that match this branch specifically
    let branchTeachers = teachers.filter(t => {
      if (!t.department) return false;
      const d = t.department.toLowerCase();
      const b = branchName.toLowerCase();
      if (b.includes('cse') && (d.includes('cse') || d.includes('computer'))) return true;
      if (b.includes('bca') && (d.includes('bca') || d.includes('computer'))) return true;
      if (b.includes('ee') && (d.includes('electro') || d.includes('ee'))) return true;
      return false;
    });

    // If no specific teachers found, use the global pool
    if (branchTeachers.length === 0) {
      console.log(`No specific teachers found for ${branchName}. Falling back to all teachers.`);
      branchTeachers = teachers;
    }

    let studentIndex = 0;
    const updates = [];

    while (studentIndex < branchStudents.length) {
      // Find the first teacher who has < 15 students
      const teacher = branchTeachers.find(t => (teacherLoad[t.id] || 0) < 15);
      
      if (!teacher) {
        console.log(`  Warning: Not enough capacity among teachers for branch ${branchName}. ${branchStudents.length - studentIndex} students left without a mentor.`);
        break; // No more available teachers can take 15
      }

      // How many can this teacher take? (Max 15 total)
      const currentLoad = (teacherLoad[teacher.id] || 0);
      const capacity = 15 - currentLoad;
      const chunk = branchStudents.slice(studentIndex, studentIndex + capacity);
      
      for (const student of chunk) {
        updates.push(
          prisma.student.update({
            where: { id: student.id },
            data: { mentorId: teacher.id }
          })
        );
      }
      
      teacherLoad[teacher.id] = currentLoad + chunk.length;
      studentIndex += chunk.length;
    }

    if (updates.length > 0) {
       await prisma.$transaction(updates);
       console.log(`Assigned ${updates.length} students in branch ${branchName}.`);
       totalAssigned += updates.length;
    }
  }

  console.log(`\nSuccess! Assigned ${totalAssigned} mentees to mentors (15 per group max).`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
