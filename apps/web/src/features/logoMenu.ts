/** Prepara a logo para o menu: tira o fundo branco e, em menu escuro, clareia o que sumiria nele. O original segue nos relatórios. */
export async function logoParaMenu(logo: string, menuClaro: boolean): Promise<string> {
  const i = new Image(); i.src = logo; await i.decode();
  const c = document.createElement("canvas"); c.width = i.naturalWidth; c.height = i.naturalHeight;
  const g = c.getContext("2d", { willReadFrequently: true }); if (!g) return logo;
  g.drawImage(i, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height), d = img.data;
  const canto = (x: number, y: number) => { const k = (y * c.width + x) * 4; return d[k + 3] > 200 && Math.min(d[k], d[k + 1], d[k + 2]) > 235; };
  const temFundo = [canto(0, 0), canto(c.width - 1, 0), canto(0, c.height - 1), canto(c.width - 1, c.height - 1)].filter(Boolean).length >= 2;
  for (let k = 0; k < d.length; k += 4) {
    if (temFundo) {
      const a = 255 - Math.min(d[k], d[k + 1], d[k + 2]);
      if (a === 0) { d[k + 3] = 0; continue; }
      for (let n = 0; n < 3; n++) d[k + n] = Math.max(0, Math.min(255, Math.round((d[k + n] - (255 - a)) * 255 / a)));
      d[k + 3] = Math.round(d[k + 3] * a / 255);
    }
    if (!menuClaro && 0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2] < 110) d[k] = d[k + 1] = d[k + 2] = 255;
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL("image/png");
}
