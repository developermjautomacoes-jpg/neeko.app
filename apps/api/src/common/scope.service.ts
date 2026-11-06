import { Injectable } from "@nestjs/common";
import type { Company, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import type { Contexto } from "./auth";
import { naoEncontrado } from "./errors";

@Injectable()
export class EscopoService {
  /** null = sem limite. Conta o que já existe contra o plano do escritório. */
  async limites(organizationId: string) {
    const o = await this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, include: { plan: true } });
    return { maxCompanies: o.internal ? null : o.plan?.maxCompanies ?? null, maxUsers: o.internal ? null : o.plan?.maxUsers ?? null };
  }
  constructor(private prisma: PrismaService) {}
  private semRestritas(c: Contexto): Prisma.CompanyWhereInput { return c.restritas.length ? { NOT: { OR: c.restritas.map((r) => ({ cnpj: { startsWith: r } })) } } : {}; }
  restrita(c: Contexto, documento: string) { return c.restritas.some((r) => documento.startsWith(r)); }
  /** Filtro das empresas que a pessoa pode ver, sempre dentro da organização da sessão. */
  filtro(c: Contexto): Prisma.CompanyWhereInput {
    return { organizationId: c.organizationId, active: true, ...this.semRestritas(c), ...(c.allCompanies ? {} : { access: { some: { membershipId: c.membershipId } } }) };
  }
  /** Carteira completa, incluindo empresas que saíram: usada só pelos memorandos. */
  carteira(c: Contexto): Prisma.CompanyWhereInput {
    return { organizationId: c.organizationId, ...this.semRestritas(c), ...(c.allCompanies ? {} : { access: { some: { membershipId: c.membershipId } } }) };
  }
  /** Id de outra organização ou sem acesso responde igual a id inexistente. */
  async empresa(c: Contexto, id: string): Promise<Company> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw naoEncontrado("Empresa não encontrada.");
    const e = await this.prisma.company.findFirst({ where: { ...this.filtro(c), id } });
    if (!e) throw naoEncontrado("Empresa não encontrada.");
    return e;
  }
}
