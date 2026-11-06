import JSZip from "jszip";
import { carregarTabela, modeloMemo, nomeArquivo, type Cel, type Item, type Memo } from "./regras";

const RODAPE = "Neeko Automações Inteligentes · (27) 98118-4118 · neeko.automacoes@gmail.com";
const PROP = 900 / 247; // largura / altura do logo
const logoBytes = async () => new Uint8Array(await (await fetch("/logo-relatorio.png")).arrayBuffer());
const logoBase64 = async () => { const b = await logoBytes(); let s = ""; b.forEach((x) => { s += String.fromCharCode(x); }); return btoa(s); };
const txtPdf = (s: unknown) => String(s ?? "").replace(/[–—]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, "...").replace(/•/g, "·").replace(/[^\x00-\xFF]/g, ""); // eslint-disable-line no-control-regex
const COLS: Record<string, number[]> = { so: [0.38, 0.2, 0.28, 0.14], ct: [0.29, 0.17, 0.31, 0.23], at: [0.12, 0.6, 0.1, 0.18], sv: [0.1, 0.75, 0.15], dp: [0.32, 0.68] };

/** PDF com texto selecionável, no papel timbrado da Neeko. */
export async function memoPdf(d: Memo, seq: number, ano: number, cancelado: boolean): Promise<Blob> {
  const [{ jsPDF }, T, logo] = await Promise.all([import("jspdf"), carregarTabela(), logoBase64()]);
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const X = 15, W = 180, TOP = 31, BOT = 276, PT = 0.3528, lh = (pt: number) => pt * PT * 1.32;
  type Cor = [number, number, number];
  const ESC: Cor = [13, 27, 42], VERDE: Cor = [6, 122, 77], MENTA: Cor = [61, 235, 159], INK: Cor = [20, 32, 45], LAB: Cor = [85, 101, 122], LINHA: Cor = [210, 216, 226], RED: Cor = [192, 38, 38];
  let y = TOP, primeira = true;
  const fundo = () => { pdf.addImage(`data:image/png;base64,${logo}`, "PNG", X, 9, 44, 44 / PROP, "logo", "FAST"); pdf.setDrawColor(...MENTA); pdf.setLineWidth(0.9); pdf.line(X, 24, X + W, 24); };
  const nova = () => { if (!primeira) pdf.addPage(); primeira = false; fundo(); y = TOP; };
  const font = (st: string, pt: number, cor: Cor = INK) => { pdf.setFont("helvetica", st); pdf.setFontSize(pt); pdf.setTextColor(...cor); };
  const quebra = (t: unknown, w: number) => pdf.splitTextToSize(txtPdf(t), Math.max(5, w)) as string[];
  const cabe = (h: number) => { if (y + h > BOT) { nova(); return false; } return true; };
  const pontilhado = (x1: number, x2: number, yy: number) => { pdf.setDrawColor(...LINHA); pdf.setLineWidth(0.15); pdf.setLineDashPattern([0.5, 0.6], 0); pdf.line(x1, yy, x2, yy); pdf.setLineDashPattern([], 0); };
  const rico = (partes: [string, boolean][], pt: number) => {
    const tk: [string, boolean][] = []; partes.forEach(([t, b]) => txtPdf(t).split(/(\s+)/).forEach((p) => { if (p) tk.push([p, b]); }));
    let li: [string, boolean, number][] = [], lw = 0; const linhas: typeof li[] = [];
    tk.forEach(([t, b]) => { if (!li.length && !t.trim()) return; font(b ? "bold" : "normal", pt); const w = pdf.getTextWidth(t); if (lw + w > W && li.length && t.trim()) { linhas.push(li); li = []; lw = 0; } li.push([t, b, w]); lw += w; });
    if (li.length) linhas.push(li);
    linhas.forEach((l) => { cabe(lh(pt)); let x = X; l.forEach(([t, b, w]) => { font(b ? "bold" : "normal", pt); pdf.text(t, x, y + pt * PT); x += w; }); y += lh(pt); });
  };
  nova();
  const itens = modeloMemo(T, d, seq, ano, cancelado);
  itens.forEach((it: Item, ix) => {
    if (it.t === "head") {
      font("bold", 8.2, VERDE); pdf.setCharSpace(0.8); pdf.text("MEMORANDO", X, y + 8.2 * PT); pdf.setCharSpace(0); y += lh(8.2);
      font("bold", 22.5, ESC); pdf.text(txtPdf(it.num), X, y + 22.5 * PT * 0.95);
      if (it.cancel) { const nw = pdf.getTextWidth(txtPdf(it.num)); font("bold", 10.5, RED); pdf.text("CANCELADO", X + nw + 3, y + 22.5 * PT * 0.95); }
      y += 22.5 * PT * 1.12; font("bold", 9.8, VERDE); pdf.text(txtPdf(it.data), X, y + 9.8 * PT); y += lh(9.8) + 3;
      rico([[`${it.saud}${it.setoresOn ? " " : ""}`, false], [it.setoresOn ? it.setores : "", true], [".", false]], 9); rico([["Assunto: ", false], [it.assunto, true]], 9); y += 1.5;
    } else if (it.t === "sec") {
      const p = itens[ix + 1]; cabe(11 + (p ? (p.t === "tab" ? 17 : p.t !== "sec" ? 7 : 0) : 0));
      y += 3.2; font("bold", 9, ESC); pdf.setCharSpace(0.35); pdf.text(txtPdf(it.title.toUpperCase()), X, y + 9 * PT); pdf.setCharSpace(0);
      if (it.extra) { font("bold", 8, VERDE); pdf.text(txtPdf(it.extra.toUpperCase()), X + W, y + 9 * PT, { align: "right" }); }
      y += lh(9) + 0.6; pdf.setDrawColor(...ESC); pdf.setLineWidth(0.4); pdf.line(X, y, X + W, y); y += 1.4;
    } else if (it.t === "kv" || it.t === "kv2") {
      const pt = 8.6, pares: [string, string, number, number][] = it.t === "kv" ? [[it.l, it.v, X, W]] : [[it.a[0], it.a[1], X, (W - 4.8) / 2], [it.b[0], it.b[1], X + (W + 4.8) / 2, (W - 4.8) / 2]];
      const bl = pares.map(([l, v, x, w]) => { const lw = it.t === "kv" ? 35 : Math.min(33, w * 0.5); font("bold", pt); return { rot: quebra(l, lw - 2), x, w, lw, lin: quebra(v, w - lw - 1.5) }; });
      const h = Math.max(...bl.map((b) => Math.max(b.lin.length, b.rot.length))) * lh(pt) + 1.4; cabe(h);
      bl.forEach((b) => { font("bold", pt, LAB); b.rot.forEach((t, k) => pdf.text(t, b.x, y + 0.6 + pt * PT + k * lh(pt))); font("bold", pt, INK); b.lin.forEach((t, k) => pdf.text(t, b.x + b.lw, y + 0.6 + pt * PT + k * lh(pt))); pontilhado(b.x, b.x + b.w, y + h); });
      y += h;
    } else if (it.t === "p") {
      const st = it.italic ? "italic" : "normal"; font(st, 8.6); quebra(it.text, W).forEach((t) => { cabe(lh(8.6)); font(st, 8.6); pdf.text(t, X, y + 8.6 * PT); y += lh(8.6); }); y += 1.2;
    } else {
      const fr = COLS[it.k], gap = 2;
      const cab = () => { let x = X; font("bold", 7, LAB); pdf.setCharSpace(0.25); it.head.forEach((h, c) => { pdf.text(txtPdf(h.toUpperCase()), x, y + 0.5 + 7 * PT); x += W * fr[c]; }); pdf.setCharSpace(0); y += lh(7) + 1; pdf.setDrawColor(159, 176, 194); pdf.setLineWidth(0.25); pdf.line(X, y, X + W, y); y += 0.6; };
      cabe(lh(7) + lh(8.6) + 3); cab();
      it.rows.forEach((r) => {
        const cel = r.map((c: Cel, ci) => { const o = typeof c === "object" ? c : { txt: c }, cw = W * fr[ci] - gap, b = (it.bold ?? []).includes(ci); font(b ? "bold" : "normal", 8.2); const lin = quebra(o.txt + ("tag" in o && o.tag ? `  [${o.tag.toLowerCase()}]` : ""), cw); font("normal", 7.6); return { lin, sub: "sub" in o && o.sub ? quebra(o.sub, cw) : [], b }; });
        const h = Math.max(...cel.map((c) => c.lin.length * lh(8.2) + c.sub.length * lh(7.6))) + 1.6;
        if (y + h > BOT) { nova(); cab(); }
        let x = X;
        cel.forEach((c, ci) => { let yy = y + 0.8 + 8.2 * PT; font(c.b ? "bold" : "normal", 8.2); c.lin.forEach((t) => { pdf.text(t, x, yy); yy += lh(8.2); }); font("normal", 7.6, LAB); c.sub.forEach((t) => { pdf.text(t, x, yy); yy += lh(7.6); }); x += W * fr[ci]; });
        y += h; pontilhado(X, X + W, y);
      });
    }
  });
  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) { pdf.setPage(i); pdf.setDrawColor(...LINHA); pdf.setLineWidth(0.2); pdf.line(X, 283, X + W, 283); font("normal", 6.6, LAB); pdf.text(txtPdf(RODAPE), X, 286.5); pdf.text(`Página ${i} de ${total}`, X + W, 286.5, { align: "right" }); }
  pdf.setProperties({ title: txtPdf(`Memorando ${seq}/${ano} - ${d.e_razao ?? ""}`), author: "Neeko Automações Inteligentes", subject: txtPdf(d.m_assunto ?? ""), creator: "Neeko" });
  return pdf.output("blob");
}

