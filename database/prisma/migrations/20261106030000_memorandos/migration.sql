CREATE TABLE "Memorandum" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "seq" INTEGER NOT NULL,
  "ano" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ativo',
  "clientStatus" TEXT NOT NULL DEFAULT 'ativa',
  "exitDate" TEXT NOT NULL DEFAULT '',
  "exitReason" TEXT NOT NULL DEFAULT '',
  "exitNotes" TEXT NOT NULL DEFAULT '',
  "data" JSONB NOT NULL,
  "history" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "createdByName" TEXT NOT NULL DEFAULT '',
  "updatedByName" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Memorandum_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Memorandum_organizationId_ano_seq_key" ON "Memorandum"("organizationId", "ano", "seq");
CREATE INDEX "Memorandum_organizationId_companyId_idx" ON "Memorandum"("organizationId", "companyId");
-- Uma empresa só tem um memorando ativo.
CREATE UNIQUE INDEX "Memorandum_um_ativo_por_empresa" ON "Memorandum"("organizationId", "companyId") WHERE "status" = 'ativo';
ALTER TABLE "Memorandum" ADD CONSTRAINT "Memorandum_organizationId_companyId_fkey" FOREIGN KEY ("organizationId", "companyId") REFERENCES "Company"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Quem já é proprietária recebe as permissões do novo módulo.
INSERT INTO "MembershipPermission" ("membershipId", "permission")
SELECT m."id", p.permission FROM "OrganizationMembership" m CROSS JOIN (VALUES ('memoranda.read'), ('memoranda.manage')) AS p(permission)
WHERE m."role" = 'ORG_OWNER' ON CONFLICT DO NOTHING;
