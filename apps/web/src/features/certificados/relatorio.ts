import { logoRelatorio } from "@/features/logoRelatorio";
import { dataBr, formatarCnpj } from "@/lib/format";
import type { Certificado, EmpresaCert } from "@/types/nfse";

export const hojeLocal = () => new Date().toLocaleDateString("sv");
export const diasPara = (data: string) => Math.round((Date.parse(data) - Date.parse(hojeLocal())) / 86400000);
export function situacao(c: Certificado) { const d = diasPara(c.validUntil); return d < 0 ? "Vencido" : d <= 30 ? "Vence em até 30 dias" : d <= 60 ? "Vence em até 60 dias" : "Válido"; }
const linhas = (l: Certificado[]) => l.map((c) => [c.nickname || c.holder, formatarCnpj(c.document), c.kind, dataBr(c.validUntil), String(diasPara(c.validUntil)), situacao(c), String(c.empresas.length)]);
const TITULOS = ["Titular", "Documento", "Tipo", "Validade", "Dias", "Situação", "Empresas"];

export async function exportarExcel(l: Certificado[], sem: EmpresaCert[]) {
  const { default: ExcelJS } = await import("exceljs"), wb = new ExcelJS.Workbook(), marca = await logoRelatorio();
  const ws = wb.addWorksheet("Certificados", { views: [{ state: "frozen", ySplit: 3 }] });
  ws.addRow([`${marca.nome} · Controle de certificados · ${dataBr(hojeLocal())}`]).font = { bold: true };
  ws.addRow([]);
  const topo = ws.addRow(TITULOS); topo.font = { bold: true, color: { argb: "FFFFFFFF" } }; topo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B0F19" } };
  [38, 22, 10, 12, 8, 22, 10].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  linhas(l).forEach((r) => { r[4] = r[4]; const x = ws.addRow([...r.slice(0, 4), Number(r[4]), r[5], Number(r[6])]); if (r[5] === "Vencido") x.getCell(6).font = { color: { argb: "FFC02626" }, bold: true }; });
  if (sem.length) { const s = wb.addWorksheet("Empresas sem certificado"); s.addRow(["Empresa", "CNPJ"]).font = { bold: true }; s.getColumn(1).width = 50; s.getColumn(2).width = 22; sem.forEach((e) => s.addRow([e.razao, formatarCnpj(e.cnpj)])); }
  try { ws.addImage(wb.addImage({ buffer: marca.bytes.buffer as never, extension: "png" }), { tl: { col: 5, row: 0 }, ext: { width: Math.min(110, 30 * marca.prop), height: Math.min(30, 110 / marca.prop) } }); } catch { /* relatório segue sem logo */ }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([await wb.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })); a.download = `certificados-${hojeLocal()}.xlsx`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function exportarPdf(l: Certificado[], sem: EmpresaCert[]) {
  const { jsPDF } = await import("jspdf"), marca = await logoRelatorio(), pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const X = [12, 95, 137, 155, 178, 193, 240], A = pdf.internal.pageSize.getHeight(), L = pdf.internal.pageSize.getWidth();
  const logoL = Math.min(40, 12 * marca.prop);
  const cabecalho = (titulo: string) => {
    pdf.addImage(marca.base64, "PNG", 12, 8, logoL, logoL / marca.prop, "logo", "FAST");
    pdf.setFont("helvetica", "bold").setFontSize(13).setTextColor(13, 27, 42).text(titulo, L - 12, 13, { align: "right" });
    pdf.setFont("helvetica", "normal").setFontSize(8).setTextColor(85, 101, 122).text(`Emitido em ${dataBr(hojeLocal())}`, L - 12, 18, { align: "right" });
    pdf.setFontSize(7.5).text(marca.rodape, L / 2, A - 7, { align: "center" });
    return 28;
  };
  let y = cabecalho("Controle de certificados");
  const titulos = (t: string[], xs: number[]) => { pdf.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(13, 27, 42); t.forEach((x, i) => pdf.text(x, xs[i], y)); pdf.setDrawColor(200).line(12, y + 1.5, L - 12, y + 1.5); y += 6; pdf.setFont("helvetica", "normal"); };
  titulos(TITULOS, X);
  for (const r of linhas(l)) {
    if (y > A - 16) { pdf.addPage(); y = cabecalho("Controle de certificados"); titulos(TITULOS, X); }
    pdf.setTextColor(r[5] === "Vencido" ? 192 : 13, r[5] === "Vencido" ? 38 : 27, r[5] === "Vencido" ? 38 : 42).setFontSize(8.5);
    r.forEach((v, i) => pdf.text(i === 0 ? (pdf.splitTextToSize(v, 80) as string[])[0] : v, X[i], y)); y += 6;
  }
  if (sem.length) {
    pdf.addPage(); y = cabecalho("Empresas sem certificado"); titulos(["Empresa", "CNPJ"], [12, 200]);
    for (const e of sem) { if (y > A - 16) { pdf.addPage(); y = cabecalho("Empresas sem certificado"); titulos(["Empresa", "CNPJ"], [12, 200]); } pdf.setTextColor(13, 27, 42).setFontSize(8.5).text((pdf.splitTextToSize(e.razao, 180) as string[])[0], 12, y).text(formatarCnpj(e.cnpj), 200, y); y += 6; }
  }
  pdf.save(`certificados-${hojeLocal()}.pdf`);
}
