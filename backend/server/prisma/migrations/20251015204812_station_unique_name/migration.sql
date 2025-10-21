/*
  Warnings:

  - You are about to drop the column `lat` on the `Station` table. All the data in the column will be lost.
  - You are about to drop the column `lng` on the `Station` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tenantId,name]` on the table `Station` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "ReservationStatus" ADD VALUE 'REJECTED';

-- DropIndex
DROP INDEX "Station_tenantId_idx";

-- AlterTable
ALTER TABLE "Station" DROP COLUMN "lat",
DROP COLUMN "lng";

-- CreateIndex
CREATE INDEX "Station_tenantId_branchId_idx" ON "Station"("tenantId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Station_tenantId_name_key" ON "Station"("tenantId", "name");
