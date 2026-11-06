CREATE TYPE "OrgStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TABLE "Plan" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "maxCompanies" INTEGER,
  "maxUsers" INTEGER,
  "monthlyPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");
ALTER TABLE "Organization"
  ADD COLUMN "cnpj" TEXT NOT NULL DEFAULT '', ADD COLUMN "contactEmail" TEXT NOT NULL DEFAULT '', ADD COLUMN "contactPhone" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "status" "OrgStatus" NOT NULL DEFAULT 'ACTIVE', ADD COLUMN "internal" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "planId" UUID,
  ADD COLUMN "paidUntil" TEXT NOT NULL DEFAULT '', ADD COLUMN "notes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User"
  ADD COLUMN "mfaSecret" BYTEA, ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "mfaLastStep" BIGINT NOT NULL DEFAULT 0, ADD COLUMN "mfaRecovery" JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "Session" ADD COLUMN "mfaVerified" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "mfaSetupRequired" BOOLEAN NOT NULL DEFAULT false;

-- A primeira organização e a primeira pessoa criadas são da Neeko.
UPDATE "Organization" SET "internal" = true WHERE "id" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" ASC LIMIT 1);
UPDATE "User" SET "globalRole" = 'NEEKO_SUPERADMIN' WHERE "id" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1);
-- Todos entram de novo para valer a nova regra de acesso.
DELETE FROM "Session";
