import { Injectable } from "@nestjs/common";
import type { Company, FiscalCertificate, Prisma } from "@prisma/client";
import { createHash, X509Certificate } from "node:crypto";
import JSZip from "jszip";
import { CertificadosService, Material } from "../certificates/certificates.service";
import { naoEncontrado } from "../common/errors";
import { config } from "../config";
import { PrismaService } from "../prisma.service";
import { Resposta, chamar, chamarComRecuo, faltaCadeia } from "./http";
import { chaveEvento, codigoEvento, lerNota, situacaoPorEventos } from "./nfse-parser";
import { abrirZip, comprimir, descomprimir, espere } from "./xml";

const BASES: Record<string, string> = { producao: "https://adn.nfse.gov.br/contribuintes", restrita: "https://adn.producaorestrita.nfse.gov.br/contribuintes" };
const LEASE_MS = 120000;
export type Passo =
  | { status: "lote" | "fim"; ultimoNsu: number; notas: number; repetidas?: number; eventos: number; ignorados: number; falhas: number }
  | { status: "aguardar"; segundos: number; mensagem: string }
  | { status: "erro"; mensagem: string };
type Tx = Prisma.TransactionClient;

const msgConexao = (r: Resposta) => {
  if ([401, 403, 495, 496].includes(r.http)) return `O ADN recusou o certificado (HTTP ${r.http}). Confira se é um e-CNPJ ICP-Brasil da mesma raiz do CNPJ consultado.`;
  if (faltaCadeia(r.erroCodigo)) return `O servidor do ADN não foi reconhecido (${r.erroCodigo}). Configure FISCAL_CA_FILE com a cadeia correta.`;
  if (r.erroCodigo) return `O ADN encerrou a conexão (${r.erro}). Use Diagnosticar para ver onde ela cai.`;
  return `Falha de comunicação com o ADN: HTTP ${r.http}`;
};
const msgErros = (j: { Erros?: { Codigo?: string; Descricao?: string; Complemento?: string }[] }) => (j.Erros ?? []).map((e) => `${e.Codigo ?? ""} ${e.Descricao ?? ""} ${e.Complemento ?? ""}`.trim()).filter(Boolean).join(" | ") || "O ADN rejeitou a consulta.";
const dica = (m: string, modo: string) => (modo === "procuracao" ? `${m} Confira se a procuração eletrônica desse cliente para a NFS-e está ativa e em nome do procurador cadastrado.` : m);
function espera(r: Resposta, tentativas: number) {
  const h = String(r.cabecalhos["retry-after"] ?? "");
  if (/^\d+$/.test(h)) return Math.max(1, +h);
  const t = h ? Date.parse(h) : NaN;
  if (!Number.isNaN(t)) return Math.max(1, Math.ceil((t - Date.now()) / 1000));
  return Math.min(3600, 60 * 2 ** Math.min(tentativas, 6));
}
const json = (s: string): Record<string, unknown> | null => { try { const j = JSON.parse(s); return j && typeof j === "object" ? j : null; } catch { return null; } };

@Injectable()
export class NfseService {
  constructor(private prisma: PrismaService, private certs: CertificadosService) {}
  private url(amb: string, caminho: string) { return (config().NFSE_ADN_URL ?? BASES[amb]).replace(/\/$/, "") + caminho; }
  private get(amb: string, caminho: string, m: Material) { return chamarComRecuo({ url: this.url(amb, caminho), cabecalhos: { accept: "application/json" }, cert: m.cert, key: m.key, ca: m.ca }); }
  private chaveEstado(e: Company, amb: string) { return { organizationId_companyId_environment: { organizationId: e.organizationId, companyId: e.id, environment: amb } }; }
  private estado(e: Company, amb: string) { return this.prisma.nfseState.upsert({ where: this.chaveEstado(e, amb), create: { organizationId: e.organizationId, companyId: e.id, environment: amb }, update: {} }); }
  private atualiza(e: Company, amb: string, data: Prisma.NfseStateUpdateInput) { return this.prisma.nfseState.update({ where: this.chaveEstado(e, amb), data }); }
  private async material(c: { cert: FiscalCertificate | null; erro: string }): Promise<{ m?: Material; erro?: string }> {
    if (!c.cert) return { erro: c.erro };
    const r = await this.certs.material(c.cert);
    return r.material ? { m: r.material } : { erro: r.erro };
  }

