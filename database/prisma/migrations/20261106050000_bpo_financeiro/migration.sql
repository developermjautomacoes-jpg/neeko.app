ALTER TABLE "Organization" ADD COLUMN "approvalLimit" DECIMAL(15,2);
CREATE TABLE "FinAccount" ("id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "companyId" UUID NOT NULL, "name" TEXT NOT NULL, "bank" TEXT NOT NULL DEFAULT '', "openingBalance" DECIMAL(15,2) NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT true, CONSTRAINT "FinAccount_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "FinAccount_organizationId_id_key" ON "FinAccount"("organizationId", "id");
CREATE INDEX "FinAccount_organizationId_companyId_idx" ON "FinAccount"("organizationId", "companyId");
CREATE TABLE "FinCategory" ("id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "companyId" UUID NOT NULL, "name" TEXT NOT NULL, "kind" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, CONSTRAINT "FinCategory_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "FinCategory_organizationId_companyId_kind_name_key" ON "FinCategory"("organizationId", "companyId", "kind", "name");
CREATE UNIQUE INDEX "FinCategory_organizationId_id_key" ON "FinCategory"("organizationId", "id");
CREATE TABLE "CostCenter" ("id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "companyId" UUID NOT NULL, "name" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "CostCenter_organizationId_companyId_name_key" ON "CostCenter"("organizationId", "companyId", "name");
CREATE UNIQUE INDEX "CostCenter_organizationId_id_key" ON "CostCenter"("organizationId", "id");
CREATE TABLE "FinEntry" ("id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "companyId" UUID NOT NULL, "kind" TEXT NOT NULL, "description" TEXT NOT NULL, "partyName" TEXT NOT NULL DEFAULT '', "partyDoc" TEXT NOT NULL DEFAULT '', "docNumber" TEXT NOT NULL DEFAULT '', "categoryId" UUID, "costCenterId" UUID, "accountId" UUID, "issueDate" TEXT NOT NULL, "dueDate" TEXT NOT NULL, "amount" DECIMAL(15,2) NOT NULL, "status" TEXT NOT NULL DEFAULT 'aberto', "paidDate" TEXT NOT NULL DEFAULT '', "paidAmount" DECIMAL(15,2), "groupId" UUID, "installment" INTEGER NOT NULL DEFAULT 1, "installments" INTEGER NOT NULL DEFAULT 1, "notes" TEXT NOT NULL DEFAULT '', "createdById" UUID NOT NULL, "createdByName" TEXT NOT NULL DEFAULT '', "approvedByName" TEXT NOT NULL DEFAULT '', "approvedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "FinEntry_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "FinEntry_organizationId_id_key" ON "FinEntry"("organizationId", "id");
CREATE INDEX "FinEntry_organizationId_companyId_dueDate_idx" ON "FinEntry"("organizationId", "companyId", "dueDate");
CREATE INDEX "FinEntry_organizationId_companyId_status_idx" ON "FinEntry"("organizationId", "companyId", "status");
CREATE TABLE "FinAttachment" ("id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "entryId" UUID NOT NULL, "name" TEXT NOT NULL, "mime" TEXT NOT NULL, "content" BYTEA NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "FinAttachment_pkey" PRIMARY KEY ("id"));
CREATE INDEX "FinAttachment_organizationId_entryId_idx" ON "FinAttachment"("organizationId", "entryId");
CREATE TABLE "FinStatementLine" ("id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "accountId" UUID NOT NULL, "fitId" TEXT NOT NULL, "date" TEXT NOT NULL, "amount" DECIMAL(15,2) NOT NULL, "memo" TEXT NOT NULL DEFAULT '', "entryId" UUID, "ignored" BOOLEAN NOT NULL DEFAULT false, CONSTRAINT "FinStatementLine_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "FinStatementLine_organizationId_accountId_fitId_key" ON "FinStatementLine"("organizationId", "accountId", "fitId");
CREATE TABLE "StockItem" ("id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "companyId" UUID NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "unit" TEXT NOT NULL DEFAULT 'UN', "minQty" DECIMAL(15,3) NOT NULL DEFAULT 0, "qty" DECIMAL(15,3) NOT NULL DEFAULT 0, "avgCost" DECIMAL(15,4) NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT true, CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id"), CONSTRAINT "StockItem_qty_positivo" CHECK ("qty" >= 0));
CREATE UNIQUE INDEX "StockItem_organizationId_companyId_code_key" ON "StockItem"("organizationId", "companyId", "code");
CREATE UNIQUE INDEX "StockItem_organizationId_id_key" ON "StockItem"("organizationId", "id");
CREATE TABLE "StockMove" ("id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "itemId" UUID NOT NULL, "type" TEXT NOT NULL, "qty" DECIMAL(15,3) NOT NULL, "unitCost" DECIMAL(15,4) NOT NULL DEFAULT 0, "date" TEXT NOT NULL, "note" TEXT NOT NULL DEFAULT '', "byName" TEXT NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "StockMove_pkey" PRIMARY KEY ("id"));
CREATE INDEX "StockMove_organizationId_itemId_idx" ON "StockMove"("organizationId", "itemId");
ALTER TABLE "FinAccount" ADD CONSTRAINT "FinAccount_organizationId_companyId_fkey" FOREIGN KEY ("organizationId", "companyId") REFERENCES "Company"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinCategory" ADD CONSTRAINT "FinCategory_organizationId_companyId_fkey" FOREIGN KEY ("organizationId", "companyId") REFERENCES "Company"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CostCenter" ADD CONSTRAINT "CostCenter_organizationId_companyId_fkey" FOREIGN KEY ("organizationId", "companyId") REFERENCES "Company"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinEntry" ADD CONSTRAINT "FinEntry_organizationId_companyId_fkey" FOREIGN KEY ("organizationId", "companyId") REFERENCES "Company"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinAttachment" ADD CONSTRAINT "FinAttachment_organizationId_entryId_fkey" FOREIGN KEY ("organizationId", "entryId") REFERENCES "FinEntry"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinStatementLine" ADD CONSTRAINT "FinStatementLine_organizationId_accountId_fkey" FOREIGN KEY ("organizationId", "accountId") REFERENCES "FinAccount"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinStatementLine" ADD CONSTRAINT "FinStatementLine_organizationId_entryId_fkey" FOREIGN KEY ("organizationId", "entryId") REFERENCES "FinEntry"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_organizationId_companyId_fkey" FOREIGN KEY ("organizationId", "companyId") REFERENCES "Company"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockMove" ADD CONSTRAINT "StockMove_organizationId_itemId_fkey" FOREIGN KEY ("organizationId", "itemId") REFERENCES "StockItem"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Proprietárias recebem as permissões do novo módulo.
INSERT INTO "MembershipPermission" ("membershipId", "permission")
SELECT m."id", p.permission FROM "OrganizationMembership" m CROSS JOIN (VALUES ('finance.read'), ('finance.manage'), ('finance.settle'), ('finance.approve'), ('stock.read'), ('stock.manage')) AS p(permission)
WHERE m."role" = 'ORG_OWNER' ON CONFLICT DO NOTHING;
