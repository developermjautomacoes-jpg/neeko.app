import type { PrismaClient } from "@prisma/client";
import { PERMISSOES } from "./common/auth";
import { hashSenha, senhaFraca } from "./common/passwords";
import { config } from "./config";

/** Só no banco vazio: cria a organização e a primeira pessoa, com senha provisória. Concessões são explícitas (ADR-005). */
export async function primeiraPessoa(prisma: PrismaClient) {
  const c = config();
  if (!c.BOOTSTRAP_ADMIN_EMAIL || !c.BOOTSTRAP_ADMIN_PASSWORD || !c.BOOTSTRAP_ORG_NAME) return;
  if (await prisma.user.count()) return;
  const fraca = senhaFraca(c.BOOTSTRAP_ADMIN_PASSWORD);
  if (fraca) throw new Error(`BOOTSTRAP_ADMIN_PASSWORD: ${fraca}`);
  await prisma.user.create({ data: { email: c.BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase(), name: c.BOOTSTRAP_ADMIN_NAME ?? "Administração", passwordHash: await hashSenha(c.BOOTSTRAP_ADMIN_PASSWORD), mustChangePassword: true,
    memberships: { create: { role: "ORG_OWNER", allCompanies: true, organization: { create: { name: c.BOOTSTRAP_ORG_NAME } }, permissions: { create: PERMISSOES.map((permission) => ({ permission })) } } } } });
  console.log("Organização e primeira pessoa criadas.");
}
