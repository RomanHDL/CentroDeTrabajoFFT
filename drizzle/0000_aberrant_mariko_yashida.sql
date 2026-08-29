CREATE TYPE "public"."AssignmentEndReason" AS ENUM('MOVED', 'RELEASED', 'SHIFT_END', 'CORRECTION');--> statement-breakpoint
CREATE TYPE "public"."AttendanceStatus" AS ENUM('PRESENTE', 'AUSENTE', 'RETARDO');--> statement-breakpoint
CREATE TYPE "public"."BajaConflictStatus" AS ENUM('PENDING', 'CONFIRMED_SAME_PERSON', 'CONFIRMED_DIFFERENT_PERSON', 'IGNORED');--> statement-breakpoint
CREATE TYPE "public"."DailyAssignmentStatus" AS ENUM('ACTIVE', 'ENDED');--> statement-breakpoint
CREATE TYPE "public"."EmployeeReconciliationStatus" AS ENUM('PENDING', 'CONFIRMED_SAME_PERSON', 'CONFIRMED_DIFFERENT_PERSON', 'IGNORED');--> statement-breakpoint
CREATE TYPE "public"."EmployeeSkillSource" AS ENUM('IMPORTED', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."ImportBatchStatus" AS ENUM('RUNNING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."PendingMoveStatus" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."SkillLevel" AS ENUM('PUEDE_CUBRIR', 'INTERMEDIO', 'EXPERTO');--> statement-breakpoint
CREATE TYPE "public"."UserPermissionEffect" AS ENUM('ALLOW', 'DENY');--> statement-breakpoint
CREATE TYPE "public"."UserRole" AS ENUM('ADMINISTRADOR', 'SUPERVISOR', 'LIDER');--> statement-breakpoint
CREATE TYPE "public"."WorkstationCategory" AS ENUM('LIDERAZGO', 'CALIDAD', 'PRODUCCION', 'TECNICO', 'SUMINISTRO', 'APOYO');--> statement-breakpoint
CREATE TABLE "Attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"employeeId" text NOT NULL,
	"date" date NOT NULL,
	"shift" text DEFAULT 'GENERAL' NOT NULL,
	"checkInAt" timestamp(3),
	"status" "AttendanceStatus" NOT NULL,
	"registeredByUserId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "BajaConflict" (
	"id" text PRIMARY KEY NOT NULL,
	"employeeId" text,
	"bajaFullName" text NOT NULL,
	"bajaRowNumber" integer NOT NULL,
	"importBatchId" text NOT NULL,
	"status" "BajaConflictStatus" DEFAULT 'PENDING' NOT NULL,
	"resolvedByUserId" text,
	"resolvedAt" timestamp(3),
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "DailyAssignment" (
	"id" text PRIMARY KEY NOT NULL,
	"employeeId" text NOT NULL,
	"date" date NOT NULL,
	"shift" text DEFAULT 'GENERAL' NOT NULL,
	"workstationId" text NOT NULL,
	"status" "DailyAssignmentStatus" DEFAULT 'ACTIVE' NOT NULL,
	"assignedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"assignedByUserId" text NOT NULL,
	"endedAt" timestamp(3),
	"endedByUserId" text,
	"endReason" "AssignmentEndReason",
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Employee" (
	"id" text PRIMARY KEY NOT NULL,
	"employeeNumber" text,
	"fullName" text NOT NULL,
	"photoUrl" text,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"actividad" text,
	"areaZona" text,
	"baseAsistencia" text,
	"baselineSuppressed" boolean DEFAULT false NOT NULL,
	"fechaIngreso" text,
	"rawZona" text
);
--> statement-breakpoint
CREATE TABLE "EmployeeImportSource" (
	"id" text PRIMARY KEY NOT NULL,
	"employeeId" text NOT NULL,
	"importBatchId" text NOT NULL,
	"sourceSheet" text NOT NULL,
	"sourceRowNumber" integer NOT NULL,
	"rawZona" text,
	"rawActividad" text,
	"rawAsistencia" text,
	"rawPrestamo" text,
	"importedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "EmployeeMovement" (
	"id" text PRIMARY KEY NOT NULL,
	"employeeId" text NOT NULL,
	"date" date NOT NULL,
	"fromWorkstationId" text,
	"toWorkstationId" text NOT NULL,
	"movedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"movedByUserId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "EmployeeReconciliationCandidate" (
	"id" text PRIMARY KEY NOT NULL,
	"existingEmployeeId" text NOT NULL,
	"importBatchId" text NOT NULL,
	"candidateSourceRowNumber" integer NOT NULL,
	"candidateFullName" text NOT NULL,
	"candidateEmployeeNumber" text,
	"candidateRawZona" text,
	"candidateRawActividad" text,
	"candidateRawAsistencia" text,
	"candidateRawPrestamo" text,
	"status" "EmployeeReconciliationStatus" DEFAULT 'PENDING' NOT NULL,
	"resolvedByUserId" text,
	"resolvedAt" timestamp(3),
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "EmployeeSkill" (
	"id" text PRIMARY KEY NOT NULL,
	"employeeId" text NOT NULL,
	"skillId" text NOT NULL,
	"level" "SkillLevel",
	"source" "EmployeeSkillSource" DEFAULT 'IMPORTED' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"addedByUserId" text,
	"deactivatedAt" timestamp(3),
	"deactivatedByUserId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ImportBatch" (
	"id" text PRIMARY KEY NOT NULL,
	"fileName" text NOT NULL,
	"fileHash" text NOT NULL,
	"sheet" text NOT NULL,
	"startedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"finishedAt" timestamp(3),
	"totalRows" integer DEFAULT 0 NOT NULL,
	"newEmployees" integer DEFAULT 0 NOT NULL,
	"updatedEmployees" integer DEFAULT 0 NOT NULL,
	"skippedRows" integer DEFAULT 0 NOT NULL,
	"conflictsFound" integer DEFAULT 0 NOT NULL,
	"status" "ImportBatchStatus" DEFAULT 'RUNNING' NOT NULL,
	"triggeredByUserId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ImportedAttendanceReference" (
	"id" text PRIMARY KEY NOT NULL,
	"employeeId" text NOT NULL,
	"employeeImportSourceId" text NOT NULL,
	"rawCode" text NOT NULL,
	"importedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PendingMove" (
	"id" text PRIMARY KEY NOT NULL,
	"employeeId" text NOT NULL,
	"date" date NOT NULL,
	"fromWorkstationId" text,
	"toWorkstationId" text NOT NULL,
	"shift" text DEFAULT 'GENERAL' NOT NULL,
	"requestedByUserId" text NOT NULL,
	"requestedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"status" "PendingMoveStatus" DEFAULT 'PENDING' NOT NULL,
	"resolvedByUserId" text,
	"resolvedAt" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "RoleModuleAccess" (
	"role" "UserRole" PRIMARY KEY NOT NULL,
	"modules" text[]
);
--> statement-breakpoint
CREATE TABLE "RoleModulePermission" (
	"id" text PRIMARY KEY NOT NULL,
	"role" "UserRole" NOT NULL,
	"moduleKey" text NOT NULL,
	"allowed" boolean DEFAULT true NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "Skill" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"employeeNumber" text,
	"username" text,
	"name" text NOT NULL,
	"passwordHash" text NOT NULL,
	"role" "UserRole" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"mustChangePassword" boolean DEFAULT false NOT NULL,
	"lastLoginAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"employeeId" text
);
--> statement-breakpoint
CREATE TABLE "UserModulePermission" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"moduleKey" text NOT NULL,
	"effect" "UserPermissionEffect" NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "WorkArea" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Workstation" (
	"id" text PRIMARY KEY NOT NULL,
	"workAreaId" text NOT NULL,
	"name" text NOT NULL,
	"requiredSkillId" text,
	"capacity" integer DEFAULT 1 NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"category" "WorkstationCategory",
	"requiredRoleLabel" text,
	"role" text
);
--> statement-breakpoint
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_registeredByUserId_fkey" FOREIGN KEY ("registeredByUserId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BajaConflict" ADD CONSTRAINT "BajaConflict_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BajaConflict" ADD CONSTRAINT "BajaConflict_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "public"."ImportBatch"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BajaConflict" ADD CONSTRAINT "BajaConflict_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "DailyAssignment" ADD CONSTRAINT "DailyAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "DailyAssignment" ADD CONSTRAINT "DailyAssignment_workstationId_fkey" FOREIGN KEY ("workstationId") REFERENCES "public"."Workstation"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "DailyAssignment" ADD CONSTRAINT "DailyAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "DailyAssignment" ADD CONSTRAINT "DailyAssignment_endedByUserId_fkey" FOREIGN KEY ("endedByUserId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "EmployeeImportSource" ADD CONSTRAINT "EmployeeImportSource_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "EmployeeImportSource" ADD CONSTRAINT "EmployeeImportSource_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "public"."ImportBatch"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "EmployeeMovement" ADD CONSTRAINT "EmployeeMovement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "EmployeeMovement" ADD CONSTRAINT "EmployeeMovement_fromWorkstationId_fkey" FOREIGN KEY ("fromWorkstationId") REFERENCES "public"."Workstation"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "EmployeeMovement" ADD CONSTRAINT "EmployeeMovement_toWorkstationId_fkey" FOREIGN KEY ("toWorkstationId") REFERENCES "public"."Workstation"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "EmployeeMovement" ADD CONSTRAINT "EmployeeMovement_movedByUserId_fkey" FOREIGN KEY ("movedByUserId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "EmployeeReconciliationCandidate" ADD CONSTRAINT "EmployeeReconciliationCandidate_existingEmployeeId_fkey" FOREIGN KEY ("existingEmployeeId") REFERENCES "public"."Employee"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "EmployeeReconciliationCandidate" ADD CONSTRAINT "EmployeeReconciliationCandidate_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "public"."ImportBatch"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "EmployeeReconciliationCandidate" ADD CONSTRAINT "EmployeeReconciliationCandidate_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "public"."Skill"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_deactivatedByUserId_fkey" FOREIGN KEY ("deactivatedByUserId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ImportedAttendanceReference" ADD CONSTRAINT "ImportedAttendanceReference_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ImportedAttendanceReference" ADD CONSTRAINT "ImportedAttendanceReference_employeeImportSourceId_fkey" FOREIGN KEY ("employeeImportSourceId") REFERENCES "public"."EmployeeImportSource"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PendingMove" ADD CONSTRAINT "PendingMove_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PendingMove" ADD CONSTRAINT "PendingMove_fromWorkstationId_fkey" FOREIGN KEY ("fromWorkstationId") REFERENCES "public"."Workstation"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PendingMove" ADD CONSTRAINT "PendingMove_toWorkstationId_fkey" FOREIGN KEY ("toWorkstationId") REFERENCES "public"."Workstation"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PendingMove" ADD CONSTRAINT "PendingMove_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PendingMove" ADD CONSTRAINT "PendingMove_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UserModulePermission" ADD CONSTRAINT "UserModulePermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Workstation" ADD CONSTRAINT "Workstation_workAreaId_fkey" FOREIGN KEY ("workAreaId") REFERENCES "public"."WorkArea"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Workstation" ADD CONSTRAINT "Workstation_requiredSkillId_fkey" FOREIGN KEY ("requiredSkillId") REFERENCES "public"."Skill"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "Attendance_date_idx" ON "Attendance" USING btree ("date" date_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Attendance_employeeId_date_shift_key" ON "Attendance" USING btree ("employeeId" date_ops,"date" date_ops,"shift" text_ops);--> statement-breakpoint
CREATE INDEX "BajaConflict_importBatchId_idx" ON "BajaConflict" USING btree ("importBatchId" text_ops);--> statement-breakpoint
CREATE INDEX "BajaConflict_status_idx" ON "BajaConflict" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "DailyAssignment_employeeId_date_idx" ON "DailyAssignment" USING btree ("employeeId" date_ops,"date" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "DailyAssignment_employeeId_date_key" ON "DailyAssignment" USING btree ("employeeId" date_ops,"date" date_ops) WHERE (status = 'ACTIVE'::"DailyAssignmentStatus");--> statement-breakpoint
CREATE INDEX "DailyAssignment_workstationId_date_idx" ON "DailyAssignment" USING btree ("workstationId" date_ops,"date" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Employee_employeeNumber_key" ON "Employee" USING btree ("employeeNumber" text_ops);--> statement-breakpoint
CREATE INDEX "Employee_fullName_idx" ON "Employee" USING btree ("fullName" text_ops);--> statement-breakpoint
CREATE INDEX "EmployeeImportSource_employeeId_idx" ON "EmployeeImportSource" USING btree ("employeeId" text_ops);--> statement-breakpoint
CREATE INDEX "EmployeeImportSource_importBatchId_idx" ON "EmployeeImportSource" USING btree ("importBatchId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "EmployeeImportSource_importBatchId_sourceSheet_sourceRowNum_key" ON "EmployeeImportSource" USING btree ("importBatchId" int4_ops,"sourceSheet" text_ops,"sourceRowNumber" text_ops);--> statement-breakpoint
CREATE INDEX "EmployeeMovement_employeeId_date_idx" ON "EmployeeMovement" USING btree ("employeeId" date_ops,"date" date_ops);--> statement-breakpoint
CREATE INDEX "EmployeeMovement_toWorkstationId_date_idx" ON "EmployeeMovement" USING btree ("toWorkstationId" text_ops,"date" date_ops);--> statement-breakpoint
CREATE INDEX "EmployeeReconciliationCandidate_existingEmployeeId_idx" ON "EmployeeReconciliationCandidate" USING btree ("existingEmployeeId" text_ops);--> statement-breakpoint
CREATE INDEX "EmployeeReconciliationCandidate_importBatchId_idx" ON "EmployeeReconciliationCandidate" USING btree ("importBatchId" text_ops);--> statement-breakpoint
CREATE INDEX "EmployeeReconciliationCandidate_status_idx" ON "EmployeeReconciliationCandidate" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "EmployeeSkill_employeeId_skillId_key" ON "EmployeeSkill" USING btree ("employeeId" text_ops,"skillId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ImportBatch_fileHash_key" ON "ImportBatch" USING btree ("fileHash" text_ops);--> statement-breakpoint
CREATE INDEX "ImportedAttendanceReference_employeeId_idx" ON "ImportedAttendanceReference" USING btree ("employeeId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ImportedAttendanceReference_employeeImportSourceId_key" ON "ImportedAttendanceReference" USING btree ("employeeImportSourceId" text_ops);--> statement-breakpoint
CREATE INDEX "PendingMove_employeeId_date_idx" ON "PendingMove" USING btree ("employeeId" date_ops,"date" date_ops);--> statement-breakpoint
CREATE INDEX "PendingMove_status_date_idx" ON "PendingMove" USING btree ("status" enum_ops,"date" date_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "RoleModulePermission_role_moduleKey_key" ON "RoleModulePermission" USING btree ("role" text_ops,"moduleKey" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Skill_code_key" ON "Skill" USING btree ("code" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "User_employeeId_key" ON "User" USING btree ("employeeId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "User_employeeNumber_key" ON "User" USING btree ("employeeNumber" text_ops);--> statement-breakpoint
CREATE INDEX "User_role_idx" ON "User" USING btree ("role" enum_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "User_username_key" ON "User" USING btree ("username" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "UserModulePermission_userId_moduleKey_key" ON "UserModulePermission" USING btree ("userId" text_ops,"moduleKey" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "WorkArea_code_key" ON "WorkArea" USING btree ("code" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Workstation_workAreaId_name_key" ON "Workstation" USING btree ("workAreaId" text_ops,"name" text_ops);