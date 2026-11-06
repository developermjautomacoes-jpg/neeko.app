export type AmbienteNfse = "producao" | "restrita";
export type PapelNfse = "prestador" | "tomador" | "intermediario" | "outro";
export type SituacaoNfse = "normal" | "cancelada" | "substituida" | "em_analise" | "bloqueada";
export type ModoBuscaNfse = "certificado" | "procuracao";
export interface CertificadoNfse { id: string; nome: string; documento: string; validade: string }
export interface EmpresaCert { cnpj: string; razao: string }
export interface Certificado { id: string; holder: string; document: string; kind: string; validUntil: string; nickname: string; createdAt: string; empresas: EmpresaCert[] }
export interface EmpresaNfse { cadastroId: string; regime: string; fantasia: string; id: string; cnpj: string; razao: string; certId: string; modo: ModoBuscaNfse; certificado: CertificadoNfse | null; ultimoNsu: number; ultimaCaptura: string | null; ultimoErro: string | null; notas: number; falhas: number }
/** Valores em centavos inteiros (a API devolve decimal em texto). */
export interface NotaNfse {
  chave: string; nsu: number; papel: PapelNfse; competencia: string; emissao: string; numero: string; serie: string; prest_doc: string; prest_nome: string; toma_doc: string; toma_nome: string;
  trib_nac: string; c_nbs: string; x_nbs: string; c_loc_incid: string; cno_obra: string; desc_nac: string; descricao: string; mun_incid: string; tp_ret_iss: string; aliq: string;
  v_serv: number; v_bc: number; v_iss: number; v_ret_cp: number; v_ret_irrf: number; v_ret_csll: number; v_pis: number; v_cofins: number; v_total_ret: number; v_liq: number; situacao: SituacaoNfse;
}
export interface FalhaNfse { nsu: number; chave: string; motivo: string; em: string }
export interface ListaNotasNfse { competencias: { competencia: string; notas: number }[]; competencia: string; notas: NotaNfse[]; falhas: FalhaNfse[] }
export type PassoCaptura =
  | { status: "lote" | "fim"; ultimoNsu: number; notas: number; repetidas?: number; eventos: number; ignorados: number; falhas: number }
  | { status: "aguardar"; segundos: number; mensagem: string }
  | { status: "erro"; mensagem: string };
export type PassoVerificacao = { status: "ok"; eventos: number; situacao: SituacaoNfse } | { status: "aguardar"; segundos: number; mensagem: string } | { status: "erro"; mensagem: string };
export interface AgendaNfse { ativo: boolean; hora: string; status: string; inicio: string | null; fim: string | null; linhas: string[] }

export type ServicoDfe = "nfe" | "cte";
export type SituacaoDfe = "normal" | "cancelada" | "denegada";
export interface EstadoDfe { ultimoNsu: number; maxNsu: number; proximaEm: string | null; ultimaCaptura: string | null; ultimoErro: string | null; documentos: number; resumos: number; pendentes: number }
export interface EmpresaDfe { id: string; cnpj: string; razao: string; certificado: CertificadoNfse | null; cienciaAuto: boolean; capturaAuto: boolean; falhas: number; nfe: EstadoDfe; cte: EstadoDfe }
export interface DocumentoDfe { chave: string; nsu: number; conteudo: "resumo" | "completa"; papel: string; numero: string; serie: string; emissao: string; competencia: string; emit_doc: string; emit_nome: string; dest_doc: string; v_total: number; situacao: SituacaoDfe; ciencia: "" | "pendente" | "enviada" | "erro"; ciencia_msg: string }
export interface FalhaDfe { servico: ServicoDfe; nsu: number; motivo: string; em: string }
export interface ListaDfe { competencias: { competencia: string; notas: number }[]; competencia: string; documentos: DocumentoDfe[]; falhas: FalhaDfe[] }
export type PassoCiencia = { status: "ok"; enviadas: number; erros: number; restantes: number } | { status: "erro"; mensagem: string };
