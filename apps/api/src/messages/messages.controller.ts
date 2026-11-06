import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { Contexto, Ctx, Membro } from "../common/auth";
import { naoEncontrado } from "../common/errors";
import { validar } from "../common/validation";
import { PrismaService } from "../prisma.service";

const GERAL = "geral";
const texto = z.object({ texto: z.string().trim().min(1, "Escreva a mensagem.").max(2000, "Mensagem longa demais.") });

/** Conversa direta entre duas pessoas do escritório, ou o canal Geral. Toda consulta fica presa à organização. */
@Controller("messages")
export class MensagensController {
  constructor(private prisma: PrismaService) {}
  private async pessoas(c: Contexto) {
    const m = await this.prisma.organizationMembership.findMany({ where: { organizationId: c.organizationId, status: "ACTIVE", user: { active: true } }, select: { userId: true, user: { select: { name: true, jobTitle: true } } }, orderBy: { user: { name: "asc" } } });
    return m.map((x) => ({ id: x.userId, nome: x.user.name, cargo: x.user.jobTitle }));
  }
  private async conferir(c: Contexto, conversa: string) {
    if (conversa === GERAL) return;
    if (conversa === c.userId || !(await this.pessoas(c)).some((p) => p.id === conversa)) throw naoEncontrado("Conversa não encontrada.");
  }
  private onde(c: Contexto, conversa: string) {
    const org = { organizationId: c.organizationId };
    if (conversa === GERAL) return { ...org, recipientId: null };
    return { ...org, OR: [{ senderId: c.userId, recipientId: conversa }, { senderId: conversa, recipientId: c.userId }] };
  }

  @Membro() @Get()
  async resumo(@Ctx() c: Contexto) {
    const [pessoas, lidas, ultimas] = await Promise.all([
      this.pessoas(c),
      this.prisma.messageRead.findMany({ where: { organizationId: c.organizationId, userId: c.userId } }),
      this.prisma.message.findMany({ where: { organizationId: c.organizationId, OR: [{ recipientId: null }, { recipientId: c.userId }, { senderId: c.userId }] }, orderBy: { createdAt: "desc" }, take: 1000 }),
    ]);
    const lido = new Map(lidas.map((l) => [l.conversation, l.readAt.getTime()])), nome = new Map(pessoas.map((p) => [p.id, p.nome]));
    const chave = (m: { recipientId: string | null; senderId: string }) => (m.recipientId === null ? GERAL : m.senderId === c.userId ? m.recipientId : m.senderId);
    const conversas = new Map<string, { naoLidas: number; ultima: { texto: string; em: Date } | null }>();
    const avisos: { conversa: string; de: string; texto: string; em: Date; mencao: boolean }[] = [];
    for (const m of ultimas) {
      const k = chave(m), x = conversas.get(k) ?? { naoLidas: 0, ultima: null };
      x.ultima ??= { texto: m.text, em: m.createdAt };
      if (m.senderId !== c.userId && m.createdAt.getTime() > (lido.get(k) ?? 0)) {
        x.naoLidas++;
        if (avisos.length < 8) avisos.push({ conversa: k, de: nome.get(m.senderId) ?? "Ex-integrante", texto: m.text.slice(0, 120), em: m.createdAt, mencao: m.mentions.includes(c.userId) });
      }
      conversas.set(k, x);
    }
    const dados = (k: string) => conversas.get(k) ?? { naoLidas: 0, ultima: null };
    return { total: [...conversas.values()].reduce((t, x) => t + x.naoLidas, 0), avisos, geral: dados(GERAL), pessoas: pessoas.filter((p) => p.id !== c.userId).map((p) => ({ ...p, ...dados(p.id) })) };
  }

  @Membro() @Get(":conversa")
  async ler(@Ctx() c: Contexto, @Param("conversa") conversa: string) {
    await this.conferir(c, conversa);
    const [l, pessoas] = await Promise.all([this.prisma.message.findMany({ where: this.onde(c, conversa), orderBy: { createdAt: "desc" }, take: 200 }), this.pessoas(c)]);
    const nome = new Map(pessoas.map((p) => [p.id, p.nome]));
    return { mensagens: l.reverse().map((m) => ({ id: m.id, de: nome.get(m.senderId) ?? "Ex-integrante", minha: m.senderId === c.userId, texto: m.text, em: m.createdAt, mencionou: m.mentions.includes(c.userId) })) };
  }

  /** Só vale como menção o @Nome de quem é do escritório: a lista nunca vem do navegador. */
  @Membro() @Post(":conversa")
  async enviar(@Ctx() c: Contexto, @Param("conversa") conversa: string, @Body() corpo: unknown) {
    await this.conferir(c, conversa);
    const d = validar(texto, corpo);
    const mentions = (await this.pessoas(c)).filter((p) => p.id !== c.userId && d.texto.toLowerCase().includes(`@${p.nome.toLowerCase()}`)).map((p) => p.id);
    const m = await this.prisma.message.create({ data: { organizationId: c.organizationId, senderId: c.userId, recipientId: conversa === GERAL ? null : conversa, text: d.texto, mentions } });
    return { id: m.id };
  }

  @Membro() @Post(":conversa/read") @HttpCode(200)
  async lido(@Ctx() c: Contexto, @Param("conversa") conversa: string) {
    await this.conferir(c, conversa);
    const chave = { organizationId: c.organizationId, userId: c.userId, conversation: conversa };
    await this.prisma.messageRead.upsert({ where: { organizationId_userId_conversation: chave }, create: chave, update: { readAt: new Date() } });
    return { ok: true };
  }
}
