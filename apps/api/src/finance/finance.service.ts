import { Injectable } from "@nestjs/common";
import { Prisma, type FinEntry } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { hoje } from "../certificates/certificates.service";
import { AuditoriaService } from "../common/audit.service";
import type { Contexto } from "../common/auth";
import { Erro, invalido, naoEncontrado } from "../common/errors";
import { EscopoService } from "../common/scope.service";
import { PrismaService } from "../prisma.service";
import { lerOfx } from "./ofx";

const D = (v: string | number | Prisma.Decimal) => new Prisma.Decimal(v);
const CATEGORIAS: [string, string][] = [["receita", "Receita de serviços"], ["receita", "Venda de produtos"], ["receita", "Outras receitas"], ["despesa", "Fornecedores"], ["despesa", "Impostos e taxas"], ["despesa", "Folha e encargos"], ["despesa", "Aluguel e condomínio"], ["despesa", "Serviços contratados"], ["despesa", "Tarifas bancárias"], ["despesa", "Outras despesas"]];
export interface NovoLancamento { kind: "pagar" | "receber"; description: string; partyName: string; partyDoc: string; docNumber: string; categoryId: string | null; costCenterId: string | null; accountId: string | null; issueDate: string; dueDate: string; amount: string; notes: string; parcelas: number; frequencia: "mensal" | "semanal" | "quinzenal" | "anual" }
function somar(data: string, f: string, n: number) {
  const d = new Date(`${data}T12:00:00Z`), dia = d.getUTCDate();
  if (f === "semanal") d.setUTCDate(dia + 7 * n); else if (f === "quinzenal") d.setUTCDate(dia + 15 * n);
  else { d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + (f === "anual" ? 12 : 1) * n); const ult = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); d.setUTCDate(Math.min(dia, ult)); }
  return d.toISOString().slice(0, 10);
}
const publico = (e: FinEntry & { attachments?: { id: string; name: string }[] }, ) => ({ ...e, amount: e.amount.toFixed(2), paidAmount: e.paidAmount?.toFixed(2) ?? null, attachments: e.attachments ?? [] });

