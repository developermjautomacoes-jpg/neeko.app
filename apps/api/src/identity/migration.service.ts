import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createDecipheriv, pbkdf2Sync } from "node:crypto";
import { hoje } from "../certificates/certificates.service";
import { abrirPfx, infoCert } from "../certificates/pkcs12";
import { AuditoriaService } from "../common/audit.service";
import type { Contexto } from "../common/auth";
import { cifrar } from "../common/cipher";
import { invalido } from "../common/errors";
import { EscopoService } from "../common/scope.service";
import { limparCnpj, numeroTxt } from "../memoranda/memoranda.service";
import { PrismaService } from "../prisma.service";

type Texto = Record<string, unknown>;
const META = ["_id", "id", "seq", "ano", "status", "situacaoCliente", "dataSaida", "motivoSaida", "obsSaida", "historico", "criadoEm", "criadoPorNome", "criadoPor", "atualizadoEm", "atualizadoPorNome", "atualizadoPor", "excluidoEm"];
const txt = (v: unknown) => (typeof v === "string" ? v : "");

/** Abre o pacote gerado no app Facilitar: AES-256-GCM com chave derivada da frase. */
function abrir(pacote: string, frase: string): { memorandos: Texto[]; certificados: Texto[]; nfse: { procurador?: string; modos?: Record<string, string> }; restritas: string[] } {
  try {
    const p = JSON.parse(pacote) as Record<string, string | number>;
    if (p.formato !== "neeko-migracao" || p.versao !== 1 || typeof p.iter !== "number" || p.iter < 100000 || p.iter > 2000000) throw new Error();
    const k = pbkdf2Sync(frase, Buffer.from(String(p.salt), "base64"), p.iter, 32, "sha256");
    const d = createDecipheriv("aes-256-gcm", k, Buffer.from(String(p.iv), "base64"));
    d.setAuthTag(Buffer.from(String(p.tag), "base64"));
    const j = JSON.parse(Buffer.concat([d.update(Buffer.from(String(p.data), "base64")), d.final()]).toString("utf8")) as Texto;
    return { memorandos: Array.isArray(j.memorandos) ? j.memorandos as Texto[] : [], certificados: Array.isArray(j.certificados) ? j.certificados as Texto[] : [], nfse: (j.nfse ?? {}) as { procurador?: string; modos?: Record<string, string> }, restritas: Array.isArray(j.restritas) ? j.restritas.map(String) : [] };
  } catch { throw invalido("Não foi possível abrir o pacote. Confira o arquivo e a frase."); }
}

@Injectable()
export class MigracaoService {
  constructor(private prisma: PrismaService, private escopo: EscopoService, private auditoria: AuditoriaService) {}

