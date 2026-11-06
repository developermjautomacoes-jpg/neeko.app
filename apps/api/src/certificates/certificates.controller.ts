import { Body, Controller, Delete, Get, HttpCode, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { AuditoriaService } from "../common/audit.service";
import { Contexto, Ctx, Exige } from "../common/auth";
import { cifrar } from "../common/cipher";
import { Erro, invalido, naoEncontrado } from "../common/errors";
import { validar } from "../common/validation";
import { PrismaService } from "../prisma.service";
import { EscopoService } from "../common/scope.service";
import { CertificadosService, hoje } from "./certificates.service";
import { abrirPfx, infoCert } from "./pkcs12";

const publico = (c: { id: string; holder: string; document: string; kind: string; validUntil: string; nickname: string; createdAt: Date }) =>
  ({ id: c.id, holder: c.holder, document: c.document, kind: c.kind, validUntil: c.validUntil, nickname: c.nickname, createdAt: c.createdAt });

@Controller("certificates")
export class CertificatesController {
  constructor(private prisma: PrismaService, private certs: CertificadosService, private auditoria: AuditoriaService, private escopo: EscopoService) {}

  @Exige("fiscal.credentials.manage") @Get()
  async listar(@Ctx() c: Contexto) {
    const certs = (await this.certs.listar(c.organizationId)).filter((x) => !this.escopo.restrita(c, x.document));
    const empresas = await this.prisma.company.findMany({ where: this.escopo.filtro(c), orderBy: { legalName: "asc" }, select: { cnpj: true, legalName: true, nfseMode: true } });
    const daRaiz = (doc: string) => (doc.length === 14 ? empresas.filter((e) => e.cnpj.slice(0, 8) === doc.slice(0, 8)) : []);
    const raizes = new Set(certs.filter((x) => x.document.length === 14).map((x) => x.document.slice(0, 8)));
    return {
      certificados: certs.map((x) => ({ ...publico(x), empresas: daRaiz(x.document).map((e) => ({ cnpj: e.cnpj, razao: e.legalName })) })).sort((a, b) => a.validUntil.localeCompare(b.validUntil)),
      semCertificado: empresas.filter((e) => e.nfseMode !== "procuracao" && !raizes.has(e.cnpj.slice(0, 8))).map((e) => ({ cnpj: e.cnpj, razao: e.legalName })),
    };
  }

  @Exige("fiscal.credentials.manage") @Post() @HttpCode(200)
  async importar(@Ctx() c: Contexto, @Body() corpo: unknown) {
    const d = validar(z.object({ pfx: z.string().min(1, "Escolha o arquivo.").max(400000), senha: z.string().max(200), apelido: z.string().trim().max(60).default("") }), corpo);
    const pfx = Buffer.from(d.pfx, "base64");
    if (!pfx.length || pfx.length > 200000) throw invalido("Arquivo de certificado inválido. Envie o .pfx ou .p12.");
    const p = abrirPfx(pfx, d.senha);
    if (!p) throw invalido("Não foi possível abrir o certificado com essa senha. Confira a senha e o arquivo (.pfx ou .p12).");
    const i = infoCert(p.certPem);
    if (this.escopo.restrita(c, i.document)) throw new Erro(403, "RESTRICTED_CNPJ", "Este CNPJ é restrito à proprietária do escritório.");
    if (i.validUntil < hoje()) throw invalido(`Certificado vencido em ${i.validUntil.split("-").reverse().join("/")}.`);
    const dados = { holder: i.holder, document: i.document, kind: i.kind, validUntil: i.validUntil, nickname: d.apelido, pfxEncrypted: cifrar(pfx, c.organizationId), passEncrypted: cifrar(Buffer.from(d.senha, "utf8"), c.organizationId), createdById: c.userId };
    const cert = await this.prisma.fiscalCertificate.upsert({ where: { organizationId_fingerprint: { organizationId: c.organizationId, fingerprint: i.fingerprint } }, create: { organizationId: c.organizationId, fingerprint: i.fingerprint, ...dados }, update: dados });
    await this.auditoria.registrar(c.organizationId, c.userId, "fiscal.certificate.imported", cert.id, { document: i.document, validUntil: i.validUntil });
    return { id: cert.id };
  }

  @Exige("fiscal.credentials.manage") @Delete(":id")
  async remover(@Ctx() c: Contexto, @Param("id") id: string) {
    const r = await this.prisma.fiscalCertificate.deleteMany({ where: { id, organizationId: c.organizationId, NOT: { OR: c.restritas.map((d) => ({ document: { startsWith: d } })) } } });
    if (!r.count) throw naoEncontrado("Certificado não encontrado.");
    await this.prisma.company.updateMany({ where: { organizationId: c.organizationId, certificateId: id }, data: { certificateId: null } });
    await this.prisma.fiscalSettings.updateMany({ where: { organizationId: c.organizationId, procuratorCertificateId: id }, data: { procuratorCertificateId: null } });
    await this.auditoria.registrar(c.organizationId, c.userId, "fiscal.certificate.removed", id);
    return { ok: true };
  }
}
