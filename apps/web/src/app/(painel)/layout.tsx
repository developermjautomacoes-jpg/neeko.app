"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Loading } from "@neeko/ui";
import { eu, sair, type Eu } from "@/services/conta";
import styles from "./painel.module.css";

const MENU = [
  { href: "/notas/nfse", nome: "NFS-e", exige: "fiscal.documents.read" },
  { href: "/notas/nfe-cte", nome: "NF-e e CT-e", exige: "fiscal.documents.read" },
  { href: "/certificados", nome: "Certificados", exige: "fiscal.credentials.manage" },
  { href: "/usuarios", nome: "Usuários", exige: "users.manage" },
];

export default function Painel({ children }: { children: ReactNode }) {
  const [pessoa, setPessoa] = useState<Eu | null>(null);
  const [menu, setMenu] = useState(false);
  const [tema, setTema] = useState("dark");
  const rota = usePathname();
  useEffect(() => {
    setTema(document.documentElement.getAttribute("data-theme") ?? "dark");
    eu().then((p) => { if (p.mustChangePassword) window.location.assign("/trocar-senha"); else setPessoa(p); }).catch(() => undefined);
  }, []);
  useEffect(() => setMenu(false), [rota]);
  function alternarTema() {
    const novo = tema === "light" ? "dark" : "light";
    setTema(novo);
    if (novo === "light") document.documentElement.setAttribute("data-theme", "light"); else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem("neeko-theme", novo); } catch { /* preferência opcional */ }
  }
  if (!pessoa) return <Loading />;
  return (
    <div className={styles.painel}>
      <aside className={[styles.lateral, menu ? styles.aberta : ""].join(" ")}>
        <img src={tema === "light" ? "/logo-claro.png" : "/logo-escuro.png"} alt="Neeko" className={styles.logo} width={150} height={48} />
        <p className={styles.org}><small>Organização</small><b>{pessoa.organization?.name ?? "Sem organização"}</b></p>
        <nav aria-label="Menu principal">
          {MENU.filter((m) => pessoa.permissions.includes(m.exige)).map((m) => <Link key={m.href} href={m.href} className={rota === m.href ? styles.ativo : styles.item} aria-current={rota === m.href ? "page" : undefined}>{m.nome}</Link>)}
        </nav>
      </aside>
      <div className={styles.area}>
        <header className={styles.topo}>
          <button type="button" className={styles.abrir} onClick={() => setMenu(!menu)} aria-label="Abrir menu" aria-expanded={menu}>☰</button>
          <span className={styles.espaco} />
          <span className={styles.pessoa}><b>{pessoa.name}</b><small>{pessoa.email}</small></span>
          <Button tamanho="sm" onClick={alternarTema}>{tema === "light" ? "Tema escuro" : "Tema claro"}</Button>
          <Link href="/trocar-senha" className={styles.link}>Trocar senha</Link>
          <Button tamanho="sm" onClick={() => { void sair().finally(() => window.location.assign("/login")); }}>Sair</Button>
        </header>
        <main className={styles.conteudo}>{children}</main>
        <footer className={styles.rodape}>Neeko Automações Inteligentes</footer>
      </div>
    </div>
  );
}
