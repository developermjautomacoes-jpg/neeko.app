ALTER TABLE "Organization" ADD COLUMN "billingExempt" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "logo" TEXT;
ALTER TABLE "Session" ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "Session_organizationId_lastSeenAt_idx" ON "Session"("organizationId", "lastSeenAt");

-- Planos iniciais; limites e preços são ajustados em Neeko Gerencial > Planos.
INSERT INTO "Plan" ("id", "name", "maxCompanies", "maxUsers", "monthlyPrice") VALUES
  (gen_random_uuid(), 'Essencial', 20, 3, 0),
  (gen_random_uuid(), 'Profissional', 60, 8, 0),
  (gen_random_uuid(), 'Avançado', 150, 20, 0)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "MembershipPermission" ("membershipId", "permission")
SELECT "id", 'office.manage' FROM "OrganizationMembership" WHERE "role" = 'ORG_OWNER' ON CONFLICT DO NOTHING;
