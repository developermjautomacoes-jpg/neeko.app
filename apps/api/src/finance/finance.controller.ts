import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { Contexto, Ctx, Exige } from "../common/auth";
import { EscopoService } from "../common/scope.service";
import { validar } from "../common/validation";
import { FinanceiroService } from "./finance.service";

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");
const valor = z.string().regex(/^\d{1,13}(\.\d{1,2})?$/, "Valor inválido.").refine((v) => +v > 0, "Informe um valor maior que zero.");
const uuid = z.string().uuid().nullable().default(null);
const base = z.object({ kind: z.enum(["pagar", "receber"]), description: z.string().trim().min(2, "Informe a descrição.").max(200), partyName: z.string().trim().max(160).default(""), partyDoc: z.string().trim().max(20).default(""), docNumber: z.string().trim().max(40).default(""), categoryId: uuid, costCenterId: uuid, accountId: uuid, issueDate: data, dueDate: data, amount: valor, notes: z.string().max(1000).default("") });
const novo = base.extend({ parcelas: z.number().int().min(1).max(120).default(1), frequencia: z.enum(["mensal", "semanal", "quinzenal", "anual"]).default("mensal") });

/** Toda rota passa pela empresa da carteira de quem está logado. */
@Controller("finance/:empresa")
export class FinanceiroController {
  constructor(private fin: FinanceiroService, private escopo: EscopoService) {}
  private async e(c: Contexto, id: string) { return (await this.escopo.empresa(c, id)).id; }

  @Exige("finance.read") @Get("setup")
  async cadastros(@Ctx() c: Contexto, @Param("empresa") e: string) { return this.fin.cadastros(c, await this.e(c, e)); }
  @Exige("finance.manage") @Post("accounts")
  async conta(@Ctx() c: Contexto, @Param("empresa") e: string, @Body() b: unknown) { return this.fin.criarConta(c, await this.e(c, e), validar(z.object({ name: z.string().trim().min(2, "Informe o nome.").max(80), bank: z.string().trim().max(80).default(""), openingBalance: z.string().regex(/^-?\d{1,13}(\.\d{1,2})?$/, "Saldo inválido.").default("0") }), b)); }
  @Exige("finance.manage") @Post("categories")
  async categoria(@Ctx() c: Contexto, @Param("empresa") e: string, @Body() b: unknown) { return this.fin.criarCategoria(c, await this.e(c, e), validar(z.object({ name: z.string().trim().min(2, "Informe o nome.").max(80), kind: z.enum(["receita", "despesa"]) }), b)); }
  @Exige("finance.manage") @Post("cost-centers")
  async centro(@Ctx() c: Contexto, @Param("empresa") e: string, @Body() b: unknown) { return this.fin.criarCentro(c, await this.e(c, e), validar(z.object({ name: z.string().trim().min(2, "Informe o nome.").max(80) }), b).name); }
  @Exige("finance.approve") @Put("approval-limit")
  async limite(@Ctx() c: Contexto, @Param("empresa") e: string, @Body() b: unknown) { await this.e(c, e); return this.fin.definirLimite(c, validar(z.object({ limite: z.string().regex(/^\d{1,13}(\.\d{1,2})?$/, "Valor inválido.").nullable() }), b).limite); }

