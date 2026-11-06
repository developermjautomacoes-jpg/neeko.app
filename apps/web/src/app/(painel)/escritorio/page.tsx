"use client";
import { useEffect, useState, type ChangeEvent } from "react";
import { Button, Card, Input, Loading, Notice, PageHeader, useToast } from "@neeko/ui";
import { TEMAS, aplicarTema } from "@/features/temas";
import { eu, importarPacote, salvarEscritorio, salvarTema, type ResultadoImportacao } from "@/services/conta";
import pagina from "../pagina.module.css";
import temas from "./temas.module.css";

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
  const [tema, setTema] = useState("verde");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [frase, setFrase] = useState("");
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  useEffect(() => { eu().then((p) => { const o = p.organization; setNome(o?.name ?? ""); setLogo(o?.logo ?? null); setEmail(o?.contactEmail ?? ""); setFone(o?.contactPhone ?? ""); setTema(o?.theme ?? "verde"); }).catch((x: Error) => setErro(x.message)).finally(() => setCarregando(false)); }, []);
  async function escolher(e: ChangeEvent<HTMLInputElement>) {
    const a = e.target.files?.[0]; e.target.value = ""; if (!a) return;
    try { setLogo(await prepararLogo(a)); } catch (x) { avisar(x instanceof Error ? x.message : "Imagem inválida.", "erro"); }
  }
  async function escolherTema(t: string) {
    const antes = tema; setTema(t); aplicarTema(t);
    try { await salvarTema(t); window.dispatchEvent(new Event("neeko:perfil")); avisar("Tema aplicado.", "sucesso"); }
    catch (x) { setTema(antes); aplicarTema(antes); avisar(x instanceof Error ? x.message : "Não foi possível aplicar o tema.", "erro"); }
  }
  async function importar() {
    if (!arquivo) return;
    setImportando(true); setResultado(null);
    try { setResultado(await importarPacote(await arquivo.text(), frase)); setFrase(""); setArquivo(null); avisar("Importação concluída.", "sucesso"); }
    catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível importar.", "erro"); } finally { setImportando(false); }
  }
  async function salvar() {
    setSalvando(true);
    try { await salvarEscritorio({ logo, contactEmail: email, contactPhone: fone }); window.dispatchEvent(new Event("neeko:perfil")); avisar("Perfil do escritório salvo.", "sucesso"); }
    catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível salvar.", "erro"); } finally { setSalvando(false); }
  }
  if (carregando) return <Loading />;
  return <>
    <PageHeader titulo="Perfil do escritório" descricao="A logo aparece no menu e nos relatórios." />
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
    <div className={pagina.bloco}><Card titulo="Tema do escritório" descricao="Vale para todas as telas e para a tela de entrada do escritório.">
      <div className={temas.grade}>{TEMAS.map((t) => <article key={t.id} className={`${temas.tema} ${tema === t.id ? temas.atual : ""}`}>
        <div className={temas.previa} style={{ background: t.fundo }} aria-hidden>
          <span className={temas.menu} style={{ background: t.menu }}><i style={{ background: t.principal }} /></span>
          <span className={temas.corpo}><b style={{ background: t.topo }} /><em><u style={{ background: t.principal }} /><u /><u /></em></span>
        </div>
        <div className={temas.rodape}>
          <div><b>{t.nome}</b><small>{t.frase}</small><span className={temas.cores}>{t.cores.map((c) => <i key={c} style={{ background: c }} />)}</span></div>
          <Button tamanho="sm" variante={tema === t.id ? "primary" : "secondary"} disabled={tema === t.id} onClick={() => void escolherTema(t.id)}>{tema === t.id ? "Tema atual" : "Selecionar tema"}</Button>
        </div>
      </article>)}</div>
    </Card></div>
    <div className={pagina.bloco}><Card titulo="Importar do app Facilitar"><div className={pagina.form}>
      <p>Envie o pacote gerado no app Facilitar. Memorandos e certificados entram neste escritório, e repetir a importação não duplica nada.</p>
      <input type="file" accept=".neeko,.json" aria-label="Pacote de migração" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
      <Input rotulo="Frase do pacote" type="password" autoComplete="off" value={frase} onChange={(e) => setFrase(e.target.value)} />
      <div><Button variante="primary" disabled={!arquivo || frase.length < 12} carregando={importando} onClick={() => void importar()}>Importar</Button></div>
      {resultado && <Notice>{resultado.memorandos.importados} memorandos e {resultado.certificados.importados} certificados importados.</Notice>}
      {resultado && [...resultado.memorandos.pulados.map((p) => `${p.numero}: ${p.motivo}`), ...resultado.certificados.pulados.map((p) => `${p.nome}: ${p.motivo}`)].map((t) => <small key={t}>{t}</small>)}
    </div></Card></div>
  </>;
}
