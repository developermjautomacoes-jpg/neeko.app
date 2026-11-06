ALTER TABLE "Organization" ADD COLUMN "colorPrimary" TEXT, ADD COLUMN "colorDark" TEXT;
CREATE TABLE "PasswordReset" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "codeHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PasswordReset_userId_createdAt_idx" ON "PasswordReset"("userId", "createdAt");

-- Raízes de CNPJ vistas só pela proprietária e por quem ela autorizar.
ALTER TABLE "Organization" ADD COLUMN "restrictedRoots" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
INSERT INTO "MembershipPermission" ("membershipId", "permission")
SELECT "id", 'companies.restricted' FROM "OrganizationMembership" WHERE "role" = 'ORG_OWNER' ON CONFLICT DO NOTHING;
