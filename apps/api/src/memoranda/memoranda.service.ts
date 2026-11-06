import { Injectable } from "@nestjs/common";
import type { FiscalCertificate, Memorandum, Prisma } from "@prisma/client";
import { CertificadosService, hoje } from "../certificates/certificates.service";
import type { Contexto } from "../common/auth";
import { Erro, invalido, naoEncontrado } from "../common/errors";
import { EscopoService } from "../common/scope.service";
import { chamar } from "../fiscal/http";
import { buscarTodos, filho, lerXml, texto } from "../fiscal/xml";
import { PrismaService } from "../prisma.service";

const ROTULOS: Record<string, string> = {
  m_data: "Data do memorando", m_assunto: "Assunto", e_razao: "Razão social", e_fantasia: "Nome fantasia", e_abertura: "Data de abertura", e_desde: "Cliente desde", e_situacao: "Situação cadastral", e_natureza: "Natureza jurídica", e_capital: "Capital social", e_nire: "NIRE", e_ie: "Inscrição estadual", e_im: "Inscrição municipal", e_endereco: "Endereço", e_tel: "Telefone da empresa", e_email: "E-mail da empresa",
  contatos: "Contatos", socios: "Quadro societário", t_regime: "Opção tributária", t_modalidade: "Simples Puro/Híbrido", t_simples: "Situação no Simples", ferramentas: "Ferramentas a serem configuradas", anexosManual: "Anexos do Simples", atividades: "Atividades (CNAEs)", svOff: "Códigos de serviço", svExtra: "Códigos de serviço", deps: "Departamentos e responsáveis",
  r_prolabore: "Pró-labore", r_folha: "Folha de pagamento", r_cert: "Certificado digital", r_dominio: "Domínio", r_sintegra: "Sintegra", r_spedc: "SPED Contábil", r_spedf: "SPED Fiscal", emissao: "Emissão", r_loginNfse: "Login NFS-e", r_senhaNfse: "Senha NFS-e", r_codSimples: "Código de acesso do Simples", r_sefaz: "Senha SEFAZ-ES AGV", r_cpfAdm: "CPF administrador", r_pis: "PIS", r_docs: "Documentos digitalizados", obs: "Observações",
};
const SVRS = ["AC", "ES", "PB", "RN", "SC", "RJ", "PI", "TO", "RO", "AL", "AP", "DF", "PA", "RR", "SE"];
const URL_SVRS = "https://cad.svrs.rs.gov.br/ws/cadconsultacadastro/cadconsultacadastro4.asmx";
export const numeroTxt = (seq: number, ano: number) => `${String(seq).padStart(2, "0")}/${ano}`;
export const limparCnpj = (v: unknown) => String(v ?? "").replace(/[^0-9A-Za-z]/g, "").toUpperCase();

/** Dígitos verificadores, inclusive do CNPJ alfanumérico (valor do caractere = código ASCII - 48). */
export function cnpjValido(c: string): boolean {
  if (!/^[0-9A-Z]{12}\d{2}$/.test(c) || /^(.)\1+$/.test(c)) return false;
  const dv = (b: string) => { let s = 0, p = 2; for (let i = b.length - 1; i >= 0; i--) { s += (b.charCodeAt(i) - 48) * p; p = p === 9 ? 2 : p + 1; } const r = s % 11; return r < 2 ? 0 : 11 - r; };
  const d1 = dv(c.slice(0, 12)), d2 = dv(c.slice(0, 12) + d1);
  return c.slice(12) === `${d1}${d2}`;
}
function normalizar(k: string, v: unknown): string {
  const o = v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Object.keys(v as object).length) ? "" : v;
  return JSON.stringify(typeof o === "string" ? o.trim() : o);
}
export function alteracoes(antes: Record<string, unknown>, depois: Record<string, unknown>): string[] {
  return [...new Set(Object.keys(ROTULOS).filter((k) => normalizar(k, antes[k]) !== normalizar(k, depois[k])).map((k) => ROTULOS[k]))];
}
type Hist = { acao: string; campos?: string[]; por: string; em: string };
const anexar = (h: unknown, novo: Hist) => [...(Array.isArray(h) ? (h as Hist[]) : []), novo].slice(-300) as unknown as Prisma.InputJsonValue;

