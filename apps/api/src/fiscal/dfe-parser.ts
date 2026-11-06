import { No, buscar, nomeDe, texto, valor } from "./xml";

export interface DocLido {
  chave: string; conteudo: "resumo" | "completa"; papel: string; emissao: string; emitDoc: string; emitNome: string; destDoc: string; destNome: string; tpNf: string; vTotal: string; situacao: string; modelo: string; serie: string; numero: string;
}
const doc = (n: No | null, g: string) => { for (const k of ["CNPJ", "CPF", "idEstrangeiro"]) { const v = texto(n, g ? `${g}/${k}` : k); if (v) return v; } return ""; };
/** Número e série não vêm no resumo: saem da chave (cUF 2, AAMM 4, CNPJ 14, mod 2, série 3, número 9). */
export const pelaChave = (c: string) => ({ modelo: c.slice(20, 22), serie: c.slice(22, 25).replace(/^0+/, "") || "0", numero: c.slice(25, 34).replace(/^0+/, "") });
const id = (n: No, p: RegExp) => (n.getAttribute?.("Id") ?? "").replace(p, "");

export function lerResumoNfe(r: No, cnpj: string): DocLido {
  const chave = texto(r, "chNFe");
  return { ...pelaChave(chave), chave, conteudo: "resumo", papel: "destinatario", emissao: texto(r, "dhEmi"), emitDoc: doc(r, ""), emitNome: texto(r, "xNome"), destDoc: cnpj, destNome: "", tpNf: texto(r, "tpNF"),
    vTotal: valor(texto(r, "vNF")), situacao: ({ "1": "normal", "2": "denegada", "3": "cancelada" } as Record<string, string>)[texto(r, "cSitNFe")] ?? "normal" };
}
export function lerNfe(r: No, cnpj: string): DocLido | null {
  const inf = buscar(r, "infNFe"); if (!inf) return null;
  const chave = id(inf, /^NFe/);
  const emit = doc(inf, "emit"), dest = doc(inf, "dest"), transp = doc(inf, "transp/transporta");
  const prot = buscar(r, "infProt"), cstat = texto(prot, "cStat");
  return { ...pelaChave(chave), chave, conteudo: "completa", papel: emit === cnpj ? "emitente" : dest === cnpj ? "destinatario" : transp === cnpj ? "transportador" : "terceiro", emissao: texto(inf, "ide/dhEmi") || texto(inf, "ide/dEmi"),
    emitDoc: emit, emitNome: texto(inf, "emit/xNome"), destDoc: dest, destNome: texto(inf, "dest/xNome"), tpNf: texto(inf, "ide/tpNF"), vTotal: valor(texto(inf, "total/ICMSTot/vNF")),
    situacao: ["110", "301", "302", "303"].includes(cstat) ? "denegada" : ["101", "151", "155"].includes(cstat) ? "cancelada" : "normal" };
}
export function lerCte(r: No, cnpj: string): DocLido | null {
  const inf = buscar(r, "infCte") ?? buscar(r, "infCTe"); if (!inf) return null;
  const chave = id(inf, /^CTe/);
  const partes: [string, string][] = [["remetente", doc(inf, "rem")], ["expedidor", doc(inf, "exped")], ["recebedor", doc(inf, "receb")], ["destinatario", doc(inf, "dest")]];
  const toma = texto(inf, "ide/toma3/toma") || texto(inf, "ide/toma4/toma");
  const iTom = ["0", "1", "2", "3"].indexOf(toma);
  const docToma = iTom >= 0 ? partes[iTom][1] : doc(inf, "ide/toma4") || doc(inf, "toma");
  const emit = doc(inf, "emit");
  let papel = emit === cnpj ? "emitente" : docToma === cnpj ? "tomador" : "terceiro";
  if (papel === "terceiro") papel = partes.find(([, d]) => d === cnpj)?.[0] ?? papel;
  const prot = buscar(r, "infProt"), cstat = texto(prot, "cStat");
  return { ...pelaChave(chave), chave, conteudo: "completa", papel, emissao: texto(inf, "ide/dhEmi"), emitDoc: emit, emitNome: texto(inf, "emit/xNome"), destDoc: docToma, destNome: texto(inf, "dest/xNome"), tpNf: "",
    vTotal: valor(texto(inf, "vPrest/vTPrest")), situacao: ["101", "135"].includes(cstat) ? "cancelada" : ["110", "301", "302", "303"].includes(cstat) ? "denegada" : "normal" };
}
export const chaveValida = (c: string) => /^[0-9A-Z]{44}$/.test(c);
export const rotaDe = (r: No) => nomeDe(r);
