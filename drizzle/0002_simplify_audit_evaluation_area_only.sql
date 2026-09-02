ALTER TABLE "AuditEvaluation" DROP CONSTRAINT "AuditEvaluation_employeeId_fkey";
--> statement-breakpoint
DROP INDEX "AuditEvaluation_employeeId_auditDate_idx";--> statement-breakpoint
CREATE INDEX "AuditEvaluation_areaId_auditDate_idx" ON "AuditEvaluation" USING btree ("areaId" text_ops,"auditDate" date_ops);--> statement-breakpoint
ALTER TABLE "AuditEvaluation" DROP COLUMN "employeeId";--> statement-breakpoint
ALTER TABLE "AuditEvaluation" DROP COLUMN "stationName";