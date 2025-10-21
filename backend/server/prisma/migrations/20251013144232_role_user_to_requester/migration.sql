DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'Role' AND e.enumlabel = 'USER'
  ) THEN
    ALTER TYPE "Role" RENAME VALUE 'USER' TO 'REQUESTER';
  END IF;
END $$;

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'REQUESTER';
