import { consultarCnpj, criarMemorando, situacaoCliente } from "@/services/fiscal";
import { DEPS_PADRAO, MOTIVOS_SAIDA, dig, fmtCnpj, hojeISO, memoVazio, normalizarReceita, type Memo } from "./regras";

/** Planilha de empresas exportada do sistema anterior (separada por ";"). Só preenche campos que o cadastro já tem. */
const COL = { razao: "Razão social", cnpj: "CNPJ", fone: "Fone", regime: "Regime", fantasia: "Nome fantasia", nire: "NIRE", im: "Insc. Municipal", end: "Endereço", num: "Número", compl: "Complemento", cep: "CEP", bairro: "Bairro", cidade: "Cidade", uf: "UF", cadastro: "Cadastro", abertura: "Data de abertura", desde: "Cli. desde", ate: "Cli. até", ativa: "Ativa?", motivo: "Motivo de cancelamento", ies: "Inscrições Estaduais" };
/** Coluna da planilha → departamento do cadastro. Os que não existem no padrão são criados no próprio memorando. */
const DEPARTAMENTOS: [string, string][] = [["Análise Tributária", "Análise Tributária"], ["Contábil", "Contábil"], ["Fiscal", "Fiscal"], ["Pessoal", "Departamento Pessoal (RH)"], ["Legalização", "Societário / Legalização"], ["Financeiro", "Financeiro"], ["Contabilidade Terceiros", "Contabilidade Terceiros"]];

function lerCsv(texto: string): string[][] {
  const linhas: string[][] = []; let campo = "", linha: string[] = [], aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) { if (c === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else aspas = false; } else campo += c; continue; }
    if (c === '"') aspas = true; else if (c === ";") { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && texto[i + 1] === "\n") i++; linha.push(campo); campo = ""; if (linha.some((x) => x.trim())) linhas.push(linha); linha = []; }
    else campo += c;
  }
  linha.push(campo); if (linha.some((x) => x.trim())) linhas.push(linha);
  return linhas;
}
const iso = (s: string) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s.trim()); return m ? `${m[3]}-${m[2]}-${m[1]}` : ""; };
const tira = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
function regime(s: string) {
  const r = tira(s);
  return r.startsWith("mei") ? "MEI (SIMEI)" : r.startsWith("simples") ? "Simples Nacional" : r.startsWith("lucro presumido") ? "Lucro Presumido" : r.startsWith("imune") || r.startsWith("isent") ? "Imune / Isenta" : "";
}
function motivo(s: string) { const r = tira(s); return r.includes("baixad") ? MOTIVOS_SAIDA[0] : r.includes("transferid") ? MOTIVOS_SAIDA[1] : r.includes("inadimpl") ? MOTIVOS_SAIDA[2] : MOTIVOS_SAIDA[4]; }
/** Liga o nome da planilha ao usuário do sistema (primeiro nome e algum sobrenome parecido). */
function pessoa(nome: string, equipe: string[]) {
  const n = tira(nome); if (!n || n === "sem usuario") return "";
  const p = n.split(/\s+/), achado = equipe.find((e) => tira(e) === n) ?? equipe.find((e) => { const q = tira(e).split(/\s+/); return q[0] === p[0] && (p.length === 1 || q.slice(1).some((s) => p.slice(1).some((t) => s.slice(0, 4) === t.slice(0, 4)))); });
  return achado ?? nome.trim();
}

