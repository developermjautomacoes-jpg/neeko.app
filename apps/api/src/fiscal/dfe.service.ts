import { Injectable } from "@nestjs/common";
import type { Company, Prisma } from "@prisma/client";
import JSZip from "jszip";
import { CertificadosService, Material } from "../certificates/certificates.service";
import { naoEncontrado } from "../common/errors";
import { config } from "../config";
import { PrismaService } from "../prisma.service";
import { eventoCiencia } from "./ciencia";
import { DocLido, chaveValida, lerCte, lerNfe, lerResumoNfe } from "./dfe-parser";
import { Resposta, chamar, faltaCadeia } from "./http";
import { Passo } from "./nfse.service";
import { No, abrirZip, buscar, buscarTodos, comprimir, descomprimir, filho, lerXml, nomeDe, texto } from "./xml";

export type Servico = "nfe" | "cte";
const SERVICOS = {
  nfe: { producao: "https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx", restrita: "https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx", portal: "http://www.portalfiscal.inf.br/nfe", operacao: "NFeDistribuicaoDFe", versao: "1.01", metodo: "nfeDistDFeInteresse", dados: "nfeDadosMsg", acoes: ["nfeDistDFeInteresse"] },
  cte: { producao: "https://www1.cte.fazenda.gov.br/CTeDistribuicaoDFe/CTeDistribuicaoDFe.asmx", restrita: "https://hom1.cte.fazenda.gov.br/CTeDistribuicaoDFe/CTeDistribuicaoDFe.asmx", portal: "http://www.portalfiscal.inf.br/cte", operacao: "CTeDistribuicaoDFe", versao: "1.00", metodo: "cteDistDFeInteresse", dados: "cteDadosMsg", acoes: ["cteDistDFeInteresse", "CTeDistribuicaoDFe"] },
} as const;
const EVENTO_URL: Record<string, string> = { producao: "https://www.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx", restrita: "https://hom1.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx" };
const ESPERA_S = 3660;      // 1 hora da NT 2014.002, com folga
const CIENCIA_LOTE = 20;    // limite de eventos por lote
const LEASE_MS = 120000;
const hora = () => new Date(Date.now() + ESPERA_S * 1000);
function corte() { const d = new Date(Date.now() - 3 * 3600 * 1000); d.setUTCMonth(d.getUTCMonth() - 2); return d.toISOString().slice(0, 10); }

