import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from "@nestjs/common";
import { z } from "zod";
import { AuditoriaService } from "../common/audit.service";
import { Contexto, Ctx, Exige, PERMISSOES } from "../common/auth";
import { Erro, invalido, naoEncontrado } from "../common/errors";
import { hashSenha, senhaFraca } from "../common/passwords";
import { validar } from "../common/validation";
import { PrismaService } from "../prisma.service";

const acesso = z.object({
  role: z.enum(["ORG_ADMIN", "STAFF", "COMPANY_USER"]),
  permissions: z.array(z.enum(PERMISSOES)).max(PERMISSOES.length),
  allCompanies: z.boolean(),
  companyIds: z.array(z.string().uuid()).max(5000),
});
const novo = acesso.extend({ name: z.string().trim().min(2, "Informe o nome.").max(120), email: z.string().email("Informe um e-mail válido.").transform((e) => e.trim().toLowerCase()), senhaProvisoria: z.string().max(200), jobTitle: z.string().trim().max(80).default("") });

/** Pessoas da organização. Cada uma tem e-mail e senha próprios; quem administra só define a senha provisória. */
@Controller("users")
export class UsersController {
  constructor(private prisma: PrismaService, private auditoria: AuditoriaService) {}

  private async vinculo(c: Contexto, id: string) {
    const m = await this.prisma.organizationMembership.findFirst({ where: { id, organizationId: c.organizationId } });
    if (!m) throw naoEncontrado("Pessoa não encontrada.");
    return m;
  }
  private async conferirEmpresas(c: Contexto, ids: string[]) {
    const n = await this.prisma.company.count({ where: { organizationId: c.organizationId, id: { in: ids } } });
    if (n !== new Set(ids).size) throw invalido("Há empresa fora desta organização.");
  }
  /** Ninguém concede a si ou a outra pessoa o que não tem: impede escalada de privilégio. */
  private conferirConcessao(c: Contexto, p: string[]) {
    if (p.includes("companies.restricted") && c.role !== "ORG_OWNER") throw new Erro(403, "FORBIDDEN", "Só a proprietária libera a empresa do escritório.");
    if (p.some((x) => !c.permissions.has(x))) throw new Erro(403, "FORBIDDEN", "Você só pode conceder permissões que já tem.");
  }

  @Exige("users.manage") @Get()
  async listar(@Ctx() c: Contexto) {
    const l = await this.prisma.organizationMembership.findMany({ where: { organizationId: c.organizationId }, include: { user: true, permissions: true, companies: true }, orderBy: { createdAt: "asc" } });
    return { usuarios: l.map((m) => ({ id: m.id, jobTitle: m.user.jobTitle, name: m.user.name, email: m.user.email, role: m.role, status: m.status, allCompanies: m.allCompanies,
      permissions: m.permissions.map((p) => p.permission), companyIds: m.companies.map((x) => x.companyId), mustChangePassword: m.user.mustChangePassword })) };
  }

  @Exige("users.manage") @Post()
  async criar(@Ctx() c: Contexto, @Body() corpo: unknown) {
    const d = validar(novo, corpo);
    const fraca = senhaFraca(d.senhaProvisoria); if (fraca) throw invalido(fraca);
    this.conferirConcessao(c, d.permissions); await this.conferirEmpresas(c, d.companyIds);
    if (await this.prisma.user.findUnique({ where: { email: d.email } })) throw new Erro(409, "EMAIL_IN_USE", "Este e-mail já tem cadastro.");
    const u = await this.prisma.user.create({ data: { email: d.email, name: d.name, passwordHash: await hashSenha(d.senhaProvisoria), mustChangePassword: true, jobTitle: d.jobTitle,
      memberships: { create: { organizationId: c.organizationId, role: d.role, allCompanies: d.allCompanies, permissions: { create: d.permissions.map((permission) => ({ permission })) } } } }, include: { memberships: true } });
    const m = u.memberships[0];
    if (d.companyIds.length) await this.prisma.companyAccess.createMany({ data: d.companyIds.map((companyId) => ({ organizationId: c.organizationId, membershipId: m.id, companyId })) });
    await this.auditoria.registrar(c.organizationId, c.userId, "users.created", u.id, { role: d.role, permissions: d.permissions, allCompanies: d.allCompanies });
    return { id: m.id };
  }

