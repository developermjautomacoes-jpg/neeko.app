import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { primeiraPessoa } from "./bootstrap";
import { config } from "./config";
import { aplicarMigracoes } from "./migrate";
import { PrismaService } from "./prisma.service";

export async function criarApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ["log", "warn", "error"] });
  app.useBodyParser("json", { limit: "9mb" });
  app.setGlobalPrefix("api/v1");
  app.disable("x-powered-by");
  return app;
}
async function iniciar() {
  const c = config();
  if (c.RUN_MIGRATIONS === "true") await aplicarMigracoes(c.DATABASE_URL, c.MIGRATIONS_DIR);
  const app = await criarApp();
  const prisma = app.get(PrismaService);
  await primeiraPessoa(prisma);
  if (c.MFA_RESET_EMAIL) { await prisma.user.updateMany({ where: { email: c.MFA_RESET_EMAIL.toLowerCase() }, data: { mfaEnabled: false, mfaSecret: null, mfaRecovery: [] } }); console.warn("Verificação em duas etapas limpa por MFA_RESET_EMAIL."); }
  await app.listen(c.PORT);
}
if (require.main === module) iniciar().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
