export interface LinhaOfx { fitId: string; date: string; amount: string; memo: string }
/** Lê OFX 1.x (SGML) e 2.x (XML). Valor fica em texto, sem ponto flutuante. */
export function lerOfx(t: string): LinhaOfx[] {
  const tag = (b: string, n: string) => new RegExp(`<${n}>([^<\\r\\n]*)`, "i").exec(b)?.[1]?.trim() ?? "";
  return [...t.matchAll(/<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|<\/BANKTRANLIST>)/gi)].flatMap((m) => {
    const b = m[1], d = tag(b, "DTPOSTED"), v = tag(b, "TRNAMT").replace(",", ".");
    if (!/^\d{8}/.test(d) || !/^-?\d+(\.\d{1,4})?$/.test(v.replace(/^\+/, ""))) return [];
    const amount = (+v.replace(/^\+/, "")).toFixed(2), date = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    return [{ fitId: tag(b, "FITID") || `${date}|${amount}|${tag(b, "MEMO")}`, date, amount, memo: (tag(b, "MEMO") || tag(b, "NAME")).slice(0, 200) }];
  });
}
