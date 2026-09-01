const db = require('../../config/db');
const { z } = require('zod');
const asyncHandler = require('../../middlewares/asyncHandler');

function getCurrentAcademicYear() {
  const now = new Date();
  const yr  = now.getFullYear();
  return now.getMonth() >= 6 ? `${yr}-${yr + 1}` : `${yr - 1}-${yr}`;
}

// ── Validation ──
const assignTeacherSchema = z.object({
  classId: z.string().uuid("Invalid class ID"),
  subjectId: z.string().uuid("Invalid subject ID"),
  teacherId: z.string().uuid("Invalid teacher ID"),
  groupId: z.string().uuid("Invalid group ID").optional()
});

// ── Admin Controllers ──

exports.assignTeacher = asyncHandler(async (req, res) => {
  const result = assignTeacherSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ success: false, errors: result.error.format() });
  const { classId, subjectId, teacherId, groupId } = result.data;

  // 1. Teacher must exist
  const teacher = await db.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });

  // 2. Class must exist
  const targetClass = await db.class.findUnique({ where: { id: classId } });
  if (!targetClass) return res.status(404).json({ success: false, message: 'Class not found' });

  // 3. Subject must exist and belong to the same branch + semester
  const subject = await db.subject.findUnique({ where: { id: subjectId } });
  if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
  
  if (subject.branchId !== targetClass.branchId || subject.semester !== targetClass.semester) {
    return res.status(400).json({ success: false, message: 'Subject does not belong to the branch and semester of this class' });
  }

  // 4. Group (if provided) must belong to the class
  if (groupId) {
    const group = await db.classGroup.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (group.classId !== classId) return res.status(400).json({ success: false, message: 'Group does not belong to the specified class' });
  }

  // 5. Prevent duplicate assignment
  // Unique constraint covers: classId + subjectId + groupId
  // Note: if groupId is null vs existing groupId is null, Prisma unique correctly handles it, but let's check manually just in case.
  const queryGroupId = groupId || null;
  const existing = await db.classAssignment.findFirst({
    where: { classId, subjectId, groupId: queryGroupId }
  });

  if (existing) {
    return res.status(409).json({ success: false, message: 'This subject is already assigned for this class and group combination' });
  }

  const assignment = await db.classAssignment.create({
    data: { classId, subjectId, teacherId, groupId: queryGroupId }
  });

  // Retroactive Auto-Enrollment
  if (queryGroupId) {
    // It's a group assignment, fetch all students in this group
    const groupStudents = await db.groupStudent.findMany({
      where: { groupId: queryGroupId },
      select: { studentId: true }
    });
    if (groupStudents.length > 0) {
      const academicYear = getCurrentAcademicYear();
      await db.studentSubjectEnrollment.createMany({
        data: groupStudents.map(gs => ({ 
          studentId: gs.studentId, 
          subjectId, 
          academicYear,
          semester: targetClass.semester
        })),
        skipDuplicates: true
      });
    }
  } else {
    // It's a full-class assignment, fetch all logically mapped students
    const classStudents = await db.student.findMany({
      where: {
        branchId: targetClass.branchId,
        batchId: targetClass.batchId,
        currentSem: targetClass.semester
      },
      select: { id: true }
    });
    if (classStudents.length > 0) {
      const academicYear = getCurrentAcademicYear();
      await db.studentSubjectEnrollment.createMany({
        data: classStudents.map(s => ({ 
          studentId: s.id, 
          subjectId, 
          academicYear,
          semester: targetClass.semester
        })),
        skipDuplicates: true
      });
    }
  }

  res.status(201).json({ success: true, message: 'Assignment created successfully', data: assignment });
});

exports.getAssignments = asyncHandler(async (req, res) => {
  const { classId } = req.query;
  const whereCls = classId ? { classId } : {};
  
  const assignments = await db.classAssignment.findMany({
    where: whereCls,
    include: {
      class: {
        include: { branch: { select: { name: true } }, batch: { select: { year: true } } }
      },
      subject: { select: { name: true, code: true, type: true } },
      teacher: { select: { name: true, department: true } },
      group: { select: { groupName: true } }
    },
    orderBy: { class: { semester: 'asc' } }
  });

  res.json({ success: true, data: assignments });
});

exports.deleteAssignment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await db.classAssignment.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ success: false, message: 'Assignment not found' });
  
  await db.classAssignment.delete({ where: { id } });
  res.json({ success: true, message: 'Assignment deleted successfully' });
});
