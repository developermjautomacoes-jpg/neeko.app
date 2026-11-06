import { api } from "./http";

export type Tipo = "pagar" | "receber";
export type Situacao = "aberto" | "aguardando" | "pago" | "cancelado" | "rejeitado";
export interface EmpresaBpo { id: string; cnpj: string; razao: string }
export interface ContaFin { id: string; name: string; bank: string; openingBalance: string; active: boolean }
export interface Categoria { id: string; name: string; kind: "receita" | "despesa"; active: boolean }
export interface Centro { id: string; name: string; active: boolean }
export interface Cadastros { contas: ContaFin[]; categorias: Categoria[]; centros: Centro[]; limiteAprovacao: string | null }
export interface Lancamento {
  id: string; kind: Tipo; description: string; partyName: string; partyDoc: string; docNumber: string; categoryId: string | null; costCenterId: string | null; accountId: string | null;
  issueDate: string; dueDate: string; amount: string; status: Situacao; paidDate: string; paidAmount: string | null; installment: number; installments: number; notes: string;
  createdByName: string; approvedByName: string; attachments: { id: string; name: string }[];
}
export interface NovoLancamento { kind: Tipo; description: string; partyName: string; partyDoc: string; docNumber: string; categoryId: string | null; costCenterId: string | null; accountId: string | null; issueDate: string; dueDate: string; amount: string; notes: string; parcelas?: number; frequencia?: string }
export interface Fluxo {
  saldoInicial: string; saldoFinal: string; aPagar: string; aReceber: string; vencidoPagar: string; vencidoReceber: string;
  serie: { competencia: string; entradas: string; saidas: string; previstoEntradas: string; previstoSaidas: string; saldo: string }[];
  categorias: { nome: string; kind: Tipo; total: string }[];
}
export interface LinhaExtrato { id: string; date: string; amount: string; memo: string; entryId: string | null; ignored: boolean; sugestoes: { id: string; description: string; dueDate: string; partyName: string }[] }
export interface ItemEstoque { id: string; code: string; name: string; unit: string; minQty: string; qty: string; avgCost: string; valor: string; active: boolean }
export interface Movimento { id: string; type: "entrada" | "saida" | "ajuste"; qty: string; unitCost: string; date: string; note: string; byName: string; createdAt: string }

const f = (e: string) => `finance/${e}`;
export const empresasBpo = async () => (await api<{ empresas: EmpresaBpo[] }>("GET", "finance/companies")).empresas;
export const lerCadastros = (e: string) => api<Cadastros>("GET", `${f(e)}/setup`);
export const criarContaFin = (e: string, d: { name: string; bank: string; openingBalance: string }) => api<ContaFin>("POST", `${f(e)}/accounts`, d);
export const criarCategoria = (e: string, d: { name: string; kind: string }) => api<Categoria>("POST", `${f(e)}/categories`, d);
export const criarCentro = (e: string, name: string) => api<Centro>("POST", `${f(e)}/cost-centers`, { name });
export const definirLimite = (e: string, limite: string | null) => api("PUT", `${f(e)}/approval-limit`, { limite });
export const listarLancamentos = async (e: string, q: { kind?: string; status?: string; de?: string; ate?: string }) => (await api<{ lancamentos: Lancamento[] }>("GET", `${f(e)}/entries`, undefined, q)).lancamentos;
export const criarLancamento = (e: string, d: NovoLancamento) => api<{ ok: true; status: Situacao }>("POST", `${f(e)}/entries`, d);
export const alterarLancamento = (e: string, id: string, d: NovoLancamento) => api<{ ok: true; status: Situacao }>("PUT", `${f(e)}/entries/${id}`, d);
export const baixarLancamento = (e: string, id: string, d: { paidDate: string; paidAmount: string; accountId: string }) => api("POST", `${f(e)}/entries/${id}/settle`, d);
export const estornarLancamento = (e: string, id: string) => api("POST", `${f(e)}/entries/${id}/reverse`, {});
export const cancelarLancamento = (e: string, id: string) => api("POST", `${f(e)}/entries/${id}/cancel`, {});
export const decidirLancamento = (e: string, id: string, aprovar: boolean) => api("POST", `${f(e)}/entries/${id}/decide`, { aprovar });
export const anexarArquivo = (e: string, id: string, d: { name: string; mime: string; base64: string }) => api<{ id: string }>("POST", `${f(e)}/entries/${id}/attachments`, d);
export const urlAnexo = (e: string, id: string, anexo: string) => `/api/${f(e)}/entries/${id}/attachments/${anexo}`;
export const lerFluxo = (e: string, de: string, ate: string) => api<Fluxo>("GET", `${f(e)}/cashflow`, undefined, { de, ate });
export const importarOfx = (e: string, conta: string, texto: string) => api<{ lidas: number; novas: number }>("POST", `${f(e)}/accounts/${conta}/ofx`, { texto });
export const lerExtrato = async (e: string, conta: string) => (await api<{ linhas: LinhaExtrato[] }>("GET", `${f(e)}/accounts/${conta}/statement`)).linhas;
export const conciliar = (e: string, conta: string, linha: string, entryId: string) => api("POST", `${f(e)}/accounts/${conta}/statement/${linha}/match`, { entryId });
export const desfazerConciliacao = (e: string, conta: string, linha: string) => api("POST", `${f(e)}/accounts/${conta}/statement/${linha}/undo`, {});
export const ignorarLinha = (e: string, conta: string, linha: string) => api("POST", `${f(e)}/accounts/${conta}/statement/${linha}/ignore`, {});

const s = (e: string) => `stock/${e}`;
export const listarItens = async (e: string) => (await api<{ itens: ItemEstoque[] }>("GET", `${s(e)}/items`)).itens;
export const salvarItem = (e: string, id: string | undefined, d: { code: string; name: string; unit: string; minQty: string; active: boolean }) => (id ? api("PUT", `${s(e)}/items/${id}`, d) : api("POST", `${s(e)}/items`, d));
export const listarMovimentos = async (e: string, id: string) => (await api<{ movimentos: Movimento[] }>("GET", `${s(e)}/items/${id}/moves`)).movimentos;
export const movimentar = (e: string, id: string, d: { type: string; qty: string; unitCost: string; date: string; note: string }) => api<ItemEstoque>("POST", `${s(e)}/items/${id}/moves`, d);
