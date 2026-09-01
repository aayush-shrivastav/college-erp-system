-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'TEACHER', 'STUDENT', 'ACCOUNTS');

-- CreateEnum
CREATE TYPE "SubjectType" AS ENUM ('THEORY', 'LAB', 'ELECTIVE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "syllabusVersion" TEXT,
    "syllabusVersionId" TEXT,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_groups" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,

    CONSTRAINT "class_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_students" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,

    CONSTRAINT "group_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "roll_no" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "phone" TEXT,
    "address" TEXT,
    "father_name" TEXT,
    "father_phone" TEXT,
    "mother_name" TEXT,
    "mother_phone" TEXT,
    "tenth_percent" DECIMAL(5,2),
    "twelfth_percent" DECIMAL(5,2),
    "profile_locked" BOOLEAN NOT NULL DEFAULT false,
    "is_hostel" BOOLEAN NOT NULL DEFAULT false,
    "uses_bus" BOOLEAN NOT NULL DEFAULT false,
    "branch_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "current_sem" INTEGER NOT NULL,
    "section_id" TEXT,
    "mentor_id" TEXT,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "employee_id" TEXT,
    "department" TEXT,
    "phone" TEXT,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "max_strength" INTEGER NOT NULL DEFAULT 60,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_groups" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "max_strength" INTEGER NOT NULL DEFAULT 20,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section_subject_teachers" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "academic_year" TEXT NOT NULL,
    "assignment_type" TEXT NOT NULL DEFAULT 'THEORY',
    "lab_group_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "section_subject_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_promotions" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "from_semester" INTEGER NOT NULL,
    "to_semester" INTEGER NOT NULL,
    "from_acad_year" TEXT NOT NULL,
    "to_acad_year" TEXT NOT NULL,
    "promoted_by" TEXT NOT NULL,
    "promoted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "students_count" INTEGER NOT NULL,

    CONSTRAINT "batch_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syllabus_versions" (
    "id" TEXT NOT NULL,
    "version_name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "syllabus_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "type" "SubjectType" NOT NULL DEFAULT 'THEORY',
    "credits" INTEGER NOT NULL DEFAULT 3,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "syllabus_version_id" TEXT,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_assignments" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "group_id" TEXT,

    CONSTRAINT "class_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_sessions" (
    "id" TEXT NOT NULL,
    "class_assignment_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "cancel_reason" TEXT,

    CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_subject_enrollments" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "registration_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_subject_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "active_semesters" (
    "id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "course_name" TEXT NOT NULL,
    "registration_open" BOOLEAN NOT NULL DEFAULT false,
    "opened_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "active_semesters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_codes" (
    "id" TEXT NOT NULL,
    "active_sem_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "max_uses" INTEGER NOT NULL DEFAULT 200,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_registration_pins" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "active_sem_id" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "generated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_registration_pins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semester_registrations" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "active_sem_id" TEXT NOT NULL,
    "code_id" TEXT NOT NULL,
    "selected_subjects" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejection_note" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "semester_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_sessions" (
    "id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "section_id" TEXT,
    "class_name" TEXT NOT NULL,
    "session_date" DATE NOT NULL,
    "start_time" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONDUCTED',
    "label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABSENT',
    "marked_by" TEXT,
    "marked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_summaries" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "total_conducted" INTEGER NOT NULL DEFAULT 0,
    "total_attended" INTEGER NOT NULL DEFAULT 0,
    "total_absent" INTEGER NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "section_id" TEXT,
    "class_name" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "exam_no" INTEGER NOT NULL,
    "exam_date" DATE,
    "max_marks" INTEGER NOT NULL DEFAULT 24,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_results" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "sec_a" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "sec_b" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "sec_c" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "entered_by" TEXT,
    "entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_submissions" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "marks_obtained" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "entered_by" TEXT,
    "entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_structures" (
    "id" TEXT NOT NULL,
    "batch_year" INTEGER NOT NULL,
    "course_name" TEXT NOT NULL,
    "total_fee" DECIMAL(10,2) NOT NULL,
    "hostel_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bus_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "effective_from" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_fee_accounts" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "fee_structure_id" TEXT NOT NULL,
    "is_hostel" BOOLEAN NOT NULL DEFAULT false,
    "uses_bus" BOOLEAN NOT NULL DEFAULT false,
    "scholarship_amt" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_payable" DECIMAL(10,2) NOT NULL,
    "total_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_fee_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_transactions" (
    "id" TEXT NOT NULL,
    "fee_account_id" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_type" TEXT NOT NULL,
    "receipt_no" TEXT NOT NULL,
    "payment_date" DATE NOT NULL,
    "processed_by" TEXT,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fines" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "amount" DECIMAL(8,2) NOT NULL,
    "fine_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMP(3),
    "payment_tx_id" TEXT,
    "raised_by" TEXT NOT NULL,
    "waived_by" TEXT,
    "waiver_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_slots" (
    "id" TEXT NOT NULL,
    "section_id" TEXT,
    "class_name" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "day" TEXT NOT NULL,
    "period" INTEGER NOT NULL,
    "subject_id" TEXT,
    "teacher_id" TEXT,
    "room" TEXT,
    "start_time" TEXT,
    "end_time" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "action_url" TEXT,
    "metadata" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "data_type" TEXT NOT NULL DEFAULT 'string',
    "description" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "branches_name_key" ON "branches"("name");

-- CreateIndex
CREATE UNIQUE INDEX "batches_year_key" ON "batches"("year");

-- CreateIndex
CREATE UNIQUE INDEX "classes_branch_id_batch_id_semester_key" ON "classes"("branch_id", "batch_id", "semester");

-- CreateIndex
CREATE UNIQUE INDEX "group_students_group_id_student_id_key" ON "group_students"("group_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_roll_no_key" ON "students"("roll_no");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_employee_id_key" ON "teachers"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "sections_batch_id_name_key" ON "sections"("batch_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "lab_groups_section_id_subject_id_name_key" ON "lab_groups"("section_id", "subject_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "section_subject_teachers_lab_group_id_key" ON "section_subject_teachers"("lab_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "section_subject_teachers_section_id_subject_id_assignment_t_key" ON "section_subject_teachers"("section_id", "subject_id", "assignment_type", "semester", "academic_year");

-- CreateIndex
CREATE UNIQUE INDEX "syllabus_versions_version_name_key" ON "syllabus_versions"("version_name");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_code_key" ON "subjects"("code");

-- CreateIndex
CREATE UNIQUE INDEX "class_assignments_class_id_subject_id_group_id_key" ON "class_assignments"("class_id", "subject_id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_sessions_class_assignment_id_date_key" ON "class_sessions"("class_assignment_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "student_subject_enrollments_student_id_subject_id_academic__key" ON "student_subject_enrollments"("student_id", "subject_id", "academic_year", "semester");

-- CreateIndex
CREATE UNIQUE INDEX "active_semesters_academic_year_semester_course_name_key" ON "active_semesters"("academic_year", "semester", "course_name");

-- CreateIndex
CREATE UNIQUE INDEX "registration_codes_code_key" ON "registration_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "registration_codes_active_sem_id_teacher_id_key" ON "registration_codes"("active_sem_id", "teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_registration_pins_pin_key" ON "student_registration_pins"("pin");

-- CreateIndex
CREATE UNIQUE INDEX "student_registration_pins_student_id_active_sem_id_key" ON "student_registration_pins"("student_id", "active_sem_id");

-- CreateIndex
CREATE UNIQUE INDEX "semester_registrations_student_id_active_sem_id_key" ON "semester_registrations"("student_id", "active_sem_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_sessions_class_name_subject_id_session_date_key" ON "attendance_sessions"("class_name", "subject_id", "session_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_session_id_student_id_key" ON "attendance_records"("session_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_summaries_student_id_subject_id_academic_year_se_key" ON "attendance_summaries"("student_id", "subject_id", "academic_year", "semester");

-- CreateIndex
CREATE UNIQUE INDEX "exams_subject_id_class_name_academic_year_semester_exam_no_key" ON "exams"("subject_id", "class_name", "academic_year", "semester", "exam_no");

-- CreateIndex
CREATE UNIQUE INDEX "exam_results_exam_id_student_id_key" ON "exam_results"("exam_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_submissions_student_id_subject_id_academic_year__key" ON "assignment_submissions"("student_id", "subject_id", "academic_year", "semester");

-- CreateIndex
CREATE UNIQUE INDEX "fee_structures_batch_year_course_name_key" ON "fee_structures"("batch_year", "course_name");

-- CreateIndex
CREATE UNIQUE INDEX "student_fee_accounts_student_id_key" ON "student_fee_accounts"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_transactions_receipt_no_key" ON "fee_transactions"("receipt_no");

-- CreateIndex
CREATE UNIQUE INDEX "fines_payment_tx_id_key" ON "fines"("payment_tx_id");

-- CreateIndex
CREATE UNIQUE INDEX "timetable_slots_class_name_academic_year_semester_day_perio_key" ON "timetable_slots"("class_name", "academic_year", "semester", "day", "period");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_syllabusVersionId_fkey" FOREIGN KEY ("syllabusVersionId") REFERENCES "syllabus_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_students" ADD CONSTRAINT "group_students_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "class_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_students" ADD CONSTRAINT "group_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_id_fkey" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_id_fkey" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_groups" ADD CONSTRAINT "lab_groups_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_groups" ADD CONSTRAINT "lab_groups_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_subject_teachers" ADD CONSTRAINT "section_subject_teachers_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_subject_teachers" ADD CONSTRAINT "section_subject_teachers_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_subject_teachers" ADD CONSTRAINT "section_subject_teachers_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_subject_teachers" ADD CONSTRAINT "section_subject_teachers_lab_group_id_fkey" FOREIGN KEY ("lab_group_id") REFERENCES "lab_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_promotions" ADD CONSTRAINT "batch_promotions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_syllabus_version_id_fkey" FOREIGN KEY ("syllabus_version_id") REFERENCES "syllabus_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_assignments" ADD CONSTRAINT "class_assignments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_assignments" ADD CONSTRAINT "class_assignments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_assignments" ADD CONSTRAINT "class_assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_assignments" ADD CONSTRAINT "class_assignments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "class_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_class_assignment_id_fkey" FOREIGN KEY ("class_assignment_id") REFERENCES "class_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_subject_enrollments" ADD CONSTRAINT "student_subject_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_subject_enrollments" ADD CONSTRAINT "student_subject_enrollments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_codes" ADD CONSTRAINT "registration_codes_active_sem_id_fkey" FOREIGN KEY ("active_sem_id") REFERENCES "active_semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_codes" ADD CONSTRAINT "registration_codes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_registration_pins" ADD CONSTRAINT "student_registration_pins_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_registration_pins" ADD CONSTRAINT "student_registration_pins_active_sem_id_fkey" FOREIGN KEY ("active_sem_id") REFERENCES "active_semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_registrations" ADD CONSTRAINT "semester_registrations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_registrations" ADD CONSTRAINT "semester_registrations_active_sem_id_fkey" FOREIGN KEY ("active_sem_id") REFERENCES "active_semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_registrations" ADD CONSTRAINT "semester_registrations_code_id_fkey" FOREIGN KEY ("code_id") REFERENCES "registration_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_summaries" ADD CONSTRAINT "attendance_summaries_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_summaries" ADD CONSTRAINT "attendance_summaries_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_accounts" ADD CONSTRAINT "student_fee_accounts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_accounts" ADD CONSTRAINT "student_fee_accounts_fee_structure_id_fkey" FOREIGN KEY ("fee_structure_id") REFERENCES "fee_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_transactions" ADD CONSTRAINT "fee_transactions_fee_account_id_fkey" FOREIGN KEY ("fee_account_id") REFERENCES "student_fee_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_payment_tx_id_fkey" FOREIGN KEY ("payment_tx_id") REFERENCES "fee_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
