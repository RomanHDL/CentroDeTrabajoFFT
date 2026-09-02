CREATE TYPE "public"."AccessRequestStatus" AS ENUM('PENDING', 'APPROVED', 'DENIED');--> statement-breakpoint
CREATE TABLE "AccessRequest" (
	"id" text PRIMARY KEY NOT NULL,
	"oidcSub" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"note" text,
	"status" "AccessRequestStatus" DEFAULT 'PENDING' NOT NULL,
	"decidedByUserId" text,
	"decidedAt" timestamp (3),
	"requestedAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "oidcSub" text;--> statement-breakpoint
CREATE INDEX "AccessRequest_oidcSub_idx" ON "AccessRequest" USING btree ("oidcSub" text_ops);--> statement-breakpoint
CREATE INDEX "AccessRequest_status_idx" ON "AccessRequest" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "User_oidcSub_key" ON "User" USING btree ("oidcSub" text_ops);