export interface LinhaPlanilha { cnpj: string; razao: string; memo: Memo; inativa: boolean; dataSaida: string; motivo: string; obsSaida: string }
export function prepararPlanilha(texto: string, equipe: string[]): LinhaPlanilha[] {
  const [cab, ...dados] = lerCsv(texto.replace(/^﻿/, ""));
  const ix = (n: string) => cab.findIndex((c) => tira(c) === tira(n));
  if (ix(COL.cnpj) < 0 || ix(COL.razao) < 0) throw new Error("A planilha precisa das colunas Razão social e CNPJ, separadas por ponto e vírgula.");
  const v = (l: string[], n: string) => (ix(n) >= 0 ? (l[ix(n)] ?? "").trim() : "");
  return dados.map((l) => {
    const m = memoVazio(), cnpj = dig(v(l, COL.cnpj)), desde = iso(v(l, COL.desde)) || iso(v(l, COL.cadastro)) || hojeISO();
    const cep = dig(v(l, COL.cep)), end = [[v(l, COL.end), v(l, COL.num)].filter(Boolean).join(", "), v(l, COL.compl), v(l, COL.bairro), [v(l, COL.cidade), v(l, COL.uf)].filter(Boolean).join("/"), cep.length === 8 ? `CEP ${cep.slice(0, 5)}-${cep.slice(5)}` : ""].filter(Boolean).join(" – ");
    const deps = DEPS_PADRAO.map((nome) => ({ nome, on: false, resp: "" }));
    for (const [coluna, nome] of DEPARTAMENTOS) {
      const resp = v(l, coluna); if (!resp) continue;
      const i = deps.findIndex((d) => d.nome === nome), item = { nome, on: true, resp: pessoa(resp, equipe) };
      if (i >= 0) deps[i] = item; else deps.push(item);
    }
    Object.assign(m, { m_data: desde, e_desde: desde, e_razao: v(l, COL.razao), e_fantasia: v(l, COL.fantasia), e_cnpj: fmtCnpj(cnpj), e_abertura: iso(v(l, COL.abertura)), e_nire: v(l, COL.nire), e_im: v(l, COL.im), e_endereco: end, e_tel: v(l, COL.fone), e_ie: /IE:\s*([^,;]+)/.exec(v(l, COL.ies))?.[1]?.trim() ?? "", t_regime: regime(v(l, COL.regime)), deps });
    const inativa = tira(v(l, COL.ativa)).startsWith("inativ");
    return { cnpj, razao: v(l, COL.razao), memo: m, inativa, dataSaida: iso(v(l, COL.ate)) || hojeISO(), motivo: motivo(v(l, COL.motivo)), obsSaida: v(l, COL.motivo) };
  });
}

/** Completa com a Receita o que a planilha não traz: atividades, sócios, natureza, capital e situação. A planilha prevalece no que já informa. */
async function completar(m: Memo) {
  const o = normalizarReceita(await consultarCnpj(dig(m.e_cnpj)));
  Object.assign(m, { e_razao: m.e_razao || o.razao, e_fantasia: m.e_fantasia || o.fantasia, e_abertura: m.e_abertura || o.abertura, e_situacao: o.situacao || m.e_situacao, e_natureza: o.natureza || m.e_natureza, e_capital: o.capital || m.e_capital, e_endereco: m.e_endereco || o.endereco, e_tel: m.e_tel || o.tel, e_email: m.e_email || o.email, t_simples: o.simples || m.t_simples, t_regime: m.t_regime || o.regime || "" });
  if (o.socios.length) m.socios = o.socios;
  if (o.cnaes.length) { m.atividades = o.cnaes; m.svOff = {}; m.anexosManual = null; }
}

export interface Relatorio { importadas: number; puladas: string[]; erros: string[]; semReceita: string[] }
export async function importarPlanilha(linhas: LinhaPlanilha[], existentes: Set<string>, receita: boolean, progresso: (feitas: number, atual: string) => void, parar: () => boolean): Promise<Relatorio> {
  const r: Relatorio = { importadas: 0, puladas: [], erros: [], semReceita: [] }, vistos = new Set<string>();
  for (let i = 0; i < linhas.length && !parar(); i++) {
    const l = linhas[i]; progresso(i, l.razao);
    if (l.cnpj.length !== 14) { r.erros.push(`${l.razao}: CNPJ incompleto`); continue; }
    if (existentes.has(l.cnpj) || vistos.has(l.cnpj)) { r.puladas.push(l.razao); continue; }
    vistos.add(l.cnpj);
    if (receita) { try { await completar(l.memo); } catch { r.semReceita.push(l.razao); } await new Promise((ok) => setTimeout(ok, 1200)); }
    try {
      const m = await criarMemorando(l.memo, null);
      if (l.inativa) await situacaoCliente(m.id, { situacao: "inativa", dataSaida: l.dataSaida, motivo: l.motivo, obs: l.obsSaida ? `Importado da planilha: ${l.obsSaida}` : "" });
      r.importadas++;
    } catch (x) { r.erros.push(`${l.razao}: ${x instanceof Error ? x.message : "erro"}`); }
  }
  progresso(linhas.length, "");
  return r;
}
