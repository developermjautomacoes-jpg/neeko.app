import { Body, Controller, Get, HttpCode, Patch, Post, Req, Res } from "@nestjs/common";
import { randomBytes, randomInt } from "node:crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import { COOKIE, PERMISSOES, Publico, SemMfa, SoLogado, hashToken, lerCookie, conferirSimultaneos } from "../common/auth";
import { AuditoriaService } from "../common/audit.service";
import { Erro, invalido } from "../common/errors";
import { HASH_FALSO, conferirSenha, hashSenha, senhaFraca } from "../common/passwords";
import { validar } from "../common/validation";
import { config } from "../config";
import { CorreioService } from "../common/mail.service";
import { PrismaService } from "../prisma.service";

const DURACAO_MS = 12 * 3600 * 1000, BLOQUEIO_MS = 15 * 60 * 1000, TENTATIVAS = 5;
const falhas = new Map<string, { n: number; ate: number }>();
export const limparTentativas = () => falhas.clear();

@Controller("auth")
export class AuthController {
  constructor(private prisma: PrismaService, private auditoria: AuditoriaService, private correio: CorreioService) {}

  @Publico() @Post("login") @HttpCode(200)
  async login(@Body() corpo: unknown, @Res({ passthrough: true }) res: Response) {
    const { email, senha, escritorio } = validar(z.object({ email: z.string().email("Informe um e-mail válido.").transform((e) => e.trim().toLowerCase()), senha: z.string().min(1, "Informe a senha.").max(200), escritorio: z.string().max(60).optional() }), corpo);
    const f = falhas.get(email);
    if (f && f.n >= TENTATIVAS && f.ate > Date.now()) throw new Erro(429, "TOO_MANY_ATTEMPTS", "Muitas tentativas. Aguarde 15 minutos.");
    const u = await this.prisma.user.findUnique({ where: { email }, include: { memberships: { where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" }, include: { organization: { select: { status: true, internal: true, slug: true } } } } } });
    const ok = await conferirSenha(senha, u?.passwordHash ?? HASH_FALSO);
    if (!u || !ok || !u.active) {
      const n = f && f.ate > Date.now() ? f.n + 1 : 1;
      falhas.set(email, { n, ate: Date.now() + BLOQUEIO_MS });
      await this.auditoria.registrar(null, u?.id ?? null, "auth.login.failed", email);
      throw new Erro(401, "BAD_CREDENTIALS", "E-mail ou senha incorretos.");
    }
    falhas.delete(email);
    const token = randomBytes(32).toString("base64url");
    const interna = u.memberships.find((m) => m.organization.internal);
    // O link do escritório só aceita quem pertence a ele; o link da Neeko, só a equipe Neeko.
    const organizacao = escritorio ? u.memberships.find((m) => m.organization.slug === escritorio) : interna ?? u.memberships.find((m) => m.organization.status === "ACTIVE") ?? u.memberships[0];
    if (escritorio && !organizacao) throw new Erro(401, "BAD_CREDENTIALS", "E-mail ou senha incorretos.");
    if (!escritorio && !interna && u.globalRole !== "NEEKO_SUPERADMIN") throw new Erro(403, "USE_OFFICE_LINK", "Este acesso é da administração da Neeko. Entre pelo link do seu escritório.");
    if (organizacao?.organization.status === "ACTIVE") await conferirSimultaneos(this.prisma, organizacao.organizationId, u.id);
    await this.prisma.session.create({ data: { userId: u.id, organizationId: organizacao?.organizationId ?? null, tokenHash: hashToken(token), portal: escritorio ? "escritorio" : "neeko", expiresAt: new Date(Date.now() + DURACAO_MS) } });
    await this.prisma.session.deleteMany({ where: { userId: u.id, expiresAt: { lt: new Date() } } });
    res.cookie(COOKIE, token, { httpOnly: true, sameSite: "strict", secure: config().NODE_ENV === "production", maxAge: DURACAO_MS, path: "/" });
    await this.auditoria.registrar(u.memberships[0]?.organizationId ?? null, u.id, "auth.login");
    return { ok: true, mustChangePassword: u.mustChangePassword, mfaRequired: u.mfaEnabled };
  }

  /** A resposta é igual exista ou não a conta, para não revelar quem tem cadastro. */
  @Publico() @Post("forgot-password") @HttpCode(200)
  async esqueci(@Body() corpo: unknown) {
    const { email, escritorio } = validar(z.object({ email: z.string().email("Informe um e-mail válido.").transform((e) => e.trim().toLowerCase()), escritorio: z.string().max(60).optional() }), corpo);
    if (!this.correio.configurado()) throw new Erro(503, "MAIL_NOT_CONFIGURED", "O envio por e-mail ainda não está disponível. Peça uma senha provisória a quem administra sua organização.");
    const u = await this.prisma.user.findUnique({ where: { email }, include: { memberships: { where: { status: "ACTIVE" }, include: { organization: { select: { name: true, slug: true } } } } } });
    if (!u?.active) return { ok: true };
    if ((await this.prisma.passwordReset.count({ where: { userId: u.id, createdAt: { gte: new Date(Date.now() - BLOQUEIO_MS) } } })) >= 3) return { ok: true };
    const codigo = String(randomInt(0, 1000000)).padStart(6, "0");
    await this.prisma.passwordReset.create({ data: { userId: u.id, codeHash: hashToken(`${u.id}:${codigo}`), expiresAt: new Date(Date.now() + BLOQUEIO_MS) } });
    const nome = u.memberships.find((m) => m.organization.slug === escritorio)?.organization.name ?? "Neeko";
    await this.auditoria.registrar(null, u.id, "auth.password.reset.requested");
    this.correio.enviar(email, `Código de segurança: ${codigo}`, `Olá, ${u.name}.\n\nSeu código para redefinir a senha em ${nome} é ${codigo}.\nEle vale por 15 minutos. Se você não pediu, ignore este e-mail.`).catch((x: Error) => console.error("Falha ao enviar e-mail:", x.message));
    return { ok: true };
  }

  @Publico() @Post("reset-password") @HttpCode(200)
  async redefinir(@Body() corpo: unknown) {
    const { email, codigo, nova } = validar(z.object({ email: z.string().email("Informe um e-mail válido.").transform((e) => e.trim().toLowerCase()), codigo: z.string().regex(/^\d{6}$/, "Informe os 6 números do código."), nova: z.string().max(200) }), corpo);
    const fraca = senhaFraca(nova); if (fraca) throw invalido(fraca);
    const erro = new Erro(400, "CODE_INVALID", "Código inválido ou vencido. Peça um novo.");
    const u = await this.prisma.user.findUnique({ where: { email } });
    const r = u?.active ? await this.prisma.passwordReset.findFirst({ where: { userId: u.id, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }) : null;
    if (!u || !r || r.attempts >= TENTATIVAS) throw erro;
    if (r.codeHash !== hashToken(`${u.id}:${codigo}`)) { await this.prisma.passwordReset.update({ where: { id: r.id }, data: { attempts: { increment: 1 } } }); throw erro; }
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: u.id }, data: { passwordHash: await hashSenha(nova), mustChangePassword: false } }),
      this.prisma.passwordReset.deleteMany({ where: { userId: u.id } }),
      this.prisma.session.deleteMany({ where: { userId: u.id } }),
    ]);
    falhas.delete(email);
    await this.auditoria.registrar(null, u.id, "auth.password.reset");
    return { ok: true };
  }