  /** Busca UM lote. Notas e último NSU gravam na mesma transação: parar no meio não perde nada. */
  async capturar(e: Company, amb: string): Promise<Passo> {
    await this.estado(e, amb);
    const agora = new Date();
    const lease = await this.prisma.nfseState.updateMany({ where: { organizationId: e.organizationId, companyId: e.id, environment: amb, OR: [{ leaseUntil: null }, { leaseUntil: { lt: agora } }] }, data: { leaseUntil: new Date(agora.getTime() + LEASE_MS) } });
    if (!lease.count) return { status: "aguardar", segundos: 5, mensagem: "Outra captura desta empresa está em andamento." };
    try { return await this.lote(e, amb); }
    finally { await this.atualiza(e, amb, { leaseUntil: null }).catch(() => undefined); }
  }

  private async lote(e: Company, amb: string): Promise<Passo> {
    const st = await this.estado(e, amb);
    if (st.blockedUntil && st.blockedUntil > new Date()) return { status: "aguardar", segundos: Math.ceil((st.blockedUntil.getTime() - Date.now()) / 1000), mensagem: "Aguardando o limite de consultas do ADN." };
    const falha = async (mensagem: string): Promise<Passo> => { await this.atualiza(e, amb, { lastError: mensagem }); return { status: "erro", mensagem }; };
    const c = await this.certs.daNfse(e);
    const { m, erro } = await this.material(c);
    if (!m) return falha(erro ?? "Certificado indisponível.");
    const nsu = st.lastNsu;
    const r = await this.get(amb, `/DFe/${nsu}?cnpjConsulta=${encodeURIComponent(e.cnpj)}&lote=true`, m);
    if (r.http === 429 || r.http >= 500) {
      const seg = espera(r, st.attempts);
      await this.atualiza(e, amb, { blockedUntil: new Date(Date.now() + seg * 1000), attempts: st.attempts + 1 });
      return { status: "aguardar", segundos: seg, mensagem: r.http === 429 ? "O ADN pediu uma pausa nas consultas." : `O ADN está instável (HTTP ${r.http}).` };
    }
    const j = json(r.corpo);
    // 404 e 400 trazem o motivo no corpo: só o StatusProcessamento diz se é fim da fila ou rejeição
    if (r.erroCodigo || !j?.StatusProcessamento) return falha(dica(msgConexao(r), c.modo));
    const status = String(j.StatusProcessamento);
    if (status === "REJEICAO") return falha(dica(msgErros(j), c.modo));
    const ok = { lastCaptureAt: new Date(), lastError: null, attempts: 0 };
    const vazio: Passo = { status: "fim", ultimoNsu: Number(nsu), notas: 0, eventos: 0, ignorados: 0, falhas: 0 };
    if (status === "NENHUM_DOCUMENTO_LOCALIZADO") { await this.atualiza(e, amb, ok); return vazio; }
    if (status !== "DOCUMENTOS_LOCALIZADOS") return falha(`Resposta inesperada do ADN: ${status.slice(0, 80)}`);
    const lote = ((j.LoteDFe ?? []) as Record<string, unknown>[]).filter((d) => BigInt(String(d.NSU ?? 0)) > nsu).sort((a, b) => (BigInt(String(a.NSU)) < BigInt(String(b.NSU)) ? -1 : 1));
    if (!lote.length) { await this.atualiza(e, amb, ok); return vazio; }
    const cont = { notas: 0, repetidas: 0, eventos: 0, ignorados: 0, falhas: 0 };
    let maior = nsu;
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const d of lote) {
          const n = BigInt(String(d.NSU)); if (n > maior) maior = n;
          const tipo = String(d.TipoDocumento ?? ""), chave = String(d.ChaveAcesso ?? "");
          let motivo = "";
          if (tipo === "NFSE" || tipo === "EVENTO") {
            const xml = abrirZip(d.ArquivoXml);
            if (!xml) motivo = "Arquivo XML corrompido.";
            else if (tipo === "NFSE") {
              if (!/^\d{50}$/.test(chave)) motivo = "NFS-e sem chave de acesso válida.";
              else { const g = await this.gravarNota(tx, e, amb, chave, n, xml); if (g === "repetida") cont.repetidas++; else if (g === "") cont.notas++; else motivo = g; }
            } else { motivo = await this.gravarEvento(tx, e, amb, chave, n, String(d.TipoEvento ?? ""), String(d.DataHoraGeracao ?? ""), xml); if (!motivo) cont.eventos++; }
          } else cont.ignorados++;
          const id = { organizationId_companyId_environment_nsu: { organizationId: e.organizationId, companyId: e.id, environment: amb, nsu: n } };
          if (motivo) {
            cont.falhas++;
            await tx.nfseFailure.upsert({ where: id, create: { organizationId: e.organizationId, companyId: e.id, environment: amb, nsu: n, chave, motivo, em: new Date() }, update: { chave, motivo, em: new Date() } });
          } else await tx.nfseFailure.deleteMany({ where: { organizationId: e.organizationId, companyId: e.id, environment: amb, nsu: n } });
        }
        await tx.nfseState.update({ where: this.chaveEstado(e, amb), data: { ...ok, lastNsu: maior, blockedUntil: null } });
      }, { timeout: 60000 });
    } catch { return falha("Erro ao gravar o lote; nada foi perdido, a captura retoma do mesmo ponto."); }
    return { status: "lote", ultimoNsu: Number(maior), ...cont };
  }

  private async gravarNota(tx: Tx, e: Company, amb: string, chave: string, nsu: bigint, xml: string): Promise<string> {
    const n = lerNota(xml, e.cnpj);
    if (!n) return "XML da NFS-e ilegível.";
    if (!/^\d{4}-\d{2}$/.test(n.competencia)) return "NFS-e sem data de competência.";
    const id = { organizationId_companyId_environment_chave: { organizationId: e.organizationId, companyId: e.id, environment: amb, chave } };
    const existe = await tx.nfseDocument.findUnique({ where: id, select: { chave: true } });
    const dados = { ...n, nsu, xmlGz: comprimir(xml) };
    await tx.nfseDocument.upsert({ where: id, create: { organizationId: e.organizationId, companyId: e.id, environment: amb, chave, ...dados }, update: dados });
    await this.atualizarSituacao(tx, e, amb, chave);
    return existe ? "repetida" : "";
  }
  private async gravarEvento(tx: Tx, e: Company, amb: string, chave: string, nsu: bigint | null, tipo: string, data: string, xml: string): Promise<string> {
    const ch = /^\d{50}$/.test(chave) ? chave : chaveEvento(xml);
    if (!ch) return "Evento sem chave de acesso.";
    const id = createHash("sha256").update(xml).digest("hex").slice(0, 32);
    await tx.nfseEvent.upsert({ where: { organizationId_companyId_environment_id: { organizationId: e.organizationId, companyId: e.id, environment: amb, id } }, update: {},
      create: { organizationId: e.organizationId, companyId: e.id, environment: amb, id, chave: ch, nsu, codigo: codigoEvento(xml, tipo), tipo, data, xmlGz: comprimir(xml) } });
    await this.atualizarSituacao(tx, e, amb, ch);
    return "";
  }
  private async atualizarSituacao(tx: Tx, e: Company, amb: string, chave: string) {
    const ev = await tx.nfseEvent.findMany({ where: { organizationId: e.organizationId, companyId: e.id, environment: amb, chave }, orderBy: [{ data: "asc" }, { nsu: { sort: "asc", nulls: "first" } }], select: { codigo: true } });
    await tx.nfseDocument.updateMany({ where: { organizationId: e.organizationId, companyId: e.id, environment: amb, chave }, data: { situacao: situacaoPorEventos(ev.map((x) => x.codigo)) } });
  }

  async notas(e: Company, amb: string, competencia?: string) {
    const onde = { organizationId: e.organizationId, companyId: e.id, environment: amb };
    const g = await this.prisma.nfseDocument.groupBy({ by: ["competencia"], where: onde, _count: true, orderBy: { competencia: "desc" } });
    const comp = competencia ?? g[0]?.competencia ?? "";
    const l = await this.prisma.nfseDocument.findMany({ where: { ...onde, competencia: comp }, orderBy: [{ emissao: "asc" }, { numero: "asc" }], omit: { xmlGz: true } });
    const f = await this.prisma.nfseFailure.findMany({ where: onde, orderBy: { nsu: "asc" } });
    return { competencias: g.map((c) => ({ competencia: c.competencia, notas: c._count })), competencia: comp, falhas: f.map((x) => ({ nsu: Number(x.nsu), chave: x.chave, motivo: x.motivo, em: x.em })),
      notas: l.map((n) => ({ ...n, nsu: Number(n.nsu), vServ: n.vServ.toFixed(2), vBc: n.vBc.toFixed(2), vIss: n.vIss.toFixed(2), vRetCp: n.vRetCp.toFixed(2), vRetIrrf: n.vRetIrrf.toFixed(2), vRetCsll: n.vRetCsll.toFixed(2), vPis: n.vPis.toFixed(2), vCofins: n.vCofins.toFixed(2), vTotalRet: n.vTotalRet.toFixed(2), vLiq: n.vLiq.toFixed(2), vIbs: n.vIbs.toFixed(2), vCbs: n.vCbs.toFixed(2) })) };
  }

  /** Consulta os eventos de uma nota pela chave: pega cancelamento que não veio na fila por NSU. */
  async verificar(e: Company, amb: string, chave: string) {
    const nota = await this.prisma.nfseDocument.findUnique({ where: { organizationId_companyId_environment_chave: { organizationId: e.organizationId, companyId: e.id, environment: amb, chave } }, select: { chave: true } });
    if (!nota) throw naoEncontrado("Nota não encontrada.");
    const c = await this.certs.daNfse(e);
    const { m, erro } = await this.material(c);
    if (!m) return { status: "erro", mensagem: erro };
    const r = await this.get(amb, `/NFSe/${chave}/Eventos`, m);
    if (r.http === 429 || r.http >= 500) return { status: "aguardar", segundos: espera(r, 0), mensagem: "O ADN pediu uma pausa nas consultas." };
    const j = json(r.corpo);
    if (r.erroCodigo || !j?.StatusProcessamento) return { status: "erro", mensagem: dica(msgConexao(r), c.modo) };
    if (j.StatusProcessamento === "REJEICAO") return { status: "erro", mensagem: dica(msgErros(j), c.modo) };
    let eventos = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const d of (j.LoteDFe ?? []) as Record<string, unknown>[]) {
        const xml = abrirZip(d.ArquivoXml); if (!xml) continue;
        if (!(await this.gravarEvento(tx, e, amb, chave, d.NSU == null ? null : BigInt(String(d.NSU)), String(d.TipoEvento ?? ""), String(d.DataHoraGeracao ?? ""), xml))) eventos++;
      }
      await tx.nfseDocument.updateMany({ where: { organizationId: e.organizationId, companyId: e.id, environment: amb, chave }, data: { eventsCheckedAt: new Date() } });
    });
    const n = await this.prisma.nfseDocument.findFirst({ where: { organizationId: e.organizationId, companyId: e.id, environment: amb, chave }, select: { situacao: true } });
    return { status: "ok", eventos, situacao: n?.situacao ?? "normal" };
  }

  /** Só leitura: mostra a cadeia do certificado e como cada forma de conexão responde. */
  async diagnosticar(e: Company, amb: string) {
    const c = await this.certs.daNfse(e);
    if (!c.cert) return { linhas: [c.erro] };
    const linhas = [`Empresa: ${e.cnpj}`, `Busca por: ${c.modo === "procuracao" ? "procuração" : "certificado da empresa"}`, `Certificado: ${c.cert.holder} / ${c.cert.document} / validade ${c.cert.validUntil}`, `Node ${process.version} / OpenSSL ${process.versions.openssl}`];
    const { material: m, erro } = await this.certs.material(c.cert, true);
    if (!m) return { linhas: [...linhas, `Certificado: ${erro}`] };
    const todos = [m.pfxCert, ...m.cadeia].map((p) => new X509Certificate(p));
    linhas.push(`Cadeia enviada (${todos.length} certificados, ${m.completa ? "completa até a raiz" : "INCOMPLETA: não chegou à raiz"}):`);
    const cn = (s: string) => /^CN=(.*)$/m.exec(s)?.[1] ?? "?";
    todos.forEach((x, i) => linhas.push(`  ${i + 1}. ${cn(x.subject)} <- ${cn(x.issuer)}`));
    const url = this.url(amb, `/DFe/0?cnpjConsulta=${encodeURIComponent(e.cnpj)}&lote=true`);
    linhas.push(`Conexão com ${new URL(url).host}:`);
    const base = { url, cabecalhos: { accept: "application/json" }, ca: m.ca };
    for (const [nome, p] of [["sem certificado", base], ["certificado, padrão", { ...base, cert: m.cert, key: m.key }], ["certificado, TLS 1.2", { ...base, cert: m.cert, key: m.key, tls12: true }]] as const) {
      const ini = Date.now(); const r = await chamar(p);
      linhas.push(`  ${nome}: ${r.erroCodigo ? `erro ${r.erroCodigo} ${r.erro}` : `HTTP ${r.http} ${json(r.corpo)?.StatusProcessamento ?? ""}`} (${((Date.now() - ini) / 1000).toFixed(1)}s)`);
      await espere(1500);
    }
    return { linhas };
  }

  async reiniciar(e: Company, amb: string) { await this.estado(e, amb); await this.atualiza(e, amb, { lastNsu: 0, lastError: null, attempts: 0 }); }

  async xmls(e: Company, amb: string, chaves: string[]) {
    const l = await this.prisma.nfseDocument.findMany({ where: { organizationId: e.organizationId, companyId: e.id, environment: amb, chave: { in: chaves } }, select: { chave: true, situacao: true, xmlGz: true } });
    return { notas: l.map((n) => ({ chave: n.chave, situacao: n.situacao, xml: descomprimir(n.xmlGz) })) };
  }
  async zip(e: Company, amb: string, competencia: string, chaves?: string[]): Promise<Buffer> {
    const onde = { organizationId: e.organizationId, companyId: e.id, environment: amb };
    const l = await this.prisma.nfseDocument.findMany({ where: { ...onde, competencia, ...(chaves ? { chave: { in: chaves } } : {}) }, select: { chave: true, papel: true, xmlGz: true } });
    if (!l.length) throw naoEncontrado("Nenhuma nota para baixar.");
    const pastas: Record<string, string> = { prestador: "prestadas", tomador: "tomadas", intermediario: "intermediadas", outro: "outras" };
    const ev = await this.prisma.nfseEvent.findMany({ where: { ...onde, chave: { in: l.map((n) => n.chave) } }, select: { chave: true, id: true, xmlGz: true } });
    const z = new JSZip(), pastaDe = new Map<string, string>();
    for (const n of l) { const p = pastas[n.papel] ?? "outras"; pastaDe.set(n.chave, p); z.file(`${p}/${n.chave}.xml`, descomprimir(n.xmlGz)); }
    for (const v of ev) z.file(`${pastaDe.get(v.chave)}/eventos/${v.chave}-${v.id}.xml`, descomprimir(v.xmlGz));
    return z.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  }
}
