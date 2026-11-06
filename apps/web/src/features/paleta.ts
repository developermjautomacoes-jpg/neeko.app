/** Deriva do par de cores do escritório os tokens usados pelos componentes, mantendo o texto legível. */
type Rgb = [number, number, number];
const CHAVES = ["--color-brand", "--color-brand-hover", "--color-brand-text", "--color-brand-soft", "--color-on-brand", "--color-dark", "--color-dark-2", "--color-dark-brand", "--focus-ring", "--shadow-glow"];
const rgb = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
const hex = (c: Rgb) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const mistura = (a: Rgb, b: Rgb, p: number): Rgb => a.map((v, i) => v + (b[i] - v) * p) as Rgb;
const luz = (c: Rgb) => { const [r, g, b] = c.map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contraste = (a: Rgb, b: Rgb) => { const [x, y] = [luz(a), luz(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const BRANCO: Rgb = [255, 255, 255], PRETO: Rgb = [0, 0, 0];
function escurecerAte(c: Rgb, minimo: number) { let x = c; for (let i = 0; i < 40 && contraste(x, BRANCO) < minimo; i++) x = mistura(x, PRETO, 0.08); return x; }

export function aplicarPaleta(principal?: string | null, escuro?: string | null) {
  const s = document.documentElement.style;
  CHAVES.forEach((k) => s.removeProperty(k));
  if (principal) {
    const p = rgb(principal);
    s.setProperty("--color-brand", principal);
    s.setProperty("--color-brand-hover", hex(mistura(p, PRETO, 0.1)));
    s.setProperty("--color-brand-text", hex(escurecerAte(p, 4.5)));
    s.setProperty("--color-brand-soft", hex(mistura(p, BRANCO, 0.85)));
    s.setProperty("--color-on-brand", contraste(p, BRANCO) >= contraste(p, PRETO) ? "#FFFFFF" : "#06241B");
    s.setProperty("--color-dark-brand", hex(mistura(p, BRANCO, contraste(p, PRETO) < 6 ? 0.45 : 0)));
    s.setProperty("--focus-ring", `0 0 0 3px rgba(${p.join(", ")}, 0.45)`);
    s.setProperty("--shadow-glow", `0 0 18px rgba(${p.join(", ")}, 0.35)`);
  }
  const base = escuro ? rgb(escuro) : principal ? mistura(rgb(principal), PRETO, 0.8) : null;
  if (base) {
    const d = escurecerAte(base, 10);
    s.setProperty("--color-dark", hex(d));
    s.setProperty("--color-dark-2", hex(principal ? mistura(d, rgb(principal), 0.22) : mistura(d, BRANCO, 0.1)));
  }
}

/** Cor principal da logo: a mais frequente entre as saturadas, ignorando transparente, branco e preto. */
export async function coresDaLogo(logo: string): Promise<{ principal: string; escuro: string } | null> {
  const i = new Image(); i.src = logo; await i.decode();
  const c = document.createElement("canvas"); c.width = 80; c.height = Math.max(1, Math.round(80 * i.height / i.width));
  const g = c.getContext("2d"); if (!g) return null;
  g.drawImage(i, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height).data, cont = new Map<string, { n: number; soma: Rgb }>();
  for (let k = 0; k < d.length; k += 4) {
    if (d[k + 3] < 200) continue;
    const m = Math.max(d[k], d[k + 1], d[k + 2]), n = Math.min(d[k], d[k + 1], d[k + 2]);
    if (m < 40 || m - n < 50) continue;
    const ch = `${d[k] >> 4}${d[k + 1] >> 4}${d[k + 2] >> 4}`, x = cont.get(ch) ?? { n: 0, soma: [0, 0, 0] };
    x.n++; x.soma = [x.soma[0] + d[k], x.soma[1] + d[k + 1], x.soma[2] + d[k + 2]]; cont.set(ch, x);
  }
  const top = [...cont.values()].sort((a, b) => b.n - a.n)[0]; if (!top) return null;
  const p = top.soma.map((v) => v / top.n) as Rgb;
  return { principal: hex(p), escuro: hex(escurecerAte(mistura(p, PRETO, 0.8), 10)) };
}
