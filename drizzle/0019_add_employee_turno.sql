CREATE TYPE "public"."EmployeeTurno" AS ENUM('MATUTINO', 'NOCTURNO');--> statement-breakpoint
ALTER TABLE "Employee" ADD COLUMN "turno" "EmployeeTurno";
