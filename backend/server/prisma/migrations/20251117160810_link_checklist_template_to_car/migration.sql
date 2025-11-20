/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,carId]` on the table `ChecklistTemplate` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ChecklistTemplate" ADD COLUMN     "carId" TEXT;

-- CreateIndex
CREATE INDEX "ChecklistTemplate_tenantId_carId_idx" ON "ChecklistTemplate"("tenantId", "carId");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistTemplate_tenantId_carId_key" ON "ChecklistTemplate"("tenantId", "carId");

-- AddForeignKey
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE SET NULL ON UPDATE CASCADE;
