-- CreateEnum
CREATE TYPE "WorkstationCategory" AS ENUM ('LIDERAZGO', 'CALIDAD', 'PRODUCCION', 'TECNICO', 'SUMINISTRO', 'APOYO');

-- AlterTable
ALTER TABLE "Workstation" ADD COLUMN     "category" "WorkstationCategory",
ADD COLUMN     "requiredRoleLabel" TEXT,
ADD COLUMN     "role" TEXT;
