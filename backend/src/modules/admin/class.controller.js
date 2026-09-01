const db = require('../../config/db');
const { z } = require('zod');
const asyncHandler = require('../../middlewares/asyncHandler');

const createClassSchema = z.object({
  branchId: z.string().uuid("Invalid branch ID"),
  batchId: z.string().uuid("Invalid batch ID"),
  semester: z.number().int().min(1).max(8)
});

exports.createClass = asyncHandler(async (req, res) => {
  const result = createClassSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.format() });
  }
  const { branchId, batchId, semester } = result.data;

  // Validate branchId exists
  const branch = await db.branch.findUnique({ where: { id: branchId } });
  if (!branch) {
    return res.status(404).json({ success: false, message: 'Branch not found' });
  }

  // Validate batchId exists
  const batch = await db.batch.findUnique({ where: { id: batchId } });
  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found' });
  }

  // Prevent duplicate class
  const existing = await db.class.findUnique({
    where: { branchId_batchId_semester: { branchId, batchId, semester } }
  });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Class already exists for this branch, batch, and semester' });
  }

  const newClass = await db.class.create({
    data: { branchId, batchId, semester }
  });

  res.status(201).json({ success: true, message: 'Class created', data: newClass });
});

exports.getClasses = asyncHandler(async (req, res) => {
  const { branchId, batchId } = req.query;

  const classes = await db.class.findMany({
    where: {
      ...(branchId && { branchId }),
      ...(batchId  && { batchId  }),
    },
    include: {
      branch: { select: { name: true } },
      batch: { select: { year: true } }
    },
    orderBy: [
      { batch: { year: 'desc' } },
      { branch: { name: 'asc' } },
      { semester: 'asc' }
    ]
  });

  // Map to requested return format
  const mapped = classes.map(c => ({
    id: c.id,
    branchName: c.branch.name,
    batchYear: c.batch.year,
    semester: c.semester,
    branchId: c.branchId,
    batchId: c.batchId,
  }));

  res.json({ success: true, data: mapped });
});

exports.getClassStudents = asyncHandler(async (req, res) => {
  const { branchId, batchId, semester } = req.query;
  
  if (!branchId || !batchId || !semester) {
    return res.status(400).json({ success: false, message: 'Missing branchId, batchId, or semester parameter' });
  }

  const semInt = parseInt(semester);
  if (isNaN(semInt) || semInt < 1 || semInt > 8) {
    return res.status(400).json({ success: false, message: 'Invalid semester (must be 1-8)' });
  }

  // Fetch students matching the logical branchId + batchId + currentSem
  const students = await db.student.findMany({
    where: {
      branchId,
      batchId,
      currentSem: semInt,
    },
    include: {
      user: { select: { email: true, isActive: true } }
    },
    orderBy: { rollNo: 'asc' }
  });

  res.json({ success: true, data: students });
});