const xe = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
type R = { b?: boolean; i?: boolean; color?: string | null; sz?: number };
const wr = (t: unknown, o: R = {}) => `<w:r><w:rPr>${o.b ? "<w:b/>" : ""}${o.i ? "<w:i/>" : ""}${o.color ? `<w:color w:val="${o.color}"/>` : ""}<w:sz w:val="${o.sz ?? 20}"/></w:rPr><w:t xml:space="preserve">${xe(t)}</w:t></w:r>`;
type P = { keep?: boolean; before?: number; after?: number; border?: string; jc?: string };
const wp = (runs: string, o: P = {}) => `<w:p><w:pPr>${o.keep ? "<w:keepNext/>" : ""}<w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 40}"/>${o.border ? `<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="1" w:color="${o.border}"/></w:pBdr>` : ""}${o.jc ? `<w:jc w:val="${o.jc}"/>` : ""}</w:pPr>${runs}</w:p>`;
const ESC = "0D1B2A", VERDE = "067A4D", MENTA = "3DEB9F";
const wtable = (head: string[], rows: string[][], w: number[]) => {
  const cell = (t: string, l: number, h: boolean) => `<w:tc><w:tcPr><w:tcW w:w="${l}" w:type="dxa"/>${h ? '<w:shd w:val="clear" w:color="auto" w:fill="E9F7F0"/>' : ""}</w:tcPr><w:p><w:pPr><w:spacing w:before="20" w:after="20"/></w:pPr>${wr(t, { b: h, sz: h ? 17 : 18, color: h ? ESC : null })}</w:p></w:tc>`;
  const tr = (c: string[], h: boolean) => `<w:tr>${h ? "<w:trPr><w:tblHeader/></w:trPr>" : ""}${c.map((t, i) => cell(t, w[i], h)).join("")}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${w.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblBorders><w:bottom w:val="single" w:sz="4" w:color="C8D2DC"/><w:insideH w:val="dotted" w:sz="4" w:color="C8D2DC"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${w.map((x) => `<w:gridCol w:w="${x}"/>`).join("")}</w:tblGrid>${tr(head, true)}${rows.map((r) => tr(r, false)).join("")}</w:tbl>${wp("", { after: 0 })}`;
};
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

