-- Cria o tipo do status se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserStatus') THEN
    CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');
  END IF;
END $$;

-- Adiciona a coluna status (default ACTIVE)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- Renomeia a coluna password -> passwordHash, se existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'password'
  ) THEN
    ALTER TABLE "User" RENAME COLUMN "password" TO "passwordHash";
  END IF;
END $$;

-- Garante default do role REQUESTER (após sua migração anterior)
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'REQUESTER';
