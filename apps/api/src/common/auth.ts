import { CanActivate, ExecutionContext, Injectable, SetMetadata, createParamDecorator } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createHash } from "node:crypto";
import type { Request } from "express";
import { PrismaService } from "../prisma.service";
import { Erro } from "./errors";

export const PERMISSOES = ["companies.read", "companies.manage", "fiscal.documents.read", "fiscal.capture", "fiscal.credentials.manage", "fiscal.ciencia.send", "fiscal.schedule.manage", "users.manage", "audit.read", "memoranda.read", "memoranda.manage", "office.manage", "companies.restricted"] as const;
export type Permissao = (typeof PERMISSOES)[number];

export interface Contexto {
  userId: string; sessionId: string; organizationId: string; membershipId: string; role: string; allCompanies: boolean; permissions: Set<string>;
  /** Raízes de CNPJ que esta pessoa não pode ver nem cadastrar. */
  restritas: string[];
}
const PUBLICO = "publico", EXIGE = "exige", SO_LOGADO = "soLogado", SEM_MFA = "semMfa", PLATAFORMA = "plataforma";
/** Rota sem contexto de organização. */
export const Publico = () => SetMetadata(PUBLICO, true);
/** Rota de quem está autenticado, mesmo com senha provisória. */
export const SoLogado = () => SetMetadata(SO_LOGADO, true);
/** Rota de quem ainda vai concluir a verificação em duas etapas. */
export const SemMfa = () => SetMetadata(SEM_MFA, true);
/** Só a administração da Neeko. Não dá acesso a conteúdo de escritórios. */
export const Plataforma = () => SetMetadata(PLATAFORMA, true);
export const Exige = (...p: Permissao[]) => SetMetadata(EXIGE, p);
export const Ctx = createParamDecorator((_: unknown, c: ExecutionContext) => c.switchToHttp().getRequest().contexto as Contexto);

/** Sem atividade por este tempo, a pessoa deixa de ocupar um acesso simultâneo. */
const JANELA_MS = 15 * 60 * 1000;
export const inicioJanela = () => new Date(Date.now() - JANELA_MS);
/** Conta pessoas distintas ativas no escritório; a própria pessoa nunca ocupa uma vaga a mais. */
export async function conferirSimultaneos(prisma: PrismaService, organizationId: string, userId: string) {
  const o = await prisma.organization.findUnique({ where: { id: organizationId }, select: { internal: true, plan: { select: { maxUsers: true } } } });
  const max = o?.internal ? null : o?.plan?.maxUsers ?? null;
  if (max === null) return;
  const ativos = await prisma.session.findMany({ where: { organizationId, userId: { not: userId }, expiresAt: { gt: new Date() }, lastSeenAt: { gte: inicioJanela() } }, distinct: ["userId"], select: { userId: true } });
  if (ativos.length >= max) throw new Erro(403, "LIMIT_SIMULTANEOUS", `Os ${max} acessos simultâneos do plano estão em uso. Aguarde alguém sair ou tente em alguns minutos.`);
}

/** A raiz do próprio escritório é sempre restrita. */
export function raizesRestritas(o: { cnpj: string; restrictedRoots: string[] }) {
  const propria = o.cnpj.replace(/[^0-9A-Za-z]/g, "").toUpperCase().slice(0, 8);
  return [...new Set([...(propria.length === 8 ? [propria] : []), ...o.restrictedRoots])];
}

export const COOKIE = "neeko_session";
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
export function lerCookie(req: Request, nome: string): string | null {
  for (const p of (req.headers.cookie ?? "").split(";")) {
    const [k, ...v] = p.trim().split("=");
    if (k === nome) return decodeURIComponent(v.join("="));
  }
  return null;
}

/** Nega por padrão: rota sem @Publico, @SoLogado ou @Exige responde 403. */
@Injectable()
export class GuardaAcesso implements CanActivate {
  constructor(private prisma: PrismaService, private reflector: Reflector) {}
  async canActivate(c: ExecutionContext): Promise<boolean> {
    const alvo = [c.getHandler(), c.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLICO, alvo)) return true;
    const req = c.switchToHttp().getRequest();
    const token = lerCookie(req, COOKIE);
    const nao = new Erro(401, "UNAUTHENTICATED", "Entre novamente.");
    if (!token) throw nao;
    const s = await this.prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
    if (!s || s.expiresAt < new Date() || !s.user.active) throw nao;
    req.sessao = s;
    if (this.reflector.getAllAndOverride<boolean>(SEM_MFA, alvo)) return true;
    if (s.user.mfaEnabled && !s.mfaVerified) throw new Erro(403, "MFA_REQUIRED", "Informe o código de verificação.");
    if (this.reflector.getAllAndOverride<boolean>(SO_LOGADO, alvo)) return true;
    if (s.user.mustChangePassword) throw new Erro(403, "PASSWORD_CHANGE_REQUIRED", "Troque a senha provisória para continuar.");
    const parado = Date.now() - s.lastSeenAt.getTime();
    if (s.organizationId && parado >= JANELA_MS) await conferirSimultaneos(this.prisma, s.organizationId, s.userId);
    if (parado >= 60000) await this.prisma.session.update({ where: { id: s.id }, data: { lastSeenAt: new Date() } });
    if (this.reflector.getAllAndOverride<boolean>(PLATAFORMA, alvo)) {
      if (s.user.globalRole !== "NEEKO_SUPERADMIN" || s.portal !== "neeko") throw new Erro(403, "FORBIDDEN", "Você não tem permissão para esta ação.");
      return true;
    }
    const exige = this.reflector.getAllAndOverride<Permissao[]>(EXIGE, alvo);
    if (!exige?.length || !s.organizationId) throw new Erro(403, "FORBIDDEN", "Você não tem permissão para esta ação.");
    const m = await this.prisma.organizationMembership.findFirst({ where: { userId: s.userId, organizationId: s.organizationId, status: "ACTIVE" }, include: { permissions: true, organization: { select: { status: true, internal: true, cnpj: true, restrictedRoots: true } } } });
    if (!m) throw new Erro(403, "FORBIDDEN", "Você não tem acesso a esta organização.");
    if (m.organization.status !== "ACTIVE") throw new Erro(403, "OFFICE_SUSPENDED", "O acesso deste escritório está suspenso. Fale com a Neeko.");
    if (!m.organization.internal && req.path.includes("/fiscal/dfe/")) throw new Erro(403, "MODULE_DISABLED", "Este módulo ainda não está liberado para o escritório.");
    const permissions = new Set(m.permissions.map((p) => p.permission));
    if (!exige.every((p) => permissions.has(p))) throw new Erro(403, "FORBIDDEN", "Você não tem permissão para esta ação.");
    req.contexto = { userId: s.userId, sessionId: s.id, organizationId: s.organizationId, membershipId: m.id, role: m.role, allCompanies: m.allCompanies, permissions, restritas: m.role === "ORG_OWNER" || permissions.has("companies.restricted") ? [] : raizesRestritas(m.organization) } satisfies Contexto;
    return true;
  }
}
