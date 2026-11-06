import { Body, Controller, Put } from "@nestjs/common";
import { z } from "zod";
import { AuditoriaService } from "../common/audit.service";
import { Contexto, Ctx, Exige } from "../common/auth";
import { validar } from "../common/validation";
import { PrismaService } from "../prisma.service";

const perfil = z.object({
  logo: z.string().max(500000, "A logo ficou grande demais.").regex(/^data:image\/png;base64,iVBOR[A-Za-z0-9+/=]+$/, "Logo inválida.").nullable(),
  contactEmail: z.string().trim().max(160).default(""), contactPhone: z.string().trim().max(30).default(""),
});

/** O próprio escritório cuida da logo e dos contatos usados nos relatórios. */
@Controller("office")
export class EscritorioController {
  constructor(private prisma: PrismaService, private auditoria: AuditoriaService) {}
  @Exige("office.manage") @Put()
  async salvar(@Ctx() c: Contexto, @Body() corpo: unknown) {
    await this.prisma.organization.update({ where: { id: c.organizationId }, data: validar(perfil, corpo) });
    await this.auditoria.registrar(c.organizationId, c.userId, "office.profile.changed");
    return { ok: true };
  }
}
