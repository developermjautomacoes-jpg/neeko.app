"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Input, Notice } from "@neeko/ui";
import { eu, trocarSenha } from "@/services/conta";
import styles from "../auth.module.css";

export default function TrocarSenha() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [repetir, setRepetir] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [provisoria, setProvisoria] = useState(false);
  useEffect(() => { eu().then((p) => setProvisoria(p.mustChangePassword)).catch(() => undefined); }, []);
  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (nova !== repetir) { setErro("As duas senhas novas não são iguais."); return; }
    setEnviando(true); setErro("");
    try { await trocarSenha(atual, nova); window.location.assign("/notas/nfse"); }
    catch (x) { setErro(x instanceof Error ? x.message : "Não foi possível trocar."); setEnviando(false); }
  }
  return (
    <div className={styles.fundo}>
      <form className={styles.caixa} onSubmit={enviar}>
        <h1 className={styles.titulo}>Trocar senha</h1>
        <p className={styles.texto}>{provisoria ? "Sua senha é provisória. Crie uma senha pessoal para continuar." : "A senha é pessoal e não deve ser compartilhada."}</p>
        {erro && <Notice tom="erro">{erro}</Notice>}
        <Input rotulo="Senha atual" type="password" autoComplete="current-password" required value={atual} onChange={(e) => setAtual(e.target.value)} />
        <Input rotulo="Nova senha" type="password" autoComplete="new-password" required dica="Ao menos 10 caracteres, com letras e números." value={nova} onChange={(e) => setNova(e.target.value)} />
        <Input rotulo="Repita a nova senha" type="password" autoComplete="new-password" required value={repetir} onChange={(e) => setRepetir(e.target.value)} />
        <Button type="submit" variante="primary" carregando={enviando}>Salvar senha</Button>
      </form>
    </div>
  );
}