/** Word editável, com o logo da Neeko no cabeçalho. */
export async function memoDocx(d: Memo, seq: number, ano: number, cancelado: boolean): Promise<Blob> {
  const T = await carregarTabela(), W = 9638;
  let b = "";
  const larguras: Record<string, number[]> = { so: [3638, 2000, 2700, 1300], ct: [2600, 1700, 2900, 2438], at: [1150, 6438, 900, 1150], sv: [900, 7838, 900], dp: [2900, 6738] };
  modeloMemo(T, d, seq, ano, cancelado).forEach((it) => {
    if (it.t === "head") {
      b += wp(wr("MEMORANDO", { b: true, sz: 18, color: VERDE }), { after: 0 }) + wp(wr(it.num, { b: true, sz: 44, color: ESC }) + (it.cancel ? wr("  CANCELADO", { b: true, sz: 22, color: "C02626" }) : ""), { after: 0 }) + wp(wr(it.data, { b: true, sz: 22, color: VERDE }), { after: 120 });
      b += wp(wr(`${it.saud}${it.setoresOn ? " " : ""}`) + (it.setoresOn ? wr(it.setores, { b: true }) : "") + wr("."), { after: 20 }) + wp(wr("Assunto: ") + wr(it.assunto, { b: true }), { after: 80 });
    } else if (it.t === "sec") b += wp(wr(it.title.toUpperCase(), { b: true, sz: 21, color: ESC }), { before: 160, after: 60, border: ESC, keep: true });
    else if (it.t === "kv") b += wp(wr(`${it.l}: `, { b: true, color: ESC }) + wr(it.v, { b: true }), { after: 30 });
    else if (it.t === "kv2") [it.a, it.b].forEach(([l, v]) => { b += wp(wr(`${l}: `, { b: true, color: ESC }) + wr(v, { b: true }), { after: 30 }); });
    else if (it.t === "p") b += wp(wr(it.text, { i: it.italic }), { after: 80, jc: "both" });
    else b += wtable(it.head, it.rows.map((r) => r.map((c) => (typeof c === "object" ? c.txt + (c.sub ? ` (${c.sub})` : "") + (c.tag ? " (principal)" : "") : c))), larguras[it.k]);
  });
  void W;
  const cx = 1980000, cy = Math.round(cx / PROP);
  const doc = `${XML}<w:document ${NS}><w:body>${b}<w:sectPr><w:headerReference w:type="default" r:id="rIdH"/><w:footerReference w:type="default" r:id="rIdF"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1500" w:right="1134" w:bottom="1000" w:left="1134" w:header="400" w:footer="400" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const header = `${XML}<w:hdr ${NS}><w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="18" w:space="4" w:color="${MENTA}"/></w:pBdr></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="Logo Neeko" descr="Logo Neeko"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="1" name="logo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p></w:hdr>`;
  const footer = `${XML}<w:ftr ${NS}>${wp(wr(RODAPE, { sz: 15, color: "55657A" }), { after: 0 })}</w:ftr>`;
  const styles = `${XML}<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/><w:sz w:val="20"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="40" w:line="252" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>`;
  const z = new JSZip();
  z.file("[Content_Types].xml", `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`);
  z.file("_rels/.rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="word/document.xml"/></Relationships>`);
  z.file("word/_rels/document.xml.rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdS" Type="${REL}/styles" Target="styles.xml"/><Relationship Id="rIdH" Type="${REL}/header" Target="header1.xml"/><Relationship Id="rIdF" Type="${REL}/footer" Target="footer1.xml"/></Relationships>`);
  z.file("word/_rels/header1.xml.rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdImg" Type="${REL}/image" Target="media/logo.png"/></Relationships>`);
  z.file("word/document.xml", doc); z.file("word/styles.xml", styles); z.file("word/header1.xml", header); z.file("word/footer1.xml", footer); z.file("word/media/logo.png", await logoBytes());
  return z.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}
export function salvarBlob(b: Blob, nome: string) { const u = URL.createObjectURL(b), a = document.createElement("a"); a.href = u; a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(u), 2000); }
export const baixarMemo = async (tipo: "pdf" | "docx", d: Memo, seq: number, ano: number, cancelado: boolean) => salvarBlob(await (tipo === "pdf" ? memoPdf : memoDocx)(d, seq, ano, cancelado), nomeArquivo(d, seq, ano, tipo));