@Injectable()
export class FinanceiroService {
  constructor(private prisma: PrismaService, private escopo: EscopoService, private auditoria: AuditoriaService) {}
  /** Só escritórios com o módulo BPO liberado pela Neeko (ou a própria Neeko) usam estas rotas. */
  async liberado(c: Contexto) {
    const o = await this.prisma.organization.findUniqueOrThrow({ where: { id: c.organizationId }, select: { internal: true, modules: true } });
    if (!o.internal && !o.modules.includes("bpo")) throw new Erro(403, "MODULO", "O BPO Financeiro não está liberado para este escritório.");
  }
  async empresas(c: Contexto) {
    await this.liberado(c);
    const l = await this.prisma.company.findMany({ where: this.escopo.filtro(c), orderBy: { legalName: "asc" }, select: { id: true, cnpj: true, legalName: true } });
    return { empresas: l.map((e) => ({ id: e.id, cnpj: e.cnpj, razao: e.legalName })) };
  }
  private onde(c: Contexto, empresa: string) { return { organizationId: c.organizationId, companyId: empresa }; }
  nome(c: Contexto) { return this.prisma.user.findUniqueOrThrow({ where: { id: c.userId }, select: { name: true } }).then((u) => u.name); }
  /** Referências só valem dentro da mesma empresa. */
  private async conferirRefs(c: Contexto, e: string, d: { categoryId: string | null; costCenterId: string | null; accountId: string | null }) {
    const onde = this.onde(c, e);
    if (d.categoryId && !(await this.prisma.finCategory.findFirst({ where: { ...onde, id: d.categoryId } }))) throw invalido("Categoria inválida.");
    if (d.costCenterId && !(await this.prisma.costCenter.findFirst({ where: { ...onde, id: d.costCenterId } }))) throw invalido("Centro de custo inválido.");
    if (d.accountId && !(await this.prisma.finAccount.findFirst({ where: { ...onde, id: d.accountId } }))) throw invalido("Conta financeira inválida.");
  }
  private async lancamento(c: Contexto, e: string, id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw naoEncontrado("Lançamento não encontrado.");
    const x = await this.prisma.finEntry.findFirst({ where: { ...this.onde(c, e), id } });
    if (!x) throw naoEncontrado("Lançamento não encontrado.");
    return x;
  }
  async cadastros(c: Contexto, e: string) {
    const onde = this.onde(c, e);
    if (!(await this.prisma.finCategory.count({ where: onde }))) await this.prisma.finCategory.createMany({ data: CATEGORIAS.map(([kind, name]) => ({ ...onde, kind, name })), skipDuplicates: true });
    const [contas, categorias, centros, o] = await Promise.all([this.prisma.finAccount.findMany({ where: onde, orderBy: { name: "asc" } }), this.prisma.finCategory.findMany({ where: onde, orderBy: { name: "asc" } }), this.prisma.costCenter.findMany({ where: onde, orderBy: { name: "asc" } }), this.prisma.company.findUniqueOrThrow({ where: { id: e } })]);
    return { contas: contas.map((x) => ({ ...x, openingBalance: x.openingBalance.toFixed(2) })), categorias, centros, limiteAprovacao: o.approvalLimit?.toFixed(2) ?? null };
  }
  criarConta(c: Contexto, e: string, d: { name: string; bank: string; openingBalance: string }) { return this.prisma.finAccount.create({ data: { ...this.onde(c, e), ...d } }); }
  async criarCategoria(c: Contexto, e: string, d: { name: string; kind: string }) { try { return await this.prisma.finCategory.create({ data: { ...this.onde(c, e), ...d } }); } catch { throw new Erro(409, "EM_USO", "Essa categoria já existe."); } }
  async criarCentro(c: Contexto, e: string, name: string) { try { return await this.prisma.costCenter.create({ data: { ...this.onde(c, e), name } }); } catch { throw new Erro(409, "EM_USO", "Esse centro de custo já existe."); } }
  async definirLimite(c: Contexto, e: string, v: string | null) { await this.prisma.company.update({ where: { id: e }, data: { approvalLimit: v } }); await this.auditoria.registrar(c.organizationId, c.userId, "finance.approval.limit", e, { v }); return { ok: true }; }

