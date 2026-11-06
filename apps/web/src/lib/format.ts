export const digitos = (s: string) => s.replace(/\D/g, "");
export function formatarCnpj(v?: string | null): string {
  const s = (v ?? "").trim();
  if (/^[0-9A-Z]{12}\d{2}$/.test(s)) return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`;
  if (/^\d{11}$/.test(s)) return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
  return s;
}
/** "2026-10-28" → "28/10/2026" */
export function dataBr(iso?: string | null): string {
  if (!iso) return "";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso);
}
export function dataHora(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}
/** "1000.10" → 100010: soma em centavos inteiros, sem erro de ponto flutuante. */
export function centavos(v: string): number {
  const m = /^(-?)(\d+)(?:\.(\d{1,2}))?/.exec(v);
  if (!m) return 0;
  const c = Number(m[2]) * 100 + Number((m[3] ?? "").padEnd(2, "0"));
  return m[1] ? -c : c;
}
export const arquivoParaBase64 = (f: File) => new Promise<string>((ok, nao) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result).split(",")[1] ?? "");
  r.onerror = () => nao(new Error("Não foi possível ler o arquivo."));
  r.readAsDataURL(f);
});
