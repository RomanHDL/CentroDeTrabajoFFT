ALTER TABLE "AccessRequest" ALTER COLUMN "oidcSub" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "AccessRequest" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "AccessRequest" ADD COLUMN "employeeNumber" text;--> statement-breakpoint
CREATE INDEX "AccessRequest_employeeNumber_idx" ON "AccessRequest" USING btree ("employeeNumber");
