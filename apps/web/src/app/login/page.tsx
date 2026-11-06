"use client";
import { useState, type FormEvent } from "react";
import { Button, Input, Notice } from "@neeko/ui";
import { destinoApos, entrar, eu } from "@/services/conta";
import styles from "../auth.module.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  async function enviar(e: FormEvent) {
    e.preventDefault(); setEnviando(true); setErro("");
    try { await entrar(email, senha); window.location.assign(destinoApos(await eu())); }
    catch (x) { setErro(x instanceof Error ? x.message : "Não foi possível entrar."); setEnviando(false); }
  }
  return (
    <div className={styles.fundo}>
      <form className={styles.caixa} onSubmit={enviar}>
        <div className={styles.marca}><img src="/neeko-marca.png" alt="" width={58} height={41} /><div><b>Neeko</b><small>Tecnologia que impulsiona sua contabilidade</small></div></div>
        <h1 className={styles.titulo}>Entrar</h1>
        {erro && <Notice tom="erro">{erro}</Notice>}
        <Input rotulo="E-mail" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input rotulo="Senha" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        <Button type="submit" variante="primary" carregando={enviando}>Entrar</Button>
        <p className={styles.texto}>Esqueceu a senha? Peça uma senha provisória a quem administra sua organização.</p>
      </form>
    </div>
  );
}
