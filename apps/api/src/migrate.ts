import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

/** Aplica, em ordem, os migration.sql ainda não registrados. A trava impede duas instâncias ao mesmo tempo. */
export async function aplicarMigracoes(url: string, pasta: string, log: (m: string) => void = console.log) {
  const c = new Client({ connectionString: url });
  await c.connect();
  try {
    await c.query("SELECT pg_advisory_lock(727001)");
    await c.query('CREATE TABLE IF NOT EXISTS "_neeko_migrations" (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
    const feitas = new Set((await c.query('SELECT name FROM "_neeko_migrations"')).rows.map((r) => r.name as string));
    for (const nome of readdirSync(pasta).sort()) {
      const arq = join(pasta, nome, "migration.sql");
      if (!existsSync(arq) || feitas.has(nome)) continue;
      await c.query("BEGIN");
      try {
        await c.query(readFileSync(arq, "utf8"));
        await c.query('INSERT INTO "_neeko_migrations" (name) VALUES ($1)', [nome]);
        await c.query("COMMIT");
        log(`Migração aplicada: ${nome}`);
      } catch (e) { await c.query("ROLLBACK"); throw e; }
    }
  } finally {
    await c.query("SELECT pg_advisory_unlock(727001)").catch(() => undefined);
    await c.end();
  }
}
