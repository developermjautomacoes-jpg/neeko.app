import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Query, Res } from "@nestjs/common";
import type { Company } from "@prisma/client";
import type { Response } from "express";
import { z } from "zod";
import { CertificadosService } from "../certificates/certificates.service";
import { AuditoriaService } from "../common/audit.service";
import { Contexto, Ctx, Exige } from "../common/auth";
import { naoEncontrado } from "../common/errors";
import { EscopoService } from "../common/scope.service";
import { validar } from "../common/validation";
import { PrismaService } from "../prisma.service";
import { DfeService, Servico } from "./dfe.service";
import { NfseService } from "./nfse.service";

const ambiente = z.enum(["producao", "restrita"], { message: "Ambiente inválido." });
const amb = (v: unknown) => validar(ambiente.default("producao"), v);
const servico = (v: unknown): Servico => validar(z.enum(["nfe", "cte"], { message: "Tipo de documento inválido." }), v);
const competencia = z.string().regex(/^\d{4}-\d{2}$/, "Competência inválida.");
const chaveNfse = z.string().regex(/^\d{50}$/, "Chave inválida.");
const chaveDfe = z.string().regex(/^[0-9A-Z]{44}$/, "Chave inválida.");
const certPublico = (c: { id: string; nickname: string; holder: string; document: string; validUntil: string } | null) => (c ? { id: c.id, nome: c.nickname || c.holder, documento: c.document, validade: c.validUntil } : null);
const lista = <T>(v: T[]) => v;
function enviarZip(res: Response, nome: string, b: Buffer) {
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${nome}"`);
  res.send(b);
}

@Controller()
export class FiscalController {
  constructor(private prisma: PrismaService, private escopo: EscopoService, private certs: CertificadosService, private nfse: NfseService, private dfe: DfeService, private auditoria: AuditoriaService) {}

  private async empresas(c: Contexto): Promise<Company[]> { return this.prisma.company.findMany({ where: this.escopo.filtro(c), orderBy: { legalName: "asc" } }); }

  // ---------- empresas ----------
  @Exige("companies.read") @Get("fiscal/companies")
  async listarNfse(@Ctx() c: Contexto, @Query("ambiente") a: unknown) {
    const environment = amb(a), lista_ = await this.empresas(c), ids = lista_.map((e) => e.id), org = c.organizationId;
    const onde = { organizationId: org, environment, companyId: { in: ids } };
    const memos = await this.prisma.memorandum.findMany({ where: { organizationId: org, companyId: { in: ids }, status: "ativo" }, select: { id: true, companyId: true, data: true } });
    const [certs, procurador, estados, notas, falhas] = await Promise.all([this.certs.listar(org), this.certs.procurador(org), this.prisma.nfseState.findMany({ where: onde }),
      this.prisma.nfseDocument.groupBy({ by: ["companyId"], where: onde, _count: true }), this.prisma.nfseFailure.groupBy({ by: ["companyId"], where: onde, _count: true })]);
    return { empresas: lista_.map((e) => {
      const st = estados.find((s) => s.companyId === e.id), m = memos.find((x) => x.companyId === e.id), dm = (m?.data ?? {}) as Record<string, unknown>;
      return { id: e.id, cadastroId: m?.id ?? "", regime: String(dm.t_regime ?? ""), fantasia: String(dm.e_fantasia ?? ""), cnpj: e.cnpj, razao: e.legalName, certId: e.certificateId ?? "", modo: e.nfseMode, certificado: certPublico(e.nfseMode === "procuracao" ? procurador : this.certs.escolher(certs, e.cnpj, e.certificateId)),
        ultimoNsu: Number(st?.lastNsu ?? 0), ultimaCaptura: st?.lastCaptureAt ?? null, ultimoErro: st?.lastError ?? null, notas: notas.find((n) => n.companyId === e.id)?._count ?? 0, falhas: falhas.find((n) => n.companyId === e.id)?._count ?? 0 };
    }) };
  }
  @Exige("companies.manage") @Patch("companies/:id/nfse-mode")
  async modo(@Ctx() c: Contexto, @Param("id") id: string, @Body() corpo: unknown) {
    const { modo } = validar(z.object({ modo: z.enum(["certificado", "procuracao"], { message: "Forma de busca inválida." }) }), corpo);
    const e = await this.escopo.empresa(c, id);
    await this.prisma.company.update({ where: { id: e.id }, data: { nfseMode: modo } });
    return { ok: true };
  }

