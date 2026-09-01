const db = require('../../config/db');
const { z } = require('zod');
const asyncHandler = require('../../middlewares/asyncHandler');

function getCurrentAcademicYear() {
  const now = new Date();
  const yr  = now.getFullYear();
  return now.getMonth() >= 6 ? `${yr}-${yr + 1}` : `${yr - 1}-${yr}`;
}

// ── Validations ──
const createGroupSchema = z.object({
  classId: z.string().uuid("Invalid class ID"),
  groupName: z.string().min(1, "Group name cannot be empty")
});

const assignRangeSchema = z.object({
  classId: z.string().uuid("Invalid class ID"),
  groupId: z.string().uuid("Invalid group ID"),
  fromRollNo: z.string().min(1),
  toRollNo: z.string().min(1)
});

const assignIndividualSchema = z.object({
  groupId: z.string().uuid("Invalid group ID"),
  studentIds: z.array(z.string()).min(1, "Provide at least one student ID")
});

// ── Helpers ──
async function validateStudentClass(studentId, targetClass) {
  const student = await db.student.findUnique({ where: { id: studentId } });
  if (!student) throw new Error(`Student ${studentId} not found`);
  
  if (student.branchId !== targetClass.branchId ||
      student.batchId !== targetClass.batchId ||
      student.currentSem !== targetClass.semester) {
    throw new Error(`Student ${student.rollNo} does not belong to this class`);
  }
  return student;
}

// ── Controllers ──

exports.createGroup = asyncHandler(async (req, res) => {
  const result = createGroupSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ success: false, errors: result.error.format() });
  
  const { classId, groupName } = result.data;

  const targetClass = await db.class.findUnique({ where: { id: classId } });
  if (!targetClass) return res.status(404).json({ success: false, message: 'Class not found' });

  // Group name duplicates aren't strictly prevented by DB (no unique constraint on classId+groupName requested), 
  // but it's good UX to prevent it here.
  const existing = await db.classGroup.findFirst({ where: { classId, groupName } });
  if (existing) return res.status(409).json({ success: false, message: 'Group name already exists in this class' });

  const group = await db.classGroup.create({ data: { classId, groupName } });
  res.status(201).json({ success: true, message: 'Group created', data: group });
});

exports.getGroups = asyncHandler(async (req, res) => {
  const { classId } = req.query;
  const whereCls = classId ? { classId } : {};
  const groups = await db.classGroup.findMany({
    where: whereCls,
    orderBy: { groupName: 'asc' }
  });
  res.json({ success: true, data: groups });
});

exports.assignGroupRange = asyncHandler(async (req, res) => {
  const result = assignRangeSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ success: false, errors: result.error.format() });

  const { classId, groupId, fromRollNo, toRollNo } = result.data;

  const targetClass = await db.class.findUnique({ where: { id: classId } });
  if (!targetClass) return res.status(404).json({ success: false, message: 'Class not found' });

  const group = await db.classGroup.findUnique({ where: { id: groupId } });
  if (!group || group.classId !== classId) {
    return res.status(400).json({ success: false, message: 'Group not found or does not belong to the specified class' });
  }

  // Find students matching the class logically, and within the rollNo range
  const students = await db.student.findMany({
    where: {
      branchId: targetClass.branchId,
      batchId: targetClass.batchId,
      currentSem: targetClass.semester,
      rollNo: { gte: fromRollNo, lte: toRollNo }
    }
  });

  if (!students.length) return res.status(404).json({ success: false, message: 'No students found in the specified range for this class' });

  // Insert students, skipping duplicates if they're already in the group
  const dataToInsert = students.map(s => ({
    groupId,
    studentId: s.id
  }));

  const created = await db.groupStudent.createMany({
    data: dataToInsert,
    skipDuplicates: true
  });

  // Auto-enroll in "Group-Specific" subjects
  const groupAssignments = await db.classAssignment.findMany({
    where: { classId: classId, groupId: groupId }
  });
  
  if (groupAssignments.length > 0 && students.length > 0) {
    const enrollmentsToInsert = [];
    const academicYear = getCurrentAcademicYear();
    for (const s of students) {
      for (const a of groupAssignments) {
        enrollmentsToInsert.push({ 
          studentId: s.id, 
          subjectId: a.subjectId, 
          academicYear,
          semester: targetClass.semester
        });
      }
    }
    await db.studentSubjectEnrollment.createMany({
      data: enrollmentsToInsert,
      skipDuplicates: true
    });
  }

  res.status(201).json({ success: true, message: `Assigned ${created.count} students to the group automatically (skipped existing).` });
});

exports.assignGroupIndividual = asyncHandler(async (req, res) => {
  const result = assignIndividualSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ success: false, errors: result.error.format() });

  const { groupId, studentIds } = result.data;

  const group = await db.classGroup.findUnique({ where: { id: groupId }, include: { class: true } });
  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
  
  const targetClass = group.class;

  // Validate each student
  for (const stuId of studentIds) {
    try {
      await validateStudentClass(stuId, targetClass);
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }
  }

  const dataToInsert = studentIds.map(studentId => ({ groupId, studentId }));

  const created = await db.groupStudent.createMany({
    data: dataToInsert,
    skipDuplicates: true
  });

  // Auto-enroll in "Group-Specific" subjects
  const groupAssignments = await db.classAssignment.findMany({
    where: { classId: targetClass.id, groupId: groupId }
  });
  
  if (groupAssignments.length > 0 && studentIds.length > 0) {
    const enrollmentsToInsert = [];
    const academicYear = getCurrentAcademicYear();
    for (const studentId of studentIds) {
      for (const a of groupAssignments) {
        enrollmentsToInsert.push({ 
          studentId, 
          subjectId: a.subjectId, 
          academicYear, 
          semester: targetClass.semester 
        });
      }
    }
    await db.studentSubjectEnrollment.createMany({
      data: enrollmentsToInsert,
      skipDuplicates: true
    });
  }

  res.status(201).json({ success: true, message: `Successfully assigned ${created.count} students (skipped existing).` });
});

exports.removeGroupStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const existing = await db.groupStudent.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ success: false, message: 'Group-Student mapping not found' });

  await db.groupStudent.delete({ where: { id } });

  res.json({ success: true, message: 'Student removed from group' });
});

exports.getGroupStudents = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const groupStudents = await db.groupStudent.findMany({
    where: { groupId },
    include: {
      student: { select: { rollNo: true, name: true, id: true } }
    },
    orderBy: {
      student: { rollNo: 'asc' }
    }
  });

  res.json({ success: true, data: groupStudents });
});
