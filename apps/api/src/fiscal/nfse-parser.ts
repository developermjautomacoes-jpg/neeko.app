import { No, buscar, filho, lerXml, texto, valor } from "./xml";

export const NFSE_EVENTOS: Record<string, string> = {
  CANCELAMENTO: "101101", CANCELAMENTO_POR_SUBSTITUICAO: "105102", SOLICITACAO_CANCELAMENTO_ANALISE_FISCAL: "101103", CANCELAMENTO_DEFERIDO_ANALISE_FISCAL: "105104",
  CANCELAMENTO_INDEFERIDO_ANALISE_FISCAL: "105105", CANCELAMENTO_POR_OFICIO: "305101", BLOQUEIO_POR_OFICIO: "305102", DESBLOQUEIO_POR_OFICIO: "305103",
};
export interface NotaLida {
  papel: string; competencia: string; dataCompetencia: string; emissao: string; numero: string; serie: string; nDps: string; cstat: string; prestDoc: string; prestNome: string; tomaDoc: string; tomaNome: string;
  intermDoc: string; opSimples: string; tribNac: string; tribMun: string; descNac: string; descricao: string; cNbs: string; xNbs: string; cLocIncid: string; cnoObra: string; munIncid: string; tribIssqn: string; tpRetIss: string;
  aliq: string; tpRetPis: string; vServ: string; vBc: string; vIss: string; vRetCp: string; vRetIrrf: string; vRetCsll: string; vPis: string; vCofins: string; vTotalRet: string; vLiq: string; vIbs: string; vCbs: string;
}

/** Leiaute da NFS-e nacional, gerada no ADN. */
export function lerNota(xml: string, cnpj: string): NotaLida | null {
  const r = lerXml(xml);
  if (!r || buscar(r, "NFSe") !== r) return null;
  const inf = filho(r, "infNFSe"); if (!inf) return null;
  const t = (c: string) => texto(inf, c);
  const d = (c: string) => t("DPS/infDPS/" + c);
  const doc = (g: string) => { for (const k of ["CNPJ", "CPF", "NIF"]) { const v = d(`${g}/${k}`); if (v) return v; } return ""; };
  const prest = doc("prest"), toma = doc("toma"), interm = doc("interm");
  const comp = d("dCompet"), tomadorEmite = d("tpEmit") === "2";
  return {
    competencia: comp.slice(0, 7), dataCompetencia: comp, emissao: d("dhEmi") || t("dhProc"), numero: t("nNFSe"), serie: d("serie"), nDps: d("nDPS"), cstat: t("cStat"),
    papel: prest === cnpj ? "prestador" : toma === cnpj ? "tomador" : interm === cnpj ? "intermediario" : "outro",
    prestDoc: prest, prestNome: d("prest/xNome") || (tomadorEmite ? "" : t("emit/xNome")), tomaDoc: toma, tomaNome: d("toma/xNome") || (tomadorEmite ? t("emit/xNome") : ""), intermDoc: interm,
    opSimples: d("prest/regTrib/opSimpNac"), tribNac: d("serv/cServ/cTribNac"), tribMun: d("serv/cServ/cTribMun"), descNac: t("xTribNac"), descricao: d("serv/cServ/xDescServ"), cNbs: d("serv/cServ/cNBS"), xNbs: t("xNBS"),
    cLocIncid: t("cLocIncid"), cnoObra: d("serv/obra/cObra"), munIncid: t("xLocIncid"), tribIssqn: d("valores/trib/tribMun/tribISSQN"), tpRetIss: d("valores/trib/tribMun/tpRetISSQN"),
    aliq: t("valores/pAliqAplic") || d("valores/trib/tribMun/pAliq"), tpRetPis: d("valores/trib/tribFed/piscofins/tpRetPisCofins"),
    vServ: valor(d("valores/vServPrest/vServ")), vBc: valor(t("valores/vBC")), vIss: valor(t("valores/vISSQN")), vRetCp: valor(d("valores/trib/tribFed/vRetCP")), vRetIrrf: valor(d("valores/trib/tribFed/vRetIRRF")),
    vRetCsll: valor(d("valores/trib/tribFed/vRetCSLL")), vPis: valor(d("valores/trib/tribFed/piscofins/vPis")), vCofins: valor(d("valores/trib/tribFed/piscofins/vCofins")), vTotalRet: valor(t("valores/vTotalRet")), vLiq: valor(t("valores/vLiq")),
    vIbs: valor(t("IBSCBS/totCIBS/gIBS/vIBSTot")), vCbs: valor(t("IBSCBS/totCIBS/gCBS/vCBS")),
  };
}
export const codigoEvento = (xml: string, tipo: string) => NFSE_EVENTOS[tipo] ?? /<(?:\w+:)?e(\d{6})[\s>]/.exec(xml)?.[1] ?? "";
export const chaveEvento = (xml: string) => /<(?:\w+:)?chNFSe>(\d{50})</.exec(xml)?.[1] ?? "";

/** A situação sai sempre dos eventos, na ordem em que aconteceram. */
export function situacaoPorEventos(codigos: string[]): string {
  let s = "normal";
  for (const c of codigos) {
    if (s === "cancelada" || s === "substituida") break;
    if (["101101", "105104", "305101"].includes(c)) s = "cancelada";
    else if (c === "105102") s = "substituida";
    else if (c === "101103") s = "em_analise";
    else if (c === "105105" || c === "305103") s = "normal";
    else if (c === "305102") s = "bloqueada";
  }
  return s;
}
export type { No };
