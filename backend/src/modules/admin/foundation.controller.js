const db = require('../../config/db');
const { z } = require('zod');
const asyncHandler = require('../../middlewares/asyncHandler');

// ── Validation Schemas ──
const createBranchSchema = z.object({
  name: z.string().min(1, "Branch name cannot be empty")
});

const createBatchSchema = z.object({
  year: z.number({ required_error: "Batch year is required", invalid_type_error: "Batch year must be a number" }),
  syllabusVersion: z.string().optional()
});

// ── Controllers ──

exports.createBranch = asyncHandler(async (req, res) => {
  const result = createBranchSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.format() });
  }

  const { name } = result.data;
  
  const existing = await db.branch.findUnique({ where: { name } });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Branch with this name already exists' });
  }

  const branch = await db.branch.create({ data: { name } });
  res.status(201).json({ success: true, message: 'Branch created successfully', data: branch });
});

exports.createBatch = asyncHandler(async (req, res) => {
  const result = createBatchSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.format() });
  }

  const { year, syllabusVersion } = result.data;
  
  const existing = await db.batch.findUnique({ where: { year } });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Batch with this year already exists' });
  }

  const batch = await db.batch.create({
    data: { year, syllabusVersion }
  });
  
  res.status(201).json({ success: true, message: 'Batch created successfully', data: batch });
});

exports.getBranches = asyncHandler(async (req, res) => {
  const branches = await db.branch.findMany({
    orderBy: { name: 'asc' }
  });
  res.json({ success: true, data: branches });
});

exports.getBatches = asyncHandler(async (req, res) => {
  const { branchId } = req.query;

  // If branchId provided, only return batches that have ≥1 class in that branch
  if (branchId) {
    const batches = await db.batch.findMany({
      where: {
        classes: { some: { branchId } }
      },
      orderBy: { year: 'desc' },
    });
    return res.json({ success: true, data: batches });
  }

  const batches = await db.batch.findMany({
    orderBy: { year: 'desc' },
  });
  res.json({ success: true, data: batches });
});

exports.deleteBranch = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const branch = await db.branch.findUnique({ where: { id } });
  if (!branch) {
    return res.status(404).json({ success: false, message: 'Branch not found' });
  }

  // Safety check: active students
  const studentCount = await db.student.count({
    where: { branchId: id, user: { isDeleted: false } }
  });
  if (studentCount > 0) {
    return res.status(409).json({
      success: false,
      message: `Cannot delete: ${studentCount} active student(s) are enrolled in this branch. Remove or transfer them first.`
    });
  }

  // Safety check: classes linked to this branch
  const classCount = await db.class.count({ where: { branchId: id } });
  if (classCount > 0) {
    return res.status(409).json({
      success: false,
      message: `Cannot delete: ${classCount} class(es) are mapped to this branch. Remove them from Structure first.`
    });
  }

  await db.branch.delete({ where: { id } });
  res.json({ success: true, message: `Branch "${branch.name}" deleted successfully.` });
});
