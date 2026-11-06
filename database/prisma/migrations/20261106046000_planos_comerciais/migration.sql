-- Renomeia os planos iniciais para manter os escritórios já vinculados.
UPDATE "Plan" SET "name" = 'Neeko Essencial' WHERE "name" = 'Essencial' AND NOT EXISTS (SELECT 1 FROM "Plan" WHERE "name" = 'Neeko Essencial');
UPDATE "Plan" SET "name" = 'Neeko Profissional' WHERE "name" = 'Profissional' AND NOT EXISTS (SELECT 1 FROM "Plan" WHERE "name" = 'Neeko Profissional');
UPDATE "Plan" SET "name" = 'Neeko Premium' WHERE "name" = 'Avançado' AND NOT EXISTS (SELECT 1 FROM "Plan" WHERE "name" = 'Neeko Premium');

INSERT INTO "Plan" ("id", "name", "maxCompanies", "maxUsers", "monthlyPrice") VALUES
  (gen_random_uuid(), 'Piloto', NULL, NULL, 0),
  (gen_random_uuid(), 'Neeko Essencial', 15, 3, 149.90),
  (gen_random_uuid(), 'Neeko Profissional', 50, 10, 299.90),
  (gen_random_uuid(), 'Neeko Premium', 150, 30, 599.90)
ON CONFLICT ("name") DO UPDATE SET "maxCompanies" = EXCLUDED."maxCompanies", "maxUsers" = EXCLUDED."maxUsers", "monthlyPrice" = EXCLUDED."monthlyPrice", "active" = true;
