// src/modules/admin/students/students.service.js
const bcrypt = require('bcrypt');
const db     = require('../../../config/db');

function generatePassword(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function getCurrentAcademicYear() {
  const now = new Date();
  const yr  = now.getFullYear();
  return now.getMonth() >= 6 ? `${yr}-${yr + 1}` : `${yr - 1}-${yr}`;
}

async function createStudent({ name, rollNo: r, email, batchYear, branchId, currentSem = 1 }) {
  const rollNo = r?.toString().trim();
  const emailLower = email.toLowerCase();
  
  // Resolve Batch Year to Batch ID (Need this early for both new and updates)
  const batch = await db.batch.findUnique({ where: { year: parseInt(batchYear) } });
  if (!batch) throw { status: 404, code: 'BATCH_NOT_FOUND', message: `Batch year ${batchYear} not found` };

  const existingUser = await db.user.findUnique({ where: { email: emailLower }, include: { student: true } });
  const existingRoll = await db.student.findUnique({ where: { rollNo } });

  // Scenario 1: Email already exists
  if (existingUser) {
    // If it's a student (active or deleted), we can update/reactivate
    if (existingUser.role === 'STUDENT') {
      return await db.$transaction(async (tx) => {
        // Reactivate and Update User
        const u = await tx.user.update({
          where: { id: existingUser.id },
          data: { isDeleted: false, isActive: true }
        });
        // Update Student details
        const s = await tx.student.update({
          where: { id: u.id },
          data: { rollNo, name, batchId: batch.id, branchId, currentSem: parseInt(currentSem) || 1 }
        });
        return { id: u.id, email: u.email, rollNo, name, batchYear, isReactivated: true };
      });
    } else {
      throw { status: 409, code: 'EMAIL_ALREADY_EXISTS', message: 'Email belongs to a non-student user' };
    }
  }

  // Scenario 2: Roll No already exists (but email was different)
  if (existingRoll) {
    // Update existing student with new email/data
    return await db.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: existingRoll.id },
        data: { email: emailLower, isDeleted: false, isActive: true }
      });
      const s = await tx.student.update({
        where: { id: existingRoll.id },
        data: { name, batchId: batch.id, branchId, currentSem: parseInt(currentSem) || 1 }
      });
      return { id: u.id, email: u.email, rollNo, name, batchYear, isUpdated: true };
    });
  }

  const password = rollNo;
  const hash     = await bcrypt.hash(password, 12);

  const sem = parseInt(currentSem) || 1;
  const user = await db.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: { email: email.toLowerCase(), password: hash, role: 'STUDENT' }
    });
    const s = await tx.student.create({
      data: { id: u.id, rollNo, name, batchId: batch.id, branchId, currentSem: sem }
    });

    // Auto-enroll in "Full Class" subjects (groupId is null)
    const targetClass = await tx.class.findFirst({
      where: { branchId, batchId: batch.id, semester: sem }
    });

    if (targetClass) {
      const fullClassAssignments = await tx.classAssignment.findMany({
        where: { classId: targetClass.id, groupId: null }
      });
      if (fullClassAssignments.length > 0) {
        const academicYear = targetClass.batchId ? `${batch.year}-${batch.year + 4}` : '2024-2025'; // fallback or compute
        await tx.studentSubjectEnrollment.createMany({
          data: fullClassAssignments.map(a => ({
            studentId: s.id,
            subjectId: a.subjectId,
            academicYear: getCurrentAcademicYear(),
            semester: sem
          })),
          skipDuplicates: true
        });
      }
    }
    
    return u;
  });

  // In production: send email with credentials
  console.log(`📧 New student: ${email} | Password (RollNo): ${password}`);
  return { id: user.id, email, rollNo, name, batchYear, tempPassword: password };
}

