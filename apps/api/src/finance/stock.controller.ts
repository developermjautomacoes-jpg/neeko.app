import { Body, Controller, Get, Param, Post, Put } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AuditoriaService } from "../common/audit.service";
import { Contexto, Ctx, Exige } from "../common/auth";
import { Erro, invalido, naoEncontrado } from "../common/errors";
import { EscopoService } from "../common/scope.service";
import { validar } from "../common/validation";
import { PrismaService } from "../prisma.service";

const qtd = z.string().regex(/^\d{1,12}(\.\d{1,3})?$/, "Quantidade inválida.");
const custo = z.string().regex(/^\d{1,11}(\.\d{1,4})?$/, "Custo inválido.");
const item = z.object({ code: z.string().trim().min(1, "Informe o código.").max(40), name: z.string().trim().min(2, "Informe o nome.").max(160), unit: z.string().trim().min(1).max(6).default("UN"), minQty: qtd.default("0"), active: z.boolean().default(true) });
const mov = z.object({ type: z.enum(["entrada", "saida", "ajuste"]), qty: qtd, unitCost: custo.default("0"), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."), note: z.string().max(300).default("") });
const pub = (i: { qty: Prisma.Decimal; minQty: Prisma.Decimal; avgCost: Prisma.Decimal }) => ({ ...i, qty: i.qty.toFixed(3), minQty: i.minQty.toFixed(3), avgCost: i.avgCost.toFixed(4), valor: i.qty.mul(i.avgCost).toFixed(2) });

/** Saldo e custo médio. A saída não deixa o saldo negativo; "ajuste" define o saldo contado. */
@Controller("stock/:empresa")
export class EstoqueController {
  constructor(private prisma: PrismaService, private escopo: EscopoService, private auditoria: AuditoriaService) {}
  private async onde(c: Contexto, e: string) { return { organizationId: c.organizationId, companyId: (await this.escopo.empresa(c, e)).id }; }
  @Exige("stock.read") @Get("items")
  async listar(@Ctx() c: Contexto, @Param("empresa") e: string) { const i = await this.prisma.stockItem.findMany({ where: await this.onde(c, e), orderBy: { name: "asc" } }); return { itens: i.map(pub) }; }
  @Exige("stock.manage") @Post("items")
  async criar(@Ctx() c: Contexto, @Param("empresa") e: string, @Body() b: unknown) {
    try { return pub(await this.prisma.stockItem.create({ data: { ...(await this.onde(c, e)), ...validar(item, b) } })); }
    catch (x) { if ((x as { code?: string }).code === "P2002") throw new Erro(409, "EM_USO", "Já existe item com esse código."); throw x; }
  }
  @Exige("stock.manage") @Put("items/:id")
  async alterar(@Ctx() c: Contexto, @Param("empresa") e: string, @Param("id") id: string, @Body() b: unknown) {
    const r = await this.prisma.stockItem.updateMany({ where: { ...(await this.onde(c, e)), id }, data: validar(item, b) });
    if (!r.count) throw naoEncontrado("Item não encontrado."); return { ok: true };
  }
  @Exige("stock.read") @Get("items/:id/moves")
  async movimentos(@Ctx() c: Contexto, @Param("empresa") e: string, @Param("id") id: string) {
    if (!(await this.prisma.stockItem.findFirst({ where: { ...(await this.onde(c, e)), id } }))) throw naoEncontrado("Item não encontrado.");
    const l = await this.prisma.stockMove.findMany({ where: { organizationId: c.organizationId, itemId: id }, orderBy: { createdAt: "desc" }, take: 200 });
    return { movimentos: l.map((m) => ({ ...m, qty: m.qty.toFixed(3), unitCost: m.unitCost.toFixed(4) })) };
  }
  @Exige("stock.manage") @Post("items/:id/moves")
  async mover(@Ctx() c: Contexto, @Param("empresa") e: string, @Param("id") id: string, @Body() b: unknown) {
    const d = validar(mov, b), onde = await this.onde(c, e), q = new Prisma.Decimal(d.qty), u = await this.prisma.user.findUniqueOrThrow({ where: { id: c.userId }, select: { name: true } });
    if (d.type !== "ajuste" && q.lte(0)) throw invalido("Informe uma quantidade maior que zero.");
    const r = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "StockItem" WHERE "id" = ${id}::uuid AND "organizationId" = ${c.organizationId}::uuid FOR UPDATE`;
      const i = await tx.stockItem.findFirst({ where: { ...onde, id } });
      if (!i) throw naoEncontrado("Item não encontrado.");
      let qty = i.qty, avgCost = i.avgCost;
      if (d.type === "entrada") { const total = i.qty.add(q); avgCost = total.gt(0) ? i.qty.mul(i.avgCost).add(q.mul(d.unitCost)).div(total).toDecimalPlaces(4) : avgCost; qty = total; }
      else if (d.type === "saida") { if (q.gt(i.qty)) throw invalido(`Saldo insuficiente: há ${i.qty.toFixed(3)} ${i.unit}.`); qty = i.qty.sub(q); }
      else qty = q;
      await tx.stockMove.create({ data: { organizationId: c.organizationId, itemId: id, type: d.type, qty: q, unitCost: d.type === "entrada" ? d.unitCost : i.avgCost, date: d.date, note: d.note, byName: u.name } });
      return pub(await tx.stockItem.update({ where: { id }, data: { qty, avgCost } }));
    });
    await this.auditoria.registrar(c.organizationId, c.userId, "stock.moved", id, { type: d.type, qty: d.qty });
    return r;
  }
}
