import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { z } from "zod";
import { Contexto, Ctx, Membro } from "../common/auth";
import { Erro, invalido, naoEncontrado } from "../common/errors";
import { validar } from "../common/validation";
import { PrismaService } from "../prisma.service";

const GERAL = "geral";
const G = "g-";
const uuids = z.array(z.string().uuid()).max(200);
const grupo = z.object({ nome: z.string().trim().min(2, "Dê um nome ao grupo.").max(80), privado: z.boolean(), pessoas: uuids.default([]) });
const texto = z.object({ texto: z.string().trim().min(1, "Escreva a mensagem.").max(2000, "Mensagem longa demais.") });

/** Conversa direta entre duas pessoas, grupo (privado ou aberto) ou o canal Geral. Toda consulta fica presa à organização. */
@Controller("messages")
export class MensagensController {
  constructor(private prisma: PrismaService) {}
  private async pessoas(c: Contexto) {
    const m = await this.prisma.organizationMembership.findMany({ where: { organizationId: c.organizationId, status: "ACTIVE", user: { active: true } }, select: { userId: true, user: { select: { name: true, jobTitle: true } } }, orderBy: { user: { name: "asc" } } });
    const veCargo = c.role === "ORG_OWNER" || c.role === "ORG_ADMIN"; // cargo é só para sócia e administração
    return m.map((x) => ({ id: x.userId, nome: x.user.name, cargo: veCargo ? x.user.jobTitle : "" }));
  }
  /** Privado só existe para quem participa: para os demais, responde como inexistente. */
  private async grupo(c: Contexto, id: string) {
    const nao = naoEncontrado("Conversa não encontrada.");
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw nao;
    const g = await this.prisma.chat.findFirst({ where: { id, organizationId: c.organizationId }, include: { members: true } });
    if (!g) throw nao;
    const participa = g.members.some((m) => m.userId === c.userId);
    if (g.private && !participa) throw nao;
    return { ...g, participa };
  }
  private async conferir(c: Contexto, conversa: string) {
    if (conversa === GERAL) return null;
    if (conversa.startsWith(G)) return this.grupo(c, conversa.slice(G.length));
    if (conversa === c.userId || !(await this.pessoas(c)).some((p) => p.id === conversa)) throw naoEncontrado("Conversa não encontrada.");
    return null;
  }
  private onde(c: Contexto, conversa: string) {
    const org = { organizationId: c.organizationId };
    if (conversa === GERAL) return { ...org, recipientId: null, chatId: null };
    if (conversa.startsWith(G)) return { ...org, chatId: conversa.slice(G.length) };
    return { ...org, OR: [{ senderId: c.userId, recipientId: conversa }, { senderId: conversa, recipientId: c.userId }] };
  }
  /** Só entra quem é do escritório. */
  private async conferirPessoas(c: Contexto, ids: string[]) {
    const todas = new Set((await this.pessoas(c)).map((p) => p.id));
    if (ids.some((i) => !todas.has(i))) throw invalido("Há pessoa fora deste escritório.");
  }
  private async gravar(c: Contexto, conversa: string, text: string, forwardedFrom = "") {
    const g = await this.conferir(c, conversa);
    if (g && !g.participa) await this.prisma.chatMember.create({ data: { chatId: g.id, userId: c.userId } }); // grupo aberto: quem escreve entra
    const validos = g?.private ? new Set(g.members.map((m) => m.userId)) : null;
    const mentions = forwardedFrom ? [] : (await this.pessoas(c)).filter((p) => p.id !== c.userId && (!validos || validos.has(p.id)) && text.toLowerCase().includes(`@${p.nome.toLowerCase()}`)).map((p) => p.id);
    return this.prisma.message.create({ data: { organizationId: c.organizationId, senderId: c.userId, recipientId: conversa === GERAL || g ? null : conversa, chatId: g?.id ?? null, text, mentions, forwardedFrom } });
  }

