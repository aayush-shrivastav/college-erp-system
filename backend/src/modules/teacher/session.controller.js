const db = require('../../config/db');
const { z } = require('zod');
const asyncHandler = require('../../middlewares/asyncHandler');

// ── Validation ──
const createSessionSchema = z.object({
  classAssignmentId: z.string().uuid("Invalid assignment ID"),
  date: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Invalid date format" }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Invalid start time format (HH:MM)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Invalid end time format (HH:MM)")
});

const updateSessionSchema = z.object({
  status: z.enum(['COMPLETED', 'CANCELLED'], { message: "Status must be COMPLETED or CANCELLED" }),
  reason: z.string().optional()
});

// ── Controllers ──

exports.createSession = asyncHandler(async (req, res) => {
  const result = createSessionSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ success: false, errors: result.error.format() });
  const { classAssignmentId, date, startTime, endTime } = result.data;

  // Verify assignment belongs to logged-in teacher
  const assignment = await db.classAssignment.findUnique({ where: { id: classAssignmentId } });
  if (!assignment) return res.status(404).json({ success: false, message: 'Class Assignment not found' });
  if (assignment.teacherId !== req.user.sub) {
    return res.status(403).json({ success: false, message: 'Unauthorized. This assignment does not belong to you.' });
  }

  const sessionDate = new Date(date);
  
  // Prevent duplicate session on same date + assignment
  const existing = await db.classSession.findUnique({
    where: {
      classAssignmentId_date: { classAssignmentId, date: sessionDate }
    }
  });
  if (existing) {
    return res.status(409).json({ success: false, message: 'A session is already scheduled for this date and assignment' });
  }

  const session = await db.classSession.create({
    data: {
      classAssignmentId,
      date: sessionDate,
      startTime,
      endTime,
      status: 'ACTIVE'
    }
  });

  res.status(201).json({ success: true, message: 'Session created successfully', data: session });
});

exports.getMySessions = asyncHandler(async (req, res) => {
  const sessions = await db.classSession.findMany({
    where: {
      classAssignment: { teacherId: req.user.sub }
    },
    include: {
      classAssignment: {
        include: {
          subject: { select: { name: true, code: true, type: true } },
          class: { include: { branch: { select: { name: true } }, batch: { select: { year: true } } } },
          group: { select: { groupName: true } }
        }
      }
    },
    orderBy: [
      { date: 'desc' },
      { startTime: 'desc' }
    ]
  });

  // Map nicely for response
  const mapped = sessions.map(s => ({
    id: s.id,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    status: s.status,
    cancelReason: s.cancelReason,
    subject: s.classAssignment.subject,
    classInfo: {
      semester: s.classAssignment.class.semester,
      branch: s.classAssignment.class.branch.name,
      batch: s.classAssignment.class.batch.year
    },
    group: s.classAssignment.group ? s.classAssignment.group.groupName : null
  }));

  res.json({ success: true, data: mapped });
});

exports.updateSessionStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = updateSessionSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ success: false, errors: result.error.format() });
  const { status, reason } = result.data;

  const session = await db.classSession.findUnique({
    where: { id },
    include: { classAssignment: true }
  });

  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

  // Only teacher who created it can update it
  if (session.classAssignment.teacherId !== req.user.sub) {
    return res.status(403).json({ success: false, message: 'Unauthorized. You do not own this session.' });
  }

  // Prevent updating already completed session
  if (session.status === 'COMPLETED') {
    return res.status(400).json({ success: false, message: 'Cannot update an already completed session.' });
  }
  
  // (Optional) prevent returning CANCELLED to COMPLETED? The spec didn't strictly say, but usually yes.
  if (session.status === 'CANCELLED' && status !== 'CANCELLED') {
    return res.status(400).json({ success: false, message: 'Cannot update a cancelled session.' });
  }

  if (status === 'CANCELLED' && !reason) {
     return res.status(400).json({ success: false, message: 'Reason is required when cancelling a session.' });
  }

  const updatedSession = await db.classSession.update({
    where: { id },
    data: {
      status,
      cancelReason: status === 'CANCELLED' ? reason : null
    }
  });

  res.json({ success: true, message: `Session status updated to ${status}`, data: updatedSession });
});
