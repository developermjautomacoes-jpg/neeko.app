import type { NotaXml } from "@/features/nfse/nfseDanfse";
import { centavos } from "@/lib/format";
import type { AgendaNfse, AmbienteNfse, Certificado, EmpresaCert, CertificadoNfse, DocumentoDfe, EmpresaDfe, EmpresaNfse, FalhaDfe, ListaDfe, ListaNotasNfse, ModoBuscaNfse, NotaNfse, PassoCaptura, PassoCiencia, PassoVerificacao, ServicoDfe } from "@/types/nfse";
import { api, baixar } from "./http";

type NotaApi = Record<string, string | number> & { vServ: string; vBc: string; vIss: string; vRetCp: string; vRetIrrf: string; vRetCsll: string; vPis: string; vCofins: string; vTotalRet: string; vLiq: string };
const nota = (n: NotaApi): NotaNfse => ({ ...(n as unknown as NotaNfse), prest_doc: String(n.prestDoc), prest_nome: String(n.prestNome), toma_doc: String(n.tomaDoc), toma_nome: String(n.tomaNome), trib_nac: String(n.tribNac), c_nbs: String(n.cNbs), x_nbs: String(n.xNbs), c_loc_incid: String(n.cLocIncid), cno_obra: String(n.cnoObra), desc_nac: String(n.descNac), mun_incid: String(n.munIncid), tp_ret_iss: String(n.tpRetIss),
  v_serv: centavos(n.vServ), v_bc: centavos(n.vBc), v_iss: centavos(n.vIss), v_ret_cp: centavos(n.vRetCp), v_ret_irrf: centavos(n.vRetIrrf), v_ret_csll: centavos(n.vRetCsll), v_pis: centavos(n.vPis), v_cofins: centavos(n.vCofins), v_total_ret: centavos(n.vTotalRet), v_liq: centavos(n.vLiq) });

export async function listarEmpresas(ambiente: AmbienteNfse) { return (await api<{ empresas: EmpresaNfse[] }>("GET", "fiscal/companies", undefined, { ambiente })).empresas; }
export const definirModo = (id: string, modo: ModoBuscaNfse) => api("PATCH", `companies/${id}/nfse-mode`, { modo });
export const reiniciarCaptura = (ambiente: AmbienteNfse, id: string) => api("POST", `fiscal/nfse/${id}/restart`, {}, { ambiente });
/** Busca um lote (até 50 documentos). Quem repete, com pausa, é a tela. */
export const capturarLote = (ambiente: AmbienteNfse, id: string) => api<PassoCaptura>("POST", `fiscal/nfse/${id}/capture`, {}, { ambiente });
export async function listarNotas(ambiente: AmbienteNfse, id: string, competencia?: string): Promise<ListaNotasNfse> {
  const r = await api<Omit<ListaNotasNfse, "notas"> & { notas: NotaApi[] }>("GET", `fiscal/nfse/${id}/documents`, undefined, { ambiente, competencia });
  return { ...r, notas: r.notas.map(nota) };
}
export const verificarEventos = (ambiente: AmbienteNfse, id: string, chave: string) => api<PassoVerificacao>("POST", `fiscal/nfse/${id}/verify`, { chave }, { ambiente });
export async function diagnosticar(ambiente: AmbienteNfse, id: string) { return (await api<{ linhas: string[] }>("POST", `fiscal/nfse/${id}/diagnose`, {}, { ambiente })).linhas; }
export const baixarXmls = (ambiente: AmbienteNfse, id: string, competencia: string, chaves?: string[]) => baixar(`fiscal/nfse/${id}/zip`, { competencia, chaves }, { ambiente });
export async function buscarXmls(ambiente: AmbienteNfse, id: string, chaves: string[]) { return (await api<{ notas: NotaXml[] }>("POST", `fiscal/nfse/${id}/xmls`, { chaves }, { ambiente })).notas; }
export const lerAgenda = () => api<AgendaNfse>("GET", "fiscal/schedule");
export const salvarAgenda = (ativo: boolean, hora: string) => api<AgendaNfse>("PUT", "fiscal/schedule", { ativo, hora });
export async function lerProcurador() { return (await api<{ procurador: CertificadoNfse | null }>("GET", "fiscal/procurator")).procurador; }
export async function definirProcurador(id: string | null) { return (await api<{ procurador: CertificadoNfse | null }>("PUT", "fiscal/procurator", { id })).procurador; }

export const lerCertificados = () => api<{ certificados: Certificado[]; semCertificado: EmpresaCert[] }>("GET", "certificates");
export const enviarCertificado = (c: { pfx: string; senha: string; apelido: string }) => api<{ id: string }>("POST", "certificates", c);
export const removerCertificado = (id: string) => api("DELETE", `certificates/${id}`);

