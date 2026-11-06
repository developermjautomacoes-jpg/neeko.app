import { redirect } from "next/navigation";
/** Endereço antigo: os memorandos agora ficam no cadastro de empresas. */
export default async function Antigo({ params }: { params: Promise<{ resto?: string[] }> }) {
  const { resto } = await params, p = resto?.[0];
  redirect(!p ? "/empresas" : p === "novo" ? "/empresas/nova" : `/empresas/${p}`);
}
