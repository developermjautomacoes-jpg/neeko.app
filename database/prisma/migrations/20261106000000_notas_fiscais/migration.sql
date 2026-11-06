-- Gerada a partir de schema.prisma.

CREATE TYPE "GlobalRole" AS ENUM ('NEEKO_SUPERADMIN', 'USER');

CREATE TYPE "OrgRole" AS ENUM ('ORG_OWNER', 'ORG_ADMIN', 'STAFF', 'COMPANY_USER');

CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

CREATE TABLE "Organization" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
  "globalRole" "GlobalRole" NOT NULL DEFAULT 'USER',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "organizationId" UUID,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationMembership" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "role" "OrgRole" NOT NULL,
  "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "allCompanies" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MembershipPermission" (
  "membershipId" UUID NOT NULL,
  "permission" TEXT NOT NULL,
  CONSTRAINT "MembershipPermission_pkey" PRIMARY KEY ("membershipId", "permission")
);

CREATE TABLE "Company" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "cnpj" TEXT NOT NULL,
  "legalName" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "nfseMode" TEXT NOT NULL DEFAULT 'certificado',
  "certificateId" UUID,
  "dfeAutoCapture" BOOLEAN NOT NULL DEFAULT false,
  "dfeAutoCiencia" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompanyAccess" (
  "organizationId" UUID NOT NULL,
  "membershipId" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  CONSTRAINT "CompanyAccess_pkey" PRIMARY KEY ("membershipId", "companyId")
);

CREATE TABLE "FiscalCertificate" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "holder" TEXT NOT NULL,
  "document" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "validUntil" TEXT NOT NULL,
  "nickname" TEXT NOT NULL DEFAULT '',
  "pfxEncrypted" BYTEA NOT NULL,
  "passEncrypted" BYTEA NOT NULL,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FiscalCertificate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FiscalSettings" (
  "organizationId" UUID NOT NULL,
  "procuratorCertificateId" UUID,
  "scheduleActive" BOOLEAN NOT NULL DEFAULT false,
  "scheduleTime" TEXT NOT NULL DEFAULT '02:00',
  "lastRunDay" TEXT NOT NULL DEFAULT '',
  "runStatus" TEXT NOT NULL DEFAULT '',
  "runStartedAt" TIMESTAMP(3),
  "runFinishedAt" TIMESTAMP(3),
  "runLines" JSONB NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT "FiscalSettings_pkey" PRIMARY KEY ("organizationId")
);

CREATE TABLE "NfseState" (
  "organizationId" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "environment" TEXT NOT NULL,
  "lastNsu" BIGINT NOT NULL DEFAULT 0,
  "blockedUntil" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastCaptureAt" TIMESTAMP(3),
  "lastError" TEXT,
  "leaseUntil" TIMESTAMP(3),
  CONSTRAINT "NfseState_pkey" PRIMARY KEY ("organizationId", "companyId", "environment")
);

CREATE TABLE "NfseDocument" (
  "organizationId" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "environment" TEXT NOT NULL,
  "chave" TEXT NOT NULL,
  "nsu" BIGINT NOT NULL,
  "papel" TEXT NOT NULL,
  "competencia" TEXT NOT NULL,
  "dataCompetencia" TEXT NOT NULL,
  "emissao" TEXT NOT NULL,
  "numero" TEXT NOT NULL,
  "serie" TEXT NOT NULL,
  "nDps" TEXT NOT NULL,
  "cstat" TEXT NOT NULL,
  "prestDoc" TEXT NOT NULL,
  "prestNome" TEXT NOT NULL,
  "tomaDoc" TEXT NOT NULL,
  "tomaNome" TEXT NOT NULL,
  "intermDoc" TEXT NOT NULL,
  "opSimples" TEXT NOT NULL,
  "tribNac" TEXT NOT NULL,
  "tribMun" TEXT NOT NULL,
  "descNac" TEXT NOT NULL,
  "descricao" TEXT NOT NULL,
  "cNbs" TEXT NOT NULL,
  "xNbs" TEXT NOT NULL,
  "cLocIncid" TEXT NOT NULL,
  "cnoObra" TEXT NOT NULL,
  "munIncid" TEXT NOT NULL,
  "tribIssqn" TEXT NOT NULL,
  "tpRetIss" TEXT NOT NULL,
  "aliq" TEXT NOT NULL,
  "tpRetPis" TEXT NOT NULL,
  "vServ" DECIMAL(15,2) NOT NULL,
  "vBc" DECIMAL(15,2) NOT NULL,
  "vIss" DECIMAL(15,2) NOT NULL,
  "vRetCp" DECIMAL(15,2) NOT NULL,
  "vRetIrrf" DECIMAL(15,2) NOT NULL,
  "vRetCsll" DECIMAL(15,2) NOT NULL,
  "vPis" DECIMAL(15,2) NOT NULL,
  "vCofins" DECIMAL(15,2) NOT NULL,
  "vTotalRet" DECIMAL(15,2) NOT NULL,
  "vLiq" DECIMAL(15,2) NOT NULL,
  "vIbs" DECIMAL(15,2) NOT NULL,
  "vCbs" DECIMAL(15,2) NOT NULL,
  "situacao" TEXT NOT NULL DEFAULT 'normal',
  "eventsCheckedAt" TIMESTAMP(3),
  "xmlGz" BYTEA NOT NULL,
  CONSTRAINT "NfseDocument_pkey" PRIMARY KEY ("organizationId", "companyId", "environment", "chave")
);

