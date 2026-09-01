const db = require('../../config/db');
const { z } = require('zod');
const asyncHandler = require('../../middlewares/asyncHandler');

const createSubjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  branchId: z.string().uuid("Invalid branch ID"),
  semester: z.coerce.number().int().min(1).max(8),
  subjectType: z.enum(['THEORY', 'LAB', 'ELECTIVE']),
  credits: z.coerce.number().int().min(1).max(10),
  syllabusVersionId: z.string().uuid().optional() // Advanced optional
});

exports.createSubject = asyncHandler(async (req, res) => {
  const result = createSubjectSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ success: false, errors: result.error.format() });
  const { name, code, branchId, semester, subjectType, credits, syllabusVersionId } = result.data;

  // Validate Code unique
  const existingCode = await db.subject.findUnique({ where: { code } });
  if (existingCode) return res.status(409).json({ success: false, message: 'Subject code already exists' });

  // Validate Branch exists
  const branch = await db.branch.findUnique({ where: { id: branchId } });
  if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });

  // If syllabusVersionId is provided, validate it exists
  if (syllabusVersionId) {
    const sv = await db.syllabusVersion.findUnique({ where: { id: syllabusVersionId } });
    if (!sv) return res.status(404).json({ success: false, message: 'Syllabus Version not found' });
  }

  const subject = await db.subject.create({
    data: { name, code, branchId, semester, type: subjectType, credits, syllabusVersionId }
  });

  res.status(201).json({ success: true, message: 'Subject created', data: subject });
});

exports.getSubjects = asyncHandler(async (req, res) => {
  const { branchId, semester } = req.query;

  const filters = { isDeleted: false };
  if (branchId) filters.branchId = branchId;
  if (semester) {
    const semInt = parseInt(semester);
    if (!isNaN(semInt)) filters.semester = semInt;
  }

  const subjects = await db.subject.findMany({
    where: filters,
    include: {
      branch: { select: { name: true } },
      syllabusVersion: { select: { versionName: true } }
    },
    orderBy: [
      { semester: 'asc' },
      { name: 'asc' }
    ]
  });

  res.json({ success: true, data: subjects });
});

const assignBatchSyllabusSchema = z.object({
  batchYear: z.coerce.number().int().min(2000),
  syllabusVersionId: z.string().uuid(),
  branchId: z.string().uuid().optional()
});

exports.assignBatchSyllabus = asyncHandler(async (req, res) => {
  const result = assignBatchSyllabusSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ success: false, errors: result.error.format() });
  
  const { batchYear, syllabusVersionId, branchId } = result.data;

  // Verify syllabus version exists
  const sv = await db.syllabusVersion.findUnique({ where: { id: syllabusVersionId } });
  if (!sv) return res.status(404).json({ success: false, message: 'Syllabus Version not found' });

  // Get or Create the global batch year record
  let batch = await db.batch.findUnique({ where: { year: batchYear } });
  if (!batch) {
    batch = await db.batch.create({ data: { year: batchYear } });
  }

  if (branchId) {
    // Branch-wise assignment
    const assignment = await db.batchSyllabus.upsert({
      where: { batchId_branchId: { batchId: batch.id, branchId } },
      update: { syllabusVersionId: syllabusVersionId },
      create: { batchId: batch.id, branchId, syllabusVersionId }
    });
    return res.json({ success: true, message: 'Syllabus assigned to branch-batch successfully', data: assignment });
  } else {
    // Global assignment (keeps legacy behavior but updates the batch year's default)
    const updatedBatch = await db.batch.update({
      where: { id: batch.id },
      data: { syllabusVersionId: syllabusVersionId }
    });
    res.json({ success: true, message: 'Syllabus assigned to all branches in this batch year', data: updatedBatch });
  }
});

const assignCoordinatorSchema = z.object({
  subjectId: z.string().uuid(),
  teacherId: z.string().uuid(),
  batchId: z.string().uuid().or(z.literal('')).optional().nullable(),
  branchId: z.string().uuid().or(z.literal('')).optional().nullable(),
  session: z.string().default("2024-25")
});

exports.assignCoordinator = asyncHandler(async (req, res) => {
  const result = assignCoordinatorSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ success: false, errors: result.error.format() });

  const { subjectId, teacherId, batchId, branchId, session } = result.data;

  try {
    // Validate teacher existence
    const teacher = await db.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });

    // Validate subject existence
    const subject = await db.subject.findUnique({ where: { id: subjectId } });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });

    // Normalize nulls for unique constraint
    const bId = (batchId && batchId !== "") ? batchId : null;
    const brId = (branchId && branchId !== "") ? branchId : null;

    console.log('Attempting Upsert with:', { subjectId, teacherId, bId, brId, session });

    // Prisma Unique constraint handling for nullable fields is tricky in where
    // We try to find existing first to be safe
    const existing = await db.subjectCoordinator.findFirst({
      where: {
        subjectId,
        batchId: bId,
        branchId: brId,
        session
      }
    });

    let coordinator;
    if (existing) {
      coordinator = await db.subjectCoordinator.update({
        where: { id: existing.id },
        data: { teacherId, isActive: true }
      });
    } else {
      coordinator = await db.subjectCoordinator.create({
        data: {
          subjectId,
          teacherId,
          batchId: bId,
          branchId: brId,
          session
        }
      });
    }


    console.log('Coordination Upsert Success:', coordinator.id);
    res.status(200).json({ success: true, message: 'Coordinator assigned successfully', data: coordinator });
  } catch (error) {
    console.error('Coordinator Assignment CRITICAL ERROR:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error during assignment',
      errorCode: error.code 
    });
  }
});



exports.getCoordinators = asyncHandler(async (req, res) => {
  const { subjectId, sessionId } = req.query;
  const filters = { isActive: true };
  if (subjectId) filters.subjectId = subjectId;
  if (sessionId) filters.session = sessionId;

  const coordinators = await db.subjectCoordinator.findMany({
    where: filters,
    include: {
      subject: { select: { name: true, code: true } },
      teacher: { select: { name: true, employeeId: true } },
      batch: { select: { year: true } },
      branch: { select: { name: true } }
    },
    orderBy: { assignedAt: 'desc' }
  });

  res.json({ success: true, data: coordinators });
});

exports.removeCoordinator = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await db.subjectCoordinator.update({
    where: { id },
    data: { isActive: false }
  });
  res.json({ success: true, message: 'Coordinator removed successfully' });
});

