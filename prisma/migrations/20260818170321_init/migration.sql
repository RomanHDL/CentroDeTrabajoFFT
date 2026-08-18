-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMINISTRADOR', 'SUPERVISOR', 'LIDER');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('PUEDE_CUBRIR', 'INTERMEDIO', 'EXPERTO');

-- CreateEnum
CREATE TYPE "EmployeeSkillSource" AS ENUM ('IMPORTED', 'MANUAL');

-- CreateEnum
CREATE TYPE "BajaConflictStatus" AS ENUM ('PENDING', 'CONFIRMED_SAME_PERSON', 'CONFIRMED_DIFFERENT_PERSON', 'IGNORED');

-- CreateEnum
CREATE TYPE "EmployeeReconciliationStatus" AS ENUM ('PENDING', 'CONFIRMED_SAME_PERSON', 'CONFIRMED_DIFFERENT_PERSON', 'IGNORED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENTE', 'AUSENTE', 'RETARDO');

-- CreateEnum
CREATE TYPE "DailyAssignmentStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "AssignmentEndReason" AS ENUM ('MOVED', 'RELEASED', 'SHIFT_END', 'CORRECTION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "employeeNumber" TEXT,
    "username" TEXT,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeNumber" TEXT,
    "fullName" TEXT NOT NULL,
    "photoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "sheet" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "newEmployees" INTEGER NOT NULL DEFAULT 0,
    "updatedEmployees" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "conflictsFound" INTEGER NOT NULL DEFAULT 0,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'RUNNING',
    "triggeredByUserId" TEXT NOT NULL,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeImportSource" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "sourceSheet" TEXT NOT NULL,
    "sourceRowNumber" INTEGER NOT NULL,
    "rawZona" TEXT,
    "rawActividad" TEXT,
    "rawAsistencia" TEXT,
    "rawPrestamo" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeImportSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSkill" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" "SkillLevel",
    "source" "EmployeeSkillSource" NOT NULL DEFAULT 'IMPORTED',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "addedByUserId" TEXT,
    "deactivatedAt" TIMESTAMP(3),
    "deactivatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BajaConflict" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "bajaFullName" TEXT NOT NULL,
    "bajaRowNumber" INTEGER NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "status" "BajaConflictStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BajaConflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeReconciliationCandidate" (
    "id" TEXT NOT NULL,
    "existingEmployeeId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "candidateSourceRowNumber" INTEGER NOT NULL,
    "candidateFullName" TEXT NOT NULL,
    "candidateEmployeeNumber" TEXT,
    "candidateRawZona" TEXT,
    "candidateRawActividad" TEXT,
    "candidateRawAsistencia" TEXT,
    "candidateRawPrestamo" TEXT,
    "status" "EmployeeReconciliationStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeReconciliationCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportedAttendanceReference" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeImportSourceId" TEXT NOT NULL,
    "rawCode" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportedAttendanceReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "shift" TEXT NOT NULL DEFAULT 'GENERAL',
    "checkInAt" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL,
    "registeredByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkArea" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workstation" (
    "id" TEXT NOT NULL,
    "workAreaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "requiredSkillId" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Workstation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyAssignment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "shift" TEXT NOT NULL DEFAULT 'GENERAL',
    "workstationId" TEXT NOT NULL,
    "status" "DailyAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedByUserId" TEXT NOT NULL,
    "endedAt" TIMESTAMP(3),
    "endedByUserId" TEXT,
    "endReason" "AssignmentEndReason",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeMovement" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "fromWorkstationId" TEXT,
    "toWorkstationId" TEXT NOT NULL,
    "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "movedByUserId" TEXT NOT NULL,

    CONSTRAINT "EmployeeMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeNumber_key" ON "User"("employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeNumber_key" ON "Employee"("employeeNumber");

-- CreateIndex
CREATE INDEX "Employee_fullName_idx" ON "Employee"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "ImportBatch_fileHash_key" ON "ImportBatch"("fileHash");

-- CreateIndex
CREATE INDEX "EmployeeImportSource_employeeId_idx" ON "EmployeeImportSource"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeImportSource_importBatchId_idx" ON "EmployeeImportSource"("importBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeImportSource_importBatchId_sourceSheet_sourceRowNum_key" ON "EmployeeImportSource"("importBatchId", "sourceSheet", "sourceRowNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_code_key" ON "Skill"("code");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSkill_employeeId_skillId_key" ON "EmployeeSkill"("employeeId", "skillId");

-- CreateIndex
CREATE INDEX "BajaConflict_importBatchId_idx" ON "BajaConflict"("importBatchId");

-- CreateIndex
CREATE INDEX "BajaConflict_status_idx" ON "BajaConflict"("status");

-- CreateIndex
CREATE INDEX "EmployeeReconciliationCandidate_existingEmployeeId_idx" ON "EmployeeReconciliationCandidate"("existingEmployeeId");

-- CreateIndex
CREATE INDEX "EmployeeReconciliationCandidate_importBatchId_idx" ON "EmployeeReconciliationCandidate"("importBatchId");

-- CreateIndex
CREATE INDEX "EmployeeReconciliationCandidate_status_idx" ON "EmployeeReconciliationCandidate"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ImportedAttendanceReference_employeeImportSourceId_key" ON "ImportedAttendanceReference"("employeeImportSourceId");

-- CreateIndex
CREATE INDEX "ImportedAttendanceReference_employeeId_idx" ON "ImportedAttendanceReference"("employeeId");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employeeId_date_shift_key" ON "Attendance"("employeeId", "date", "shift");

-- CreateIndex
CREATE UNIQUE INDEX "WorkArea_code_key" ON "WorkArea"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Workstation_workAreaId_name_key" ON "Workstation"("workAreaId", "name");

-- CreateIndex
CREATE INDEX "DailyAssignment_employeeId_date_idx" ON "DailyAssignment"("employeeId", "date");

-- CreateIndex
CREATE INDEX "DailyAssignment_workstationId_date_idx" ON "DailyAssignment"("workstationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAssignment_employeeId_date_key" ON "DailyAssignment"("employeeId", "date") WHERE ("status" = 'ACTIVE');

-- CreateIndex
CREATE INDEX "EmployeeMovement_employeeId_date_idx" ON "EmployeeMovement"("employeeId", "date");

-- CreateIndex
CREATE INDEX "EmployeeMovement_toWorkstationId_date_idx" ON "EmployeeMovement"("toWorkstationId", "date");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeImportSource" ADD CONSTRAINT "EmployeeImportSource_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeImportSource" ADD CONSTRAINT "EmployeeImportSource_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_deactivatedByUserId_fkey" FOREIGN KEY ("deactivatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BajaConflict" ADD CONSTRAINT "BajaConflict_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BajaConflict" ADD CONSTRAINT "BajaConflict_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BajaConflict" ADD CONSTRAINT "BajaConflict_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeReconciliationCandidate" ADD CONSTRAINT "EmployeeReconciliationCandidate_existingEmployeeId_fkey" FOREIGN KEY ("existingEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeReconciliationCandidate" ADD CONSTRAINT "EmployeeReconciliationCandidate_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeReconciliationCandidate" ADD CONSTRAINT "EmployeeReconciliationCandidate_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedAttendanceReference" ADD CONSTRAINT "ImportedAttendanceReference_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedAttendanceReference" ADD CONSTRAINT "ImportedAttendanceReference_employeeImportSourceId_fkey" FOREIGN KEY ("employeeImportSourceId") REFERENCES "EmployeeImportSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_registeredByUserId_fkey" FOREIGN KEY ("registeredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workstation" ADD CONSTRAINT "Workstation_workAreaId_fkey" FOREIGN KEY ("workAreaId") REFERENCES "WorkArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workstation" ADD CONSTRAINT "Workstation_requiredSkillId_fkey" FOREIGN KEY ("requiredSkillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAssignment" ADD CONSTRAINT "DailyAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAssignment" ADD CONSTRAINT "DailyAssignment_workstationId_fkey" FOREIGN KEY ("workstationId") REFERENCES "Workstation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAssignment" ADD CONSTRAINT "DailyAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAssignment" ADD CONSTRAINT "DailyAssignment_endedByUserId_fkey" FOREIGN KEY ("endedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeMovement" ADD CONSTRAINT "EmployeeMovement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeMovement" ADD CONSTRAINT "EmployeeMovement_fromWorkstationId_fkey" FOREIGN KEY ("fromWorkstationId") REFERENCES "Workstation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeMovement" ADD CONSTRAINT "EmployeeMovement_toWorkstationId_fkey" FOREIGN KEY ("toWorkstationId") REFERENCES "Workstation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeMovement" ADD CONSTRAINT "EmployeeMovement_movedByUserId_fkey" FOREIGN KEY ("movedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
