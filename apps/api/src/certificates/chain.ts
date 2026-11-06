import { X509Certificate } from "node:crypto";
import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP } from "node:net";
import forge from "node-forge";

const privados = new BlockList();
for (const [ip, p] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.168.0.0", 16], ["224.0.0.0", 3]] as const) privados.addSubnet(ip, p, "ipv4");
for (const [ip, p] of [["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8]] as const) privados.addSubnet(ip, p, "ipv6");
export const ipPublico = (ip: string) => isIP(ip) !== 0 && !privados.check(ip, isIP(ip) === 6 ? "ipv6" : "ipv4");

/** O endereço vem de dentro do certificado: só servidor público, sem redirecionamento e com limite de tamanho. */
async function baixar(url: string): Promise<Buffer | null> {
  let u: URL; try { u = new URL(url); } catch { return null; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const ips = await lookup(u.hostname, { all: true }).catch(() => []);
  if (!ips.length || !ips.every((i) => ipPublico(i.address))) return null;
  const alvo = ips[0];
  return new Promise((ok) => {
    const req = (u.protocol === "https:" ? https : http).get(u, { timeout: 10000, lookup: ((_h: string, o: { all?: boolean }, cb: (...a: unknown[]) => void) => (o?.all ? cb(null, [alvo]) : cb(null, alvo.address, alvo.family))) as never }, (r) => {
      if (r.statusCode !== 200) { r.resume(); ok(null); return; }
      const partes: Buffer[] = []; let n = 0;
      r.on("data", (b: Buffer) => { n += b.length; if (n > 300000) { req.destroy(); ok(null); } else partes.push(b); });
      r.on("end", () => ok(Buffer.concat(partes)));
    });
    req.on("timeout", () => { req.destroy(); ok(null); });
    req.on("error", () => ok(null));
  });
}
export function lerCertificados(b: Buffer): string[] {
  const t = b.toString("latin1");
  if (t.includes("-----BEGIN CERTIFICATE-----")) return t.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) ?? [];
  try { return [new X509Certificate(b).toString()]; } catch { /* pode ser .p7b */ }
  try {
    const m = forge.pkcs7.messageFromAsn1(forge.asn1.fromDer(b.toString("binary"))) as { certificates?: forge.pki.Certificate[] };
    return (m.certificates ?? []).map((c) => forge.pki.certificateToPem(c));
  } catch { return []; }
}
const aiaDe = (x: X509Certificate) => [...(x.infoAccess ?? "").matchAll(/CA Issuers - URI:(\S+)/g)].map((m) => m[1]);

/** O .pfx costuma trazer só o certificado da empresa; sem as ACs intermediárias o servidor recusa a conexão. */
export async function completarCadeia(certPem: string, extras: string[], baixarAc: (u: string) => Promise<Buffer | null> = baixar): Promise<{ cadeia: string[]; completa: boolean }> {
  const pool = [...extras];
  const cadeia: string[] = [];
  let atual = new X509Certificate(certPem);
  for (let i = 0; i < 6; i++) {
    if (atual.subject === atual.issuer) return { cadeia, completa: true };
    const emissor = (l: string[]) => l.find((c) => atual.checkIssued(new X509Certificate(c)));
    let prox = emissor(pool);
    if (!prox) for (const url of aiaDe(atual)) {
      const b = await baixarAc(url);
      if (b) pool.push(...lerCertificados(b));
      prox = emissor(pool);
      if (prox) break;
    }
    if (!prox) return { cadeia, completa: false };
    cadeia.push(prox);
    atual = new X509Certificate(prox);
  }
  return { cadeia, completa: atual.subject === atual.issuer };
}