  @Membro() @Post("groups")
  async criarGrupo(@Ctx() c: Contexto, @Body() corpo: unknown) {
    const d = validar(grupo, corpo), ids = [...new Set([...d.pessoas, c.userId])];
    await this.conferirPessoas(c, ids);
    const g = await this.prisma.chat.create({ data: { organizationId: c.organizationId, name: d.nome, private: d.privado, createdById: c.userId, members: { create: ids.map((userId) => ({ userId })) } } });
    return { id: `${G}${g.id}` };
  }
  @Membro() @Patch("groups/:id")
  async alterarGrupo(@Ctx() c: Contexto, @Param("id") id: string, @Body() corpo: unknown) {
    const g = await this.grupo(c, id), d = validar(z.object({ privado: z.boolean() }), corpo);
    if (!g.participa) throw invalido("Entre no grupo para alterar.");
    await this.prisma.chat.update({ where: { id }, data: { private: d.privado } });
    return { ok: true };
  }
  @Membro() @Post("groups/:id/members") @HttpCode(200)
  async incluir(@Ctx() c: Contexto, @Param("id") id: string, @Body() corpo: unknown) {
    const g = await this.grupo(c, id), { pessoas } = validar(z.object({ pessoas: uuids.min(1, "Escolha ao menos uma pessoa.") }), corpo);
    if (!g.participa) throw invalido("Entre no grupo para incluir pessoas.");
    await this.conferirPessoas(c, pessoas);
    await this.prisma.chatMember.createMany({ data: pessoas.map((userId) => ({ chatId: id, userId })), skipDuplicates: true });
    return { ok: true };
  }
  @Membro() @Post("groups/:id/leave") @HttpCode(200)
  async sair(@Ctx() c: Contexto, @Param("id") id: string) {
    await this.grupo(c, id);
    await this.prisma.chatMember.deleteMany({ where: { chatId: id, userId: c.userId } });
    return { ok: true };
  }

  @Membro() @Get()
  async resumo(@Ctx() c: Contexto) {
    const org = c.organizationId, [pessoas, lidas, grupos] = await Promise.all([
      this.pessoas(c),
      this.prisma.messageRead.findMany({ where: { organizationId: org, userId: c.userId } }),
      this.prisma.chat.findMany({ where: { organizationId: org, OR: [{ private: false }, { members: { some: { userId: c.userId } } }] }, include: { members: true }, orderBy: { name: "asc" } }),
    ]);
    const ultimas = await this.prisma.message.findMany({ where: { organizationId: org, OR: [{ recipientId: null, chatId: null }, { recipientId: c.userId }, { senderId: c.userId, recipientId: { not: null } }, { chatId: { in: grupos.map((g) => g.id) } }] }, orderBy: { createdAt: "desc" }, take: 1000 });
    const lido = new Map(lidas.map((l) => [l.conversation, l.readAt.getTime()])), nome = new Map(pessoas.map((p) => [p.id, p.nome]));
    const fora = new Set(grupos.filter((g) => !g.members.some((m) => m.userId === c.userId)).map((g) => g.id));
    const chave = (m: { recipientId: string | null; senderId: string; chatId: string | null }) => (m.chatId ? `${G}${m.chatId}` : m.recipientId === null ? GERAL : m.senderId === c.userId ? m.recipientId : m.senderId);
    const conversas = new Map<string, { naoLidas: number; ultima: { texto: string; em: Date } | null }>();
    const avisos: { conversa: string; de: string; texto: string; em: Date; mencao: boolean }[] = [];
    for (const m of ultimas) {
      const k = chave(m), x = conversas.get(k) ?? { naoLidas: 0, ultima: null };
      x.ultima ??= { texto: m.deletedAt ? "Mensagem apagada" : m.text, em: m.createdAt };
      if (!m.deletedAt && m.senderId !== c.userId && m.createdAt.getTime() > (lido.get(k) ?? 0) && !(m.chatId && fora.has(m.chatId))) {
        x.naoLidas++;
        if (avisos.length < 8) avisos.push({ conversa: k, de: nome.get(m.senderId) ?? "Ex-integrante", texto: m.text.slice(0, 120), em: m.createdAt, mencao: m.mentions.includes(c.userId) });
      }
      conversas.set(k, x);
    }
    const dados = (k: string) => conversas.get(k) ?? { naoLidas: 0, ultima: null };
    return { total: [...conversas.values()].reduce((t, x) => t + x.naoLidas, 0), avisos, geral: dados(GERAL), pessoas: pessoas.filter((p) => p.id !== c.userId).map((p) => ({ ...p, ...dados(p.id) })),
      grupos: grupos.map((g) => ({ id: `${G}${g.id}`, nome: g.name, privado: g.private, participa: !fora.has(g.id), participantes: g.members.map((m) => nome.get(m.userId)).filter(Boolean), pessoasIds: g.members.map((m) => m.userId), ...dados(`${G}${g.id}`) })) };
  }

