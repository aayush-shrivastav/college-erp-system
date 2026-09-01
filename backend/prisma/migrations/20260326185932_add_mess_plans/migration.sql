/*
  Warnings:

  - You are about to drop the `fee_structures` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `fee_transactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `student_fee_accounts` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "StudentCategory" AS ENUM ('GENERAL', 'SC_ST', 'OBC', 'DRCC');

-- DropForeignKey
ALTER TABLE "fee_transactions" DROP CONSTRAINT "fee_transactions_fee_account_id_fkey";

-- DropForeignKey
ALTER TABLE "fines" DROP CONSTRAINT "fines_payment_tx_id_fkey";

-- DropForeignKey
ALTER TABLE "student_fee_accounts" DROP CONSTRAINT "student_fee_accounts_fee_structure_id_fkey";

-- DropForeignKey
ALTER TABLE "student_fee_accounts" DROP CONSTRAINT "student_fee_accounts_student_id_fkey";

-- DropTable
DROP TABLE "fee_structures";

-- DropTable
DROP TABLE "fee_transactions";

-- DropTable
DROP TABLE "student_fee_accounts";

-- CreateTable
CREATE TABLE "fee_masters" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "tuition_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "development_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "exam_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "other_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_fee" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hostel_rooms" (
    "id" TEXT NOT NULL,
    "room_type" TEXT NOT NULL,
    "fee_amount" DECIMAL(10,2) NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hostel_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bus_routes" (
    "id" TEXT NOT NULL,
    "route_name" TEXT NOT NULL,
    "fee_amount" DECIMAL(10,2) NOT NULL,
    "stops" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bus_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mess_plans" (
    "id" TEXT NOT NULL,
    "plan_name" TEXT NOT NULL,
    "fee_amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mess_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_fee_profiles" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "category" "StudentCategory" NOT NULL DEFAULT 'GENERAL',
    "is_hosteller" BOOLEAN NOT NULL DEFAULT false,
    "hostel_room_id" TEXT,
    "uses_bus" BOOLEAN NOT NULL DEFAULT false,
    "bus_route_id" TEXT,
    "uses_mess" BOOLEAN NOT NULL DEFAULT false,
    "mess_plan_id" TEXT,
    "has_scholarship" BOOLEAN NOT NULL DEFAULT false,
    "scholarship_name" TEXT,

    CONSTRAINT "student_fee_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_ledgers" (
    "id" TEXT NOT NULL,
    "student_fee_profile_id" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "base_fee_due" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "hostel_fee_due" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bus_fee_due" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "mess_fee_due" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "scholarship_awaited" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "scholarship_verified" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "net_due" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "student_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "ledger_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_mode" TEXT NOT NULL DEFAULT 'CASH',
    "reference_no" TEXT,
    "receipt_no" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_by" TEXT,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fee_masters_batch_id_branch_id_semester_key" ON "fee_masters"("batch_id", "branch_id", "semester");

-- CreateIndex
CREATE UNIQUE INDEX "student_fee_profiles_student_id_key" ON "student_fee_profiles"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_ledgers_student_fee_profile_id_semester_key" ON "student_ledgers"("student_fee_profile_id", "semester");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_receipt_no_key" ON "transactions"("receipt_no");

-- AddForeignKey
ALTER TABLE "fee_masters" ADD CONSTRAINT "fee_masters_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_masters" ADD CONSTRAINT "fee_masters_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_profiles" ADD CONSTRAINT "student_fee_profiles_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_profiles" ADD CONSTRAINT "student_fee_profiles_hostel_room_id_fkey" FOREIGN KEY ("hostel_room_id") REFERENCES "hostel_rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_profiles" ADD CONSTRAINT "student_fee_profiles_bus_route_id_fkey" FOREIGN KEY ("bus_route_id") REFERENCES "bus_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_profiles" ADD CONSTRAINT "student_fee_profiles_mess_plan_id_fkey" FOREIGN KEY ("mess_plan_id") REFERENCES "mess_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_ledgers" ADD CONSTRAINT "student_ledgers_student_fee_profile_id_fkey" FOREIGN KEY ("student_fee_profile_id") REFERENCES "student_fee_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_ledger_id_fkey" FOREIGN KEY ("ledger_id") REFERENCES "student_ledgers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_payment_tx_id_fkey" FOREIGN KEY ("payment_tx_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