async function listStudents({ page = 1, limit = 20, search, batchYear, branchId, currentSem, mentorId }) {
  const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit) || 20);
  const take = Math.min(100, parseInt(limit) || 20);
  const where = { user: { isDeleted: false } };
  if (search) {
    where.OR = [
      { name:   { contains: search, mode: 'insensitive' } },
      { rollNo: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (batchYear)  where.batch = { year: parseInt(batchYear) };
  if (branchId)   where.branchId = branchId;
  if (currentSem) where.currentSem = parseInt(currentSem);
  if (mentorId)   where.mentorId   = mentorId;

  const [total, students] = await db.$transaction([
    db.student.count({ where }),
    db.student.findMany({
      where, skip, take,
      orderBy: { rollNo: 'asc' },
      select: {
        id: true, rollNo: true, name: true,
        currentSem: true, mentorId: true,
        profileLocked: true,
        user: { select: { email: true } },
        mentor: { select: { name: true } },
        batch: { select: { year: true } },
        branch: { select: { name: true } },
        feeProfile: {
          select: {
            ledgers: {
              select: { baseFeeDue: true, hostelFeeDue: true, busFeeDue: true, totalPaid: true, scholarshipVerified: true }
            }
          }
        }
      }
    })
  ]);

  // Compute feeAccount summary per student
  const enriched = students.map(s => {
    if (s.feeProfile) {
      let payable = 0, paid = 0;
      s.feeProfile.ledgers.forEach(l => {
        payable += Number(l.baseFeeDue) + Number(l.hostelFeeDue) + Number(l.busFeeDue);
        paid += Number(l.totalPaid) + Number(l.scholarshipVerified);
      });
      s.feeAccount = { totalPayable: payable, totalPaid: paid };
    }
    delete s.feeProfile;
    return s;
  });

  const pages = Math.ceil(total / take);
  return {
    data: enriched,
    meta: { 
      total, 
      page: parseInt(page), 
      limit: take, 
      pages,
      has_prev: parseInt(page) > 1,
      has_next: parseInt(page) < pages
    }
  };
}

async function getStudent(id) {
  const student = await db.student.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, isActive: true, isDeleted: true } },
      mentor: { select: { name: true, employeeId: true } },
      feeProfile: { include: { ledgers: true } }
    }
  });
  if (!student || student.user.isDeleted) throw { status: 404, code: 'STUDENT_NOT_FOUND' };

  if (student.feeProfile) {
    let payable = 0, paid = 0;
    student.feeProfile.ledgers.forEach(l => {
      payable += Number(l.baseFeeDue) + Number(l.hostelFeeDue) + Number(l.busFeeDue);
      paid += Number(l.totalPaid) + Number(l.scholarshipVerified);
    });
    student.feeAccount = { totalPayable: payable, totalPaid: paid };
    delete student.feeProfile;
  }
  return student;
}

async function updateStudent(id, data) {
  const allowed = ['name', 'phone', 'address', 'fatherName', 'fatherPhone',
                   'motherName', 'motherPhone', 'tenthPercent', 'twelfthPercent',
                   'isHostel', 'usesBus', 'mentorId'];
  const filtered = {};
  for (const key of allowed) {
    if (data[key] !== undefined) filtered[key] = data[key];
  }
  return db.student.update({ where: { id }, data: filtered });
}

async function softDeleteStudent(id, deletedBy) {
  return db.$transaction(async (tx) => {
    // Perform soft delete by updating the User record
    await tx.user.update({
      where: { id },
      data: { isDeleted: true, isActive: false }
    });
    
    await tx.auditLog.create({
      data: { userId: deletedBy, action: 'STUDENT_DELETED', entityType: 'students', entityId: id,
              newValue: { status: 'DELETED (SOFT)' } }
    });
  });
}

async function assignMentorsRange({ teacherId, branchId, batchYear, currentSem, fromRollNo, toRollNo }) {
  const teacher = await db.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) throw { status: 404, code: 'TEACHER_NOT_FOUND', message: 'Teacher not found' };

  const batch = await db.batch.findUnique({ where: { year: parseInt(batchYear) } });
  if (!batch) throw { status: 404, code: 'BATCH_NOT_FOUND', message: 'Batch year not found' };

  const result = await db.student.updateMany({
    where: {
      branchId,
      batchId: batch.id,
      currentSem: parseInt(currentSem),
      rollNo: {
        gte: fromRollNo,
        lte: toRollNo
      }
    },
    data: {
      mentorId: teacherId
    }
  });

  return { count: result.count };
}

module.exports = {
  createStudent,
  listStudents,
  getStudent,
  updateStudent,
  softDeleteStudent,
  assignMentorsRange
};
