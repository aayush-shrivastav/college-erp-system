-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'APPEALED');

-- AlterTable
ALTER TABLE "fee_masters" ADD COLUMN     "bus_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "hostel_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "mess_fee" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "designation" TEXT;

-- CreateTable
CREATE TABLE "scholarships" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "providerType" TEXT NOT NULL DEFAULT 'COLLEGE',
    "default_amount" DECIMAL(10,2) NOT NULL,
    "total_budget" DECIMAL(12,2),
    "disbursed_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "application_deadline" TIMESTAMP(3),
    "category" "StudentCategory",
    "min_tenth_percent" DECIMAL(5,2),
    "min_twelfth_percent" DECIMAL(5,2),
    "min_cgpa" DECIMAL(4,2),
    "min_attendance_percent" DECIMAL(5,2),
    "family_income_limit" DECIMAL(10,2),
    "skip_marks_filter" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scholarships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scholarship_applications" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "scholarship_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "approved_amount" DECIMAL(10,2),
    "rejection_reason" TEXT,
    "document_url" TEXT,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action_at" TIMESTAMP(3),
    "action_by" TEXT,

    CONSTRAINT "scholarship_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scholarships_name_key" ON "scholarships"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scholarship_applications_student_id_scholarship_id_academic_key" ON "scholarship_applications"("student_id", "scholarship_id", "academic_year", "semester");

-- AddForeignKey
ALTER TABLE "scholarship_applications" ADD CONSTRAINT "scholarship_applications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_applications" ADD CONSTRAINT "scholarship_applications_scholarship_id_fkey" FOREIGN KEY ("scholarship_id") REFERENCES "scholarships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_applications" ADD CONSTRAINT "scholarship_applications_action_by_fkey" FOREIGN KEY ("action_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
