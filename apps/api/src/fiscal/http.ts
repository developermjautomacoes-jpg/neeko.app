import https from "node:https";
import http from "node:http";
import tls from "node:tls";
import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";

export interface Pedido { url: string; metodo?: "GET" | "POST"; cabecalhos?: Record<string, string>; corpo?: string; cert?: string; key?: string; ca?: string[]; tls12?: boolean; timeoutMs?: number }
export interface Resposta { http: number; corpo: string; erroCodigo: string; erro: string; cabecalhos: Record<string, string | string[] | undefined> }

/** Conexão mútua com o certificado da empresa. A verificação do servidor nunca é desligada. */
export function chamar(p: Pedido): Promise<Resposta> {
  return new Promise((fim) => {
    const u = new URL(p.url);
    const mod = u.protocol === "https:" ? https : http;
    const req = mod.request(u, { method: p.metodo ?? "GET", headers: { "accept-encoding": "gzip", ...(p.corpo ? { "content-length": Buffer.byteLength(p.corpo) } : {}), ...p.cabecalhos }, timeout: p.timeoutMs ?? 60000, agent: false,
      ...(u.protocol === "https:" ? { cert: p.cert, key: p.key, ca: [...tls.rootCertificates, ...(p.ca ?? [])], rejectUnauthorized: true, ...(p.tls12 ? { maxVersion: "TLSv1.2" as const } : {}) } : {}) }, (r) => {
      const partes: Buffer[] = [];
      r.on("data", (b: Buffer) => partes.push(b));
      r.on("error", (e: NodeJS.ErrnoException) => fim({ http: r.statusCode ?? 0, corpo: "", erroCodigo: e.code ?? "ERRO", erro: e.message, cabecalhos: r.headers }));
      r.on("end", () => {
        let b = Buffer.concat(partes);
        try { const c = r.headers["content-encoding"]; if (c === "gzip") b = gunzipSync(b); else if (c === "deflate") b = inflateSync(b); else if (c === "br") b = brotliDecompressSync(b); } catch { /* corpo já legível */ }
        fim({ http: r.statusCode ?? 0, corpo: b.toString("utf8"), erroCodigo: "", erro: "", cabecalhos: r.headers });
      });
    });
    req.on("timeout", () => req.destroy(Object.assign(new Error("Tempo de resposta esgotado."), { code: "ETIMEDOUT" })));
    req.on("error", (e: NodeJS.ErrnoException) => fim({ http: 0, corpo: "", erroCodigo: e.code ?? "ERRO", erro: e.message, cabecalhos: {} }));
    if (p.corpo) req.write(p.corpo);
    req.end();
  });
}
const CONEXAO = new Set(["ECONNRESET", "EPIPE", "EPROTO", "ERR_SSL_WRONG_VERSION_NUMBER"]);
/** Alguns servidores só aceitam TLS 1.2. */
export async function chamarComRecuo(p: Pedido): Promise<Resposta> {
  const r = await chamar(p);
  return CONEXAO.has(r.erroCodigo) ? chamar({ ...p, tls12: true }) : r;
}
export const faltaCadeia = (c: string) => ["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "SELF_SIGNED_CERT_IN_CHAIN", "DEPTH_ZERO_SELF_SIGNED_CERT", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "UNABLE_TO_GET_ISSUER_CERT", "CERT_UNTRUSTED"].includes(c);
