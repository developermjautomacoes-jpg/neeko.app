import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { config } from "../config";

const chave = () => Buffer.from(config().CERT_ENCRYPTION_KEY, "base64");

/** AES-256-GCM: iv (12) + tag (16) + cifrado. O vínculo com a organização entra como dado autenticado. */
export function cifrar(dado: Buffer, organizationId: string): Buffer {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  c.setAAD(Buffer.from(organizationId));
  const corpo = Buffer.concat([c.update(dado), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), corpo]);
}
export function decifrar(blob: Buffer, organizationId: string): Buffer {
  const d = createDecipheriv("aes-256-gcm", chave(), blob.subarray(0, 12));
  d.setAAD(Buffer.from(organizationId));
  d.setAuthTag(blob.subarray(12, 28));
  return Buffer.concat([d.update(blob.subarray(28)), d.final()]);
}
