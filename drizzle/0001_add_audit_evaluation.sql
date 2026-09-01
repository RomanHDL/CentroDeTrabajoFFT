CREATE TYPE "public"."FiveSClassification" AS ENUM('CUMPLE', 'CUMPLE_PARCIAL', 'NO_CUMPLE');--> statement-breakpoint
CREATE TABLE "AuditEvaluation" (
	"id" text PRIMARY KEY NOT NULL,
	"employeeId" text NOT NULL,
	"areaId" text NOT NULL,
	"stationName" text NOT NULL,
	"auditDate" date NOT NULL,
	"s1" "FiveSClassification" NOT NULL,
	"s2" "FiveSClassification" NOT NULL,
	"s3" "FiveSClassification" NOT NULL,
	"s4" "FiveSClassification" NOT NULL,
	"s5" "FiveSClassification" NOT NULL,
	"scorePct" integer NOT NULL,
	"createdByUserId" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "AuditEvaluation" ADD CONSTRAINT "AuditEvaluation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AuditEvaluation" ADD CONSTRAINT "AuditEvaluation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "AuditEvaluation_employeeId_auditDate_idx" ON "AuditEvaluation" USING btree ("employeeId" text_ops,"auditDate" date_ops);