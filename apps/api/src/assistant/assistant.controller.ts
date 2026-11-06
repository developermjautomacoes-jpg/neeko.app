import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { z } from "zod";
import { Membro } from "../common/auth";
import { validar } from "../common/validation";
import { AssistenteService } from "./assistant.service";

@Controller("assistant")
export class AssistenteController {
  constructor(private assistente: AssistenteService) {}
  @Membro() @Get("topics")
  assuntos() { return { assuntos: this.assistente.assuntos }; }
  @Membro() @Post("ask") @HttpCode(200)
  perguntar(@Body() corpo: unknown) {
    const d = validar(z.object({ pergunta: z.string().trim().min(2, "Escreva a dúvida.").max(300), assunto: z.string().max(60).optional() }), corpo);
    return { resultados: this.assistente.buscar(d.pergunta, d.assunto) };
  }
}
