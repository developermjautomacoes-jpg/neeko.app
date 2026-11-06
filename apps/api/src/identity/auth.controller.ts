import { Body, Controller, Get, HttpCode, Patch, Post, Req, Res } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import { COOKIE, PERMISSOES, Publico, SemMfa, SoLogado, hashToken, lerCookie } from "../common/auth";
import { AuditoriaService } from "../common/audit.service";
import { Erro, invalido } from "../common/errors";
import { HASH_FALSO, conferirSenha, hashSenha, senhaFraca } from "../common/passwords";
import { validar } from "../common/validation";
import { config } from "../config";
import { PrismaService } from "../prisma.service";

const DURACAO_MS = 12 * 3600 * 1000, BLOQUEIO_MS = 15 * 60 * 1000, TENTATIVAS = 5;
const falhas = new Map<string, { n: number; ate: number }>();
export const limparTentativas = () => falhas.clear();

@Controller("auth")
export class AuthController {
  constructor(private prisma: PrismaService, private auditoria: AuditoriaService) {}

  @Publico() @Post("login") @HttpCode(200)
  async login(@Body() corpo: unknown, @Res({ passthrough: true }) res: Response) {
    const { email, senha } = validar(z.object({ email: z.string().email("Informe um e-mail válido.").transform((e) => e.trim().toLowerCase()), senha: z.string().min(1, "Informe a senha.").max(200) }), corpo);
    const f = falhas.get(email);
    if (f && f.n >= TENTATIVAS && f.ate > Date.now()) throw new Erro(429, "TOO_MANY_ATTEMPTS", "Muitas tentativas. Aguarde 15 minutos.");
    const u = await this.prisma.user.findUnique({ where: { email }, include: { memberships: { where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" }, include: { organization: { select: { status: true } } } } } });
    const ok = await conferirSenha(senha, u?.passwordHash ?? HASH_FALSO);
    if (!u || !ok || !u.active) {
      const n = f && f.ate > Date.now() ? f.n + 1 : 1;
      falhas.set(email, { n, ate: Date.now() + BLOQUEIO_MS });
      await this.auditoria.registrar(null, u?.id ?? null, "auth.login.failed", email);
      throw new Erro(401, "BAD_CREDENTIALS", "E-mail ou senha incorretos.");
    }
    falhas.delete(email);
    const token = randomBytes(32).toString("base64url");
    const organizacao = u.memberships.find((m) => m.organization.status === "ACTIVE") ?? u.memberships[0];
    await this.prisma.session.create({ data: { userId: u.id, organizationId: organizacao?.organizationId ?? null, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + DURACAO_MS) } });
    await this.prisma.session.deleteMany({ where: { userId: u.id, expiresAt: { lt: new Date() } } });
    res.cookie(COOKIE, token, { httpOnly: true, sameSite: "strict", secure: config().NODE_ENV === "production", maxAge: DURACAO_MS, path: "/" });
    await this.auditoria.registrar(u.memberships[0]?.organizationId ?? null, u.id, "auth.login");
    return { ok: true, mustChangePassword: u.mustChangePassword, mfaRequired: u.mfaEnabled };
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
  async eu(@Req() req: Request & { sessao: { userId: string; organizationId: string | null; mfaVerified: boolean } }) {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: req.sessao.userId }, include: { memberships: { where: { status: "ACTIVE" }, include: { organization: true, permissions: true } } } });
    const atual = u.memberships.find((m) => m.organizationId === req.sessao.organizationId && m.organization.status === "ACTIVE");
    return { id: u.id, name: u.name, email: u.email, platformAdmin: u.globalRole === "NEEKO_SUPERADMIN", mfaEnabled: u.mfaEnabled, mfaPending: u.mfaEnabled && !req.sessao.mfaVerified, mfaSetupRequired: false, avatar: u.avatar, jobTitle: u.jobTitle, phone: u.phone, mustChangePassword: u.mustChangePassword,
      organization: atual ? { id: atual.organizationId, name: atual.organization.name, role: atual.role } : null,
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