  // ---------- procurador e agenda ----------
  @Exige("fiscal.credentials.manage") @Get("fiscal/procurator")
  async procurador(@Ctx() c: Contexto) { return { procurador: certPublico(await this.certs.procurador(c.organizationId)) }; }
  @Exige("fiscal.credentials.manage") @Put("fiscal/procurator")
  async definirProcurador(@Ctx() c: Contexto, @Body() corpo: unknown) {
    const { id } = validar(z.object({ id: z.string().uuid().nullable() }), corpo);
    if (id && !(await this.prisma.fiscalCertificate.findFirst({ where: { id, organizationId: c.organizationId } }))) throw naoEncontrado("Certificado não encontrado.");
    await this.prisma.fiscalSettings.upsert({ where: { organizationId: c.organizationId }, create: { organizationId: c.organizationId, procuratorCertificateId: id }, update: { procuratorCertificateId: id } });
    await this.auditoria.registrar(c.organizationId, c.userId, "fiscal.procurator.changed", id ?? "");
    return { procurador: certPublico(await this.certs.procurador(c.organizationId)) };
  }
  private async agenda(org: string) {
    const s = await this.prisma.fiscalSettings.upsert({ where: { organizationId: org }, create: { organizationId: org }, update: {} });
    return { ativo: s.scheduleActive, hora: s.scheduleTime, status: s.runStatus, inicio: s.runStartedAt, fim: s.runFinishedAt, linhas: lista(s.runLines as string[]) };
  }
  @Exige("fiscal.documents.read") @Get("fiscal/schedule")
  async lerAgenda(@Ctx() c: Contexto) {
    const a = await this.agenda(c.organizationId);
    if (!c.restritas.length) return a;
    const ocultas = await this.prisma.company.findMany({ where: { organizationId: c.organizationId, OR: c.restritas.map((r) => ({ cnpj: { startsWith: r } })) }, select: { cnpj: true, legalName: true } });
    return { ...a, linhas: a.linhas.filter((l: string) => !ocultas.some((e) => l.includes(e.cnpj) || l.includes(e.legalName))) };
  }
  @Exige("fiscal.schedule.manage") @Put("fiscal/schedule")
  async salvarAgenda(@Ctx() c: Contexto, @Body() corpo: unknown) {
    const d = validar(z.object({ ativo: z.boolean(), hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido.") }), corpo);
    await this.prisma.fiscalSettings.upsert({ where: { organizationId: c.organizationId }, create: { organizationId: c.organizationId, scheduleActive: d.ativo, scheduleTime: d.hora }, update: { scheduleActive: d.ativo, scheduleTime: d.hora } });
    await this.auditoria.registrar(c.organizationId, c.userId, "fiscal.schedule.changed", "", d);
    return this.agenda(c.organizationId);
  }

  // ---------- NFS-e ----------
  @Exige("fiscal.capture") @Post("fiscal/nfse/:id/capture") @HttpCode(200)
  async capturarNfse(@Ctx() c: Contexto, @Param("id") id: string, @Query("ambiente") a: unknown) { return this.nfse.capturar(await this.escopo.empresa(c, id), amb(a)); }
  @Exige("fiscal.documents.read") @Get("fiscal/nfse/:id/documents")
  async notas(@Ctx() c: Contexto, @Param("id") id: string, @Query("ambiente") a: unknown, @Query("competencia") comp?: string) { return this.nfse.notas(await this.escopo.empresa(c, id), amb(a), comp ? validar(competencia, comp) : undefined); }
  @Exige("fiscal.capture") @Post("fiscal/nfse/:id/verify") @HttpCode(200)
  async verificar(@Ctx() c: Contexto, @Param("id") id: string, @Query("ambiente") a: unknown, @Body() corpo: unknown) { return this.nfse.verificar(await this.escopo.empresa(c, id), amb(a), validar(z.object({ chave: chaveNfse }), corpo).chave); }
  @Exige("fiscal.capture") @Post("fiscal/nfse/:id/diagnose") @HttpCode(200)
  async diagnosticar(@Ctx() c: Contexto, @Param("id") id: string, @Query("ambiente") a: unknown) { return this.nfse.diagnosticar(await this.escopo.empresa(c, id), amb(a)); }
  @Exige("fiscal.capture") @Post("fiscal/nfse/:id/restart") @HttpCode(200)
  async reiniciar(@Ctx() c: Contexto, @Param("id") id: string, @Query("ambiente") a: unknown) {
    const e = await this.escopo.empresa(c, id);
    await this.nfse.reiniciar(e, amb(a));
    await this.auditoria.registrar(c.organizationId, c.userId, "fiscal.nfse.restarted", e.id);
    return { ok: true };
  }
  @Exige("fiscal.documents.read") @Post("fiscal/nfse/:id/xmls") @HttpCode(200)
  async xmls(@Ctx() c: Contexto, @Param("id") id: string, @Query("ambiente") a: unknown, @Body() corpo: unknown) { return this.nfse.xmls(await this.escopo.empresa(c, id), amb(a), validar(z.object({ chaves: z.array(chaveNfse).max(300, "Escolha até 300 notas por vez.") }), corpo).chaves); }
  @Exige("fiscal.documents.read") @Post("fiscal/nfse/:id/zip") @HttpCode(200)
  async zip(@Ctx() c: Contexto, @Param("id") id: string, @Query("ambiente") a: unknown, @Body() corpo: unknown, @Res() res: Response) {
    const d = validar(z.object({ competencia, chaves: z.array(chaveNfse).max(5000).optional() }), corpo);
    const e = await this.escopo.empresa(c, id);
    const b = await this.nfse.zip(e, amb(a), d.competencia, d.chaves);
    await this.auditoria.registrar(c.organizationId, c.userId, "fiscal.nfse.exported", e.id, { competencia: d.competencia });
    enviarZip(res, `NFSe-${e.cnpj}-${d.competencia}.zip`, b);
  }

  // ---------- NF-e e CT-e ----------
  @Exige("companies.read") @Get("fiscal/dfe/companies")
  async listarDfe(@Ctx() c: Contexto, @Query("ambiente") a: unknown) {
    const environment = amb(a), l = await this.empresas(c), org = c.organizationId;
    const onde = { organizationId: org, environment, companyId: { in: l.map((e) => e.id) } };
    const [certs, estados, grupos, falhas] = await Promise.all([this.certs.listar(org), this.prisma.dfeState.findMany({ where: onde }), this.prisma.dfeDocument.groupBy({ by: ["companyId", "servico", "conteudo", "ciencia"], where: onde, _count: true }), this.prisma.dfeFailure.groupBy({ by: ["companyId"], where: onde, _count: true })]);
    const est = (id: string, s: string) => {
      const st = estados.find((x) => x.companyId === id && x.servico === s), g = grupos.filter((x) => x.companyId === id && x.servico === s), soma = (f: (x: (typeof g)[number]) => boolean) => g.filter(f).reduce((t, x) => t + x._count, 0);
      return { ultimoNsu: Number(st?.lastNsu ?? 0), maxNsu: Number(st?.maxNsu ?? 0), proximaEm: st?.nextAt ?? null, ultimaCaptura: st?.lastCaptureAt ?? null, ultimoErro: st?.lastError ?? null, documentos: soma(() => true), resumos: soma((x) => x.conteudo === "resumo"), pendentes: soma((x) => x.ciencia === "pendente") };
    };
    return { empresas: l.map((e) => ({ id: e.id, cnpj: e.cnpj, razao: e.legalName, certificado: certPublico(this.certs.escolher(certs, e.cnpj, e.certificateId)), cienciaAuto: e.dfeAutoCiencia, capturaAuto: e.dfeAutoCapture, falhas: falhas.find((f) => f.companyId === e.id)?._count ?? 0, nfe: est(e.id, "nfe"), cte: est(e.id, "cte") })) };
  }
  @Exige("fiscal.schedule.manage") @Patch("fiscal/dfe/:id/auto-capture")
  async capturaAuto(@Ctx() c: Contexto, @Param("id") id: string, @Body() corpo: unknown) {
    const { ativo } = validar(z.object({ ativo: z.boolean() }), corpo);
    const e = await this.escopo.empresa(c, id);
    await this.prisma.company.update({ where: { id: e.id }, data: { dfeAutoCapture: ativo } });
    await this.auditoria.registrar(c.organizationId, c.userId, "fiscal.dfe.autocapture", e.id, { ativo });
    return { ok: true };
  }
  @Exige("fiscal.ciencia.send") @Patch("fiscal/dfe/:id/auto-ciencia")
  async cienciaAuto(@Ctx() c: Contexto, @Param("id") id: string, @Body() corpo: unknown) {
    const { ativo } = validar(z.object({ ativo: z.boolean() }), corpo);
    const e = await this.escopo.empresa(c, id);
    await this.prisma.company.update({ where: { id: e.id }, data: { dfeAutoCiencia: ativo } });
    await this.auditoria.registrar(c.organizationId, c.userId, "fiscal.dfe.autociencia", e.id, { ativo });
    return { ok: true };
  }
  @Exige("fiscal.ciencia.send") @Post("fiscal/dfe/:id/ciencia/mark") @HttpCode(200)
  async marcar(@Ctx() c: Contexto, @Param("id") id: string, @Query("ambiente") a: unknown, @Body() corpo: unknown) { return this.dfe.marcarCiencia(await this.escopo.empresa(c, id), amb(a), validar(z.object({ chaves: z.array(chaveDfe).max(5000) }), corpo).chaves); }
  @Exige("fiscal.ciencia.send") @Post("fiscal/dfe/:id/ciencia/send") @HttpCode(200)
  async enviar(@Ctx() c: Contexto, @Param("id") id: string, @Query("ambiente") a: unknown) {
    const e = await this.escopo.empresa(c, id);
    const r = await this.dfe.enviarCiencias(e, amb(a));
    await this.auditoria.registrar(c.organizationId, c.userId, "fiscal.dfe.ciencia.sent", e.id, r);
    return r;
  }
  @Exige("fiscal.capture") @Post("fiscal/dfe/:id/:servico/capture") @HttpCode(200)
  async capturarDfe(@Ctx() c: Contexto, @Param("id") id: string, @Param("servico") s: string, @Query("ambiente") a: unknown) { return this.dfe.capturar(await this.escopo.empresa(c, id), amb(a), servico(s)); }
  @Exige("fiscal.documents.read") @Get("fiscal/dfe/:id/:servico/documents")
  async documentos(@Ctx() c: Contexto, @Param("id") id: string, @Param("servico") s: string, @Query("ambiente") a: unknown, @Query("competencia") comp?: string) { return this.dfe.documentos(await this.escopo.empresa(c, id), amb(a), servico(s), comp ? validar(competencia, comp) : undefined); }
  @Exige("fiscal.capture") @Post("fiscal/dfe/:id/:servico/restart") @HttpCode(200)
  async reiniciarDfe(@Ctx() c: Contexto, @Param("id") id: string, @Param("servico") s: string, @Query("ambiente") a: unknown) {
    const e = await this.escopo.empresa(c, id);
    await this.dfe.reiniciar(e, amb(a), servico(s));
    await this.auditoria.registrar(c.organizationId, c.userId, "fiscal.dfe.restarted", e.id, { servico: s });
    return { ok: true };
  }
  @Exige("fiscal.documents.read") @Post("fiscal/dfe/:id/:servico/zip") @HttpCode(200)
  async zipDfe(@Ctx() c: Contexto, @Param("id") id: string, @Param("servico") s: string, @Query("ambiente") a: unknown, @Body() corpo: unknown, @Res() res: Response) {
    const d = validar(z.object({ competencia, chaves: z.array(chaveDfe).max(5000).optional() }), corpo);
    const e = await this.escopo.empresa(c, id), sv = servico(s);
    const b = await this.dfe.zip(e, amb(a), sv, d.competencia, d.chaves);
    await this.auditoria.registrar(c.organizationId, c.userId, "fiscal.dfe.exported", e.id, { servico: sv, competencia: d.competencia });
    enviarZip(res, `${sv.toUpperCase()}-${e.cnpj}-${d.competencia}.zip`, b);
  }
}