CREATE TABLE "NfseEvent" (
  "organizationId" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "environment" TEXT NOT NULL,
  "id" TEXT NOT NULL,
  "chave" TEXT NOT NULL,
  "nsu" BIGINT,
  "codigo" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "data" TEXT NOT NULL,
  "xmlGz" BYTEA NOT NULL,
  CONSTRAINT "NfseEvent_pkey" PRIMARY KEY ("organizationId", "companyId", "environment", "id")
);

CREATE TABLE "NfseFailure" (
  "organizationId" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "environment" TEXT NOT NULL,
  "nsu" BIGINT NOT NULL,
  "chave" TEXT NOT NULL,
  "motivo" TEXT NOT NULL,
  "em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NfseFailure_pkey" PRIMARY KEY ("organizationId", "companyId", "environment", "nsu")
);

CREATE TABLE "DfeState" (
  "organizationId" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "environment" TEXT NOT NULL,
  "servico" TEXT NOT NULL,
  "lastNsu" BIGINT NOT NULL DEFAULT 0,
  "maxNsu" BIGINT NOT NULL DEFAULT 0,
  "nextAt" TIMESTAMP(3),
  "corte" TEXT NOT NULL,
  "lastCaptureAt" TIMESTAMP(3),
  "lastError" TEXT,
  "leaseUntil" TIMESTAMP(3),
  CONSTRAINT "DfeState_pkey" PRIMARY KEY ("organizationId", "companyId", "environment", "servico")
);

CREATE TABLE "DfeDocument" (
  "organizationId" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "environment" TEXT NOT NULL,
  "servico" TEXT NOT NULL,
  "chave" TEXT NOT NULL,
  "nsu" BIGINT NOT NULL,
  "conteudo" TEXT NOT NULL,
  "modelo" TEXT NOT NULL,
  "papel" TEXT NOT NULL,
  "numero" TEXT NOT NULL,
  "serie" TEXT NOT NULL,
  "emissao" TEXT NOT NULL,
  "competencia" TEXT NOT NULL,
  "emitDoc" TEXT NOT NULL,
  "emitNome" TEXT NOT NULL,
  "destDoc" TEXT NOT NULL,
  "destNome" TEXT NOT NULL,
  "tpNf" TEXT NOT NULL,
  "vTotal" DECIMAL(15,2) NOT NULL,
  "situacao" TEXT NOT NULL DEFAULT 'normal',
  "ciencia" TEXT NOT NULL DEFAULT '',
  "cienciaEm" TIMESTAMP(3),
  "cienciaMsg" TEXT NOT NULL DEFAULT '',
  "xmlGz" BYTEA NOT NULL,
  CONSTRAINT "DfeDocument_pkey" PRIMARY KEY ("organizationId", "companyId", "environment", "servico", "chave")
);

CREATE TABLE "DfeEvent" (
  "organizationId" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "environment" TEXT NOT NULL,
  "servico" TEXT NOT NULL,
  "chave" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "seq" TEXT NOT NULL,
  "nsu" BIGINT NOT NULL,
  "data" TEXT NOT NULL,
  "xmlGz" BYTEA NOT NULL,
  CONSTRAINT "DfeEvent_pkey" PRIMARY KEY ("organizationId", "companyId", "environment", "servico", "chave", "tipo", "seq")
);