  /** Nome, e-mail e cargo. Os dados da proprietária só ela altera; quem também está em outro escritório não é alterado por aqui. */
  @Exige("users.manage") @Put(":id/details")
  async dados(@Ctx() c: Contexto, @Param("id") id: string, @Body() corpo: unknown) {
    const d = validar(z.object({ name: z.string().trim().min(2, "Informe o nome.").max(120), email: z.string().email("Informe um e-mail válido.").transform((e) => e.trim().toLowerCase()), jobTitle: z.string().trim().max(80).default("") }), corpo);
    const m = await this.vinculo(c, id);
    if (m.role === "ORG_OWNER" && m.id !== c.membershipId) throw new Erro(403, "FORBIDDEN", "Só a proprietária altera os próprios dados.");
    if ((await this.prisma.organizationMembership.count({ where: { userId: m.userId } })) > 1) throw new Erro(403, "FORBIDDEN", "Esta pessoa também está em outro escritório. Peça que ela altere pelo próprio perfil.");
    const outro = await this.prisma.user.findUnique({ where: { email: d.email } });
    if (outro && outro.id !== m.userId) throw new Erro(409, "EMAIL_IN_USE", "Este e-mail já tem cadastro.");
    await this.prisma.user.update({ where: { id: m.userId }, data: { name: d.name, email: d.email, jobTitle: d.jobTitle } });
    await this.auditoria.registrar(c.organizationId, c.userId, "users.details.changed", m.userId);
    return { ok: true };
  }

  /** Tira a pessoa do escritório. Sem outro vínculo, a conta deixa de existir e o e-mail fica livre. */
  @Exige("users.manage") @Delete(":id")
  async excluir(@Ctx() c: Contexto, @Param("id") id: string) {
    const m = await this.vinculo(c, id);
    if (m.role === "ORG_OWNER") throw new Erro(403, "FORBIDDEN", "A pessoa proprietária não pode ser excluída.");
    if (m.id === c.membershipId) throw new Erro(403, "FORBIDDEN", "Você não pode excluir o próprio acesso.");
    await this.prisma.$transaction([
      this.prisma.session.deleteMany({ where: { userId: m.userId, organizationId: c.organizationId } }),
      this.prisma.organizationMembership.delete({ where: { id } }),
      this.prisma.user.deleteMany({ where: { id: m.userId, globalRole: { not: "NEEKO_SUPERADMIN" }, memberships: { none: {} } } }),
    ]);
    await this.auditoria.registrar(c.organizationId, c.userId, "users.deleted", m.userId);
    return { ok: true };
  }

  @Exige("users.manage") @Patch(":id")
  async alterar(@Ctx() c: Contexto, @Param("id") id: string, @Body() corpo: unknown) {
    const d = validar(acesso.extend({ status: z.enum(["ACTIVE", "SUSPENDED"]) }), corpo);
    const m = await this.vinculo(c, id);
    if (m.role === "ORG_OWNER") throw new Erro(403, "FORBIDDEN", "A pessoa proprietária não é alterada por aqui.");
    if (m.id === c.membershipId) throw new Erro(403, "FORBIDDEN", "Você não pode alterar o próprio acesso.");
    this.conferirConcessao(c, d.permissions); await this.conferirEmpresas(c, d.companyIds);
    await this.prisma.$transaction([
      this.prisma.organizationMembership.update({ where: { id }, data: { role: d.role, status: d.status, allCompanies: d.allCompanies } }),
      this.prisma.membershipPermission.deleteMany({ where: { membershipId: id } }),
      this.prisma.membershipPermission.createMany({ data: d.permissions.map((permission) => ({ membershipId: id, permission })) }),
      this.prisma.companyAccess.deleteMany({ where: { membershipId: id } }),
      this.prisma.companyAccess.createMany({ data: d.companyIds.map((companyId) => ({ organizationId: c.organizationId, membershipId: id, companyId })) }),
      this.prisma.session.deleteMany({ where: { userId: m.userId, organizationId: c.organizationId } }),
    ]);
    await this.auditoria.registrar(c.organizationId, c.userId, "users.access.changed", m.userId, { status: d.status, role: d.role, permissions: d.permissions, allCompanies: d.allCompanies });
    return { ok: true };
  }

  /** Esquecimento de senha: define nova provisória e encerra as sessões da pessoa. */
  @Exige("users.manage") @Post(":id/reset-password") @HttpCode(200)
  async redefinir(@Ctx() c: Contexto, @Param("id") id: string, @Body() corpo: unknown) {
    const { senhaProvisoria } = validar(z.object({ senhaProvisoria: z.string().max(200) }), corpo);
    const fraca = senhaFraca(senhaProvisoria); if (fraca) throw invalido(fraca);
    const m = await this.vinculo(c, id);
    if (m.role === "ORG_OWNER" && m.id !== c.membershipId) throw new Erro(403, "FORBIDDEN", "A pessoa proprietária troca a própria senha.");
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: m.userId }, data: { passwordHash: await hashSenha(senhaProvisoria), mustChangePassword: true } }),
      this.prisma.session.deleteMany({ where: { userId: m.userId } }),
    ]);
    await this.auditoria.registrar(c.organizationId, c.userId, "users.password.reset", m.userId);
    return { ok: true };
  }
}