  async listar(c: Contexto, e: string, f: { kind?: string; status?: string; de?: string; ate?: string }) {
    const hojeD = hoje();
    const where: Prisma.FinEntryWhereInput = { ...this.onde(c, e), ...(f.kind ? { kind: f.kind } : {}), ...(f.de || f.ate ? { dueDate: { ...(f.de ? { gte: f.de } : {}), ...(f.ate ? { lte: f.ate } : {}) } } : {}), ...(f.status === "vencido" ? { status: { in: ["aberto", "aguardando"] }, dueDate: { lt: hojeD } } : f.status ? { status: f.status } : {}) };
    const l = await this.prisma.finEntry.findMany({ where, orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }], take: 2000, include: { attachments: { select: { id: true, name: true } } } });
    return { lancamentos: l.map(publico) };
  }
  /** Parcelas repetem o valor. Acima do limite, conta a pagar nasce aguardando aprovação. */
  async criar(c: Contexto, e: string, d: NovoLancamento) {
    await this.conferirRefs(c, e, d);
    const o = await this.prisma.company.findUniqueOrThrow({ where: { id: e } }), por = await this.nome(c);
    const status = d.kind === "pagar" && o.approvalLimit && D(d.amount).gt(o.approvalLimit) ? "aguardando" : "aberto", groupId = d.parcelas > 1 ? randomUUID() : null;
    const { parcelas, frequencia, ...base } = d;
    await this.prisma.finEntry.createMany({ data: Array.from({ length: parcelas }, (_, i) => ({ ...this.onde(c, e), ...base, dueDate: somar(d.dueDate, frequencia, i), status, groupId, installment: i + 1, installments: parcelas, createdById: c.userId, createdByName: por })) });
    await this.auditoria.registrar(c.organizationId, c.userId, "finance.entry.created", e, { kind: d.kind, parcelas });
    return { ok: true, status };
  }
  async alterar(c: Contexto, e: string, id: string, d: Omit<NovoLancamento, "parcelas" | "frequencia">) {
    const x = await this.lancamento(c, e, id);
    if (x.status === "pago" || x.status === "cancelado") throw invalido("Lançamento pago ou cancelado não pode ser alterado.");
    await this.conferirRefs(c, e, d);
    const o = await this.prisma.company.findUniqueOrThrow({ where: { id: e } });
    const status = d.kind === "pagar" && o.approvalLimit && D(d.amount).gt(o.approvalLimit) ? "aguardando" : "aberto";
    await this.prisma.finEntry.update({ where: { id }, data: { ...d, status, approvedByName: "", approvedAt: null } });
    await this.auditoria.registrar(c.organizationId, c.userId, "finance.entry.changed", id);
    return { ok: true, status };
  }
  async baixar(c: Contexto, e: string, id: string, d: { paidDate: string; paidAmount: string; accountId: string }) {
    const x = await this.lancamento(c, e, id);
    if (x.status !== "aberto") throw invalido(x.status === "aguardando" ? "Este pagamento aguarda aprovação." : "Este lançamento não está em aberto.");
    await this.conferirRefs(c, e, { categoryId: null, costCenterId: null, accountId: d.accountId });
    await this.prisma.finEntry.update({ where: { id }, data: { status: "pago", ...d } });
    await this.auditoria.registrar(c.organizationId, c.userId, "finance.entry.settled", id);
    return { ok: true };
  }
  async estornar(c: Contexto, e: string, id: string) {
    const x = await this.lancamento(c, e, id);
    if (x.status !== "pago") throw invalido("Só lançamento pago pode ser estornado.");
    if (await this.prisma.finStatementLine.findFirst({ where: { organizationId: c.organizationId, entryId: id } })) throw invalido("Desfaça a conciliação antes de estornar.");
    await this.prisma.finEntry.update({ where: { id }, data: { status: "aberto", paidDate: "", paidAmount: null } });
    await this.auditoria.registrar(c.organizationId, c.userId, "finance.entry.reversed", id);
    return { ok: true };
  }
  async cancelar(c: Contexto, e: string, id: string) {
    const x = await this.lancamento(c, e, id);
    if (x.status === "pago") throw invalido("Estorne o pagamento antes de cancelar.");
    await this.prisma.finEntry.update({ where: { id }, data: { status: "cancelado" } });
    await this.auditoria.registrar(c.organizationId, c.userId, "finance.entry.canceled", id);
    return { ok: true };
  }
  /** Quem lançou não aprova o próprio pagamento. */
  async decidir(c: Contexto, e: string, id: string, aprovar: boolean) {
    const x = await this.lancamento(c, e, id);
    if (x.status !== "aguardando") throw invalido("Este lançamento não aguarda aprovação.");
    if (x.createdById === c.userId) throw new Erro(403, "FORBIDDEN", "Quem lançou não aprova o próprio pagamento.");
    await this.prisma.finEntry.update({ where: { id }, data: { status: aprovar ? "aberto" : "rejeitado", approvedByName: await this.nome(c), approvedAt: new Date() } });
    await this.auditoria.registrar(c.organizationId, c.userId, aprovar ? "finance.entry.approved" : "finance.entry.rejected", id);
    return { ok: true };
  }
  async anexar(c: Contexto, e: string, id: string, d: { name: string; mime: string; base64: string }) {
    await this.lancamento(c, e, id);
    const content = Buffer.from(d.base64, "base64");
    if (!content.length || content.length > 5 * 1024 * 1024) throw invalido("Envie um arquivo de até 5 MB.");
    const a = await this.prisma.finAttachment.create({ data: { organizationId: c.organizationId, entryId: id, name: d.name, mime: d.mime, content } });
    return { id: a.id };
  }
  async anexo(c: Contexto, e: string, id: string, anexo: string) {
    await this.lancamento(c, e, id);
    const a = await this.prisma.finAttachment.findFirst({ where: { organizationId: c.organizationId, entryId: id, id: anexo } });
    if (!a) throw naoEncontrado("Anexo não encontrado.");
    return a;
  }
  /** Realizado por data de pagamento; previsto por vencimento. Tudo somado em Decimal. */
  async fluxo(c: Contexto, e: string, de: string, ate: string) {
    const onde = this.onde(c, e);
    const [l, contas] = await Promise.all([this.prisma.finEntry.findMany({ where: { ...onde, status: { in: ["aberto", "aguardando", "pago"] } } }), this.prisma.finAccount.findMany({ where: onde })]);
    const cats = await this.prisma.finCategory.findMany({ where: onde }), nomeCat = new Map(cats.map((x) => [x.id, x.name]));
    const inicial = contas.reduce((t, x) => t.add(x.openingBalance), D(0)), sinal = (k: string) => (k === "receber" ? 1 : -1);
    const valor = (x: FinEntry) => x.paidAmount ?? x.amount;
    const saldoAntes = l.filter((x) => x.status === "pago" && x.paidDate < de).reduce((t, x) => t.add(valor(x).mul(sinal(x.kind))), inicial);
    const meses = new Map<string, { entradas: Prisma.Decimal; saidas: Prisma.Decimal; previstoEntradas: Prisma.Decimal; previstoSaidas: Prisma.Decimal }>();
    const mes = (m: string) => { if (!meses.has(m)) meses.set(m, { entradas: D(0), saidas: D(0), previstoEntradas: D(0), previstoSaidas: D(0) }); return meses.get(m)!; };
    const porCat = new Map<string, { kind: string; total: Prisma.Decimal }>();
    for (const x of l) {
      if (x.status === "pago" && x.paidDate >= de && x.paidDate <= ate) {
        const m = mes(x.paidDate.slice(0, 7)); if (x.kind === "receber") m.entradas = m.entradas.add(valor(x)); else m.saidas = m.saidas.add(valor(x));
        const n = `${x.kind}|${x.categoryId ? nomeCat.get(x.categoryId) ?? "Sem categoria" : "Sem categoria"}`, p = porCat.get(n) ?? { kind: x.kind, total: D(0) }; p.total = p.total.add(valor(x)); porCat.set(n, p);
      } else if (x.status !== "pago" && x.dueDate >= de && x.dueDate <= ate) { const m = mes(x.dueDate.slice(0, 7)); if (x.kind === "receber") m.previstoEntradas = m.previstoEntradas.add(x.amount); else m.previstoSaidas = m.previstoSaidas.add(x.amount); }
    }
    let saldo = saldoAntes;
    const serie = [...meses.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([competencia, m]) => { saldo = saldo.add(m.entradas).sub(m.saidas); return { competencia, entradas: m.entradas.toFixed(2), saidas: m.saidas.toFixed(2), previstoEntradas: m.previstoEntradas.toFixed(2), previstoSaidas: m.previstoSaidas.toFixed(2), saldo: saldo.toFixed(2) }; });
    const dia = hoje(), abertos = l.filter((x) => x.status !== "pago"), soma = (f: (x: FinEntry) => boolean) => abertos.filter(f).reduce((t, x) => t.add(x.amount), D(0)).toFixed(2);
    return { saldoInicial: saldoAntes.toFixed(2), saldoFinal: saldo.toFixed(2), serie, categorias: [...porCat.entries()].map(([k, v]) => ({ nome: k.split("|")[1], kind: v.kind, total: v.total.toFixed(2) })).sort((a, b) => a.nome.localeCompare(b.nome)),
      aPagar: soma((x) => x.kind === "pagar"), aReceber: soma((x) => x.kind === "receber"), vencidoPagar: soma((x) => x.kind === "pagar" && x.dueDate < dia), vencidoReceber: soma((x) => x.kind === "receber" && x.dueDate < dia) };
  }
  private async conta(c: Contexto, e: string, id: string) { const a = await this.prisma.finAccount.findFirst({ where: { ...this.onde(c, e), id } }); if (!a) throw naoEncontrado("Conta financeira não encontrada."); return a; }
  async importarOfx(c: Contexto, e: string, conta: string, texto: string) {
    await this.conta(c, e, conta);
    const linhas = lerOfx(texto);
    if (!linhas.length) throw invalido("Nenhum lançamento encontrado no arquivo OFX.");
    const r = await this.prisma.finStatementLine.createMany({ data: linhas.map((l) => ({ organizationId: c.organizationId, accountId: conta, ...l })), skipDuplicates: true });
    await this.auditoria.registrar(c.organizationId, c.userId, "finance.ofx.imported", conta, { novas: r.count });
    return { lidas: linhas.length, novas: r.count };
  }
  /** Sugere lançamento em aberto com o mesmo valor e sentido, com vencimento em até 7 dias. */
  async extrato(c: Contexto, e: string, conta: string) {
    await this.conta(c, e, conta);
    const linhas = await this.prisma.finStatementLine.findMany({ where: { organizationId: c.organizationId, accountId: conta }, orderBy: { date: "desc" }, take: 500 });
    const abertos = await this.prisma.finEntry.findMany({ where: { ...this.onde(c, e), status: "aberto" } });
    const dias = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86400000;
    return { linhas: linhas.map((l) => { const k = l.amount.gte(0) ? "receber" : "pagar", v = l.amount.abs(); return { id: l.id, date: l.date, amount: l.amount.toFixed(2), memo: l.memo, entryId: l.entryId, ignored: l.ignored, sugestoes: l.entryId || l.ignored ? [] : abertos.filter((x) => x.kind === k && x.amount.eq(v) && dias(x.dueDate, l.date) <= 7).map((x) => ({ id: x.id, description: x.description, dueDate: x.dueDate, partyName: x.partyName })) }; }) };
  }
  private async linha(c: Contexto, conta: string, id: string) { const l = await this.prisma.finStatementLine.findFirst({ where: { organizationId: c.organizationId, accountId: conta, id } }); if (!l) throw naoEncontrado("Linha não encontrada."); return l; }
  async conciliar(c: Contexto, e: string, conta: string, id: string, entryId: string) {
    await this.conta(c, e, conta);
    const l = await this.linha(c, conta, id), x = await this.lancamento(c, e, entryId);
    if (l.entryId) throw invalido("Esta linha já está conciliada.");
    if (x.status !== "aberto") throw invalido("O lançamento precisa estar em aberto.");
    if ((x.kind === "receber") !== l.amount.gte(0) || !x.amount.eq(l.amount.abs())) throw invalido("Valor ou sentido diferente do lançamento.");
    await this.prisma.$transaction([this.prisma.finStatementLine.update({ where: { id }, data: { entryId, ignored: false } }), this.prisma.finEntry.update({ where: { id: entryId }, data: { status: "pago", paidDate: l.date, paidAmount: x.amount, accountId: conta } })]);
    await this.auditoria.registrar(c.organizationId, c.userId, "finance.reconciled", id);
    return { ok: true };
  }
  async desfazer(c: Contexto, e: string, conta: string, id: string) {
    await this.conta(c, e, conta);
    const l = await this.linha(c, conta, id);
    if (l.entryId) { await this.prisma.$transaction([this.prisma.finStatementLine.update({ where: { id }, data: { entryId: null } }), this.prisma.finEntry.update({ where: { id: l.entryId }, data: { status: "aberto", paidDate: "", paidAmount: null } })]); }
    else await this.prisma.finStatementLine.update({ where: { id }, data: { ignored: false } });
    return { ok: true };
  }
  async ignorar(c: Contexto, e: string, conta: string, id: string) { await this.conta(c, e, conta); await this.linha(c, conta, id); await this.prisma.finStatementLine.update({ where: { id }, data: { ignored: true } }); return { ok: true }; }
}
