"use client";
import { useState, type FormEvent } from "react";
import { Button, Input, Notice } from "@neeko/ui";
import { destinoApos, eu, sair, verificarMfa } from "@/services/conta";
import { telaEntrada } from "@/services/http";
import styles from "../auth.module.css";

export default function Verificacao() {
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  async function enviar(e: FormEvent) {
    e.preventDefault(); setEnviando(true); setErro("");
    try { await verificarMfa(codigo); window.location.assign(destinoApos(await eu())); }
    catch (x) { setErro(x instanceof Error ? x.message : "Não foi possível verificar."); setEnviando(false); }
  }
  return <div className={styles.fundo}><form className={styles.caixa} onSubmit={enviar}>
    <h1 className={styles.titulo}>Verificação em duas etapas</h1>
    <p className={styles.texto}>Digite o código do aplicativo autenticador. Sem o celular, use um código de recuperação.</p>
    {erro && <Notice tom="erro">{erro}</Notice>}
    <Input rotulo="Código" autoComplete="one-time-code" required autoFocus value={codigo} onChange={(e) => setCodigo(e.target.value)} />
    <Button type="submit" variante="primary" carregando={enviando}>Confirmar</Button>
    <Button variante="ghost" onClick={() => { void sair().finally(() => window.location.assign(telaEntrada())); }}>Sair</Button>
  </form></div>;
}
