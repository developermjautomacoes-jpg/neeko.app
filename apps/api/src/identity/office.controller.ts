import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from "@nestjs/common";
import { z } from "zod";
import { AuditoriaService } from "../common/audit.service";
import { Contexto, Ctx, Exige, Membro, Publico } from "../common/auth";
import { Erro, naoEncontrado } from "../common/errors";
import { config } from "../config";
import { validar } from "../common/validation";
import { PrismaService } from "../prisma.service";
import { MigracaoService } from "./migration.service";

/** Nomes das ações no histórico. O que não está aqui não aparece. */
const ACOES: Record<string, string> = {
  "auth.login": "Entrou no sistema", "auth.password.changed": "Trocou a senha", "auth.password.reset": "Redefiniu a senha por e-mail", "users.profile.changed": "Alterou o próprio perfil",
  "users.created": "Criou usuário", "users.access.changed": "Alterou acesso de usuário", "users.details.changed": "Alterou dados de usuário", "users.password.reset": "Redefiniu senha de usuário", "users.deleted": "Excluiu usuário",
  "memoranda.created": "Cadastrou empresa", "memoranda.updated": "Alterou cadastro de empresa", "memoranda.status": "Cancelou ou reativou cadastro", "memoranda.client": "Registrou saída ou retorno de cliente",
  "fiscal.certificate.imported": "Importou certificado", "fiscal.certificate.removed": "Removeu certificado", "fiscal.procurator.changed": "Alterou o procurador", "fiscal.schedule.changed": "Alterou a captura automática",
  "fiscal.nfse.exported": "Baixou notas de NFS-e", "fiscal.nfse.restarted": "Recomeçou a busca de NFS-e", "office.profile.changed": "Alterou o perfil do escritório", "office.theme.changed": "Trocou o tema",
};
const perfil = z.object({
  logo: z.string().max(500000, "A logo ficou grande demais.").regex(/^data:image\/png;base64,iVBOR[A-Za-z0-9+/=]+$/, "Logo inválida.").nullable(),
  contactEmail: z.string().trim().max(160).default(""), contactPhone: z.string().trim().max(30).default(""),
});

/** Só o necessário para personalizar a tela de entrada do link do escritório. */
@Controller("public")
export class EscritorioPublicoController {
  constructor(private prisma: PrismaService) {}
  @Publico() @Get("offices/:slug")
  async ler(@Param("slug") slug: string) {
    const o = await this.prisma.organization.findFirst({ where: { slug, status: "ACTIVE", internal: false }, select: { name: true, logo: true, theme: true } });
    if (!o) throw naoEncontrado("Escritório não encontrado.");
    return o;
  }
}

/** O próprio escritório cuida da logo e dos contatos usados nos relatórios. */
@Controller("office")
export class EscritorioController {
  constructor(private prisma: PrismaService, private auditoria: AuditoriaService, private migracao: MigracaoService) {}
  @Exige("office.manage") @Put()
  async salvar(@Ctx() c: Contexto, @Body() corpo: unknown) {
    await this.prisma.organization.update({ where: { id: c.organizationId }, data: validar(perfil, corpo) });
    await this.auditoria.registrar(c.organizationId, c.userId, "office.profile.changed");
    return { ok: true };
  }
  @Exige("office.manage") @Put("theme")
  async tema(@Ctx() c: Contexto, @Body() corpo: unknown) {
    const { tema } = validar(z.object({ tema: z.enum(["verde", "azul", "roxo", "dourado", "marinho"], { message: "Tema inválido." }) }), corpo);
    await this.prisma.organization.update({ where: { id: c.organizationId }, data: { theme: tema } });
    await this.auditoria.registrar(c.organizationId, c.userId, "office.theme.changed", tema);
    return { ok: true };
  }
  /** Histórico de todos do escritório: só proprietária e administração. */
  @Membro() @Get("activity")
  async atividades(@Ctx() c: Contexto, @Query() q: Record<string, string>) {
    if (c.role !== "ORG_OWNER" && c.role !== "ORG_ADMIN") throw new Erro(403, "FORBIDDEN", "Você não tem permissão para esta ação.");
    const f = validar(z.object({ pessoa: z.string().uuid().optional(), de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }), q);
    const membros = await this.prisma.organizationMembership.findMany({ where: { organizationId: c.organizationId }, select: { userId: true, user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } });
    const nome = new Map(membros.map((m) => [m.userId, m.user.name]));
    const l = await this.prisma.auditEvent.findMany({ where: { organizationId: c.organizationId, action: { in: Object.keys(ACOES) }, ...(f.pessoa ? { userId: f.pessoa } : {}), ...(f.de || f.ate ? { createdAt: { ...(f.de ? { gte: new Date(`${f.de}T00:00:00-03:00`) } : {}), ...(f.ate ? { lte: new Date(`${f.ate}T23:59:59-03:00`) } : {}) } } : {}) }, orderBy: { createdAt: "desc" }, take: 500 });
    return { pessoas: membros.map((m) => ({ id: m.userId, nome: m.user.name })), atividades: l.map((e) => ({ id: e.id, em: e.createdAt, pessoa: (e.userId && nome.get(e.userId)) || "Ex-integrante", acao: ACOES[e.action] })) };
  }
  /** Importa para o próprio escritório logado: o pacote nunca escolhe o destino. */
  @Exige("office.manage") @Post("import") @HttpCode(200)
  importar(@Ctx() c: Contexto, @Body() corpo: unknown) {
    if (config().OFFICE_IMPORT_ENABLED !== "true") throw new Erro(403, "MODULE_DISABLED", "A importação está desativada.");
    const d = validar(z.object({ pacote: z.string().min(10).max(58000000), frase: z.string().min(12, "A frase tem pelo menos 12 caracteres.").max(200) }), corpo);
    return this.migracao.importar(c, d.pacote, d.frase);
  }
}