const doc = (d: Record<string, unknown>): DocumentoDfe => ({ ...(d as unknown as DocumentoDfe), emit_doc: String(d.emitDoc), emit_nome: String(d.emitNome), dest_doc: String(d.destDoc), v_total: centavos(String(d.vTotal)), ciencia_msg: String(d.cienciaMsg ?? "") });
export async function listarEmpresasDfe(ambiente: AmbienteNfse) { return (await api<{ empresas: EmpresaDfe[] }>("GET", "fiscal/dfe/companies", undefined, { ambiente })).empresas; }
export const definirCiencia = (id: string, ativo: boolean) => api("PATCH", `fiscal/dfe/${id}/auto-ciencia`, { ativo });
export const definirCapturaAuto = (id: string, ativo: boolean) => api("PATCH", `fiscal/dfe/${id}/auto-capture`, { ativo });
export const capturarDfe = (ambiente: AmbienteNfse, id: string, s: ServicoDfe) => api<PassoCaptura>("POST", `fiscal/dfe/${id}/${s}/capture`, {}, { ambiente });
export const enviarCiencias = (ambiente: AmbienteNfse, id: string) => api<PassoCiencia>("POST", `fiscal/dfe/${id}/ciencia/send`, {}, { ambiente });
export const marcarCiencia = (ambiente: AmbienteNfse, id: string, chaves: string[]) => api<{ marcadas: number }>("POST", `fiscal/dfe/${id}/ciencia/mark`, { chaves }, { ambiente });
export async function listarDocumentos(ambiente: AmbienteNfse, id: string, s: ServicoDfe, competencia?: string): Promise<ListaDfe> {
  const r = await api<{ competencias: ListaDfe["competencias"]; competencia: string; documentos: Record<string, unknown>[]; falhas: FalhaDfe[] }>("GET", `fiscal/dfe/${id}/${s}/documents`, undefined, { ambiente, competencia });
  return { ...r, documentos: r.documentos.map(doc) };
}
export const reiniciarDfe = (ambiente: AmbienteNfse, id: string, s: ServicoDfe) => api("POST", `fiscal/dfe/${id}/${s}/restart`, {}, { ambiente });
export const baixarXmlsDfe = (ambiente: AmbienteNfse, id: string, s: ServicoDfe, competencia: string, chaves?: string[]) => baixar(`fiscal/dfe/${id}/${s}/zip`, { competencia, chaves }, { ambiente });

export interface Painel {
  empresas: number; notasMes: number; notasVariacao: number | null; servicosMes: string; servicosVariacao: number | null; pendencias: number;
  serie: { competencia: string; valor: string; notas: number }[]; pendenciasLista: { texto: string; rota: string }[]; empresasLista: { id: string; cnpj: string; razao: string }[];
  saude: { percentual: number; itens: { nome: string; ok: boolean; detalhe: string }[] }; atividade: { id: string; texto: string; em: string }[]; atencao: { total: number; lista: { id: string; razao: string; cnpj: string; grau: number; motivo: string }[] };
}
export const lerPainel = () => api<Painel>("GET", "fiscal/dashboard");

export interface MemorandoResumo { id: string; seq: number; ano: number; numero: string; status: "ativo" | "cancelado"; clientStatus: "ativa" | "inativa"; exitDate: string; exitReason: string; cnpj: string; razao: string; fantasia: string; regime: string; data: string; responsaveis: string[]; atualizadoEm: string }
export interface MemorandoCompleto { id: string; seq: number; ano: number; status: string; clientStatus: string; data: Record<string, unknown>; history: { acao: string; campos?: string[]; por: string; em: string }[]; createdByName: string }
type Num = { seq: number; ano: number } | null;
export const listarMemorandos = () => api<{ memorandos: MemorandoResumo[]; semMemorando: { cnpj: string; legalName: string }[] }>("GET", "memoranda");
export const lerMemorando = (id: string) => api<MemorandoCompleto>("GET", `memoranda/${id}`);
export const criarMemorando = (memo: unknown, numero: Num) => api<MemorandoCompleto>("POST", "memoranda", { memo, numero });
export const alterarMemorando = (id: string, memo: unknown, numero: Num) => api<MemorandoCompleto>("PUT", `memoranda/${id}`, { memo, numero });
export const situacaoMemorando = (id: string, status: "ativo" | "cancelado") => api("POST", `memoranda/${id}/status`, { status });
export const situacaoCliente = (id: string, s: { situacao: "ativa" | "inativa"; dataSaida?: string; motivo?: string; obs?: string }) => api("POST", `memoranda/${id}/client`, s);
export const equipe = async () => (await api<{ equipe: string[] }>("GET", "memoranda/team")).equipe;
export const consultarCnpj = (cnpj: string) => api<Record<string, unknown>>("GET", `memoranda/lookup/cnpj/${cnpj}`);
export const consultarIe = (cnpj: string, uf: string) => api<{ cStat: string; xMotivo: string; cadastros: { ie: string; situacao: string; regime: string }[] }>("GET", `memoranda/lookup/ie/${cnpj}`, undefined, { uf });
