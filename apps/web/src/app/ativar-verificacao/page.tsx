"use client";
import { useEffect, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { Button, Input, Loading, Notice } from "@neeko/ui";
import { ativarMfa, iniciarMfa } from "@/services/conta";
import styles from "../auth.module.css";

export default function AtivarVerificacao() {
  const [qr, setQr] = useState("");
  const [chave, setChave] = useState("");
  const [codigo, setCodigo] = useState("");
  const [recuperacao, setRecuperacao] = useState<string[]>([]);
  const [confirmou, setConfirmou] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  useEffect(() => { iniciarMfa().then(async (r) => { setChave(r.chave); setQr(await QRCode.toDataURL(r.uri, { width: 220, margin: 1 })); }).catch((x: Error) => setErro(x.message)); }, []);
  async function enviar(e: FormEvent) {
    e.preventDefault(); setEnviando(true); setErro("");
    try { setRecuperacao((await ativarMfa(codigo)).codigos); }
    catch (x) { setErro(x instanceof Error ? x.message : "Não foi possível ativar."); }
    finally { setEnviando(false); }
  }
  if (recuperacao.length) return <div className={styles.fundo}><div className={styles.caixa}>
    <h1 className={styles.titulo}>Guarde estes códigos</h1>
    <p className={styles.texto}>Cada código vale uma vez, para entrar sem o celular. Eles não serão mostrados de novo.</p>
    <div className={styles.codigos}>{recuperacao.map((c) => <code key={c}>{c}</code>)}</div>
    <Button onClick={() => { void navigator.clipboard.writeText(recuperacao.join("\n")); }}>Copiar códigos</Button>
    <label className={styles.confirma}><input type="checkbox" checked={confirmou} onChange={(e) => setConfirmou(e.target.checked)} /> Guardei os códigos em local seguro</label>
    <Button variante="primary" disabled={!confirmou} onClick={() => window.location.assign("/inicio")}>Continuar</Button>
  </div></div>;
  return <div className={styles.fundo}><form className={styles.caixa} onSubmit={enviar}>
    <h1 className={styles.titulo}>Ative as duas etapas</h1>
    <p className={styles.texto}>Leia o QR Code com Google Authenticator, Microsoft Authenticator ou outro aplicativo igual.</p>
    {erro && <Notice tom="erro">{erro}</Notice>}
    {qr ? <img src={qr} alt="QR Code da verificação em duas etapas" width={220} height={220} className={styles.qr} /> : <Loading />}
    {chave && <p className={styles.texto}>Ou digite a chave: <code>{chave}</code></p>}
    <Input rotulo="Código de 6 números" inputMode="numeric" autoComplete="one-time-code" required value={codigo} onChange={(e) => setCodigo(e.target.value)} />
    <Button type="submit" variante="primary" carregando={enviando}>Ativar</Button>
  </form></div>;
}
