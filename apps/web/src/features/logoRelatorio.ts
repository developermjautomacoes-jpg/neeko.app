import { eu } from "@/services/conta";

/** Logo e rodapé dos relatórios: os do escritório; sem logo cadastrada, usa a da Neeko. */
export async function logoRelatorio() {
  const o = (await eu()).organization, logo = o?.logo;
  const bytes = logo ? Uint8Array.from(atob(logo.split(",")[1]), (c) => c.charCodeAt(0)) : new Uint8Array(await (await fetch("/logo-relatorio.png")).arrayBuffer());
  const v = new DataView(bytes.buffer, bytes.byteOffset), prop = v.getUint32(16) / v.getUint32(20); // cabeçalho PNG: largura e altura
  let base64 = ""; bytes.forEach((x) => { base64 += String.fromCharCode(x); }); base64 = btoa(base64);
  const nome = o?.name ?? "Neeko";
  return { bytes, base64, prop, nome, rodape: [nome, o?.contactPhone, o?.contactEmail].filter(Boolean).join(" · ") };
}
