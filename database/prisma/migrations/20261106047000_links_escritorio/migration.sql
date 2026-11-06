ALTER TABLE "Organization" ADD COLUMN "slug" TEXT;
WITH base AS (
  SELECT "id", COALESCE(NULLIF(trim(both '-' from regexp_replace(translate(lower("name"), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), '[^a-z0-9]+', '-', 'g')), ''), 'escritorio') AS s FROM "Organization"
), numerado AS (
  SELECT "id", s, row_number() OVER (PARTITION BY s ORDER BY "id") AS n FROM base
)
UPDATE "Organization" o SET "slug" = CASE WHEN n.n = 1 THEN n.s ELSE n.s || '-' || n.n END FROM numerado n WHERE o."id" = n."id";
ALTER TABLE "Organization" ALTER COLUMN "slug" SET NOT NULL, ALTER COLUMN "slug" SET DEFAULT gen_random_uuid()::text;
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
-- Sessão aberta pelo link da Neeko (acesso completo) ou pelo link do escritório.
ALTER TABLE "Session" ADD COLUMN "portal" TEXT NOT NULL DEFAULT 'neeko';
