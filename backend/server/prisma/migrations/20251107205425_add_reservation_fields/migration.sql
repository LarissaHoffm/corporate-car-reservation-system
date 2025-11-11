-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "purpose" TEXT;

-- CreateIndex
CREATE INDEX "Reservation_tenantId_userId_idx" ON "Reservation"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "Reservation_tenantId_startAt_endAt_idx" ON "Reservation"("tenantId", "startAt", "endAt");
