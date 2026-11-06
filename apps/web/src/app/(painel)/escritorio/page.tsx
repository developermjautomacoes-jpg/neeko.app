"use client";
import { useEffect, useState, type ChangeEvent } from "react";
import { Button, Card, Input, Loading, Notice, PageHeader, useToast } from "@neeko/ui";
import { eu, salvarEscritorio } from "@/services/conta";
import pagina from "../pagina.module.css";

/** Reduz a logo mantendo a proporção e a transparência. */
function prepararLogo(arquivo: File) {
  return new Promise<string>((ok, falha) => {
    const url = URL.createObjectURL(arquivo), i = new Image();
    i.onerror = () => { URL.revokeObjectURL(url); falha(new Error("Não foi possível abrir esta imagem.")); };
    i.onload = () => {
      URL.revokeObjectURL(url);
      const k = Math.min(1, 900 / i.width, 300 / i.height), c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(i.width * k)); c.height = Math.max(1, Math.round(i.height * k));
      c.getContext("2d")?.drawImage(i, 0, 0, c.width, c.height);
      ok(c.toDataURL("image/png"));
    };
    i.src = url;
  });
}

export default function PerfilEscritorio() {
  const avisar = useToast();
  const [nome, setNome] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [fone, setFone] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  useEffect(() => { eu().then((p) => { const o = p.organization; setNome(o?.name ?? ""); setLogo(o?.logo ?? null); setEmail(o?.contactEmail ?? ""); setFone(o?.contactPhone ?? ""); }).catch((x: Error) => setErro(x.message)).finally(() => setCarregando(false)); }, []);
  async function escolher(e: ChangeEvent<HTMLInputElement>) {
    const a = e.target.files?.[0]; e.target.value = ""; if (!a) return;
    try { setLogo(await prepararLogo(a)); } catch (x) { avisar(x instanceof Error ? x.message : "Imagem inválida.", "erro"); }
  }
  async function salvar() {
    setSalvando(true);
    try { await salvarEscritorio({ logo, contactEmail: email, contactPhone: fone }); window.dispatchEvent(new Event("neeko:perfil")); avisar("Perfil do escritório salvo.", "sucesso"); }
    catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível salvar.", "erro"); } finally { setSalvando(false); }
  }
  if (carregando) return <Loading />;
  return <>
    <PageHeader titulo="Perfil do escritório" descricao="A logo aparece no menu e nos relatórios, memorandos e planilhas do escritório." />
    {erro && <Notice tom="erro">{erro}</Notice>}
    <Card titulo={nome}><div className={pagina.form}>
      {logo ? <img src={logo} alt="Logo do escritório" style={{ maxWidth: 280, maxHeight: 100, objectFit: "contain", alignSelf: "flex-start" }} /> : <Notice>Sem logo cadastrada. Por enquanto, os relatórios saem com a logo da Neeko.</Notice>}
      <div className={pagina.acoes} style={{ justifyContent: "flex-start" }}>
        <label><Button tamanho="sm" onClick={(e) => { (e.currentTarget.parentElement?.querySelector("input") as HTMLInputElement | null)?.click(); }}>Escolher logo</Button><input type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label="Escolher logo" onChange={(e) => void escolher(e)} /></label>
        {logo && <Button tamanho="sm" onClick={() => setLogo(null)}>Remover</Button>}
      </div>
      <div className={pagina.colunas}><Input rotulo="E-mail no rodapé dos relatórios" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /><Input rotulo="Telefone no rodapé dos relatórios" value={fone} onChange={(e) => setFone(e.target.value)} /></div>
      <div><Button variante="primary" carregando={salvando} onClick={() => void salvar()}>Salvar</Button></div>
    </div></Card>
  </>;
}