CREATE TABLE "DfeFailure" (
  "organizationId" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "environment" TEXT NOT NULL,
  "servico" TEXT NOT NULL,
  "nsu" BIGINT NOT NULL,
  "motivo" TEXT NOT NULL,
  "em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DfeFailure_pkey" PRIMARY KEY ("organizationId", "companyId", "environment", "servico", "nsu")
);

CREATE TABLE "AuditEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID,
  "userId" UUID,
  "action" TEXT NOT NULL,
  "target" TEXT NOT NULL DEFAULT '',
  "detail" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

CREATE INDEX "Session_userId_idx" ON "Session"("userId");

CREATE UNIQUE INDEX "OrganizationMembership_userId_organizationId_key" ON "OrganizationMembership"("userId", "organizationId");

CREATE UNIQUE INDEX "OrganizationMembership_organizationId_id_key" ON "OrganizationMembership"("organizationId", "id");

CREATE UNIQUE INDEX "Company_organizationId_cnpj_key" ON "Company"("organizationId", "cnpj");

CREATE UNIQUE INDEX "Company_organizationId_id_key" ON "Company"("organizationId", "id");

CREATE UNIQUE INDEX "FiscalCertificate_organizationId_fingerprint_key" ON "FiscalCertificate"("organizationId", "fingerprint");

CREATE UNIQUE INDEX "FiscalCertificate_organizationId_id_key" ON "FiscalCertificate"("organizationId", "id");

CREATE INDEX "NfseDocument_organizationId_companyId_environment_competencia_idx" ON "NfseDocument"("organizationId", "companyId", "environment", "competencia");

CREATE INDEX "NfseEvent_organizationId_companyId_environment_chave_idx" ON "NfseEvent"("organizationId", "companyId", "environment", "chave");

CREATE INDEX "DfeDocument_organizationId_companyId_environment_servico_competencia_idx" ON "DfeDocument"("organizationId", "companyId", "environment", "servico", "competencia");

CREATE INDEX "DfeDocument_organizationId_companyId_environment_ciencia_idx" ON "DfeDocument"("organizationId", "companyId", "environment", "ciencia");

CREATE INDEX "AuditEvent_organizationId_createdAt_idx" ON "AuditEvent"("organizationId", "createdAt");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MembershipPermission" ADD CONSTRAINT "MembershipPermission_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "OrganizationMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Company" ADD CONSTRAINT "Company_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanyAccess" ADD CONSTRAINT "CompanyAccess_organizationId_membershipId_fkey" FOREIGN KEY ("organizationId", "membershipId") REFERENCES "OrganizationMembership"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanyAccess" ADD CONSTRAINT "CompanyAccess_organizationId_companyId_fkey" FOREIGN KEY ("organizationId", "companyId") REFERENCES "Company"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FiscalCertificate" ADD CONSTRAINT "FiscalCertificate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FiscalSettings" ADD CONSTRAINT "FiscalSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NfseState" ADD CONSTRAINT "NfseState_organizationId_companyId_fkey" FOREIGN KEY ("organizationId", "companyId") REFERENCES "Company"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NfseDocument" ADD CONSTRAINT "NfseDocument_organizationId_companyId_fkey" FOREIGN KEY ("organizationId", "companyId") REFERENCES "Company"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NfseEvent" ADD CONSTRAINT "NfseEvent_organizationId_companyId_fkey" FOREIGN KEY ("organizationId", "companyId") REFERENCES "Company"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NfseFailure" ADD CONSTRAINT "NfseFailure_organizationId_companyId_fkey" FOREIGN KEY ("organizationId", "companyId") REFERENCES "Company"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DfeState" ADD CONSTRAINT "DfeState_organizationId_companyId_fkey" FOREIGN KEY ("organizationId", "companyId") REFERENCES "Company"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DfeDocument" ADD CONSTRAINT "DfeDocument_organizationId_companyId_fkey" FOREIGN KEY ("organizationId", "companyId") REFERENCES "Company"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DfeEvent" ADD CONSTRAINT "DfeEvent_organizationId_companyId_fkey" FOREIGN KEY ("organizationId", "companyId") REFERENCES "Company"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DfeFailure" ADD CONSTRAINT "DfeFailure_organizationId_companyId_fkey" FOREIGN KEY ("organizationId", "companyId") REFERENCES "Company"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