  @SemMfa() @Post("logout") @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const t = lerCookie(req, COOKIE);
    if (t) await this.prisma.session.deleteMany({ where: { tokenHash: hashToken(t) } });
    res.clearCookie(COOKIE, { path: "/" });
    return { ok: true };
  }

  /** Troca da própria senha: encerra as demais sessões da pessoa. */
  @SoLogado() @Post("password") @HttpCode(200)
  async senha(@Req() req: Request & { sessao: { id: string; userId: string; organizationId: string | null; user: { passwordHash: string } } }, @Body() corpo: unknown) {
    const { atual, nova } = validar(z.object({ atual: z.string().min(1, "Informe a senha atual."), nova: z.string().max(200) }), corpo);
    const fraca = senhaFraca(nova); if (fraca) throw invalido(fraca);
    if (!(await conferirSenha(atual, req.sessao.user.passwordHash))) throw invalido("A senha atual não confere.");
    if (atual === nova) throw invalido("A nova senha precisa ser diferente da atual.");
    await this.prisma.user.update({ where: { id: req.sessao.userId }, data: { passwordHash: await hashSenha(nova), mustChangePassword: false } });
    await this.prisma.session.deleteMany({ where: { userId: req.sessao.userId, id: { not: req.sessao.id } } });
    await this.auditoria.registrar(req.sessao.organizationId, req.sessao.userId, "auth.password.changed");
    return { ok: true };
  }
}

@Controller("me")
export class MeController {
  constructor(private prisma: PrismaService, private auditoria: AuditoriaService) {}
  @SemMfa() @Get()
  async eu(@Req() req: Request & { sessao: { userId: string; organizationId: string | null; mfaVerified: boolean; portal: string } }) {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: req.sessao.userId }, include: { memberships: { where: { status: "ACTIVE" }, include: { organization: true, permissions: true } } } });
    const atual = u.memberships.find((m) => m.organizationId === req.sessao.organizationId && m.organization.status === "ACTIVE");
    return { id: u.id, name: u.name, email: u.email, platformAdmin: u.globalRole === "NEEKO_SUPERADMIN" && req.sessao.portal === "neeko", portal: req.sessao.portal, mfaEnabled: u.mfaEnabled, mfaPending: u.mfaEnabled && !req.sessao.mfaVerified, mfaSetupRequired: false, avatar: u.avatar, jobTitle: u.jobTitle, phone: u.phone, mustChangePassword: u.mustChangePassword,
      organization: atual ? { id: atual.organizationId, name: atual.organization.name, role: atual.role, slug: atual.organization.slug, internal: atual.organization.internal, logo: atual.organization.logo, colorPrimary: atual.organization.colorPrimary, colorDark: atual.organization.colorDark, contactEmail: atual.organization.contactEmail, contactPhone: atual.organization.contactPhone } : null,
      permissions: atual?.permissions.map((p) => p.permission) ?? [], availablePermissions: PERMISSOES };
  }

  /** Cada pessoa altera só o próprio perfil. A foto chega já recortada; o e-mail de acesso não muda por aqui. */
  @SoLogado() @Patch()
  async perfil(@Req() req: Request & { sessao: { userId: string; organizationId: string | null } }, @Body() corpo: unknown) {
    const d = validar(z.object({ name: z.string().trim().min(2, "Informe o nome.").max(120), jobTitle: z.string().trim().max(80).default(""), phone: z.string().trim().max(30).default(""),
      avatar: z.string().max(400000, "A foto ficou grande demais.").regex(/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/=]+$/, "Foto inválida.").nullable() }), corpo);
    await this.prisma.user.update({ where: { id: req.sessao.userId }, data: d });
    await this.auditoria.registrar(req.sessao.organizationId, req.sessao.userId, "users.profile.changed");
    return { ok: true };
  }
}
