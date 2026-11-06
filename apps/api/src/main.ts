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
  app.useBodyParser("json", { limit: "2mb" });
  app.setGlobalPrefix("api/v1");
  app.disable("x-powered-by");
  return app;
}
async function iniciar() {
  const c = config();
  if (c.RUN_MIGRATIONS === "true") await aplicarMigracoes(c.DATABASE_URL, c.MIGRATIONS_DIR);
  const app = await criarApp();
  await primeiraPessoa(app.get(PrismaService));
  await app.listen(c.PORT);
}
if (require.main === module) iniciar().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
