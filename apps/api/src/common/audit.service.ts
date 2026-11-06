import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class AuditoriaService {
  private log = new Logger("Auditoria");
  constructor(private prisma: PrismaService) {}
  async registrar(organizationId: string | null, userId: string | null, action: string, target = "", detail: Record<string, unknown> = {}) {
    try { await this.prisma.auditEvent.create({ data: { organizationId, userId, action, target, detail: detail as object } }); }
    catch (e) { this.log.error(`Falha ao auditar ${action}: ${String(e)}`); }
  }
}
