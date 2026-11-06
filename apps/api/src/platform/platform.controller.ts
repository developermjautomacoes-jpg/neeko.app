import { Body, Controller, Get, HttpCode, Param, Patch, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { AuditoriaService } from "../common/audit.service";
import { PERMISSOES, Plataforma } from "../common/auth";
import { Erro, invalido, naoEncontrado } from "../common/errors";
import { hashSenha, senhaFraca } from "../common/passwords";
import { validar } from "../common/validation";
import { cnpjValido, limparCnpj } from "../memoranda/memoranda.service";
import { PrismaService } from "../prisma.service";

const limite = z.number().int().min(0).max(100000).nullable();
const plano = z.object({ name: z.string().trim().min(2, "Informe o nome do plano.").max(60), maxCompanies: limite, maxUsers: limite, monthlyPrice: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/, "Preço inválido."), active: z.boolean().default(true) });
const dados = z.object({ name: z.string().trim().min(2, "Informe o nome do escritório.").max(160), cnpj: z.string().transform(limparCnpj).refine((c) => !c || cnpjValido(c), "CNPJ inválido."), contactEmail: z.string().trim().max(160).default(""), contactPhone: z.string().trim().max(30).default(""), planId: z.string().uuid().nullable(), paidUntil: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Data inválida.").default(""), notes: z.string().max(1000).default("") });
const novo = dados.extend({ gestorNome: z.string().trim().min(2, "Informe o nome do gestor.").max(120), gestorEmail: z.string().email("E-mail do gestor inválido.").transform((e) => e.trim().toLowerCase()), senhaProvisoria: z.string().max(200) });
type Req2 = Request & { sessao: { userId: string } };

/** Administração da Neeko: só dados gerenciais. Nada aqui lê notas, memorandos, finanças ou certificados dos escritórios. */
@Controller("platform")
export class PlataformaController {
  constructor(private prisma: PrismaService, private auditoria: AuditoriaService) {}
  private id(v: string) { if (!/^[0-9a-f-]{36}$/i.test(v)) throw naoEncontrado("Não encontrado."); return v; }

  @Plataforma() @Get("plans")
  async planos() { return { planos: (await this.prisma.plan.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { organizations: true } } } })).map((p) => ({ id: p.id, name: p.name, maxCompanies: p.maxCompanies, maxUsers: p.maxUsers, monthlyPrice: p.monthlyPrice.toFixed(2), active: p.active, escritorios: p._count.organizations })) }; }
  @Plataforma() @Post("plans")
  async criarPlano(@Req() r: Req2, @Body() c: unknown) {
    const d = validar(plano, c);
    if (await this.prisma.plan.findUnique({ where: { name: d.name } })) throw new Erro(409, "EM_USO", "Já existe plano com esse nome.");
    const p = await this.prisma.plan.create({ data: d }); await this.auditoria.registrar(null, r.sessao.userId, "platform.plan.created", p.id); return { id: p.id };
  }
  @Plataforma() @Patch("plans/:id")
  async alterarPlano(@Req() r: Req2, @Param("id") id: string, @Body() c: unknown) {
    const d = validar(plano, c);
    if (!(await this.prisma.plan.updateMany({ where: { id: this.id(id) }, data: d })).count) throw naoEncontrado("Plano não encontrado.");
    await this.auditoria.registrar(null, r.sessao.userId, "platform.plan.changed", id); return { ok: true };
  }

  @Plataforma() @Get("offices")
  async escritorios() {
    const l = await this.prisma.organization.findMany({ orderBy: { name: "asc" }, include: { plan: true, _count: { select: { companies: { where: { active: true } }, memberships: { where: { status: "ACTIVE" } } } }, memberships: { where: { role: "ORG_OWNER" }, take: 1, orderBy: { createdAt: "asc" }, include: { user: { select: { name: true, email: true } } } } } });
    return { escritorios: l.map((o) => ({ id: o.id, name: o.name, cnpj: o.cnpj, contactEmail: o.contactEmail, contactPhone: o.contactPhone, status: o.status, internal: o.internal, planId: o.planId, plano: o.plan?.name ?? "", mensalidade: o.plan?.monthlyPrice.toFixed(2) ?? "0.00", maxCompanies: o.plan?.maxCompanies ?? null, maxUsers: o.plan?.maxUsers ?? null, paidUntil: o.paidUntil, notes: o.notes, empresas: o._count.companies, usuarios: o._count.memberships, gestor: o.memberships[0]?.user.name ?? "", gestorEmail: o.memberships[0]?.user.email ?? "", createdAt: o.createdAt })) };
  }
  @Plataforma() @Post("offices")
  async criar(@Req() r: Req2, @Body() c: unknown) {
    const d = validar(novo, c), fraca = senhaFraca(d.senhaProvisoria);
    if (fraca) throw invalido(fraca);
    if (await this.prisma.user.findUnique({ where: { email: d.gestorEmail } })) throw new Erro(409, "EMAIL_IN_USE", "Este e-mail já tem cadastro. Use outro para o gestor.");
    if (d.planId && !(await this.prisma.plan.findFirst({ where: { id: d.planId, active: true } }))) throw invalido("Escolha um plano ativo.");
    const senha = await hashSenha(d.senhaProvisoria);
    const o = await this.prisma.organization.create({ data: { name: d.name, cnpj: d.cnpj, contactEmail: d.contactEmail, contactPhone: d.contactPhone, planId: d.planId, paidUntil: d.paidUntil, notes: d.notes,
      memberships: { create: { role: "ORG_OWNER", allCompanies: true, permissions: { create: PERMISSOES.map((permission) => ({ permission })) }, user: { create: { email: d.gestorEmail, name: d.gestorNome, passwordHash: senha, mustChangePassword: true } } } } } });
    await this.auditoria.registrar(null, r.sessao.userId, "platform.office.created", o.id);
    return { id: o.id };
  }
  @Plataforma() @Patch("offices/:id")
  async alterar(@Req() r: Req2, @Param("id") id: string, @Body() c: unknown) {
    const d = validar(dados, c);
    if (d.planId && !(await this.prisma.plan.findUnique({ where: { id: d.planId } }))) throw invalido("Plano não encontrado.");
    if (!(await this.prisma.organization.updateMany({ where: { id: this.id(id) }, data: d })).count) throw naoEncontrado("Escritório não encontrado.");
    await this.auditoria.registrar(null, r.sessao.userId, "platform.office.changed", id); return { ok: true };
  }
  /** Suspender bloqueia o acesso e a captura noturna; os dados continuam guardados. */
  @Plataforma() @Post("offices/:id/status") @HttpCode(200)
  async situacao(@Req() r: Req2, @Param("id") id: string, @Body() c: unknown) {
    const { status } = validar(z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]) }), c);
    const o = await this.prisma.organization.findUnique({ where: { id: this.id(id) } });
    if (!o) throw naoEncontrado("Escritório não encontrado.");
    if (o.internal) throw invalido("A organização interna da Neeko não é suspensa.");
    await this.prisma.$transaction([this.prisma.organization.update({ where: { id: o.id }, data: { status } }), this.prisma.session.deleteMany({ where: { organizationId: o.id } })]);
    await this.auditoria.registrar(null, r.sessao.userId, "platform.office.status", id, { status }); return { ok: true };
  }
  /** Gestor perdeu o acesso: nova senha provisória e nova ativação das duas etapas. */
  @Plataforma() @Post("offices/:id/reset-manager") @HttpCode(200)
  async redefinir(@Req() r: Req2, @Param("id") id: string, @Body() c: unknown) {
    const { senhaProvisoria } = validar(z.object({ senhaProvisoria: z.string().max(200) }), c), fraca = senhaFraca(senhaProvisoria);
    if (fraca) throw invalido(fraca);
    const m = await this.prisma.organizationMembership.findFirst({ where: { organizationId: this.id(id), role: "ORG_OWNER" }, orderBy: { createdAt: "asc" } });
    if (!m) throw naoEncontrado("Gestor não encontrado.");
    await this.prisma.$transaction([this.prisma.user.update({ where: { id: m.userId }, data: { passwordHash: await hashSenha(senhaProvisoria), mustChangePassword: true, mfaEnabled: false, mfaSecret: null, mfaRecovery: [] } }), this.prisma.session.deleteMany({ where: { userId: m.userId } })]);
    await this.auditoria.registrar(null, r.sessao.userId, "platform.office.manager.reset", id); return { ok: true };
  }
}
