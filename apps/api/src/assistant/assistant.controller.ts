import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { z } from "zod";
import { Contexto, Ctx, Membro } from "../common/auth";
import { PrismaService } from "../prisma.service";
import { validar } from "../common/validation";
import { AssistenteService } from "./assistant.service";

@Controller("assistant")
export class AssistenteController {
  constructor(private assistente: AssistenteService, private prisma: PrismaService) {}
  @Membro() @Get("topics")
  assuntos() { return { assuntos: this.assistente.assuntos }; }
  @Membro() @Post("ask") @HttpCode(200)
  perguntar(@Body() corpo: unknown) {
    const d = validar(z.object({ pergunta: z.string().trim().min(2, "Escreva a dúvida.").max(300), assunto: z.string().max(60).optional() }), corpo);
    return { resultados: this.assistente.buscar(d.pergunta, d.assunto) };
  }
  /** Pedido de assunto novo: chega à Neeko no Gerencial. */
  @Membro() @Post("requests")
  async solicitar(@Ctx() c: Contexto, @Body() corpo: unknown) {
    const { texto } = validar(z.object({ texto: z.string().trim().min(3, "Descreva o assunto.").max(300) }), corpo);
    await this.prisma.topicRequest.create({ data: { organizationId: c.organizationId, userId: c.userId, text: texto } });
    return { ok: true };
  }
}