@Injectable()
export class MemorandosService {
  constructor(private prisma: PrismaService, private escopo: EscopoService, private certs: CertificadosService) {}
  nome(c: Contexto) { return this.prisma.user.findUniqueOrThrow({ where: { id: c.userId }, select: { name: true } }).then((u) => u.name); }

  async listar(c: Contexto) {
    const l = await this.prisma.memorandum.findMany({ where: { organizationId: c.organizationId, company: this.escopo.carteira(c) }, orderBy: [{ ano: "desc" }, { seq: "desc" }], include: { company: { select: { cnpj: true } } } });
    const sem = await this.prisma.company.findMany({ where: { ...this.escopo.carteira(c), active: true, memoranda: { none: {} } }, orderBy: { legalName: "asc" }, select: { cnpj: true, legalName: true } });
    return { memorandos: l.map((m) => { const d = m.data as Record<string, unknown>; return { id: m.id, seq: m.seq, ano: m.ano, numero: numeroTxt(m.seq, m.ano), status: m.status, clientStatus: m.clientStatus, exitDate: m.exitDate, exitReason: m.exitReason, cnpj: m.company.cnpj, razao: d.e_razao ?? "", fantasia: d.e_fantasia ?? "", regime: d.t_regime ?? "", data: d.m_data ?? "",
      responsaveis: (Array.isArray(d.deps) ? (d.deps as { on?: boolean; nome: string; resp?: string }[]) : []).filter((x) => x.on).map((x) => `${x.nome}${x.resp ? `: ${x.resp}` : ""}`), atualizadoEm: m.updatedAt }; }), semMemorando: sem };
  }
  async um(c: Contexto, id: string): Promise<Memorandum> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw naoEncontrado("Memorando não encontrado.");
    const m = await this.prisma.memorandum.findFirst({ where: { id, organizationId: c.organizationId, company: this.escopo.carteira(c) } });
    if (!m) throw naoEncontrado("Memorando não encontrado.");
    return m;
  }
  private dadosEmpresa(d: Record<string, unknown>) {
    const cnpj = limparCnpj(d.e_cnpj);
    if (!cnpjValido(cnpj)) throw invalido("Informe um CNPJ válido.");
    const legalName = String(d.e_razao ?? "").trim().slice(0, 200);
    if (!legalName) throw invalido("Informe a razão social.");
    return { cnpj, legalName };
  }
  private ativa(status: string, clientStatus: string) { return status === "ativo" && clientStatus === "ativa"; }

  /** O número é editável; sem número, usa o próximo do ano. */
  async criar(c: Contexto, d: Record<string, unknown>, numero: { seq: number; ano: number } | null) {
    const { cnpj, legalName } = this.dadosEmpresa(d), org = c.organizationId, por = await this.nome(c);
    const ano = numero?.ano ?? +String(d.m_data || hoje()).slice(0, 4);
    if (!c.allCompanies) { const j = await this.prisma.company.findFirst({ where: { organizationId: org, cnpj } }); if (j && !(await this.prisma.companyAccess.findFirst({ where: { membershipId: c.membershipId, companyId: j.id } }))) throw new Erro(409, "EM_USO", "Esta empresa já está cadastrada. Peça acesso a quem administra."); }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const e = await tx.company.upsert({ where: { organizationId_cnpj: { organizationId: org, cnpj } }, create: { organizationId: org, cnpj, legalName }, update: { legalName, active: true } });
        const ativo = await tx.memorandum.findFirst({ where: { organizationId: org, companyId: e.id, status: "ativo" } });
        if (ativo) throw new Erro(409, "JA_CADASTRADA", `Empresa já cadastrada no memorando Nº ${numeroTxt(ativo.seq, ativo.ano)}.`);
        const seq = numero?.seq ?? ((await tx.memorandum.aggregate({ where: { organizationId: org, ano }, _max: { seq: true } }))._max.seq ?? 0) + 1;
        if (!c.allCompanies) await tx.companyAccess.upsert({ where: { membershipId_companyId: { membershipId: c.membershipId, companyId: e.id } }, create: { organizationId: org, membershipId: c.membershipId, companyId: e.id }, update: {} });
        return tx.memorandum.create({ data: { organizationId: org, companyId: e.id, seq, ano, data: d as Prisma.InputJsonValue, createdByName: por, updatedByName: por, history: [{ acao: "Criou o memorando", por, em: new Date().toISOString() }] } });
      });
    } catch (x) { if ((x as { code?: string }).code === "P2002") throw new Erro(409, "NUMERO_EM_USO", "Já existe memorando com esse número. Escolha outro."); throw x; }
  }
  async alterar(c: Contexto, id: string, d: Record<string, unknown>, numero: { seq: number; ano: number } | null) {
    const m = await this.um(c, id), { cnpj, legalName } = this.dadosEmpresa(d), por = await this.nome(c), em = new Date().toISOString();
    const e = await this.prisma.company.findFirstOrThrow({ where: { id: m.companyId, organizationId: c.organizationId } });
    if (e.cnpj !== cnpj) throw invalido("O CNPJ do memorando não muda. Para outra empresa, crie um novo memorando.");
    const seq = numero?.seq ?? m.seq, ano = numero?.ano ?? m.ano, campos = alteracoes(m.data as Record<string, unknown>, d);
    const renumerou = seq !== m.seq || ano !== m.ano;
    let history = m.history as Prisma.InputJsonValue;
    if (renumerou) history = anexar(history, { acao: `Renumerou de ${numeroTxt(m.seq, m.ano)} para ${numeroTxt(seq, ano)}`, campos, por, em });
    else if (campos.length) history = anexar(history, { acao: "Alterou", campos, por, em });
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.company.update({ where: { id: e.id }, data: { legalName } });
        return tx.memorandum.update({ where: { id: m.id }, data: { seq, ano, data: d as Prisma.InputJsonValue, history, updatedByName: por } });
      });
    } catch (x) { if ((x as { code?: string }).code === "P2002") throw new Erro(409, "NUMERO_EM_USO", "Já existe memorando com esse número. Escolha outro."); throw x; }
  }
  /** Cancelar ou registrar a saída tira a empresa das capturas; as notas guardadas continuam. */
  async situacao(c: Contexto, id: string, status: "ativo" | "cancelado") {
    const m = await this.um(c, id), por = await this.nome(c);
    if (status === "ativo" && (await this.prisma.memorandum.findFirst({ where: { organizationId: c.organizationId, companyId: m.companyId, status: "ativo", id: { not: m.id } } }))) throw new Erro(409, "JA_CADASTRADA", "A empresa já tem outro memorando ativo.");
    return this.prisma.$transaction(async (tx) => {
      await tx.company.update({ where: { id: m.companyId }, data: { active: this.ativa(status, m.clientStatus) } });
      return tx.memorandum.update({ where: { id: m.id }, data: { status, updatedByName: por, history: anexar(m.history, { acao: status === "cancelado" ? "Cancelou o memorando" : "Reativou o memorando", por, em: new Date().toISOString() }) } });
    });
  }
  async cliente(c: Contexto, id: string, s: { situacao: "ativa" | "inativa"; dataSaida?: string; motivo?: string; obs?: string }) {
    const m = await this.um(c, id), por = await this.nome(c), saiu = s.situacao === "inativa";
    if (saiu && !/^\d{4}-\d{2}-\d{2}$/.test(s.dataSaida ?? "")) throw invalido("Data de saída inválida.");
    const acao = saiu ? `Registrou a saída do cliente (${s.dataSaida!.split("-").reverse().join("/")}${s.motivo ? ` · ${s.motivo}` : ""})` : "Reativou o cliente";
    return this.prisma.$transaction(async (tx) => {
      await tx.company.update({ where: { id: m.companyId }, data: { active: this.ativa(m.status, s.situacao) } });
      return tx.memorandum.update({ where: { id: m.id }, data: { clientStatus: s.situacao, exitDate: saiu ? s.dataSaida : "", exitReason: saiu ? s.motivo ?? "" : "", exitNotes: saiu ? s.obs ?? "" : "", updatedByName: por, history: anexar(m.history, { acao, por, em: new Date().toISOString() }) } });
    });
  }
  async equipe(c: Contexto) {
    const l = await this.prisma.organizationMembership.findMany({ where: { organizationId: c.organizationId, status: "ACTIVE" }, include: { user: { select: { name: true } } } });
    return { equipe: l.map((m) => m.user.name).sort((a, b) => a.localeCompare(b)) };
  }

  /** Só estes dois serviços públicos; o CNPJ já chega validado. */
  async consultarCnpj(cnpj: string) {
    let ultimo = "Não foi possível consultar o CNPJ.";
    for (const url of [`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, `https://receitaws.com.br/v1/cnpj/${cnpj}`]) {
      try {
        const r = await fetch(url, { headers: { accept: "application/json", "user-agent": "Neeko/1.0" }, signal: AbortSignal.timeout(15000) });
        const j = (await r.json()) as Record<string, unknown>;
        if (r.ok && (j.razao_social !== undefined || (j.nome !== undefined && j.status !== "ERROR"))) return j;
        ultimo = String(j.message ?? (r.status === 404 ? "CNPJ não encontrado." : "Consulta não retornou dados."));
        if (r.status === 404) break;
      } catch { ultimo = "Serviço de consulta indisponível."; }
    }
    throw new Erro(502, "CONSULTA", ultimo);
  }
  async consultarIe(c: Contexto, cnpj: string, uf: string) {
    if (!SVRS.includes(uf)) throw invalido(`Consulta de IE automática ainda não configurada para ${uf}. Preencha a IE manualmente.`);
    const lista = (await this.certs.listar(c.organizationId)).filter((x) => x.kind === "e-CNPJ" && x.validUntil >= hoje());
    const cert: FiscalCertificate | null = this.certs.escolher(lista, cnpj, null) ?? lista[0] ?? null;
    if (!cert) throw invalido("Importe um certificado para consultar a IE.");
    const { material: m, erro } = await this.certs.material(cert);
    if (!m) throw invalido(erro ?? "Certificado indisponível.");
    const xml = `<ConsCad xmlns="http://www.portalfiscal.inf.br/nfe" versao="2.00"><infCons><xServ>CONS-CAD</xServ><UF>${uf}</UF><CNPJ>${cnpj}</CNPJ></infCons></ConsCad>`;
    const corpo = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/CadConsultaCadastro4">${xml}</nfeDadosMsg></soap12:Body></soap12:Envelope>`;
    const r = await chamar({ url: URL_SVRS, metodo: "POST", corpo, cert: m.cert, key: m.key, ca: m.ca, timeoutMs: 30000, cabecalhos: { "content-type": 'application/soap+xml; charset=utf-8; action="http://www.portalfiscal.inf.br/nfe/wsdl/CadConsultaCadastro4/consultaCadastro"' } });
    if (r.erroCodigo) throw new Erro(502, "SEFAZ", `SEFAZ indisponível: ${r.erro}`);
    const raiz = lerXml(r.corpo);
    if (!raiz) throw new Erro(502, "SEFAZ", `Resposta inesperada da SEFAZ (HTTP ${r.http}).`);
    const inf = buscarTodos(raiz, "infCons")[0] ?? null;
    return { cStat: texto(inf, "cStat"), xMotivo: texto(inf, "xMotivo"), cadastros: buscarTodos(raiz, "infCad").map((i) => ({ ie: texto(i, "IE"), situacao: texto(i, "cSit") === "1" ? "Habilitado" : "Não habilitado", regime: texto(i, "xRegApur"), uf: filho(i, "UF")?.textContent ?? "" })) };
  }
}