  @Exige("finance.read") @Get("entries")
  async listar(@Ctx() c: Contexto, @Param("empresa") e: string, @Query() q: Record<string, string>) { return this.fin.listar(c, await this.e(c, e), validar(z.object({ kind: z.enum(["pagar", "receber"]).optional(), status: z.enum(["aberto", "aguardando", "pago", "cancelado", "rejeitado", "vencido"]).optional(), de: data.optional(), ate: data.optional() }), q)); }
  @Exige("finance.manage") @Post("entries")
  async criar(@Ctx() c: Contexto, @Param("empresa") e: string, @Body() b: unknown) { return this.fin.criar(c, await this.e(c, e), validar(novo, b)); }
  @Exige("finance.manage") @Put("entries/:id")
  async alterar(@Ctx() c: Contexto, @Param("empresa") e: string, @Param("id") id: string, @Body() b: unknown) { return this.fin.alterar(c, await this.e(c, e), id, validar(base, b)); }
  @Exige("finance.settle") @Post("entries/:id/settle") @HttpCode(200)
  async baixar(@Ctx() c: Contexto, @Param("empresa") e: string, @Param("id") id: string, @Body() b: unknown) { return this.fin.baixar(c, await this.e(c, e), id, validar(z.object({ paidDate: data, paidAmount: valor, accountId: z.string().uuid("Escolha a conta.") }), b)); }
  @Exige("finance.settle") @Post("entries/:id/reverse") @HttpCode(200)
  async estornar(@Ctx() c: Contexto, @Param("empresa") e: string, @Param("id") id: string) { return this.fin.estornar(c, await this.e(c, e), id); }
  @Exige("finance.manage") @Post("entries/:id/cancel") @HttpCode(200)
  async cancelar(@Ctx() c: Contexto, @Param("empresa") e: string, @Param("id") id: string) { return this.fin.cancelar(c, await this.e(c, e), id); }
  @Exige("finance.approve") @Post("entries/:id/decide") @HttpCode(200)
  async decidir(@Ctx() c: Contexto, @Param("empresa") e: string, @Param("id") id: string, @Body() b: unknown) { return this.fin.decidir(c, await this.e(c, e), id, validar(z.object({ aprovar: z.boolean() }), b).aprovar); }
  @Exige("finance.manage") @Post("entries/:id/attachments")
  async anexar(@Ctx() c: Contexto, @Param("empresa") e: string, @Param("id") id: string, @Body() b: unknown) { return this.fin.anexar(c, await this.e(c, e), id, validar(z.object({ name: z.string().trim().min(1).max(160), mime: z.enum(["application/pdf", "image/png", "image/jpeg"], { message: "Envie PDF, PNG ou JPG." }), base64: z.string().min(1).max(7200000) }), b)); }
  @Exige("finance.read") @Get("entries/:id/attachments/:anexo")
  async anexo(@Ctx() c: Contexto, @Param("empresa") e: string, @Param("id") id: string, @Param("anexo") a: string, @Res() res: Response) {
    const x = await this.fin.anexo(c, await this.e(c, e), id, a);
    res.setHeader("Content-Type", x.mime); res.setHeader("X-Content-Type-Options", "nosniff"); res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(x.name)}`); res.send(Buffer.from(x.content));
  }
  @Exige("finance.read") @Get("cashflow")
  async fluxo(@Ctx() c: Contexto, @Param("empresa") e: string, @Query() q: Record<string, string>) { const d = validar(z.object({ de: data, ate: data }), q); return this.fin.fluxo(c, await this.e(c, e), d.de, d.ate); }
  @Exige("finance.manage") @Post("accounts/:conta/ofx")
  async ofx(@Ctx() c: Contexto, @Param("empresa") e: string, @Param("conta") conta: string, @Body() b: unknown) { return this.fin.importarOfx(c, await this.e(c, e), conta, validar(z.object({ texto: z.string().min(10).max(5000000) }), b).texto); }
  @Exige("finance.read") @Get("accounts/:conta/statement")
  async extrato(@Ctx() c: Contexto, @Param("empresa") e: string, @Param("conta") conta: string) { return this.fin.extrato(c, await this.e(c, e), conta); }
  @Exige("finance.settle") @Post("accounts/:conta/statement/:id/match") @HttpCode(200)
  async conciliar(@Ctx() c: Contexto, @Param("empresa") e: string, @Param("conta") conta: string, @Param("id") id: string, @Body() b: unknown) { return this.fin.conciliar(c, await this.e(c, e), conta, id, validar(z.object({ entryId: z.string().uuid() }), b).entryId); }
  @Exige("finance.settle") @Post("accounts/:conta/statement/:id/undo") @HttpCode(200)
  async desfazer(@Ctx() c: Contexto, @Param("empresa") e: string, @Param("conta") conta: string, @Param("id") id: string) { return this.fin.desfazer(c, await this.e(c, e), conta, id); }
  @Exige("finance.settle") @Post("accounts/:conta/statement/:id/ignore") @HttpCode(200)
  async ignorar(@Ctx() c: Contexto, @Param("empresa") e: string, @Param("conta") conta: string, @Param("id") id: string) { return this.fin.ignorar(c, await this.e(c, e), conta, id); }
}
