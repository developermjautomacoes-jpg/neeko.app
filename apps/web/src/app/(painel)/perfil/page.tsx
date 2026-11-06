"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, ImageCropper, Input, Loading, Modal, Notice, PageHeader, useToast } from "@neeko/ui";
import { eu, salvarPerfil } from "@/services/conta";
import styles from "./perfil.module.css";

export default function Perfil() {
  const avisar = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [jobTitle, setCargo] = useState("");
  const [phone, setFone] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState("");
  const [original, setOriginal] = useState("");
  const [recorte, setRecorte] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [chave, setChave] = useState(0);
  useEffect(() => { eu().then((p) => { setEmail(p.email); setName(p.name); setCargo(p.jobTitle); setFone(p.phone); setAvatar(p.avatar); setPronto(true); }).catch((x: Error) => setErro(x.message)); }, []);

  function escolher(f?: File) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { avisar("Escolha uma imagem.", "erro"); return; }
    if (f.size > 15 * 1024 * 1024) { avisar("Escolha uma imagem de até 15 MB.", "erro"); return; }
    setOriginal(URL.createObjectURL(f));
  }
  function fechar() { if (original) URL.revokeObjectURL(original); setOriginal(""); setChave((k) => k + 1); }
  async function gravar(foto: string | null) {
    setSalvando(true);
    try { await salvarPerfil({ name, jobTitle, phone, avatar: foto }); setAvatar(foto); window.dispatchEvent(new Event("neeko:perfil")); avisar("Perfil salvo.", "sucesso"); return true; }
    catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível salvar.", "erro"); return false; }
    finally { setSalvando(false); }
  }
  if (erro) return <Notice tom="erro">{erro}</Notice>;
  if (!pronto) return <Loading />;
  const iniciais = name.trim().split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <>
      <PageHeader titulo="Meu perfil" descricao="Seu nome e sua foto aparecem no menu e na tela inicial." />
      <div className={styles.grade}>
        <Card titulo="Foto">
          <div className={styles.foto}>
            {avatar ? <img src={avatar} alt="Sua foto de perfil" className={styles.avatar} /> : <span className={styles.avatar}>{iniciais}</span>}
            <label className={styles.escolher}>Escolher foto<input key={chave} type="file" accept="image/*" onChange={(e) => escolher(e.target.files?.[0])} /></label>
            {avatar && <Button tamanho="sm" variante="danger" carregando={salvando} onClick={() => void gravar(null)}>Remover foto</Button>}
          </div>
        </Card>
        <Card titulo="Dados pessoais">
          <div className={styles.form}>
            <Input rotulo="Nome" value={name} onChange={(e) => setName(e.target.value)} />
            <Input rotulo="E-mail de acesso" value={email} disabled dica="Para trocar, fale com quem administra a organização." />
            <Input rotulo="Cargo" value={jobTitle} onChange={(e) => setCargo(e.target.value)} />
            <Input rotulo="Telefone" value={phone} onChange={(e) => setFone(e.target.value)} />
            <div className={styles.acoes}><Link href="/trocar-senha">Trocar senha</Link><Button variante="primary" carregando={salvando} onClick={() => void gravar(avatar)}>Salvar</Button></div>
          </div>
        </Card>
      </div>
      <Modal aberto={!!original} titulo="Ajustar foto" onFechar={fechar} rodape={<><Button onClick={fechar}>Voltar</Button><Button variante="primary" carregando={salvando} disabled={!recorte} onClick={() => { void gravar(recorte).then((ok) => { if (ok) fechar(); }); }}>Usar esta foto</Button></>}>
        {original && <ImageCropper imagem={original} onRecorte={setRecorte} />}
      </Modal>
    </>
  );
}
