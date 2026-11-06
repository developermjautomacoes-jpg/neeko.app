"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@neeko/ui";
import { lerAssuntos, perguntarAssistente, type AssuntoAssistente, type ResultadoAssistente } from "@/services/conta";
import styles from "./mensagens.module.css";

interface Troca { pergunta: string; assunto: string; resultados: ResultadoAssistente[] | null }

export function Assistente() {
  const [assuntos, setAssuntos] = useState<AssuntoAssistente[]>([]);
  const [filtro, setFiltro] = useState("");
  const [texto, setTexto] = useState("");
  const [trocas, setTrocas] = useState<Troca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  useEffect(() => { lerAssuntos().then(setAssuntos).catch(() => undefined); }, []);
  useEffect(() => { fim.current?.scrollIntoView(); }, [trocas]);
  const nome = (id: string) => assuntos.find((a) => a.id === id)?.nome ?? "";
  async function enviar(e: FormEvent) {
    e.preventDefault(); const pergunta = texto.trim(); if (pergunta.length < 2 || buscando) return;
    setBuscando(true); setTexto("");
    try { const resultados = await perguntarAssistente(pergunta, filtro || undefined); setTrocas((t) => [...t, { pergunta, assunto: filtro, resultados }]); }
    catch { setTrocas((t) => [...t, { pergunta, assunto: filtro, resultados: null }]); } finally { setBuscando(false); }
  }
  return (
    <section className={styles.conversa}>
      <div className={styles.cabeca}><div><h2>Assistente Neeko</h2><small>Busca nas bases da Neeko, sem acesso aos dados do escritório</small></div></div>
      <div className={styles.mensagens}>
        <div className={styles.boasVindas}>
          <img src="/neeko-robo.png" alt="Robô da Neeko" />
          <div>
            <p><b>Olá! Sou o assistente da Neeko.</b></p>
            <p>Estes são os assuntos que estou atendendo. Escolha um para buscar só nele, ou pergunte direto:</p>
            <div className={styles.assuntos}>{assuntos.map((a) => <button type="button" key={a.id} title={a.descricao} aria-pressed={filtro === a.id} onClick={() => setFiltro(filtro === a.id ? "" : a.id)}>{a.nome}</button>)}</div>
          </div>
        </div>
        {trocas.map((t, i) => <div key={i} className={styles.resposta}>
          <div className={`${styles.balao} ${styles.minha}`} style={{ marginLeft: "auto", width: "fit-content" }}><p>{t.pergunta}</p></div>
          {t.resultados === null ? <p className={styles.vazio}>Não consegui buscar agora. Tente de novo.</p>
            : !t.resultados.length ? <div className={styles.resultado}><p>Não encontrei isso {t.assunto ? `em ${nome(t.assunto)}` : "nas minhas bases"}. Tente outras palavras ou fale com um colega no chat.</p></div>
            : t.resultados.map((r, j) => <article key={j} className={styles.resultado}><small>{r.assunto}</small><b>{r.titulo}</b><p>{r.trecho}</p></article>)}
          {!!t.resultados?.length && <p className={styles.aviso}>Trechos das bases da Neeko. Confira a legislação vigente antes de aplicar.</p>}
        </div>)}
        <div ref={fim} />
      </div>
      <form className={styles.escrever} onSubmit={enviar}>
        <textarea aria-label="Pergunta" rows={2} maxLength={300} placeholder={filtro ? `Pergunte sobre ${nome(filtro)}` : "Escreva sua dúvida"} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
        <Button type="submit" variante="primary" carregando={buscando}>Perguntar</Button>
      </form>
    </section>
  );
}
