// src/modules/admin/timetable.routes.js
const router       = require('express').Router()
const asyncHandler = require('../../middlewares/asyncHandler')
const { verifyToken } = require('../../middlewares/verifyToken')
const { verifyRole }  = require('../../middlewares/checkPermission')
const multer       = require('multer')
const db = require('../../config/db')

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Days and periods config
const DAYS    = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const PERIODS = [1,2,3,4,5,6,7,8]

// ── ADMIN routes ───────────────────────────────────────────────────────────────
router.use(verifyToken)

// GET timetable for a class (all roles can view)
// GET /api/v1/timetable?className=CS-3A&academicYear=2024-25&semester=3
router.get('/', asyncHandler(async (req, res) => {
  const { className, academicYear, semester } = req.query
  if (!className) return res.status(400).json({ success: false, error: { code: 'CLASS_REQUIRED' } })

  const slots = await db.timetableSlot.findMany({
    where: {
      className,
      ...(academicYear && { academicYear }),
      ...(semester    && { semester: parseInt(semester) }),
      isActive: true
    },
    include: {
      subject: { select: { name: true, code: true, type: true } },
      teacher: { select: { name: true, employeeId: true } }
    },
    orderBy: [{ day: 'asc' }, { period: 'asc' }]
  })

  // Build grid: { Monday: { 1: slot, 2: slot }, Tuesday: {...} }
  const grid = {}
  for (const day of DAYS) {
    grid[day] = {}
    for (const period of PERIODS) {
      grid[day][period] = null
    }
  }
  for (const slot of slots) {
    if (grid[slot.day]) {
      grid[slot.day][slot.period] = {
        id:          slot.id,
        subjectName: slot.subject?.name,
        subjectCode: slot.subject?.code,
        subjectType: slot.subject?.type,
        teacherName: slot.teacher?.name,
        room:        slot.room,
        startTime:   slot.startTime,
        endTime:     slot.endTime
      }
    }
  }

  res.json({ success: true, data: { grid, slots, days: DAYS, periods: PERIODS } })
}))

// GET all class names that have timetables
router.get('/classes', asyncHandler(async (req, res) => {
  const classes = await db.timetableSlot.findMany({
    select: { className: true, academicYear: true, semester: true },
    distinct: ['className', 'academicYear', 'semester'],
    where: { isActive: true },
    orderBy: { className: 'asc' }
  })
  res.json({ success: true, data: classes })
}))

// Admin only routes below
router.use(verifyRole('ADMIN'))

// POST create/update a single slot
// POST /api/v1/timetable/slot
router.post('/slot', asyncHandler(async (req, res) => {
  const { className, academicYear, semester, day, period, subjectId, teacherId, room, startTime, endTime } = req.body

  if (!DAYS.includes(day))    throw { status: 400, code: 'INVALID_DAY' }
  if (!PERIODS.includes(parseInt(period))) throw { status: 400, code: 'INVALID_PERIOD' }

  // Check teacher conflict — same teacher same day same period different class
  if (teacherId) {
    const conflict = await db.timetableSlot.findFirst({
      where: {
        teacherId, day, period: parseInt(period), academicYear, isActive: true,
        NOT: { className }
      }
    })
    if (conflict) throw { status: 409, code: 'TEACHER_CONFLICT',
      message: `Teacher already assigned in ${conflict.className} for ${day} Period ${period}` }
  }

  const slot = await db.timetableSlot.upsert({
    where: { className_academicYear_semester_day_period: {
      className, academicYear, semester: parseInt(semester), day, period: parseInt(period)
    }},
    create: {
      className, academicYear, semester: parseInt(semester),
      day, period: parseInt(period),
      subjectId: subjectId || null, teacherId: teacherId || null,
      room: room || null, startTime: startTime || null, endTime: endTime || null,
      isActive: true
    },
    update: {
      subjectId: subjectId || null, teacherId: teacherId || null,
      room: room || null, startTime: startTime || null, endTime: endTime || null
    },
    include: {
      subject: { select: { name: true, code: true } },
      teacher: { select: { name: true } }
    }
  })

  res.json({ success: true, data: slot })
}))

// DELETE a slot
router.delete('/slot/:id', asyncHandler(async (req, res) => {
  await db.timetableSlot.update({
    where: { id: req.params.id },
    data: { isActive: false }
  })
  res.json({ success: true, message: 'Slot cleared' })
}))

