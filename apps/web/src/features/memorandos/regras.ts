/**
 * Regras do memorando. Anexo e código de serviço vêm da tabela CNAE da planilha de apuração do Simples (public/dados/cnae.json);
 * CNAE sem anexo segue a LC 123/2006, art. 18 (§5º-B, XIV para escritórios de contabilidade e §5º-C para construção).
 */
export interface Atividade { cod: string; desc?: string; tipo?: string; on: boolean }
export interface Socio { nome: string; cpf: string; cpfReceita?: string; qualificacao: string; entrada: string }
export interface Contato { nome: string; cargo: string; telefone: string; email: string; setores: string[] }
export interface Departamento { nome: string; on: boolean; resp: string }
export interface Memo {
  [k: string]: unknown;
  m_data?: string; m_assunto?: string; e_razao?: string; e_fantasia?: string; e_cnpj?: string; e_abertura?: string; e_desde?: string; e_situacao?: string; e_natureza?: string; e_capital?: string; e_nire?: string; e_ie?: string; e_im?: string; e_endereco?: string; e_tel?: string; e_email?: string;
  t_regime?: string; t_modalidade?: string; t_simples?: string; obs?: string; atividades: Atividade[]; svOff: Record<string, boolean>; svExtra: { item: string; desc: string; anexo: string }[]; anexosManual: string[] | null; deps: Departamento[]; emissao: string[]; contatos: Contato[]; socios: Socio[]; ferramentas: string[];
}
export interface Tabela { cnae: Record<string, [string, string, number, string, string, string]>; lc116: Record<string, string>; itemAnexo: Record<string, Record<string, number>> }
export const OBS_PADRAO = "Aos setores, favor comunicar ao cliente todas as obrigações que devem ser respeitadas no início de suas atividades (tributação e classificação de produtos), em caso de troca de endereço, mudança de razão social e demais, para que sigamos a legislação vigente.\n\nCaso a empresa não tenha certificado digital, favor prestar as orientações para que faça o mesmo o mais rápido possível, de preferência o A1.\n\nSetor contábil, favor solicitar ao antigo escritório contábil da empresa os saldos iniciais para continuidade na contabilidade.";
export const DEPS_PADRAO = ["Contábil", "Fiscal", "Departamento Pessoal (RH)", "Societário / Legalização", "Financeiro"];
export const FERRAMENTAS = ["Veri", "Domínio", "Sieg", "Acessórias"];
export const EMISSOES = ["NF-e", "NFC-e", "NFS-e", "CT-e", "MDF-e", "Não emite"];
export const MOTIVOS_SAIDA = ["Encerramento da empresa", "Mudou de escritório contábil", "Inadimplência", "Rescisão pelo escritório", "Outro"];
const MESES = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
export const dig = (s: unknown) => String(s ?? "").replace(/\D/g, "");
const pad = (n: number | string, w: number) => String(n).padStart(w, "0");
export const hojeISO = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
export const br = (iso?: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? ""); return m ? `${m[3]}/${m[2]}/${m[1]}` : ""; };
const isoDeBr = (s?: string) => { const v = String(s ?? ""); if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10); const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(v); return m ? `${m[3]}-${m[2]}-${m[1]}` : ""; };
export const extenso = (iso?: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? ""); return m ? `${+m[3]} DE ${MESES[+m[2] - 1]} DE ${m[1]}` : ""; };
export const fmtCnpj = (s?: string) => { const d = String(s ?? "").replace(/[^0-9A-Za-z]/g, "").toUpperCase(); return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : s ?? ""; };
export const fmtCnae = (c: string) => { const d = pad(dig(c), 7); return `${d.slice(0, 4)}-${d.slice(4, 5)}/${d.slice(5)}`; };
const moeda = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fone = (s: unknown) => { const d = dig(s); return d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : String(s ?? ""); };
const cep = (s: unknown) => { const d = dig(s); return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : String(s ?? ""); };
export const numeroTxt = (seq: number | null | undefined, ano: number) => `${seq ? pad(seq, 2) : "--"}/${ano}`;
export const parseNumero = (s: string, anoPadrao: number) => { const m = /^\s*(?:n[º°o.]*\s*)?(\d{1,4})\s*(?:[/-]\s*(\d{4}))?\s*$/i.exec(s); return m && +m[1] >= 1 ? { seq: +m[1], ano: m[2] ? +m[2] : anoPadrao } : null; };
export const ehSimples = (r?: string) => /simples|mei/i.test(r ?? "");
function cpfOk(c: string) { if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false; for (let t = 9; t < 11; t++) { let s = 0; for (let i = 0; i < t; i++) s += +c[i] * (t + 1 - i); if (((s * 10) % 11) % 10 !== +c[t]) return false; } return true; }
export const docInvalido = (v: string) => { const d = dig(v); return !!d && d.length !== 14 && !cpfOk(d); };
export const fmtDoc = (v: string) => { const d = dig(v); return d.length === 11 ? d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4") : d.length === 14 ? fmtCnpj(d) : v; };

let cache: Promise<Tabela> | null = null;
export const carregarTabela = () => (cache ??= fetch("/dados/cnae.json").then((r) => r.json() as Promise<Tabela>));

export function infoCnae(T: Tabela, cod: string) {
  const c = pad(dig(cod), 7), r = T.cnae[c];
  let anexos: string[] = [], fatorR = false, origem = "tabela", itens: string[] = [], iss = "";
  if (r) {
    const a = String(r[1] ?? "");
    if (a && !/verificar/i.test(a)) anexos = a.split(/\s+ou\s+/i).map((s) => s.trim()).filter(Boolean);
    fatorR = r[2] === 1 || /V ou III|III ou V/i.test(a);
    itens = String(r[3] ?? "").split(/;\s*/).filter((x) => /^\d{2}\.\d{2}$/.test(x));
    iss = r[5] ?? "";
  }
  if (!anexos.length && (c === "6920601" || c === "6920602")) { anexos = ["III"]; origem = "LC 123, art. 18, §5º-B, XIV"; }
  if (!anexos.length) {
    const div = +c.slice(0, 2), cand: Record<string, number> = {};
    itens.forEach((it) => { const m = T.itemAnexo[it]; if (m) Object.keys(m).forEach((a) => { cand[a] = (cand[a] ?? 0) + m[a]; }); });
    const ord = Object.keys(cand).sort((a, b) => cand[b] - cand[a]);
    if (ord.length && (ord.length === 1 || cand[ord[0]] > cand[ord[1]])) { anexos = ord[0].split(/\s+ou\s+/i); fatorR = /V ou III|III ou V/i.test(ord[0]); origem = "pelo código de serviço"; }
    else if (div >= 10 && div <= 33) { anexos = ["II"]; origem = "regra geral (indústria)"; }
    else if (div >= 45 && div <= 47) { anexos = ["I"]; origem = "regra geral (comércio)"; }
    else if (div >= 41 && div <= 43) { anexos = ["IV"]; origem = "regra geral (construção, art. 18 §5º-C)"; }
    else if (div >= 49 && div <= 53) { anexos = ["III"]; origem = "regra geral (transporte)"; }
    else origem = "verificar";
  }
  return { cod: c, desc: r ? r[0] : "", anexos, fatorR, origem, itens, iss, item1desc: r ? r[4] : "" };
}
export const anexoLabel = (i: ReturnType<typeof infoCnae>) => (!i.anexos.length ? "Verificar" : i.anexos.join(" ou ") + (i.fatorR && i.anexos.length > 1 ? " (fator r)" : ""));
export function anexosAuto(T: Tabela, d: Memo) { const s = new Set<string>(); d.atividades.filter((a) => a.on).forEach((a) => infoCnae(T, a.cod).anexos.forEach((x) => s.add(x))); return ["I", "II", "III", "IV", "V"].filter((x) => s.has(x)); }
export const anexosAtuais = (T: Tabela, d: Memo) => d.anexosManual ?? anexosAuto(T, d);
export function servicos(T: Tabela, d: Memo) {
  const out: { k: string; item: string; desc: string; anexo: string; iss: string; on: boolean; extra: boolean; ix?: number }[] = [], visto = new Set<string>();
  d.atividades.filter((a) => a.on).forEach((a) => {
    const i = infoCnae(T, a.cod);
    i.itens.forEach((it) => { const anx = i.anexos.join("/") || "Verificar", k = `${it}|${anx}`; if (visto.has(k)) return; visto.add(k); out.push({ k, item: it, desc: T.lc116[it] || (i.itens.length === 1 ? i.item1desc : "") || "", anexo: anx, iss: i.iss, on: !d.svOff[k], extra: false }); });
  });
  d.svExtra.forEach((x, ix) => out.push({ k: `x${ix}`, item: x.item, desc: x.desc, anexo: x.anexo, iss: "", on: true, extra: true, ix }));
  return out;
}
export const contatoVazio = (): Contato => ({ nome: "", cargo: "", telefone: "", email: "", setores: [] });
export function memoVazio(): Memo {
  return { m_data: hojeISO(), m_assunto: "ENTRADA DE EMPRESA EM NOSSO ESCRITÓRIO", e_desde: hojeISO(), obs: OBS_PADRAO, atividades: [], svOff: {}, svExtra: [], anexosManual: null, deps: DEPS_PADRAO.map((nome) => ({ nome, on: false, resp: "" })), emissao: [], contatos: [contatoVazio()], socios: [], ferramentas: [] };
}
export interface Receita { razao?: string; fantasia?: string; cnpj?: string; abertura?: string; situacao?: string; natureza?: string; capital?: string; endereco?: string; tel?: string; email?: string; simples?: string; regime?: string; regimeDica?: string; socios: Socio[]; cnaes: Atividade[] }
const mascara = (v: string) => { const s = String(v ?? ""); return /\d/.test(s) ? s : ""; };
type J = Record<string, any>;
const endereco = (log: string, j: J) => [log + (j.numero ? `, ${j.numero}` : ""), j.complemento, j.bairro, (j.municipio ?? "") + (j.uf ? `/${j.uf}` : ""), j.cep ? `CEP ${cep(j.cep)}` : ""].filter((x) => x && String(x).trim()).join(" – ");
export function normalizarReceita(j: J): Receita {
  const o: Receita = { socios: [], cnaes: [] };
  if (j.razao_social !== undefined || j.cnae_fiscal !== undefined) {
    Object.assign(o, { razao: j.razao_social ?? "", fantasia: j.nome_fantasia ?? "", cnpj: fmtCnpj(j.cnpj), abertura: isoDeBr(j.data_inicio_atividade), situacao: j.descricao_situacao_cadastral ?? "", natureza: j.natureza_juridica ?? "", capital: j.capital_social != null ? moeda(+j.capital_social) : "", endereco: endereco([j.descricao_tipo_de_logradouro, j.logradouro].filter(Boolean).join(" "), j),
      tel: [j.ddd_telefone_1, j.ddd_telefone_2].filter((x) => dig(x).length >= 10).map(fone).join(" / "), email: String(j.email ?? "").toLowerCase() });
    o.socios = (j.qsa ?? []).map((x: J) => { const doc = String(x.cnpj_cpf_do_socio ?? ""), cheio = dig(doc).length === 14 && !doc.includes("*"); return { nome: x.nome_socio ?? "", cpf: cheio ? fmtCnpj(doc) : "", cpfReceita: cheio ? "" : mascara(doc), qualificacao: x.qualificacao_socio ?? "", entrada: isoDeBr(x.data_entrada_sociedade) }; }).filter((x: Socio) => x.nome);
    if (j.cnae_fiscal) o.cnaes.push({ cod: pad(dig(j.cnae_fiscal), 7), desc: j.cnae_fiscal_descricao ?? "", tipo: "Principal", on: true });
    (j.cnaes_secundarios ?? []).forEach((c: J) => { if (+dig(c.codigo) > 0) o.cnaes.push({ cod: pad(dig(c.codigo), 7), desc: c.descricao ?? "", tipo: "Secundária", on: true }); });
    if (j.opcao_pelo_mei === true) { o.simples = `Optante pelo SIMEI${j.data_opcao_pelo_mei ? ` desde ${br(j.data_opcao_pelo_mei)}` : ""}`; o.regime = "MEI (SIMEI)"; }
    else if (j.opcao_pelo_simples === true) { o.simples = `Optante desde ${br(j.data_opcao_pelo_simples)}`; o.regime = "Simples Nacional"; }
    else if (j.opcao_pelo_simples === false) o.simples = `Não optante${j.data_exclusao_do_simples ? ` (excluída em ${br(j.data_exclusao_do_simples)})` : ""}`;
    else o.simples = "Não informado na consulta";
    if (!o.regime && Array.isArray(j.regime_tributario) && j.regime_tributario.length) {
      const u = [...j.regime_tributario].sort((a, b) => (+b.ano || 0) - (+a.ano || 0))[0], f = String(u.forma_de_tributacao ?? "").toUpperCase();
      if (f.includes("PRESUMIDO")) o.regime = "Lucro Presumido"; else if (f.includes("REAL")) o.regimeDica = "Lucro Real"; else if (f.includes("ARBITRADO")) o.regime = "Lucro Arbitrado"; else if (f.includes("IMUNE") || f.includes("ISENT")) o.regime = "Imune / Isenta";
      if (o.regime || o.regimeDica) o.simples += ` · última declaração: ${u.forma_de_tributacao ?? ""} (${u.ano})`;
    }
  } else if (j.nome !== undefined) {
    Object.assign(o, { razao: j.nome ?? "", fantasia: j.fantasia ?? "", cnpj: fmtCnpj(j.cnpj), abertura: isoDeBr(j.abertura), situacao: j.situacao ?? "", natureza: j.natureza_juridica ?? "", capital: j.capital_social ? moeda(parseFloat(j.capital_social)) : "", endereco: endereco(j.logradouro ?? "", j), tel: j.telefone ?? "", email: String(j.email ?? "").toLowerCase() });
    o.socios = (j.qsa ?? []).map((x: J) => ({ nome: x.nome ?? "", cpf: "", qualificacao: String(x.qual ?? "").replace(/^\d+-/, ""), entrada: "" })).filter((x: Socio) => x.nome);
    (j.atividade_principal ?? []).forEach((c: J) => { if (+dig(c.code) > 0) o.cnaes.push({ cod: pad(dig(c.code), 7), desc: c.text ?? "", tipo: "Principal", on: true }); });
    (j.atividades_secundarias ?? []).forEach((c: J) => { if (+dig(c.code) > 0) o.cnaes.push({ cod: pad(dig(c.code), 7), desc: c.text ?? "", tipo: "Secundária", on: true }); });
    if (j.simei?.optante) { o.simples = "Optante pelo SIMEI"; o.regime = "MEI (SIMEI)"; }
    else if (j.simples?.optante) { o.simples = `Optante${j.simples.data_opcao ? ` desde ${br(isoDeBr(j.simples.data_opcao))}` : ""}`; o.regime = "Simples Nacional"; }
    else o.simples = j.simples ? "Não optante" : "Não informado na consulta";
  } else throw new Error("Formato de resposta não reconhecido.");
  return o;
}
const listaSetores = (ds: Departamento[]) => { const n = ds.filter((d) => d.on).map((d) => d.nome); return n.length > 1 ? `${n.slice(0, -1).join(", ")} e ${n[n.length - 1]}` : n[0] ?? ""; };
export type Cel = string | { txt: string; sub?: string; tag?: string };
export type Item =
  | { t: "head"; num: string; cancel: boolean; data: string; setores: string; setoresOn: boolean; saud: string; assunto: string }
  | { t: "sec"; title: string; extra?: string } | { t: "kv"; l: string; v: string } | { t: "kv2"; a: [string, string]; b: [string, string] } | { t: "p"; text: string; italic?: boolean }
  | { t: "tab"; k: "so" | "ct" | "at" | "sv" | "dp"; head: string[]; bold?: number[]; rows: Cel[][] };
/** Conteúdo do memorando em itens neutros; PDF e Word são desenhados a partir dele. */
export function modeloMemo(T: Tabela, d: Memo, seq: number, ano: number, cancelado: boolean): Item[] {
  const I: Item[] = [], val = (x: unknown) => String(x ?? "").trim() || "—", atv = d.atividades.filter((a) => a.on), reg = d.t_regime ?? "";
  const on = d.deps.filter((x) => x.on), sv = servicos(T, d).filter((s) => s.on), anx = anexosAtuais(T, d), fr = atv.some((a) => infoCnae(T, a.cod).fatorR);
  I.push({ t: "head", num: `Nº ${numeroTxt(seq, ano)}`, cancel: cancelado, data: `Em ${extenso(d.m_data)}`, setores: listaSetores(d.deps), setoresOn: on.length > 0, saud: on.length === 1 ? "Ao setor" : "Aos setores", assunto: val(d.m_assunto) });
  I.push({ t: "sec", title: "Dados da empresa" }, { t: "kv", l: "Nome", v: val(d.e_razao) }, { t: "kv", l: "Nome fantasia", v: val(d.e_fantasia) }, { t: "kv2", a: ["CNPJ", val(d.e_cnpj)], b: ["Abertura", val(br(d.e_abertura))] }, { t: "kv2", a: ["Cliente desde", val(br(d.e_desde))], b: ["Situação", val(d.e_situacao)] }, { t: "kv2", a: ["NIRE", val(d.e_nire)], b: ["Capital social", val(d.e_capital)] }, { t: "kv2", a: ["Inscrição estadual", val(d.e_ie)], b: ["Inscrição municipal", val(d.e_im)] });
  if (d.e_natureza) I.push({ t: "kv", l: "Natureza jurídica", v: val(d.e_natureza) });
  I.push({ t: "kv", l: "Endereço", v: val(d.e_endereco) }, { t: "kv2", a: ["Telefone da empresa", val(d.e_tel)], b: ["E-mail da empresa", val(d.e_email)] });
  const socs = d.socios.filter((x) => x.nome.trim());
  if (socs.length) I.push({ t: "sec", title: "Quadro societário", extra: `${socs.length} sócio${socs.length > 1 ? "s" : ""}` }, { t: "tab", k: "so", head: ["Nome", "CPF / CNPJ", "Qualificação", "Entrada"], bold: [0], rows: socs.map((x) => [val(x.nome), val(x.cpf), val(x.qualificacao), val(br(x.entrada))]) });
  const cts = d.contatos.filter((c) => (c.nome || c.telefone || c.email).trim());
  if (cts.length) I.push({ t: "sec", title: "Contatos da empresa", extra: `${cts.length} contato${cts.length > 1 ? "s" : ""}` }, { t: "tab", k: "ct", head: ["Nome / cargo", "Telefone", "E-mail", "Setores"], bold: [0], rows: cts.map((c) => [{ txt: val(c.nome), sub: c.cargo }, val(c.telefone), val(c.email), val(c.setores.join(", "))]) });
  I.push({ t: "sec", title: "Tributação" }, { t: "kv", l: "Opção tributária", v: val(reg.toUpperCase() + (reg === "Simples Nacional" && d.t_modalidade ? ` – ${d.t_modalidade.toUpperCase()}` : "")) });
  if (ehSimples(reg)) { I.push({ t: "kv", l: "Situação no Simples", v: val(d.t_simples) }); if (/simples/i.test(reg)) I.push({ t: "kv", l: "Anexos do Simples", v: val(anx.length ? anx.map((a) => `Anexo ${a}`).join(", ") + (fr ? " · atividade sujeita ao fator r" : "") : "") }); }
  const pr = atv.find((a) => a.tipo === "Principal");
  I.push({ t: "kv", l: "CNAE principal", v: val(pr ? `${fmtCnae(pr.cod)} – ${pr.desc || infoCnae(T, pr.cod).desc}` : "") });
  if (atv.length) I.push({ t: "sec", title: "Atividades que podem ser exercidas", extra: `${atv.length} CNAE${atv.length > 1 ? "s" : ""}` }, { t: "tab", k: "at", head: ["CNAE", "Atividade", "Anexo", "Cód. serviço"], rows: atv.map((a) => { const i = infoCnae(T, a.cod); return [fmtCnae(a.cod), { txt: a.desc || i.desc || "—", tag: a.tipo === "Principal" ? "PRINCIPAL" : "" }, i.anexos.join("/") || "Verificar", i.itens.join(", ") || "—"]; }) });
  if (sv.length) I.push({ t: "sec", title: "Códigos de serviço (LC 116)" }, { t: "tab", k: "sv", head: ["Código", "Descrição", "Anexo"], rows: sv.map((x) => [x.item, x.desc || "—", x.anexo || "—"]) });
  I.push({ t: "sec", title: "Departamentos e responsáveis" });
  I.push(on.length ? { t: "tab", k: "dp", head: ["Departamento", "Responsável pela empresa"], bold: [0], rows: on.map((x) => [x.nome, val(x.resp)]) } : { t: "p", text: "Nenhum setor marcado.", italic: true });
  I.push({ t: "sec", title: "Rotinas, acessos e obrigações" }, { t: "kv2", a: ["Pró-labore", val(d.r_prolabore)], b: ["Folha de pagamento", val(d.r_folha)] }, { t: "kv2", a: ["Certificado digital", val(d.r_cert)], b: ["Domínio", val(d.r_dominio)] }, { t: "kv2", a: ["Sintegra", val(d.r_sintegra)], b: ["SPED Contábil", val(d.r_spedc)] }, { t: "kv2", a: ["SPED Fiscal", val(d.r_spedf)], b: ["Fará a emissão", val(d.emissao.join(", "))] }, { t: "kv", l: "Ferramentas a configurar", v: val(d.ferramentas.join(", ")) }, { t: "kv2", a: ["Login NFS-e", val(d.r_loginNfse)], b: ["Senha NFS-e", val(d.r_senhaNfse)] }, { t: "kv2", a: ["Cód. acesso Simples", val(d.r_codSimples)], b: ["Senha SEFAZ-ES AGV", val(d.r_sefaz)] }, { t: "kv2", a: ["CPF ADM", val(d.r_cpfAdm)], b: ["PIS", val(d.r_pis)] }, { t: "kv", l: "Documentos digitalizados em", v: val(d.r_docs) });
  const obs = String(d.obs ?? "").split(/\n\s*\n|\n/).map((x) => x.trim()).filter(Boolean);
  if (obs.length) { I.push({ t: "sec", title: "Observações" }); obs.forEach((text) => I.push({ t: "p", text })); }
  return I;
}
export const nomeArquivo = (d: Memo, seq: number, ano: number, ext: string) => `Memorando-${numeroTxt(seq, ano).replace("/", "-")}-${String(d.e_razao ?? "empresa").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50)}.${ext}`;
