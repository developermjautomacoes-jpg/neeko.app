"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button, Input, Notice } from "@neeko/ui";
import { destinoApos, entrar, eu } from "@/services/conta";
import { lembrarLink } from "@/services/http";
import styles from "@/app/auth.module.css";

/** Sem `escritorio`, é a entrada da Neeko; com ele, a tela personalizada do escritório. */
export function TelaLogin({ escritorio, marca, rodape }: { escritorio?: string; marca: ReactNode; rodape?: ReactNode }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(() => (typeof window !== "undefined" && window.location.search.includes("limite=1") ? "Todos os acessos simultâneos do plano estão em uso. Tente novamente em alguns minutos." : ""));
  const [enviando, setEnviando] = useState(false);
  async function enviar(e: FormEvent) {
    e.preventDefault(); setEnviando(true); setErro("");
    try { await entrar(email, senha, escritorio); lembrarLink(escritorio ?? null); window.location.assign(destinoApos(await eu())); }
    catch (x) { setErro(x instanceof Error ? x.message : "Não foi possível entrar."); setEnviando(false); }
  }
  return (
    <div className={styles.fundo}>
      <form className={styles.caixa} onSubmit={enviar}>
        {marca}
        <h1 className={styles.titulo}>Entrar</h1>
        {erro && <Notice tom="erro">{erro}</Notice>}
        <Input rotulo="E-mail" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input rotulo="Senha" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        <Button type="submit" variante="primary" carregando={enviando}>Entrar</Button>
        <p className={styles.texto}>Esqueceu a senha? Peça uma senha provisória a quem administra sua organização.</p>
        {rodape}
      </form>
    </div>
  );
}