/** Sem a cadeia reconhecida a chamada falha: diferente do sistema de origem, nunca repete sem verificar o servidor. */
async function post(url: string, acoes: string[], corpo: string, m: Material, retorno: string): Promise<Resposta> {
  const env = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body>${corpo}</soap12:Body></soap12:Envelope>`;
  let r!: Resposta;
  for (const a of acoes) {
    r = await chamar({ url, metodo: "POST", corpo: env, cert: m.cert, key: m.key, ca: m.ca, timeoutMs: 90000, cabecalhos: { "content-type": `application/soap+xml;charset=utf-8;action="${a}"` } });
    if (r.erroCodigo || r.corpo.includes(retorno)) break;
  }
  return r;
}
function retorno(r: Resposta, nome: string): { no?: No; erro?: string } {
  if (faltaCadeia(r.erroCodigo)) return { erro: `O servidor da SEFAZ não foi reconhecido (${r.erroCodigo}). Configure FISCAL_CA_FILE com a cadeia ICP-Brasil.` };
  if (r.erroCodigo) return { erro: `Falha de comunicação com a SEFAZ: ${r.erro}` };
  const raiz = lerXml(r.corpo);
  const no = raiz ? buscar(raiz, nome) : null;
  return no ? { no } : { erro: `Resposta inesperada da SEFAZ (HTTP ${r.http}).` };
}

@Injectable()
export class DfeService {
  constructor(private prisma: PrismaService, private certs: CertificadosService) {}
  private k(e: Company, amb: string, s: string) { return { organizationId_companyId_environment_servico: { organizationId: e.organizationId, companyId: e.id, environment: amb, servico: s } }; }
  private onde(e: Company, amb: string) { return { organizationId: e.organizationId, companyId: e.id, environment: amb }; }
  private estado(e: Company, amb: string, s: Servico) { return this.prisma.dfeState.upsert({ where: this.k(e, amb, s), create: { ...this.onde(e, amb), servico: s, corte: corte() }, update: {} }); }

  async capturar(e: Company, amb: string, s: Servico): Promise<Passo> {
    await this.estado(e, amb, s);
    const agora = new Date();
    const l = await this.prisma.dfeState.updateMany({ where: { ...this.onde(e, amb), servico: s, OR: [{ leaseUntil: null }, { leaseUntil: { lt: agora } }] }, data: { leaseUntil: new Date(agora.getTime() + LEASE_MS) } });
    if (!l.count) return { status: "aguardar", segundos: 5, mensagem: "Outra captura desta empresa está em andamento." };
    try { return await this.lote(e, amb, s); }
    finally { await this.prisma.dfeState.update({ where: this.k(e, amb, s), data: { leaseUntil: null } }).catch(() => undefined); }
  }

  private async lote(e: Company, amb: string, s: Servico): Promise<Passo> {
    const st = await this.estado(e, amb, s);
    if (st.nextAt && st.nextAt > new Date()) return { status: "aguardar", segundos: Math.ceil((st.nextAt.getTime() - Date.now()) / 1000), mensagem: "A SEFAZ só permite nova consulta depois de 1 hora." };
    const atualiza = (data: Prisma.DfeStateUpdateInput) => this.prisma.dfeState.update({ where: this.k(e, amb, s), data });
    const falha = async (mensagem: string): Promise<Passo> => { await atualiza({ lastError: mensagem }); return { status: "erro", mensagem }; };
    const c = await this.certs.daDfe(e);
    if (!c.cert) return falha(c.erro);
    const { material: m, erro } = await this.certs.material(c.cert);
    if (!m) return falha(erro ?? "Certificado indisponível.");
    const w = SERVICOS[s], nsu = st.lastNsu, ns = `${w.portal}/wsdl/${w.operacao}`;
    const pedido = `<distDFeInt xmlns="${w.portal}" versao="${w.versao}"><tpAmb>${amb === "producao" ? "1" : "2"}</tpAmb><cUFAutor>${config().DFE_CUF_AUTOR}</cUFAutor><CNPJ>${e.cnpj}</CNPJ><distNSU><ultNSU>${String(nsu).padStart(15, "0")}</ultNSU></distNSU></distDFeInt>`;
    const corpo = `<${w.metodo} xmlns="${ns}"><${w.dados}>${pedido}</${w.dados}></${w.metodo}>`;
    const url = (s === "nfe" ? config().DFE_URL_NFE : config().DFE_URL_CTE) ?? w[amb as "producao" | "restrita"];
    const ret = retorno(await post(url, w.acoes.map((a) => `${ns}/${a}`), corpo, m, "retDistDFeInt"), "retDistDFeInt");
    if (!ret.no) return falha(ret.erro ?? "Falha na SEFAZ.");
    const no = ret.no, cstat = texto(no, "cStat"), motivo = texto(no, "xMotivo");
    const ult = BigInt(texto(no, "ultNSU") || 0), max = BigInt(texto(no, "maxNSU") || 0);
    if (cstat === "656") {
      // A 656 devolve o último NSU já consultado para o CNPJ (NT 2014.002): a captura segue dele.
      const moveu = ult > 0n && ult !== nsu;
      await atualiza({ nextAt: hora(), ...(moveu ? { lastNsu: ult } : {}), lastError: moveu ? `Outro sistema ou consulta já usou este CNPJ até o NSU ${ult}. A captura continua a partir dele; o que veio antes só pode ser obtido naquele sistema.` : `656 ${motivo}` });
      return { status: "aguardar", segundos: ESPERA_S, mensagem: "A SEFAZ bloqueou a consulta por 1 hora (consumo indevido)." };
    }
    const maiorNsu = ult > nsu ? ult : nsu;
    if (cstat === "137") {
      await atualiza({ lastNsu: maiorNsu, maxNsu: max, nextAt: hora(), lastCaptureAt: new Date(), lastError: null });
      return { status: "fim", ultimoNsu: Number(maiorNsu), notas: 0, eventos: 0, ignorados: 0, falhas: 0 };
    }
    if (cstat !== "138") return falha(`SEFAZ ${cstat}: ${motivo}`);
    const cont = { notas: 0, repetidas: 0, eventos: 0, ignorados: 0, falhas: 0 };
    const auto = s === "nfe" && e.dfeAutoCiencia;
    const fim = ult >= max;
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const z of buscarTodos(no, "docZip")) {
          const n = BigInt(z.getAttribute?.("NSU") ?? 0);
          const xml = abrirZip(z.textContent?.trim());
          const mot = xml ? await this.processar(tx, e, amb, s, n, xml, st.corte, auto, cont) : "Arquivo XML corrompido.";
          const f = { ...this.onde(e, amb), servico: s, nsu: n };
          if (mot) { cont.falhas++; await tx.dfeFailure.upsert({ where: { organizationId_companyId_environment_servico_nsu: f }, create: { ...f, motivo: mot, em: new Date() }, update: { motivo: mot, em: new Date() } }); }
          else await tx.dfeFailure.deleteMany({ where: f });
        }
        await tx.dfeState.update({ where: this.k(e, amb, s), data: { lastNsu: ult, maxNsu: max, nextAt: fim ? hora() : null, lastCaptureAt: new Date(), lastError: null } });
      }, { timeout: 60000 });
    } catch { return falha("Erro ao gravar o lote; nada foi perdido, a captura retoma do mesmo ponto."); }
    return { status: fim ? "fim" : "lote", ultimoNsu: Number(ult), ...cont };
  }

  private async processar(tx: Prisma.TransactionClient, e: Company, amb: string, s: Servico, nsu: bigint, xml: string, cortar: string, auto: boolean, cont: { notas: number; repetidas: number; eventos: number; ignorados: number }): Promise<string> {
    const r = lerXml(xml); if (!r) return "XML ilegível.";
    const nome = nomeDe(r);
    if (nome === "procEventoNFe" || nome === "procEventoCTe" || nome === "resEvento") {
      const m = await this.gravarEvento(tx, e, amb, s, nsu, r, nome, xml);
      if (!m) cont.eventos++;
      return m;
    }
    let n: DocLido | null;
    if (nome === "resNFe") n = lerResumoNfe(r, e.cnpj);
    else if (nome === "nfeProc") n = lerNfe(r, e.cnpj);
    else if (["cteProc", "cteOSProc", "GTVeProc"].includes(nome)) n = lerCte(r, e.cnpj);
    else { cont.ignorados++; return ""; }
    if (!n) return "XML do documento ilegível.";
    const m = await this.gravarDoc(tx, e, amb, s, nsu, n, xml, cortar, auto);
    if (m === "nova") cont.notas++; else if (m === "repetida") cont.repetidas++; else if (m === "antiga") cont.ignorados++; else return m;
    return "";
  }
  private async gravarDoc(tx: Prisma.TransactionClient, e: Company, amb: string, s: Servico, nsu: bigint, n: DocLido, xml: string, cortar: string, auto: boolean): Promise<string> {
    if (!chaveValida(n.chave)) return "Documento sem chave de acesso válida.";
    const comp = n.emissao.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(comp)) return "Documento sem data de emissão.";
    if (n.emissao.slice(0, 10) < cortar) return "antiga";
    const id = { organizationId_companyId_environment_servico_chave: { ...this.onde(e, amb), servico: s, chave: n.chave } };
    const ja = await tx.dfeDocument.findUnique({ where: id, select: { conteudo: true, ciencia: true } });
    if (ja?.conteudo === "completa" && n.conteudo === "resumo") return "repetida";
    let ciencia = ja?.ciencia ?? "";
    if (n.conteudo === "completa") { if (ciencia === "pendente") ciencia = ""; }
    else if (!ja && auto && n.situacao === "normal") ciencia = "pendente";
    const dados = { ...n, nsu, competencia: comp, ciencia, xmlGz: comprimir(xml) };
    await tx.dfeDocument.upsert({ where: id, create: { ...this.onde(e, amb), servico: s, ...dados }, update: dados });
    await this.aplicarCancelamento(tx, e, amb, s, n.chave);
    return ja && ja.conteudo === n.conteudo ? "repetida" : "nova";
  }
  private async gravarEvento(tx: Prisma.TransactionClient, e: Company, amb: string, s: Servico, nsu: bigint, r: No, nome: string, xml: string): Promise<string> {
    const inf = nome === "resEvento" ? r : buscar(r, "infEvento");
    if (!inf) return "Evento ilegível.";
    const chave = texto(inf, "chNFe") || texto(inf, "chCTe"), tipo = texto(inf, "tpEvento"), seq = texto(inf, "nSeqEvento") || "1";
    if (!chaveValida(chave) || !tipo) return "Evento sem chave de acesso.";
    const f = { ...this.onde(e, amb), servico: s, chave, tipo, seq };
    const dados = { nsu, data: texto(inf, "dhEvento"), xmlGz: comprimir(xml) };
    await tx.dfeEvent.upsert({ where: { organizationId_companyId_environment_servico_chave_tipo_seq: f }, create: { ...f, ...dados }, update: dados });
    await this.aplicarCancelamento(tx, e, amb, s, chave);
    return "";
  }
  /** O cancelamento pode chegar antes da própria nota; 110111 e 110112 são cancelamento e cancelamento por substituição. */
  private async aplicarCancelamento(tx: Prisma.TransactionClient, e: Company, amb: string, s: Servico, chave: string) {
    const f = { ...this.onde(e, amb), servico: s, chave };
    if (!(await tx.dfeEvent.findFirst({ where: { ...f, tipo: { in: ["110111", "110112"] } }, select: { tipo: true } }))) return;
    await tx.dfeDocument.updateMany({ where: { ...f, ciencia: "pendente" }, data: { ciencia: "" } });
    await tx.dfeDocument.updateMany({ where: f, data: { situacao: "cancelada" } });
  }

  /** Envia até 20 ciências pendentes. O XML completo chega numa captura seguinte. */
  async enviarCiencias(e: Company, amb: string) {
    const pendente = { ...this.onde(e, amb), servico: "nfe", ciencia: "pendente" };
    const l = await this.prisma.dfeDocument.findMany({ where: pendente, orderBy: { nsu: "asc" }, take: CIENCIA_LOTE, select: { chave: true } });
    if (!l.length) return { status: "ok", enviadas: 0, erros: 0, restantes: 0 };
    const c = await this.certs.daDfe(e);
    if (!c.cert) return { status: "erro", mensagem: c.erro };
    const { material: m, erro } = await this.certs.material(c.cert);
    if (!m) return { status: "erro", mensagem: erro };
    const chaves = l.map((d) => d.chave);
    let eventos: string;
    try { eventos = chaves.map((ch) => eventoCiencia(amb, e.cnpj, ch, m.key, m.pfxCert)).join(""); }
    catch { return { status: "erro", mensagem: "Não foi possível assinar a ciência com esse certificado." }; }
    const ns = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4";
    const lote = String(Date.now()).padStart(15, "0").slice(-15);
    const corpo = `<nfeDadosMsg xmlns="${ns}"><envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><idLote>${lote}</idLote>${eventos}</envEvento></nfeDadosMsg>`;
    const ret = retorno(await post(config().DFE_URL_EVENTO ?? EVENTO_URL[amb], [`${ns}/nfeRecepcaoEvento`, `${ns}/nfeRecepcaoEventoNF`], corpo, m, "retEnvEvento"), "retEnvEvento");
    if (!ret.no) return { status: "erro", mensagem: ret.erro };
    const cst = texto(ret.no, "cStat");
    if (cst !== "128") return { status: "erro", mensagem: `SEFAZ ${cst}: ${texto(ret.no, "xMotivo")}` };
    let enviadas = 0, erros = 0;
    for (const r of buscarTodos(ret.no, "retEvento")) {
      const i = filho(r, "infEvento"), ch = texto(i, "chNFe"), st = texto(i, "cStat"), mot = texto(i, "xMotivo");
      if (!chaves.includes(ch)) continue;
      const bom = ["135", "136", "573"].includes(st); // 573: a ciência já estava registrada
      await this.prisma.dfeDocument.updateMany({ where: { ...this.onde(e, amb), servico: "nfe", chave: ch }, data: { ciencia: bom ? "enviada" : "erro", cienciaEm: new Date(), cienciaMsg: bom ? "" : `${st} ${mot}` } });
      if (bom) enviadas++; else erros++;
    }
    return { status: "ok", enviadas, erros, restantes: await this.prisma.dfeDocument.count({ where: pendente }) };
  }
  async marcarCiencia(e: Company, amb: string, chaves: string[]) {
    const r = await this.prisma.dfeDocument.updateMany({ where: { ...this.onde(e, amb), servico: "nfe", chave: { in: chaves }, conteudo: "resumo", situacao: "normal", ciencia: { not: "enviada" } }, data: { ciencia: "pendente", cienciaMsg: "" } });
    return { marcadas: r.count };
  }

  async documentos(e: Company, amb: string, s: Servico, competencia?: string) {
    const onde = { ...this.onde(e, amb), servico: s };
    const g = await this.prisma.dfeDocument.groupBy({ by: ["competencia"], where: onde, _count: true, orderBy: { competencia: "desc" } });
    const comp = competencia ?? g[0]?.competencia ?? "";
    const l = await this.prisma.dfeDocument.findMany({ where: { ...onde, competencia: comp }, orderBy: [{ emissao: "asc" }, { numero: "asc" }], omit: { xmlGz: true } });
    const f = await this.prisma.dfeFailure.findMany({ where: onde, orderBy: { nsu: "asc" } });
    return { competencias: g.map((c) => ({ competencia: c.competencia, notas: c._count })), competencia: comp, documentos: l.map((d) => ({ ...d, nsu: Number(d.nsu), vTotal: d.vTotal.toFixed(2) })), falhas: f.map((x) => ({ servico: x.servico, nsu: Number(x.nsu), motivo: x.motivo, em: x.em })) };
  }
  async reiniciar(e: Company, amb: string, s: Servico) { await this.estado(e, amb, s); await this.prisma.dfeState.update({ where: this.k(e, amb, s), data: { lastNsu: 0, lastError: null } }); }

  async zip(e: Company, amb: string, s: Servico, competencia: string, chaves?: string[]): Promise<Buffer> {
    const onde = { ...this.onde(e, amb), servico: s };
    const l = await this.prisma.dfeDocument.findMany({ where: { ...onde, competencia, conteudo: "completa", ...(chaves ? { chave: { in: chaves } } : {}) }, select: { chave: true, papel: true, xmlGz: true } });
    if (!l.length) throw naoEncontrado("Nenhum XML completo para baixar. Notas só com resumo precisam de ciência.");
    const ev = await this.prisma.dfeEvent.findMany({ where: { ...onde, chave: { in: l.map((d) => d.chave) } }, select: { chave: true, tipo: true, seq: true, xmlGz: true } });
    const z = new JSZip(), pasta = new Map<string, string>();
    for (const d of l) { const p = d.papel.replace(/[^a-z]/g, "") || "outros"; pasta.set(d.chave, p); z.file(`${p}/${d.chave}.xml`, descomprimir(d.xmlGz)); }
    for (const v of ev) z.file(`${pasta.get(v.chave)}/eventos/${v.chave}-${v.tipo}-${v.seq}.xml`, descomprimir(v.xmlGz));
    return z.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  }
}
