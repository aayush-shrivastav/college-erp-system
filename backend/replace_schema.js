const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(file, 'utf8');

const startIdx = content.indexOf('// ── RBAC');
const endIdx = content.indexOf('@@map("batches")\n}') + '@@map("batches")\n}'.length;

const replacement = `// ── ENUMS ─────────────────────────────────────────────────────────────────────
enum Role {
  ADMIN
  TEACHER
  STUDENT
  ACCOUNTS
}

// ── USERS ─────────────────────────────────────────────────────────────────────
model User {
  id           String    @id @default(uuid())
  email        String    @unique
  password     String
  role         Role
  
  // Relations for other models
  student       Student?
  teacher       Teacher?
  notifications Notification[]
  auditLogs     AuditLog[]
  @@map("users")
}

// ── FOUNDATION MODELS ─────────────────────────────────────────────────────────
model Branch {
  id       String    @id @default(uuid())
  name     String    @unique
  students Student[]
  @@map("branches")
}

model Batch {
  id              String   @id @default(uuid())
  year            Int      @unique
  syllabusVersion String?

  // Relations for other models
  students        Student[]
  sections        Section[]
  promotions      BatchPromotion[]
  @@map("batches")
}

// ── STUDENT ───────────────────────────────────────────────────────────────────
model Student {
  id             String   @id
  user           User     @relation(fields: [id], references: [id])
  rollNo         String   @unique @map("roll_no")
  branchId       String   @map("branch_id")
  branch         Branch   @relation(fields: [branchId], references: [id])
  batchId        String   @map("batch_id")
  batch          Batch    @relation(fields: [batchId], references: [id])
  currentSem     Int      @map("current_sem")

  // Relations for other models
  sectionId      String?  @map("section_id")
  section        Section? @relation(fields: [sectionId], references: [id])
  mentorId       String?  @map("mentor_id")
  mentor         Teacher? @relation("MentorStudent", fields: [mentorId], references: [id])
  
  enrollments         StudentSubjectEnrollment[]
  attendanceRecords   AttendanceRecord[]
  attendanceSummaries AttendanceSummary[]
  examResults         ExamResult[]
  assignmentMarks     AssignmentSubmission[]
  feeAccount          StudentFeeAccount?
  semRegistrations    SemesterRegistration[]
  fines               Fine[]
  @@map("students")
}

// ── TEACHER ───────────────────────────────────────────────────────────────────
model Teacher {
  id            String    @id
  user          User      @relation(fields: [id], references: [id])
  name          String
  department    String?

  // Relations for other models
  mentees              Student[]              @relation("MentorStudent")
  attendanceSessions   AttendanceSession[]
  registrationCodes    RegistrationCode[]
  timetableSlots       TimetableSlot[]
  subjectAssignments   SectionSubjectTeacher[]
  @@map("teachers")
}`;

content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
fs.writeFileSync(file, content);
console.log('Schema replaced');
