"use client";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Forward, Lock, LogOut, Smile, Unlock, UserPlus, Users } from "lucide-react";
import { Button, IconButton, Input, Loading, Modal, Notice, PageHeader, Select, useToast } from "@neeko/ui";
import { criarGrupo, encaminharMensagem, enviarMensagem, incluirNoGrupo, lerMensagens, marcarLida, privacidadeGrupo, resumoMensagens, sairDoGrupo, type Mensagem, type ResumoMensagens } from "@/services/conta";
import styles from "./mensagens.module.css";

const EMOJIS = "😀 😂 😊 😍 🤔 😅 😢 😡 👍 👎 👏 🙏 💪 🤝 🎉 ✅ ❌ ⚠️ ❗ ❓ 🔥 ⭐ ❤️ 💡 📌 📎 📅 ⏰ 💰 📄 📊 🚀".split(" ");
const hora = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function Conversas() {
  const avisar = useToast(), pedido = useSearchParams().get("c");
  const [resumo, setResumo] = useState<ResumoMensagens | null>(null);
  const [conversa, setConversa] = useState(pedido ?? "geral");
  const [lista, setLista] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [emojis, setEmojis] = useState(false);
  const [modal, setModal] = useState<{ tipo: "novo" | "incluir"; nome: string; privado: boolean; pessoas: string[] } | null>(null);
  const [encaminhar, setEncaminhar] = useState<Mensagem | null>(null);
  const [destino, setDestino] = useState("");
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
  function emoji(e: string) {
    const c = campo.current, i = c?.selectionStart ?? texto.length, f = c?.selectionEnd ?? texto.length;
    setTexto(texto.slice(0, i) + e + texto.slice(f)); setEmojis(false);
    setTimeout(() => { c?.focus(); c?.setSelectionRange(i + e.length, i + e.length); }, 0);
  }
  const tentar = async (fn: () => Promise<unknown>) => { try { await fn(); await atualizar(); return true; } catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível concluir.", "erro"); return false; } };
  async function confirmarModal() {
    if (!modal) return;
    if (modal.tipo === "incluir") { if (await tentar(() => incluirNoGrupo(conversa, modal.pessoas))) setModal(null); return; }
    try { const g = await criarGrupo(modal.nome, modal.privado, modal.pessoas); setModal(null); setConversa(g.id); } catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível criar.", "erro"); }
  }
  async function confirmarEncaminhar() {
    if (!encaminhar || !destino) return;
    if (await tentar(() => encaminharMensagem(conversa, encaminhar.id, destino))) { setEncaminhar(null); setDestino(""); avisar("Mensagem encaminhada.", "sucesso"); }
  }
  async function enviar() {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    try { await enviarMensagem(conversa, texto); setTexto(""); await atualizar(); }
    catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível enviar.", "erro"); } finally { setEnviando(false); }
  }
  function tecla(e: KeyboardEvent) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void enviar(); } }
  if (!resumo && !erro) return <Loading />;
  const grupo = resumo?.grupos.find((g) => g.id === conversa), direta = resumo?.pessoas.find((p) => p.id === conversa);
  const nome = conversa === "geral" ? "Geral" : grupo?.nome ?? direta?.nome ?? "Conversa";
  const candidatos = (resumo?.pessoas ?? []).filter((p) => !grupo?.pessoasIds.includes(p.id) || modal?.tipo === "novo");
  const destinos = [{ id: "geral", nome: "Geral" }, ...(resumo?.grupos ?? []).filter((g) => g.participa).map((g) => ({ id: g.id, nome: `Grupo: ${g.nome}` })), ...(resumo?.pessoas ?? [])].filter((d) => d.id !== conversa);
  const item = (id: string, titulo: string, sub: string, n: number) => <button type="button" key={id} className={`${styles.item} ${conversa === id ? styles.atual : ""}`} onClick={() => setConversa(id)}><span><b>{titulo}</b><small>{sub}</small></span>{n > 0 && <i>{n}</i>}</button>;
  const destacar = (t: string) => { const nomes = (resumo?.pessoas ?? []).map((p) => p.nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")); return nomes.length ? t.split(new RegExp(`(@(?:${nomes.join("|")}))`, "gi")).map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p)) : t; };
  return <>
    <PageHeader titulo="Mensagens" descricao="Converse com a equipe. Digite @ para marcar uma pessoa." />
    {erro && <Notice tom="erro">{erro}</Notice>}
    <div className={styles.grade}>
      <aside className={styles.lista}>
        {item("geral", "Geral", resumo?.geral.ultima?.texto ?? "Toda a equipe", resumo?.geral.naoLidas ?? 0)}
        <div className={styles.secao}><span>Grupos</span><IconButton dica="Novo grupo" icone={<Users size={15} />} onClick={() => setModal({ tipo: "novo", nome: "", privado: true, pessoas: [] })} /></div>
        {resumo?.grupos.map((g) => item(g.id, `${g.privado ? "🔒 " : ""}${g.nome}`, g.ultima?.texto ?? `${g.participantes.length} participante(s)`, g.participa ? g.naoLidas : 0))}
        <div className={styles.secao}><span>Pessoas</span></div>
        {resumo?.pessoas.map((p) => item(p.id, p.nome, p.ultima?.texto ?? p.cargo, p.naoLidas))}
      </aside>
      <section className={styles.conversa}>
        <div className={styles.cabeca}>
          <div><h2>{nome}</h2>{grupo && <small>{grupo.privado ? "Privado" : "Aberto à equipe"} · {grupo.participantes.join(", ")}</small>}</div>
          <div className={styles.botoes}>
            {direta && <IconButton dica="Incluir pessoas (cria um grupo)" icone={<UserPlus size={16} />} onClick={() => setModal({ tipo: "novo", nome: "", privado: true, pessoas: [direta.id] })} />}
            {grupo?.participa && <IconButton dica="Incluir pessoas" icone={<UserPlus size={16} />} onClick={() => setModal({ tipo: "incluir", nome: "", privado: true, pessoas: [] })} />}
            {grupo?.participa && <IconButton dica={grupo.privado ? "Abrir para a equipe" : "Tornar privado"} icone={grupo.privado ? <Unlock size={16} /> : <Lock size={16} />} onClick={() => void tentar(() => privacidadeGrupo(conversa, !grupo.privado))} />}
            {grupo?.participa && <IconButton dica="Sair do grupo" icone={<LogOut size={16} />} onClick={() => { void tentar(() => sairDoGrupo(conversa)).then(() => setConversa("geral")); }} />}
          </div>
        </div>
        <div className={styles.mensagens}>
          {!lista.length && <p className={styles.vazio}>Nenhuma mensagem ainda.</p>}
          {lista.map((m) => <div key={m.id} className={`${styles.balao} ${m.minha ? styles.minha : ""} ${m.mencionou ? styles.mencao : ""}`}><small>{m.minha ? "Você" : m.de} · {hora(m.em)}</small>{m.encaminhadaDe && <small className={styles.encaminhada}>Encaminhada de {m.encaminhadaDe}</small>}<p>{destacar(m.texto)}</p><span className={styles.acaoMsg}><IconButton dica="Encaminhar" icone={<Forward size={14} />} onClick={() => setEncaminhar(m)} /></span></div>)}
          <div ref={fim} />
        </div>
        <div className={styles.escrever}>
          {!!sugestoes.length && <div className={styles.sugestoes}>{sugestoes.map((p) => <button type="button" key={p.id} onClick={() => marcar(p.nome)}>{p.nome}{p.cargo && <small> · {p.cargo}</small>}</button>)}</div>}
          {emojis && <div className={styles.emojis}>{EMOJIS.map((e) => <button type="button" key={e} onClick={() => emoji(e)}>{e}</button>)}</div>}
          <IconButton dica="Emoticons" icone={<Smile size={18} />} onClick={() => setEmojis(!emojis)} />
          <textarea ref={campo} aria-label="Mensagem" rows={2} maxLength={2000} placeholder="Escreva uma mensagem" value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={tecla} />
          <Button variante="primary" carregando={enviando} onClick={() => void enviar()}>Enviar</Button>
        </div>
      </section>
    </div>
    <Modal aberto={!!modal} largura="sm" titulo={modal?.tipo === "incluir" ? "Incluir pessoas" : "Novo grupo"} onFechar={() => setModal(null)} rodape={<><Button onClick={() => setModal(null)}>Voltar</Button><Button variante="primary" onClick={() => void confirmarModal()}>{modal?.tipo === "incluir" ? "Incluir" : "Criar grupo"}</Button></>}>
      {modal && <div className={styles.formModal}>
        {modal.tipo === "novo" && <><Input rotulo="Nome do grupo" value={modal.nome} onChange={(e) => setModal({ ...modal, nome: e.target.value })} />
          <label><input type="checkbox" checked={modal.privado} onChange={(e) => setModal({ ...modal, privado: e.target.checked })} /> Privado: só os participantes veem</label></>}
        <b>Pessoas</b>
        {candidatos.map((p) => <label key={p.id}><input type="checkbox" checked={modal.pessoas.includes(p.id)} onChange={(e) => setModal({ ...modal, pessoas: e.target.checked ? [...modal.pessoas, p.id] : modal.pessoas.filter((x) => x !== p.id) })} /> {p.nome}</label>)}
        {!candidatos.length && <small>Todos já participam.</small>}
      </div>}
    </Modal>
    <Modal aberto={!!encaminhar} largura="sm" titulo="Encaminhar mensagem" onFechar={() => setEncaminhar(null)} rodape={<><Button onClick={() => setEncaminhar(null)}>Voltar</Button><Button variante="primary" disabled={!destino} onClick={() => void confirmarEncaminhar()}>Encaminhar</Button></>}>
      <Select rotulo="Para" value={destino} onChange={(e) => setDestino(e.target.value)}><option value="">Escolha</option>{destinos.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}</Select>
    </Modal>
  </>;
}
export default function Mensagens() { return <Suspense fallback={<Loading />}><Conversas /></Suspense>; }