// POST bulk create — copy timetable from one class to another
router.post('/copy', asyncHandler(async (req, res) => {
  const { fromClass, toClass, academicYear, semester } = req.body

  const source = await db.timetableSlot.findMany({
    where: { className: fromClass, academicYear, semester: parseInt(semester), isActive: true }
  })

  if (source.length === 0) throw { status: 404, code: 'SOURCE_EMPTY' }

  let created = 0
  for (const s of source) {
    await db.timetableSlot.upsert({
      where: { className_academicYear_semester_day_period: {
        className: toClass, academicYear, semester: parseInt(semester), day: s.day, period: s.period
      }},
      create: {
        className: toClass, academicYear, semester: parseInt(semester),
        day: s.day, period: s.period,
        subjectId: s.subjectId, teacherId: s.teacherId,
        room: s.room, startTime: s.startTime, endTime: s.endTime, isActive: true
      },
      update: {
        subjectId: s.subjectId, teacherId: s.teacherId,
        room: s.room, startTime: s.startTime, endTime: s.endTime
      }
    })
    created++
  }

  res.json({ success: true, message: `${created} slots copied to ${toClass}` })
}))

// POST bulk create via Excel
router.post('/bulk', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: { code: 'NO_FILE' } });

  const xlsx = require('xlsx');
  const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
  const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });

  // Normalize helper
  const normalize = (key) => key.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const rows = rawRows.map(row => {
    const n = {};
    Object.keys(row).forEach(k => n[normalize(k)] = row[k]);
    return n;
  });

  const [dbSubjects, dbTeachers] = await Promise.all([
    db.subject.findMany({ select: { id: true, code: true } }),
    db.teacher.findMany({ select: { id: true, employeeId: true, name: true } })
  ]);

  const success = [], failed = [];
  
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const className    = (row.classname || row.class)?.toString().trim().toUpperCase();
        const day          = (row.day)?.toString().trim();
        const period       = parseInt(row.period);
        const subCode      = (row.subjectcode || row.subject)?.toString().trim().toUpperCase();
        const empId        = (row.teacherempid || row.teacherid || row.teacher)?.toString().trim().toUpperCase();
        const room         = (row.room || row.venue)?.toString().trim();
        const academicYear = (row.academicyear || row.year)?.toString().trim();
        const semester     = parseInt(row.semester || row.sem);

        if (!className || !day || !period || !academicYear || !semester) {
          throw new Error('Missing required fields (Class, Day, Period, AcademicYear, or Semester)');
        }

        if (!DAYS.includes(day)) throw new Error(`Invalid Day: ${day}. Use: ${DAYS.join(', ')}`);
        if (!PERIODS.includes(period)) throw new Error(`Invalid Period: ${period}. Use 1-8.`);

        let subjectId = null;
        if (subCode) {
          const sub = dbSubjects.find(s => s.code.toUpperCase() === subCode);
          if (sub) subjectId = sub.id;
          else throw new Error(`Subject Code "${subCode}" not found in database`);
        }

        let teacherId = null;
        if (empId) {
          const tea = dbTeachers.find(t => 
            (t.employeeId && t.employeeId.toUpperCase() === empId) || 
            (t.id && t.id.toUpperCase() === empId)
          );
          if (tea) teacherId = tea.id;
          else throw new Error(`Teacher with ID/EmpID "${empId}" not found`);
        }

      // Conflict check
      if (teacherId) {
        const conflict = await db.timetableSlot.findFirst({
          where: {
            teacherId, day, period, academicYear, isActive: true,
            NOT: { className }
          }
        });
        if (conflict) throw new Error(`Teacher conflict: Already in ${conflict.className}`);
      }

      await db.timetableSlot.upsert({
        where: { className_academicYear_semester_day_period: {
          className, academicYear, semester, day, period
        }},
        create: {
          className, academicYear, semester, day, period,
          subjectId, teacherId, room, isActive: true
        },
        update: { subjectId, teacherId, room }
      });
      success.push({ className, day, period });
    } catch (err) {
      failed.push({ row: i + 2, reason: err.message });
    }
  }

  const status = failed.length === 0 ? 201 : success.length === 0 ? 400 : 207;
  res.status(status).json({
    success: true,
    data: { created: success.length, failed: failed.length, errors: failed }
  });
}))

module.exports = router
