import type { NextRequest } from "next/server";

/** O navegador só fala com a Web: mesma origem, cookie httpOnly e a API fora da internet pública. */
async function repassar(req: NextRequest, { params }: { params: Promise<{ caminho: string[] }> }) {
  const base = process.env.API_INTERNAL_URL;
  if (!base) return Response.json({ code: "CONFIG", message: "API_INTERNAL_URL não configurada." }, { status: 500 });
  const { caminho } = await params;
  const url = `${base.replace(/\/$/, "")}/api/v1/${caminho.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  const cab = new Headers();
  for (const h of ["content-type", "cookie"]) { const v = req.headers.get(h); if (v) cab.set(h, v); }
  try {
    const temCorpo = req.method !== "GET" && req.method !== "HEAD";
    const r = await fetch(url, { method: req.method, headers: cab, body: temCorpo ? await req.arrayBuffer() : undefined, redirect: "manual", cache: "no-store" });
    const saida = new Headers();
    for (const h of ["content-type", "content-disposition"]) { const v = r.headers.get(h); if (v) saida.set(h, v); }
    for (const c of r.headers.getSetCookie()) saida.append("set-cookie", c);
    return new Response(r.body, { status: r.status, headers: saida });
  } catch { return Response.json({ code: "API_OFFLINE", message: "Serviço indisponível. Tente em instantes." }, { status: 502 }); }
}
export { repassar as GET, repassar as POST, repassar as PUT, repassar as PATCH, repassar as DELETE };