  /** Repetir a importação não duplica: número e empresa com memorando ativo são pulados. */
  async importar(c: Contexto, pacote: string, frase: string) {
    const dados = abrir(pacote, frase), org = c.organizationId;
    const certIds = new Map<string, string>(), cOk: string[] = [], cPulados: { nome: string; motivo: string }[] = [];
    for (const x of dados.certificados) {
      const nome = txt(x.apelido) || txt(x.titular) || "Certificado";
      const pfx = Buffer.from(txt(x.pfx), "base64"), senha = txt(x.senha), p = pfx.length ? abrirPfx(pfx, senha) : null;
      if (!p) { cPulados.push({ nome, motivo: "Não abriu com a senha guardada." }); continue; }
      const i = infoCert(p.certPem);
      if (i.validUntil < hoje()) { cPulados.push({ nome: i.holder, motivo: `Vencido em ${i.validUntil.split("-").reverse().join("/")}.` }); continue; }
      const campos = { holder: i.holder, document: i.document, kind: i.kind, validUntil: i.validUntil, nickname: txt(x.apelido).slice(0, 60), pfxEncrypted: cifrar(pfx, org), passEncrypted: cifrar(Buffer.from(senha, "utf8"), org) };
      const r = await this.prisma.fiscalCertificate.upsert({ where: { organizationId_fingerprint: { organizationId: org, fingerprint: i.fingerprint } }, create: { organizationId: org, fingerprint: i.fingerprint, createdById: c.userId, ...campos }, update: campos });
      certIds.set(txt(x.id), r.id); cOk.push(r.id);
    }
    const { maxCompanies } = await this.escopo.limites(org);
    let importados = 0; const pulados: { numero: string; motivo: string }[] = [];
    const ordem = [...dados.memorandos].sort((a, b) => Number(a.status === "cancelado") - Number(b.status === "cancelado"));
    for (const m of ordem) {
      const seq = Number(m.seq), ano = Number(m.ano), numero = Number.isInteger(seq) && Number.isInteger(ano) ? numeroTxt(seq, ano) : "sem número";
      const cnpj = limparCnpj(m.e_cnpj), legalName = txt(m.e_razao).trim() || txt(m.e_fantasia).trim();
      if (numero === "sem número") { pulados.push({ numero, motivo: `${legalName || "Memorando"} sem número.` }); continue; }
      if (cnpj.length !== 14) { pulados.push({ numero, motivo: "CNPJ ausente ou incompleto." }); continue; }
      const status = m.status === "cancelado" ? "cancelado" : "ativo", clientStatus = txt(m.situacaoCliente).toLowerCase() === "inativa" ? "inativa" : "ativa";
      if (await this.prisma.memorandum.findFirst({ where: { organizationId: org, seq, ano } })) { pulados.push({ numero, motivo: "Número já existe neste escritório." }); continue; }
      const empresa = await this.prisma.company.findFirst({ where: { organizationId: org, cnpj } });
      if (status === "ativo" && empresa && await this.prisma.memorandum.findFirst({ where: { organizationId: org, companyId: empresa.id, status: "ativo" } })) { pulados.push({ numero, motivo: "A empresa já tem memorando ativo." }); continue; }
      const ativa = status === "ativo" && clientStatus === "ativa";
      if (!empresa && ativa && maxCompanies !== null && (await this.prisma.company.count({ where: { organizationId: org, active: true } })) >= maxCompanies) { pulados.push({ numero, motivo: "Limite de empresas do plano." }); continue; }
      const data = Object.fromEntries(Object.entries(m).filter(([k]) => !META.includes(k))), criado = Date.parse(txt(m.criadoEm)), atualizado = Date.parse(txt(m.atualizadoEm));
      await this.prisma.$transaction(async (tx) => {
        const e = await tx.company.upsert({ where: { organizationId_cnpj: { organizationId: org, cnpj } }, create: { organizationId: org, cnpj, legalName: legalName || cnpj, active: ativa }, update: ativa ? { legalName: legalName || cnpj, active: true } : {} });
        await tx.memorandum.create({ data: { organizationId: org, companyId: e.id, seq, ano, status, clientStatus, exitDate: txt(m.dataSaida), exitReason: txt(m.motivoSaida), exitNotes: txt(m.obsSaida), data: data as Prisma.InputJsonValue, history: (Array.isArray(m.historico) ? m.historico : []) as Prisma.InputJsonValue, createdByName: txt(m.criadoPorNome) || "Importado do app Facilitar", updatedByName: txt(m.atualizadoPorNome), ...(Number.isNaN(criado) ? {} : { createdAt: new Date(criado) }), ...(Number.isNaN(atualizado) ? {} : { updatedAt: new Date(atualizado) }) } });
      });
      importados++;
    }
    for (const [cnpj, modo] of Object.entries(dados.nfse.modos ?? {})) if (modo === "procuracao" || modo === "certificado") await this.prisma.company.updateMany({ where: { organizationId: org, cnpj: limparCnpj(cnpj) }, data: { nfseMode: modo } });
    const procurador = certIds.get(txt(dados.nfse.procurador));
    if (procurador) await this.prisma.fiscalSettings.upsert({ where: { organizationId: org }, create: { organizationId: org, procuratorCertificateId: procurador }, update: { procuratorCertificateId: procurador } });
    const raizes = dados.restritas.map(limparCnpj).filter((r) => r.length === 8);
    if (raizes.length) { const o = await this.prisma.organization.findUniqueOrThrow({ where: { id: org } }); await this.prisma.organization.update({ where: { id: org }, data: { restrictedRoots: [...new Set([...o.restrictedRoots, ...raizes])] } }); }
    await this.auditoria.registrar(org, c.userId, "office.migration.imported", "", { memorandos: importados, pulados: pulados.length, certificados: cOk.length });
    return { memorandos: { importados, pulados }, certificados: { importados: cOk.length, pulados: cPulados } };
  }
}
