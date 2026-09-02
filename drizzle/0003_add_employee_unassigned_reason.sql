CREATE TYPE "public"."UnassignedReason" AS ENUM('BAJA', 'TURNO', 'FALTA');--> statement-breakpoint
ALTER TABLE "Employee" ADD COLUMN "unassignedReason" "UnassignedReason";--> statement-breakpoint
ALTER TABLE "Employee" ADD COLUMN "unassignedReasonSetAt" timestamp (3);--> statement-breakpoint
ALTER TABLE "Employee" ADD COLUMN "unassignedReasonSetByUserId" text;