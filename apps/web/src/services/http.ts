export class ErroApi extends Error { constructor(readonly status: number, readonly codigo: string, mensagem: string) { super(mensagem); } }

async function falha(r: Response): Promise<never> {
  const j = await r.json().catch(() => ({})) as { code?: string; message?: string };
  if (typeof window !== "undefined") {
    if (r.status === 401 && j.code === "UNAUTHENTICATED") window.location.assign("/login");
    if (j.code === "PASSWORD_CHANGE_REQUIRED") window.location.assign("/trocar-senha");
  }
  throw new ErroApi(r.status, j.code ?? "ERRO", j.message ?? "Não foi possível concluir.");
}
export async function api<T>(metodo: string, rota: string, corpo?: unknown, query?: Record<string, string | undefined>): Promise<T> {
  const q = new URLSearchParams(Object.entries(query ?? {}).filter((e): e is [string, string] => !!e[1])).toString();
  const r = await fetch(`/api/${rota}${q ? `?${q}` : ""}`, { method: metodo, headers: corpo === undefined ? undefined : { "content-type": "application/json" }, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
  if (!r.ok) return falha(r);
  return r.json() as Promise<T>;
}
/** Baixa o arquivo devolvido pela API com o nome informado por ela. */
export async function baixar(rota: string, corpo: unknown, query: Record<string, string>): Promise<void> {
  const r = await fetch(`/api/${rota}?${new URLSearchParams(query)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) });
  if (!r.ok) return falha(r);
  const nome = /filename="([^"]+)"/.exec(r.headers.get("content-disposition") ?? "")?.[1] ?? "arquivo.zip";
  const url = URL.createObjectURL(await r.blob());
  const a = document.createElement("a"); a.href = url; a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
