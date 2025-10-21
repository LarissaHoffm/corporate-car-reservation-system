/* 
  Warnings:

  - A unique constraint covering the columns `[tenantId,plate]` on the table `Car` will be added. If there are existing duplicate values, this will fail.
*/

-- Garantir que o enum tenha 'IN_USE' (se necessário)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'CarStatus' AND e.enumlabel = 'IN_USE'
  ) THEN
    ALTER TYPE "CarStatus" ADD VALUE 'IN_USE';
  END IF;
END$$;

-- Ajustes de chave estrangeira e índice para (tenantId, plate)
ALTER TABLE "Car" DROP CONSTRAINT IF EXISTS "Car_branchId_fkey";

-- Remover unique antigo em plate
DROP INDEX IF EXISTS "Car_plate_key";

-- branchId opcional
ALTER TABLE "Car" 
  ALTER COLUMN "branchId" DROP NOT NULL;

-- Índices
CREATE INDEX IF NOT EXISTS "Car_tenantId_status_idx" ON "Car"("tenantId","status");
CREATE UNIQUE INDEX IF NOT EXISTS "Car_tenantId_plate_key" ON "Car"("tenantId","plate");

-- FK branch com ON DELETE SET NULL
ALTER TABLE "Car" 
  ADD CONSTRAINT "Car_branchId_fkey" 
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- MIGRAÇÃO B: usar AVAILABLE como default e migrar dados legados
ALTER TABLE "Car" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';
UPDATE "Car" SET "status" = 'AVAILABLE' WHERE "status" = 'ACTIVE';
