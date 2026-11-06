import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (s: string, salt: Buffer, len: number, o: object) => Promise<Buffer>;
const N = 32768, R = 8, P = 1;
const opcoes = (n: number, r: number, p: number) => ({ N: n, r, p, maxmem: 128 * n * r * 2 });

export async function hashSenha(senha: string): Promise<string> {
  const salt = randomBytes(16);
  const h = await scrypt(senha, salt, 32, opcoes(N, R, P));
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${h.toString("base64")}`;
}
export async function conferirSenha(senha: string, guardado: string): Promise<boolean> {
  const [alg, n, r, p, salt, hash] = guardado.split("$");
  if (alg !== "scrypt" || !hash) return false;
  const esperado = Buffer.from(hash, "base64");
  const h = await scrypt(senha, Buffer.from(salt, "base64"), esperado.length, opcoes(+n, +r, +p));
  return timingSafeEqual(h, esperado);
}
/** Mesmo custo de uma conferência real, para e-mail inexistente não responder mais rápido. */
export const HASH_FALSO = "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
export function senhaFraca(s: string): string | null {
  if (s.length < 10) return "A senha precisa ter ao menos 10 caracteres.";
  if (!/[a-zA-Z]/.test(s) || !/\d/.test(s)) return "A senha precisa ter letras e números.";
  return null;
}
