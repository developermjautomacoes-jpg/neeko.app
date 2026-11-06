"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Calculator, Factory, FileSpreadsheet, FileText, Landmark, Percent, Repeat, Search, type LucideIcon } from "lucide-react";
import { Button, Input, Select, useToast } from "@neeko/ui";
import { lerAssuntos, perguntarAssistente, solicitarAssunto, type AssuntoAssistente, type ResultadoAssistente } from "@/services/conta";
import styles from "./mensagens.module.css";

interface Troca { pergunta: string; assunto: string; resultados: ResultadoAssistente[] | null }
const ICONES: Record<string, LucideIcon> = { arquivo: FileSpreadsheet, nota: FileText, calculo: Calculator, balanca: Landmark, transicao: Repeat, fabrica: Factory, percentual: Percent };

export function Assistente() {
  const avisar = useToast();
  const [assuntos, setAssuntos] = useState<AssuntoAssistente[]>([]);
  const [filtro, setFiltro] = useState("");
  const [texto, setTexto] = useState("");
  const [trocas, setTrocas] = useState<Troca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [pedido, setPedido] = useState("");
  const [pedindo, setPedindo] = useState(false);
  const fim = useRef<HTMLDivElement>(null), campo = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { lerAssuntos().then(setAssuntos).catch(() => undefined); }, []);
  useEffect(() => { if (trocas.length) fim.current?.scrollIntoView(); }, [trocas]);
  const nome = (id: string) => assuntos.find((a) => a.id === id)?.nome ?? "";
  const areas = [...new Set(assuntos.map((a) => a.area))];
  async function enviar(e: FormEvent) {
    e.preventDefault(); const pergunta = texto.trim(); if (pergunta.length < 2 || buscando) return;
    setBuscando(true); setTexto("");
    try { const resultados = await perguntarAssistente(pergunta, filtro || undefined); setTrocas((t) => [...t, { pergunta, assunto: filtro, resultados }]); }
    catch { setTrocas((t) => [...t, { pergunta, assunto: filtro, resultados: null }]); } finally { setBuscando(false); }
  }
  async function pedir() {
    setPedindo(true);
    try { await solicitarAssunto(pedido); setPedido(""); avisar("Pedido enviado à Neeko. Obrigado!", "sucesso"); }
    catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível enviar.", "erro"); } finally { setPedindo(false); }
  }
  return (
    <section className={styles.conversa}>
      <div className={styles.cabeca}><div><h2>Assistente Neeko</h2><small>Respostas com base na legislação e nos manuais oficiais</small></div></div>
      <div className={styles.mensagens}>
        <div className={styles.boasVindas}>
          <img src="/neeko-robo.png" alt="Robô da Neeko" />
          <div>
            <p><b>Olá! Sou o assistente da Neeko.</b></p>
            <p>Estou aqui para tirar as dúvidas do escritório, e meus assuntos crescem conforme a demanda. Escolha um ou pergunte direto.</p>
          </div>
        </div>
        {!trocas.length && <div className={styles.ajuda}>
          {areas.map((area) => <div key={area}><span className={styles.area}>{area}</span><div className={styles.cartoes}>
            {assuntos.filter((a) => a.area === area).map((a) => { const I = ICONES[a.icone] ?? Search; return <button type="button" key={a.id} className={styles.cartao} aria-pressed={filtro === a.id} onClick={() => { setFiltro(filtro === a.id ? "" : a.id); campo.current?.focus(); }}><I size={18} aria-hidden /><span><b>{a.nome}</b><small>{a.descricao}</small></span></button>; })}
          </div></div>)}
          <div className={styles.pedido}>
            <Input rotulo="Sentiu falta de algum assunto?" placeholder="Ex.: folha de pagamento, abertura de empresa" maxLength={300} value={pedido} onChange={(e) => setPedido(e.target.value)} />
            <Button carregando={pedindo} disabled={pedido.trim().length < 3} onClick={() => void pedir()}>Solicitar</Button>
          </div>
        </div>}
        {trocas.map((t, i) => <div key={i} className={styles.resposta}>
          <div className={`${styles.balao} ${styles.minha}`} style={{ marginLeft: "auto", width: "fit-content" }}><p>{t.pergunta}</p></div>
          {t.resultados === null ? <p className={styles.vazio}>Não consegui buscar agora. Tente de novo.</p>
            : !t.resultados.length ? <div className={styles.resultado}><p>Não encontrei isso {t.assunto ? `em ${nome(t.assunto)}` : "nos meus assuntos"}. Tente outras palavras, ou peça este assunto para a Neeko.</p></div>
            : t.resultados.map((r, j) => <article key={j} className={styles.resultado}><small>{r.assunto}</small><b>{r.titulo}</b><p>{r.trecho}</p></article>)}
          {!!t.resultados?.length && <p className={styles.aviso}>Confira a legislação vigente antes de aplicar.</p>}
        </div>)}
        <div ref={fim} />
      </div>
      <form className={styles.escrever} onSubmit={enviar}>
        <div className={styles.seletor}><Select rotulo="Assunto" value={filtro} onChange={(e) => setFiltro(e.target.value)}><option value="">Todos os assuntos</option>{assuntos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}</Select></div>
        <textarea ref={campo} aria-label="Pergunta" rows={2} maxLength={300} placeholder={filtro ? `Pergunte sobre ${nome(filtro)}` : "Escreva sua dúvida"} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
        <Button type="submit" variante="primary" carregando={buscando}>Perguntar</Button>
      </form>
    </section>
  );
}
