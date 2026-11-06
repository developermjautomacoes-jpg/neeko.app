import { Injectable } from "@nestjs/common";
import type { Company, FiscalCertificate } from "@prisma/client";
import { X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import { decifrar } from "../common/cipher";
import { config } from "../config";
import { PrismaService } from "../prisma.service";
import { completarCadeia } from "./chain";
import { abrirPfx } from "./pkcs12";

export interface Material { cert: string; key: string; ca: string[]; pfxCert: string; cadeia: string[]; completa: boolean }
export const hoje = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
const brData = (d: string) => d.split("-").reverse().join("/");

@Injectable()
export class CertificadosService {
  private cadeias = new Map<string, { cadeia: string[]; completa: boolean }>();
  constructor(private prisma: PrismaService) {}

  /** Mesma raiz do CNPJ: o escolhido, senão o do próprio CNPJ, senão o de validade mais longa. */
  escolher(lista: FiscalCertificate[], cnpj: string, certificateId: string | null): FiscalCertificate | null {
    const validos = lista.filter((c) => c.document.length === 14 && c.document.slice(0, 8) === cnpj.slice(0, 8));
    const fixo = certificateId ? validos.find((c) => c.id === certificateId) : undefined;
    if (fixo) return fixo;
    return [...validos].sort((a, b) => Number(b.document === cnpj) - Number(a.document === cnpj) || b.validUntil.localeCompare(a.validUntil))[0] ?? null;
  }
  listar(organizationId: string) { return this.prisma.fiscalCertificate.findMany({ where: { organizationId } }); }
  async procurador(organizationId: string): Promise<FiscalCertificate | null> {
    const s = await this.prisma.fiscalSettings.findUnique({ where: { organizationId } });
    if (!s?.procuratorCertificateId) return null;
    return this.prisma.fiscalCertificate.findFirst({ where: { organizationId, id: s.procuratorCertificateId } });
  }
  /** Certificado usado na NFS-e: o da empresa ou o do procurador, conforme a escolha na tela. */
  async daNfse(e: Company): Promise<{ cert: FiscalCertificate | null; erro: string; modo: string }> {
    if (e.nfseMode === "procuracao") {
      const cert = await this.procurador(e.organizationId);
      return { cert, modo: e.nfseMode, erro: cert ? "" : "Cadastre o certificado do procurador na tela de NFS-e." };
    }
    const cert = this.escolher(await this.listar(e.organizationId), e.cnpj, e.certificateId);
    return { cert, modo: e.nfseMode, erro: cert ? "" : "Nenhum e-CNPJ com a mesma raiz desse CNPJ. Importe o certificado ou use a busca por procuração." };
  }
  /** Web service da SEFAZ exige e-CNPJ da mesma raiz; procuração da NFS-e não vale. */
  async daDfe(e: Company): Promise<{ cert: FiscalCertificate | null; erro: string }> {
    const cert = this.escolher(await this.listar(e.organizationId), e.cnpj, e.certificateId);
    return { cert, erro: cert ? "" : "Nenhum e-CNPJ com a mesma raiz desse CNPJ. Importe o certificado." };
  }

  /** A chave privada só existe em memória durante a chamada; nunca vai para arquivo temporário. */
  async material(c: FiscalCertificate, recriar = false): Promise<{ material?: Material; erro?: string }> {
    let pfx;
    try { pfx = abrirPfx(decifrar(Buffer.from(c.pfxEncrypted), c.organizationId), decifrar(Buffer.from(c.passEncrypted), c.organizationId).toString("utf8")); }
    catch { return { erro: "Não foi possível ler o certificado: a chave do servidor mudou? Importe-o de novo." }; }
    if (!pfx) return { erro: "Não foi possível abrir o certificado: importe-o de novo." };
    if (c.validUntil < hoje()) return { erro: `Certificado vencido em ${brData(c.validUntil)}. Importe o novo.` };
    let ch = recriar ? undefined : this.cadeias.get(c.fingerprint);
    if (!ch) { ch = await completarCadeia(pfx.certPem, pfx.extras); if (ch.completa) this.cadeias.set(c.fingerprint, ch); }
    return { material: { cert: [pfx.certPem, ...ch.cadeia].join("\n"), key: pfx.keyPem, ca: autoridades(ch.cadeia), pfxCert: pfx.certPem, cadeia: ch.cadeia, completa: ch.completa } };
  }
}

/** Servidores da SEFAZ usam a cadeia ICP-Brasil: aceita a raiz ICP-Brasil da cadeia do certificado, além da lista do FISCAL_CA_FILE. */
export function autoridades(cadeia: string[]): string[] {
  const extra: string[] = [];
  const arq = config().FISCAL_CA_FILE;
  if (arq) extra.push(readFileSync(arq, "utf8"));
  for (const c of cadeia) {
    const x = new X509Certificate(c);
    if (x.subject === x.issuer && /^O=ICP-Brasil$/m.test(x.subject)) extra.push(c);
  }
  return extra;
}
