"use client";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Loading, Notice, PageHeader, useToast } from "@neeko/ui";
import { enviarMensagem, lerMensagens, marcarLida, resumoMensagens, type Mensagem, type ResumoMensagens } from "@/services/conta";
import styles from "./mensagens.module.css";

const hora = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function Conversas() {
  const avisar = useToast(), pedido = useSearchParams().get("c");
  const [resumo, setResumo] = useState<ResumoMensagens | null>(null);
  const [conversa, setConversa] = useState(pedido ?? "geral");
  const [lista, setLista] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const fim = useRef<HTMLDivElement>(null), campo = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (pedido) setConversa(pedido); }, [pedido]);
  const atualizar = useCallback(async () => {
    try {
      const m = await lerMensagens(conversa);
      setLista((a) => { if (a.length !== m.length) setTimeout(() => fim.current?.scrollIntoView(), 0); return m; });
      await marcarLida(conversa);
      setResumo(await resumoMensagens());
      window.dispatchEvent(new Event("neeko:mensagens"));
      setErro("");
    } catch (x) { setErro(x instanceof Error ? x.message : "Não foi possível carregar."); }
  }, [conversa]);
  useEffect(() => { setLista([]); void atualizar(); const t = setInterval(() => void atualizar(), 8000); return () => clearInterval(t); }, [atualizar]);
  // @ sendo digitado no fim do texto abre a lista de pessoas
  const termo = /(?:^|\s)@([^@\n]*)$/.exec(texto)?.[1];
  const sugestoes = useMemo(() => (termo === undefined ? [] : (resumo?.pessoas ?? []).filter((p) => p.nome.toLowerCase().includes(termo.toLowerCase())).slice(0, 6)), [termo, resumo]);
  const marcar = (nome: string) => { setTexto(texto.replace(/@[^@\n]*$/, `@${nome} `)); campo.current?.focus(); };
  async function enviar() {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    try { await enviarMensagem(conversa, texto); setTexto(""); await atualizar(); }
    catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível enviar.", "erro"); } finally { setEnviando(false); }
  }
  function tecla(e: KeyboardEvent) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void enviar(); } }
  if (!resumo && !erro) return <Loading />;
  const nome = conversa === "geral" ? "Geral" : resumo?.pessoas.find((p) => p.id === conversa)?.nome ?? "Conversa";
  const item = (id: string, titulo: string, sub: string, n: number) => <button type="button" key={id} className={`${styles.item} ${conversa === id ? styles.atual : ""}`} onClick={() => setConversa(id)}><span><b>{titulo}</b><small>{sub}</small></span>{n > 0 && <i>{n}</i>}</button>;
  const destacar = (t: string) => { const nomes = (resumo?.pessoas ?? []).map((p) => p.nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")); return nomes.length ? t.split(new RegExp(`(@(?:${nomes.join("|")}))`, "gi")).map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p)) : t; };
  return <>
    <PageHeader titulo="Mensagens" descricao="Converse com a equipe. Digite @ para marcar uma pessoa." />
    {erro && <Notice tom="erro">{erro}</Notice>}
    <div className={styles.grade}>
      <aside className={styles.lista}>
        {item("geral", "Geral", resumo?.geral.ultima?.texto ?? "Toda a equipe", resumo?.geral.naoLidas ?? 0)}
        {resumo?.pessoas.map((p) => item(p.id, p.nome, p.ultima?.texto ?? p.cargo, p.naoLidas))}
      </aside>
      <section className={styles.conversa}>
        <h2>{nome}</h2>
        <div className={styles.mensagens}>
          {!lista.length && <p className={styles.vazio}>Nenhuma mensagem ainda.</p>}
          {lista.map((m) => <div key={m.id} className={`${styles.balao} ${m.minha ? styles.minha : ""} ${m.mencionou ? styles.mencao : ""}`}><small>{m.minha ? "Você" : m.de} · {hora(m.em)}</small><p>{destacar(m.texto)}</p></div>)}
          <div ref={fim} />
        </div>
        <div className={styles.escrever}>
          {!!sugestoes.length && <div className={styles.sugestoes}>{sugestoes.map((p) => <button type="button" key={p.id} onClick={() => marcar(p.nome)}>{p.nome}{p.cargo && <small> · {p.cargo}</small>}</button>)}</div>}
          <textarea ref={campo} aria-label="Mensagem" rows={2} maxLength={2000} placeholder="Escreva uma mensagem" value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={tecla} />
          <Button variante="primary" carregando={enviando} onClick={() => void enviar()}>Enviar</Button>
        </div>
      </section>
    </div>
  </>;
}
export default function Mensagens() { return <Suspense fallback={<Loading />}><Conversas /></Suspense>; }
