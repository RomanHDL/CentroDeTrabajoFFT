-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "actividad" TEXT,
ADD COLUMN     "areaZona" TEXT,
ADD COLUMN     "baseAsistencia" TEXT,
ADD COLUMN     "baselineSuppressed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fechaIngreso" TEXT,
ADD COLUMN     "rawZona" TEXT;

-- CreateEnum
CREATE TYPE "PendingMoveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "PendingMove" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "fromWorkstationId" TEXT,
    "toWorkstationId" TEXT NOT NULL,
    "shift" TEXT NOT NULL DEFAULT 'GENERAL',
    "requestedByUserId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PendingMoveStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "PendingMove_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingMove_employeeId_date_idx" ON "PendingMove"("employeeId", "date");

-- CreateIndex
CREATE INDEX "PendingMove_status_date_idx" ON "PendingMove"("status", "date");

-- AddForeignKey
ALTER TABLE "PendingMove" ADD CONSTRAINT "PendingMove_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingMove" ADD CONSTRAINT "PendingMove_fromWorkstationId_fkey" FOREIGN KEY ("fromWorkstationId") REFERENCES "Workstation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingMove" ADD CONSTRAINT "PendingMove_toWorkstationId_fkey" FOREIGN KEY ("toWorkstationId") REFERENCES "Workstation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingMove" ADD CONSTRAINT "PendingMove_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingMove" ADD CONSTRAINT "PendingMove_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
