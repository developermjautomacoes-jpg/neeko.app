import { Body, Controller, HttpCode, Post, Req } from "@nestjs/common";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { z } from "zod";
import { AuditoriaService } from "../common/audit.service";
import { SemMfa, SoLogado } from "../common/auth";
import { cifrar, decifrar } from "../common/cipher";
import { Erro, invalido } from "../common/errors";
import { validar } from "../common/validation";
import { PrismaService } from "../prisma.service";

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const b32 = (b: Buffer) => { let bits = "", s = ""; for (const x of b) bits += x.toString(2).padStart(8, "0"); for (let i = 0; i + 5 <= bits.length; i += 5) s += B32[parseInt(bits.slice(i, i + 5), 2)]; return s; };
export function totp(segredo: Buffer, passo: number): string {
  const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(passo));
  const h = createHmac("sha1", segredo).update(c).digest(), o = h[19] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1000000).padStart(6, "0");
}
const igual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const hash = (c: string) => createHash("sha256").update(c.replace(/[^A-Z0-9]/gi, "").toUpperCase()).digest("hex");
const falhas = new Map<string, { n: number; ate: number }>();
export const limparMfa = () => falhas.clear();
type Sessao = { id: string; userId: string; organizationId: string | null; mfaVerified: boolean };

@Controller("auth/mfa")
export class MfaController {
  constructor(private prisma: PrismaService, private auditoria: AuditoriaService) {}

  private passo() { return Math.floor(Date.now() / 30000); }
  /** Aceita o código do passo atual e dos vizinhos; um código usado não vale de novo. */
  private conferir(segredo: Buffer, codigo: string, ultimo: bigint): number | null {
    const p = this.passo();
    for (const s of [p - 1, p, p + 1]) if (BigInt(s) > ultimo && igual(totp(segredo, s), codigo)) return s;
    return null;
  }

  @SoLogado() @Post("setup") @HttpCode(200)
  async setup(@Req() req: Request & { sessao: Sessao }) {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: req.sessao.userId } });
    if (u.mfaEnabled) throw invalido("A verificação em duas etapas já está ativa.");
    const segredo = randomBytes(20);
    await this.prisma.user.update({ where: { id: u.id }, data: { mfaSecret: cifrar(segredo, u.id) } });
    const chave = b32(segredo);
    return { chave, uri: `otpauth://totp/${encodeURIComponent(`Neeko:${u.email}`)}?secret=${chave}&issuer=Neeko&algorithm=SHA1&digits=6&period=30` };
  }

  @SoLogado() @Post("enable") @HttpCode(200)
  async ativar(@Req() req: Request & { sessao: Sessao }, @Body() corpo: unknown) {
    const { codigo } = validar(z.object({ codigo: z.string().regex(/^\d{6}$/, "Digite os 6 números do aplicativo.") }), corpo);
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: req.sessao.userId } });
    if (u.mfaEnabled || !u.mfaSecret) throw invalido("Comece a ativação de novo.");
    const passo = this.conferir(decifrar(Buffer.from(u.mfaSecret), u.id), codigo, 0n);
    if (passo === null) throw invalido("Código incorreto. Confira o horário do celular e tente de novo.");
    const codigos = Array.from({ length: 8 }, () => randomBytes(5).toString("hex").toUpperCase().replace(/(.{5})/, "$1-"));
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: u.id }, data: { mfaEnabled: true, mfaLastStep: BigInt(passo), mfaRecovery: codigos.map(hash) } }),
      this.prisma.session.update({ where: { id: req.sessao.id }, data: { mfaVerified: true } }),
    ]);
    await this.auditoria.registrar(req.sessao.organizationId, u.id, "auth.mfa.enabled");
    return { codigos };
  }

  @SemMfa() @Post("verify") @HttpCode(200)
  async verificar(@Req() req: Request & { sessao: Sessao }, @Body() corpo: unknown) {
    const { codigo } = validar(z.object({ codigo: z.string().trim().min(6, "Digite o código.").max(20) }), corpo);
    const k = req.sessao.userId, f = falhas.get(k);
    if (f && f.n >= 5 && f.ate > Date.now()) throw new Erro(429, "TOO_MANY_ATTEMPTS", "Muitas tentativas. Aguarde 15 minutos.");
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: k } });
    if (!u.mfaEnabled || !u.mfaSecret) throw invalido("A verificação em duas etapas não está ativa.");
    const lista = u.mfaRecovery as string[], recup = lista.includes(hash(codigo));
    const passo = /^\d{6}$/.test(codigo) ? this.conferir(decifrar(Buffer.from(u.mfaSecret), u.id), codigo, u.mfaLastStep) : null;
    if (passo === null && !recup) { falhas.set(k, { n: f && f.ate > Date.now() ? f.n + 1 : 1, ate: Date.now() + 900000 }); throw invalido("Código incorreto."); }
    falhas.delete(k);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: k }, data: passo !== null ? { mfaLastStep: BigInt(passo) } : { mfaRecovery: lista.filter((x) => x !== hash(codigo)) } }),
      this.prisma.session.update({ where: { id: req.sessao.id }, data: { mfaVerified: true } }),
    ]);
    if (recup && passo === null) await this.auditoria.registrar(req.sessao.organizationId, k, "auth.mfa.recovery.used");
    return { ok: true, restantes: recup && passo === null ? lista.length - 1 : undefined };
  }
}
