DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'CarStatus' AND e.enumlabel = 'AVAILABLE'
  ) THEN
    ALTER TYPE "CarStatus" ADD VALUE 'AVAILABLE';
  END IF;
END$$;
