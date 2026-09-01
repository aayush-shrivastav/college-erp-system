const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding dummy academic data (MST 1 marks + Attendance)...');

  // Fetch all active students
  const enrollments = await prisma.studentSubjectEnrollment.findMany({
    where: { isActive: true },
    include: {
      student: { include: { section: true, branch: true } },
      subject: true
    }
  });

  if (enrollments.length === 0) {
    console.log('No active enrollments found.');
    return;
  }

  // Group by branch + subject since students have no section
  const groupings = {};
  for (const en of enrollments) {
    const className = en.student.branch ? `${en.student.branch.name} - A` : 'Section A';
    const key = `${className}_${en.subjectId}`;
    
    if (!groupings[key]) {
      groupings[key] = {
        className: className,
        subject: en.subject,
        students: [],
        academicYear: en.academicYear,
        semester: en.semester
      };
    }
    groupings[key].students.push(en.student);
  }

  let examCount = 0;
  let examResultCount = 0;
  let sessionCount = 0;
  let attendanceCount = 0;

  // Let's get a random teacher to assign as the conductor/entered_by
  const teacher = await prisma.teacher.findFirst();
  const teacherId = teacher ? teacher.id : 'SYSTEM';

  for (const key of Object.keys(groupings)) {
    const group = groupings[key];
    
    const className = group.className; // e.g., "B.Tech CSE - A"

    // --- 1. Create Exam ---
    // Ensure we don't duplicate Exam
    let exam = await prisma.exam.findUnique({
      where: {
        subjectId_className_academicYear_semester_examNo: {
          subjectId: group.subject.id,
          className: className,
          academicYear: group.academicYear,
          semester: group.semester,
          examNo: 1 // MST 1
        }
      }
    });

    if (!exam) {
      exam = await prisma.exam.create({
        data: {
          subjectId: group.subject.id,
          sectionId: null,
          className: className,
          academicYear: group.academicYear,
          semester: group.semester,
          examNo: 1,
          examDate: new Date(),
          maxMarks: 24,
          isLocked: true
        }
      });
      examCount++;
    }

    // --- 2. Seed Marks ---
    for (const student of group.students) {
      // Random marks (max total 24: A=9, B=9, C=6 roughly)
      const sa = Math.floor(Math.random() * 8) + 1;
      const sb = Math.floor(Math.random() * 8) + 1;
      const sc = Math.floor(Math.random() * 5) + 1;

      await prisma.examResult.upsert({
        where: {
          examId_studentId: {
            examId: exam.id,
            studentId: student.id
          }
        },
        update: {},
        create: {
          examId: exam.id,
          studentId: student.id,
          secA: sa,
          secB: sb,
          secC: sc,
          enteredBy: teacherId
        }
      });
      examResultCount++;
    }

    // --- 3. Seed Attendance (5 dummy sessions) ---
    for (let i = 0; i < 5; i++) {
        const sessionDate = new Date();
        sessionDate.setDate(sessionDate.getDate() - i*2); // Distribute dates

        let session = await prisma.attendanceSession.findUnique({
             where: { className_subjectId_sessionDate: { className: className, subjectId: group.subject.id, sessionDate } }
        });

        if (!session) {
             session = await prisma.attendanceSession.create({
                  data: {
                      subjectId: group.subject.id,
                      teacherId: teacherId,
                      sectionId: null,
                      className: className,
                      sessionDate: sessionDate,
                      startTime: "10:00 AM",
                      status: "CONDUCTED",
                      label: `Lecture ${i+1}`
                  }
             });
             sessionCount++;
        }

        // Attendance records for session
        for (const student of group.students) {
            const isPresent = Math.random() > 0.2; // 80% chance present
            
            await prisma.attendanceRecord.upsert({
                where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } },
                update: {},
                create: {
                    sessionId: session.id,
                    studentId: student.id,
                    status: isPresent ? 'PRESENT' : 'ABSENT',
                    markedBy: teacherId
                }
            });
            attendanceCount++;
            
            // Update summary
            const summary = await prisma.attendanceSummary.findUnique({
                where: { studentId_subjectId_academicYear_semester: {
                    studentId: student.id, subjectId: group.subject.id, academicYear: group.academicYear, semester: group.semester
                }}
            });
            if (summary) {
                 await prisma.attendanceSummary.update({
                      where: { id: summary.id },
                      data: {
                          totalConducted: { increment: 1 },
                          totalAttended: isPresent ? { increment: 1 } : undefined,
                          totalAbsent: !isPresent ? { increment: 1 } : undefined
                      }
                 });
            } else {
                 await prisma.attendanceSummary.create({
                      data: {
                          studentId: student.id,
                          subjectId: group.subject.id,
                          academicYear: group.academicYear,
                          semester: group.semester,
                          totalConducted: 1,
                          totalAttended: isPresent ? 1 : 0,
                          totalAbsent: !isPresent ? 1 : 0
                      }
                 });
            }
        }
    }
  }

  console.log('Seeding complete!');
  console.log(`- Created ${examCount} MST-1 Exams.`);
  console.log(`- Inserted ${examResultCount} Exam Results.`);
  console.log(`- Created ${sessionCount} Attendance Sessions.`);
  console.log(`- Inserted ${attendanceCount} Attendance Records.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
