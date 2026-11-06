import { Body, Controller, Delete, Get, HttpCode, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { AuditoriaService } from "../common/audit.service";
import { Contexto, Ctx, Exige } from "../common/auth";
import { cifrar } from "../common/cipher";
import { invalido, naoEncontrado } from "../common/errors";
import { validar } from "../common/validation";
import { PrismaService } from "../prisma.service";
import { CertificadosService, hoje } from "./certificates.service";
import { abrirPfx, infoCert } from "./pkcs12";

const publico = (c: { id: string; holder: string; document: string; kind: string; validUntil: string; nickname: string; createdAt: Date }) =>
  ({ id: c.id, holder: c.holder, document: c.document, kind: c.kind, validUntil: c.validUntil, nickname: c.nickname, createdAt: c.createdAt });

@Controller("certificates")
export class CertificatesController {
  constructor(private prisma: PrismaService, private certs: CertificadosService, private auditoria: AuditoriaService) {}

  @Exige("fiscal.credentials.manage") @Get()
  async listar(@Ctx() c: Contexto) { return { certificados: (await this.certs.listar(c.organizationId)).map(publico).sort((a, b) => a.holder.localeCompare(b.holder)) }; }

  @Exige("fiscal.credentials.manage") @Post() @HttpCode(200)
  async importar(@Ctx() c: Contexto, @Body() corpo: unknown) {
    const d = validar(z.object({ pfx: z.string().min(1, "Escolha o arquivo.").max(400000), senha: z.string().max(200), apelido: z.string().trim().max(60).default("") }), corpo);
    const pfx = Buffer.from(d.pfx, "base64");
    if (!pfx.length || pfx.length > 200000) throw invalido("Arquivo de certificado inválido. Envie o .pfx ou .p12.");
    const p = abrirPfx(pfx, d.senha);
    if (!p) throw invalido("Não foi possível abrir o certificado com essa senha. Confira a senha e o arquivo (.pfx ou .p12).");
    const i = infoCert(p.certPem);
    if (i.validUntil < hoje()) throw invalido(`Certificado vencido em ${i.validUntil.split("-").reverse().join("/")}.`);
    const dados = { holder: i.holder, document: i.document, kind: i.kind, validUntil: i.validUntil, nickname: d.apelido, pfxEncrypted: cifrar(pfx, c.organizationId), passEncrypted: cifrar(Buffer.from(d.senha, "utf8"), c.organizationId), createdById: c.userId };
    const cert = await this.prisma.fiscalCertificate.upsert({ where: { organizationId_fingerprint: { organizationId: c.organizationId, fingerprint: i.fingerprint } }, create: { organizationId: c.organizationId, fingerprint: i.fingerprint, ...dados }, update: dados });
    await this.auditoria.registrar(c.organizationId, c.userId, "fiscal.certificate.imported", cert.id, { document: i.document, validUntil: i.validUntil });
    return { id: cert.id };
  }

  @Exige("fiscal.credentials.manage") @Delete(":id")
  async remover(@Ctx() c: Contexto, @Param("id") id: string) {
    const r = await this.prisma.fiscalCertificate.deleteMany({ where: { id, organizationId: c.organizationId } });
    if (!r.count) throw naoEncontrado("Certificado não encontrado.");
    await this.prisma.company.updateMany({ where: { organizationId: c.organizationId, certificateId: id }, data: { certificateId: null } });
    await this.prisma.fiscalSettings.updateMany({ where: { organizationId: c.organizationId, procuratorCertificateId: id }, data: { procuratorCertificateId: null } });
    await this.auditoria.registrar(c.organizationId, c.userId, "fiscal.certificate.removed", id);
    return { ok: true };
  }
}
