"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button, Input, Notice } from "@neeko/ui";
import { destinoApos, entrar, esqueciSenha, eu, redefinirComCodigo } from "@/services/conta";
import { lembrarLink } from "@/services/http";
import styles from "@/app/auth.module.css";

/** Sem `escritorio`, é a entrada da Neeko; com ele, a tela personalizada do escritório. */
export function TelaLogin({ escritorio, marca, rodape }: { escritorio?: string; marca: ReactNode; rodape?: ReactNode }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(() => (typeof window !== "undefined" && window.location.search.includes("limite=1") ? "Todos os acessos simultâneos do plano estão em uso. Tente novamente em alguns minutos." : ""));
  const [enviando, setEnviando] = useState(false);
  const [etapa, setEtapa] = useState<"entrar" | "pedir" | "codigo">("entrar");
  const [codigo, setCodigo] = useState("");
  const [nova, setNova] = useState("");
  const [aviso, setAviso] = useState("");
  const mudar = (e: "entrar" | "pedir" | "codigo") => { setEtapa(e); setErro(""); setSenha(""); };
  async function pedir(e: FormEvent) {
    e.preventDefault(); setEnviando(true); setErro(""); setAviso("");
    try { await esqueciSenha(email, escritorio); setCodigo(""); setNova(""); mudar("codigo"); setAviso("Se este e-mail tiver cadastro, enviamos um código de 6 números. Ele vale por 15 minutos."); }
    catch (x) { setErro(x instanceof Error ? x.message : "Não foi possível enviar o código."); } finally { setEnviando(false); }
  }
  async function redefinir(e: FormEvent) {
    e.preventDefault(); setEnviando(true); setErro(""); setAviso("");
    try { await redefinirComCodigo(email, codigo, nova); mudar("entrar"); setAviso("Senha alterada. Entre com a nova senha."); }
    catch (x) { setErro(x instanceof Error ? x.message : "Não foi possível alterar a senha."); } finally { setEnviando(false); }
  }
  async function enviar(e: FormEvent) {
    e.preventDefault(); setEnviando(true); setErro("");
    try { await entrar(email, senha, escritorio); lembrarLink(escritorio ?? null); window.location.assign(destinoApos(await eu())); }
    catch (x) { setErro(x instanceof Error ? x.message : "Não foi possível entrar."); setEnviando(false); }
  }
  return (
    <div className={styles.fundo}>
      {etapa === "entrar" && <form className={styles.caixa} onSubmit={enviar}>
        {marca}
        <h1 className={styles.titulo}>Entrar</h1>
        {aviso && <Notice>{aviso}</Notice>}
        {erro && <Notice tom="erro">{erro}</Notice>}
        <Input rotulo="E-mail" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input rotulo="Senha" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        <Button type="submit" variante="primary" carregando={enviando}>Entrar</Button>
        <button type="button" className={styles.linkTexto} onClick={() => { setAviso(""); mudar("pedir"); }}>Esqueci minha senha</button>
        {rodape}
      </form>}
      {etapa === "pedir" && <form className={styles.caixa} onSubmit={pedir}>
        {marca}
        <h1 className={styles.titulo}>Redefinir senha</h1>
        <p className={styles.texto}>Enviaremos um código de segurança para o seu e-mail.</p>
        {erro && <Notice tom="erro">{erro}</Notice>}
        <Input rotulo="E-mail" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit" variante="primary" carregando={enviando}>Enviar código</Button>
        <button type="button" className={styles.linkTexto} onClick={() => mudar("entrar")}>Voltar para entrar</button>
        {rodape}
      </form>}
      {etapa === "codigo" && <form className={styles.caixa} onSubmit={redefinir}>
        {marca}
        <h1 className={styles.titulo}>Criar nova senha</h1>
        {aviso && <Notice>{aviso}</Notice>}
        {erro && <Notice tom="erro">{erro}</Notice>}
        <Input rotulo="Código de segurança" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))} />
        <Input rotulo="Nova senha" type="password" autoComplete="new-password" required value={nova} onChange={(e) => setNova(e.target.value)} />
        <Button type="submit" variante="primary" carregando={enviando}>Salvar nova senha</Button>
        <button type="button" className={styles.linkTexto} onClick={() => mudar("pedir")}>Enviar outro código</button>
        {rodape}
      </form>}
    </div>
  );
}
