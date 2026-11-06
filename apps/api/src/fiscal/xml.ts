import { DOMParser } from "@xmldom/xmldom";
import { gunzipSync, gzipSync } from "node:zlib";

export type No = { nodeType: number; localName?: string | null; nodeName: string; textContent: string | null; childNodes: { length: number; [i: number]: No } & ArrayLike<No>; getAttribute?: (n: string) => string | null };

/** Recusa DOCTYPE (entidades externas) e XML malformado. */
export function lerXml(xml: string): No | null {
  if (/<!DOCTYPE/i.test(xml)) return null;
  try {
    const d = new DOMParser({ onError: () => undefined }).parseFromString(xml, "text/xml") as unknown as { documentElement: No | null };
    return d.documentElement ?? null;
  } catch { return null; }
}
const nome = (n: No) => n.localName ?? n.nodeName.replace(/^.*:/, "");
export const filhos = (n: No): No[] => Array.from(n.childNodes as ArrayLike<No>).filter((c) => c.nodeType === 1);
export function filho(n: No | null, caminho: string): No | null {
  let at = n;
  for (const p of caminho.split("/")) { at = at ? filhos(at).find((c) => nome(c) === p) ?? null : null; if (!at) return null; }
  return at;
}
export const texto = (n: No | null, caminho: string) => filho(n, caminho)?.textContent?.trim() ?? "";
/** Primeiro elemento com esse nome, em qualquer profundidade (inclui a raiz). */
export function buscar(n: No, alvo: string): No | null {
  if (nome(n) === alvo) return n;
  for (const c of filhos(n)) { const r = buscar(c, alvo); if (r) return r; }
  return null;
}
export function buscarTodos(n: No, alvo: string, saida: No[] = []): No[] {
  if (nome(n) === alvo) saida.push(n);
  for (const c of filhos(n)) buscarTodos(c, alvo, saida);
  return saida;
}
export const nomeDe = nome;
/** Valor exato do XML, sem passar por float. */
export const valor = (s: string) => (/^-?\d+(\.\d+)?$/.test(s) ? s : "0");
export const comprimir = (xml: string) => gzipSync(Buffer.from(xml, "utf8"));
export const descomprimir = (b: Uint8Array) => gunzipSync(Buffer.from(b)).toString("utf8");
/** docZip e ArquivoXml: base64 de gzip. */
export function abrirZip(b64: unknown): string | null {
  try {
    const b = Buffer.from(String(b64 ?? ""), "base64");
    if (!b.length) return null;
    const x = gunzipSync(b).toString("utf8");
    return x || null;
  } catch { return null; }
}
export const espere = (ms: number) => new Promise((r) => setTimeout(r, ms));