  @Membro() @Get(":conversa")
  async ler(@Ctx() c: Contexto, @Param("conversa") conversa: string) {
    await this.conferir(c, conversa);
    const [l, pessoas] = await Promise.all([this.prisma.message.findMany({ where: this.onde(c, conversa), orderBy: { createdAt: "desc" }, take: 200 }), this.pessoas(c)]);
    const nome = new Map(pessoas.map((p) => [p.id, p.nome]));
    return { mensagens: l.reverse().map((m) => ({ id: m.id, de: nome.get(m.senderId) ?? "Ex-integrante", minha: m.senderId === c.userId, texto: m.deletedAt ? "" : m.text, em: m.createdAt, mencionou: !m.deletedAt && m.mentions.includes(c.userId), encaminhadaDe: m.forwardedFrom, editada: !!m.editedAt, apagada: !!m.deletedAt })) };
  }

  /** Só vale como menção o @Nome de quem pode ver a conversa: a lista nunca vem do navegador. */
  @Membro() @Post(":conversa")
  async enviar(@Ctx() c: Contexto, @Param("conversa") conversa: string, @Body() corpo: unknown) {
    await this.conferir(c, conversa);
    const m = await this.gravar(c, conversa, validar(texto, corpo).texto);
    return { id: m.id };
  }

  /** Só encaminha o que a própria pessoa consegue ler. */
  @Membro() @Post(":conversa/:id/forward")
  async encaminhar(@Ctx() c: Contexto, @Param("conversa") conversa: string, @Param("id") id: string, @Body() corpo: unknown) {
    await this.conferir(c, conversa);
    const { destino } = validar(z.object({ destino: z.string().min(1).max(60) }), corpo);
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw naoEncontrado("Mensagem não encontrada.");
    const m = await this.prisma.message.findFirst({ where: { ...this.onde(c, conversa), id, deletedAt: null } });
    if (!m) throw naoEncontrado("Mensagem não encontrada.");
    const de = await this.prisma.user.findUnique({ where: { id: m.senderId }, select: { name: true } });
    return { id: (await this.gravar(c, destino, m.text, m.forwardedFrom || de?.name || "Ex-integrante")).id };
  }

  /** Só quem escreveu edita ou apaga; o texto apagado some para todos. */
  private async propria(c: Contexto, conversa: string, id: string) {
    await this.conferir(c, conversa);
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw naoEncontrado("Mensagem não encontrada.");
    const m = await this.prisma.message.findFirst({ where: { ...this.onde(c, conversa), id, deletedAt: null } });
    if (!m) throw naoEncontrado("Mensagem não encontrada.");
    if (m.senderId !== c.userId) throw new Erro(403, "FORBIDDEN", "Só quem escreveu pode alterar a mensagem.");
    if (m.forwardedFrom) throw invalido("Mensagem encaminhada não pode ser editada.");
    return m;
  }
  @Membro() @Patch(":conversa/:id")
  async editar(@Ctx() c: Contexto, @Param("conversa") conversa: string, @Param("id") id: string, @Body() corpo: unknown) {
    const m = await this.propria(c, conversa, id), text = validar(texto, corpo).texto;
    const g = conversa.startsWith(G) ? await this.grupo(c, conversa.slice(G.length)) : null, validos = g?.private ? new Set(g.members.map((x) => x.userId)) : null;
    const mentions = (await this.pessoas(c)).filter((p) => p.id !== c.userId && (!validos || validos.has(p.id)) && text.toLowerCase().includes(`@${p.nome.toLowerCase()}`)).map((p) => p.id);
    await this.prisma.message.update({ where: { id: m.id }, data: { text, mentions, editedAt: new Date() } });
    return { ok: true };
  }
  @Membro() @Delete(":conversa/:id")
  async apagar(@Ctx() c: Contexto, @Param("conversa") conversa: string, @Param("id") id: string) {
    const m = await this.propria(c, conversa, id).catch((x) => { if (x instanceof Erro && x.message.includes("encaminhada")) return null; throw x; });
    const alvo = m ?? (await this.prisma.message.findFirst({ where: { ...this.onde(c, conversa), id, senderId: c.userId, deletedAt: null } }));
    if (!alvo) throw naoEncontrado("Mensagem não encontrada.");
    await this.prisma.message.update({ where: { id: alvo.id }, data: { text: "", mentions: [], deletedAt: new Date() } });
    return { ok: true };
  }

  @Membro() @Post(":conversa/read") @HttpCode(200)
  async lido(@Ctx() c: Contexto, @Param("conversa") conversa: string) {
    await this.conferir(c, conversa);
    const chave = { organizationId: c.organizationId, userId: c.userId, conversation: conversa };
    await this.prisma.messageRead.upsert({ where: { organizationId_userId_conversation: chave }, create: chave, update: { readAt: new Date() } });
    return { ok: true };
  }
}
