import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { Publico } from "./common/auth";
import { PrismaService } from "./prisma.service";

@Controller("health")
export class HealthController {
  constructor(private prisma: PrismaService) {}
  @Publico() @Get()
  async ok() {
    try { await this.prisma.$queryRaw`SELECT 1`; return { status: "ok" }; }
    catch { throw new ServiceUnavailableException("indisponível"); }
  }
}
