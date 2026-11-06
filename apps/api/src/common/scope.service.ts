import { Injectable } from "@nestjs/common";
import type { Company, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import type { Contexto } from "./auth";
import { naoEncontrado } from "./errors";

@Injectable()
export class EscopoService {
  constructor(private prisma: PrismaService) {}
  /** Filtro das empresas que a pessoa pode ver, sempre dentro da organização da sessão. */
  filtro(c: Contexto): Prisma.CompanyWhereInput {
    return { organizationId: c.organizationId, active: true, ...(c.allCompanies ? {} : { access: { some: { membershipId: c.membershipId } } }) };
  }
  /** Id de outra organização ou sem acesso responde igual a id inexistente. */
  async empresa(c: Contexto, id: string): Promise<Company> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw naoEncontrado("Empresa não encontrada.");
    const e = await this.prisma.company.findFirst({ where: { ...this.filtro(c), id } });
    if (!e) throw naoEncontrado("Empresa não encontrada.");
    return e;
  }
}
