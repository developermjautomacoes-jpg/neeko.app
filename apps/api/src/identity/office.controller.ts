import { Body, Controller, Get, HttpCode, Param, Post, Put } from "@nestjs/common";
import { z } from "zod";
import { AuditoriaService } from "../common/audit.service";
import { Contexto, Ctx, Exige, Publico } from "../common/auth";
import { naoEncontrado } from "../common/errors";
import { validar } from "../common/validation";
import { PrismaService } from "../prisma.service";
import { MigracaoService } from "./migration.service";

const cor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida.").nullable().default(null);
const perfil = z.object({
  colorPrimary: cor, colorDark: cor,
  logo: z.string().max(500000, "A logo ficou grande demais.").regex(/^data:image\/png;base64,iVBOR[A-Za-z0-9+/=]+$/, "Logo inválida.").nullable(),
  contactEmail: z.string().trim().max(160).default(""), contactPhone: z.string().trim().max(30).default(""),
});

/** Só o necessário para personalizar a tela de entrada do link do escritório. */
@Controller("public")
export class EscritorioPublicoController {
  constructor(private prisma: PrismaService) {}
  @Publico() @Get("offices/:slug")
  async ler(@Param("slug") slug: string) {
    const o = await this.prisma.organization.findFirst({ where: { slug, status: "ACTIVE", internal: false }, select: { name: true, logo: true, colorPrimary: true, colorDark: true } });
    if (!o) throw naoEncontrado("Escritório não encontrado.");
    return o;
  }
}

/** O próprio escritório cuida da logo e dos contatos usados nos relatórios. */
@Controller("office")
export class EscritorioController {
  constructor(private prisma: PrismaService, private auditoria: AuditoriaService, private migracao: MigracaoService) {}
  @Exige("office.manage") @Put()
  async salvar(@Ctx() c: Contexto, @Body() corpo: unknown) {
    await this.prisma.organization.update({ where: { id: c.organizationId }, data: validar(perfil, corpo) });
    await this.auditoria.registrar(c.organizationId, c.userId, "office.profile.changed");
    return { ok: true };
  }
  /** Importa para o próprio escritório logado: o pacote nunca escolhe o destino. */
  @Exige("office.manage") @Post("import") @HttpCode(200)
  importar(@Ctx() c: Contexto, @Body() corpo: unknown) {
    const d = validar(z.object({ pacote: z.string().min(10).max(58000000), frase: z.string().min(12, "A frase tem pelo menos 12 caracteres.").max(200) }), corpo);
    return this.migracao.importar(c, d.pacote, d.frase);
  }
}
