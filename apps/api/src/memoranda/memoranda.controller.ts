import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from "@nestjs/common";
import { z } from "zod";
import { AuditoriaService } from "../common/audit.service";
import { Contexto, Ctx, Exige } from "../common/auth";
import { invalido } from "../common/errors";
import { validar } from "../common/validation";
import { MemorandosService, cnpjValido, limparCnpj } from "./memoranda.service";

const numero = z.object({ seq: z.number().int().min(1).max(9999), ano: z.number().int().min(2000).max(2100) }).nullable().default(null);
const salvar = z.object({ numero, memo: z.record(z.unknown()) }).refine((v) => JSON.stringify(v.memo).length < 500000, "Memorando grande demais.");
const cnpjParam = (v: string) => { const c = limparCnpj(v); if (!cnpjValido(c)) throw invalido("Informe um CNPJ válido."); return c; };
const publico = (m: { id: string; seq: number; ano: number; status: string; clientStatus: string; exitDate: string; exitReason: string; exitNotes: string; data: unknown; history: unknown; createdByName: string; updatedByName: string; updatedAt: Date }) => m;

/** Memorando é o cadastro único da empresa. */
@Controller("memoranda")
export class MemorandosController {
  constructor(private memos: MemorandosService, private auditoria: AuditoriaService) {}

  @Exige("memoranda.read") @Get()
  listar(@Ctx() c: Contexto) { return this.memos.listar(c); }
  @Exige("memoranda.read") @Get("team")
  equipe(@Ctx() c: Contexto) { return this.memos.equipe(c); }
  @Exige("memoranda.manage") @Get("lookup/cnpj/:cnpj")
  cnpj(@Param("cnpj") v: string) { const c = cnpjParam(v); if (!/^\d+$/.test(c)) throw invalido("A consulta automática ainda não atende CNPJ alfanumérico."); return this.memos.consultarCnpj(c); }
  @Exige("memoranda.manage") @Get("lookup/ie/:cnpj")
  ie(@Ctx() c: Contexto, @Param("cnpj") v: string, @Query("uf") uf?: string) { return this.memos.consultarIe(c, cnpjParam(v), String(uf ?? "ES").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2) || "ES"); }
  @Exige("memoranda.read") @Get(":id")
  async um(@Ctx() c: Contexto, @Param("id") id: string) { return publico(await this.memos.um(c, id)); }

  @Exige("memoranda.manage") @Post()
  async criar(@Ctx() c: Contexto, @Body() corpo: unknown) {
    const d = validar(salvar, corpo), m = await this.memos.criar(c, d.memo, d.numero);
    await this.auditoria.registrar(c.organizationId, c.userId, "memoranda.created", m.id);
    return m;
  }
  @Exige("memoranda.manage") @Put(":id")
  async alterar(@Ctx() c: Contexto, @Param("id") id: string, @Body() corpo: unknown) {
    const d = validar(salvar, corpo), m = await this.memos.alterar(c, id, d.memo, d.numero);
    await this.auditoria.registrar(c.organizationId, c.userId, "memoranda.updated", m.id);
    return m;
  }
  @Exige("memoranda.manage") @Post(":id/status") @HttpCode(200)
  async status(@Ctx() c: Contexto, @Param("id") id: string, @Body() corpo: unknown) {
    const { status } = validar(z.object({ status: z.enum(["ativo", "cancelado"]) }), corpo);
    await this.memos.situacao(c, id, status);
    await this.auditoria.registrar(c.organizationId, c.userId, "memoranda.status", id, { status });
    return { ok: true };
  }
  @Exige("memoranda.manage") @Post(":id/client") @HttpCode(200)
  async cliente(@Ctx() c: Contexto, @Param("id") id: string, @Body() corpo: unknown) {
    const s = validar(z.object({ situacao: z.enum(["ativa", "inativa"]), dataSaida: z.string().optional(), motivo: z.string().max(120).optional(), obs: z.string().max(500).optional() }), corpo);
    await this.memos.cliente(c, id, s);
    await this.auditoria.registrar(c.organizationId, c.userId, "memoranda.client", id, { situacao: s.situacao });
    return { ok: true };
  }
}
