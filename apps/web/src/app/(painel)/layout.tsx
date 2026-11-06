"use client";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Building2, ChevronDown, FileBadge, FileStack, Handshake, Home, Landmark, LogOut, Mails, Menu, PieChart, Search, Settings, Wallet } from "lucide-react";
import { Loading, Notice } from "@neeko/ui";
import { formatarCnpj } from "@/lib/format";
import { destinoApos, eu, sair, type Eu } from "@/services/conta";
import { lerPainel, type Painel as DadosPainel } from "@/services/fiscal";
import styles from "./painel.module.css";

interface Item { plataforma?: boolean; nome: string; icone: ComponentType<{ size?: number }>; href?: string; exige?: string; filhos?: { href: string; nome: string; exige: string }[] }
const MENU: Item[] = [
  { nome: "Início", icone: Home, href: "/inicio" },
  { nome: "Fiscal", icone: Landmark },
  { nome: "Documentos Fiscais", icone: FileStack, filhos: [{ href: "/notas/nfse", nome: "NFS-e", exige: "fiscal.documents.read" }, { href: "/notas/nfe-cte", nome: "NF-e e CT-e", exige: "fiscal.documents.read" }] },
  { nome: "Emissão de NFS-e", icone: FileBadge },
  { nome: "BPO Financeiro", icone: Wallet },
  { nome: "Contratos", icone: Handshake },
  { nome: "Memorandos", icone: Mails, href: "/memorandos", exige: "memoranda.read" },
  { nome: "Relatórios", icone: PieChart },
  { nome: "Neeko Gerencial", icone: Building2, plataforma: true, filhos: [{ href: "/plataforma/escritorios", nome: "Escritórios", exige: "" }, { href: "/plataforma/planos", nome: "Planos", exige: "" }] },
  { nome: "Administração", icone: Settings, filhos: [{ href: "/escritorio", nome: "Perfil do escritório", exige: "office.manage" }, { href: "/certificados", nome: "Certificados", exige: "fiscal.credentials.manage" }, { href: "/usuarios", nome: "Usuários", exige: "users.manage" }] },
];
const iniciais = (n: string) => { const p = n.trim().split(/\s+/); return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); };

export default function Painel({ children }: { children: ReactNode }) {
  const [pessoa, setPessoa] = useState<Eu | null>(null);
  const [dados, setDados] = useState<DadosPainel | null>(null);
  const [menu, setMenu] = useState(false);
  const [abertos, setAbertos] = useState<string[]>(["Documentos Fiscais"]);
  const [busca, setBusca] = useState("");
  const [sino, setSino] = useState(false);
  const rota = usePathname();
  useEffect(() => {
    eu().then((p) => { const d = destinoApos(p); if (d !== "/inicio") window.location.assign(d); else { setPessoa(p); if (p.permissions.includes("fiscal.documents.read")) lerPainel().then(setDados).catch(() => undefined); } }).catch(() => undefined);
  }, []);
  useEffect(() => { setMenu(false); setSino(false); setBusca(""); }, [rota]);
  useEffect(() => {
    const atualizar = () => { eu().then(setPessoa).catch(() => undefined); };
    window.addEventListener("neeko:perfil", atualizar);
    return () => window.removeEventListener("neeko:perfil", atualizar);
  }, []);
  const achadas = useMemo(() => {
    const q = busca.trim().toLowerCase(); if (!q) return [];
    const n = q.replace(/\D/g, "");
    return (dados?.empresasLista ?? []).filter((e) => e.razao.toLowerCase().includes(q) || (n && e.cnpj.includes(n))).slice(0, 6);
  }, [busca, dados]);
  if (!pessoa) return <Loading />;
  if (!pessoa.organization && !pessoa.platformAdmin) return <div className={styles.conteudo}><Notice tom="alerta">O acesso deste escritório está suspenso. Fale com a Neeko.</Notice></div>;
  const pode = (p?: string) => !p || pessoa.permissions.includes(p);
  return (
    <div className={styles.painel}>
      <aside className={[styles.lateral, menu ? styles.aberta : ""].join(" ")}>
        {pessoa.organization?.logo ? <div className={styles.marcaEscritorio}><img src={pessoa.organization.logo} alt={pessoa.organization.name} /></div> : <div className={styles.marca}><img src="/neeko-marca.png" alt="" width={54} height={38} /><div><b>Neeko</b><small>Tecnologia que impulsiona sua contabilidade</small></div></div>}
        <nav aria-label="Menu principal" className={styles.nav}>
          {MENU.map((m) => {
            if (m.plataforma && !pessoa.platformAdmin) return null;
            const I = m.icone;
            const filhos = m.filhos?.filter((f) => pode(f.exige));
            if (m.filhos && !filhos?.length) return null;
            if (filhos) {
              const aberto = abertos.includes(m.nome) || filhos.some((f) => f.href === rota);
              return <div key={m.nome}>
                <button type="button" className={styles.item} aria-expanded={aberto} onClick={() => setAbertos((a) => (a.includes(m.nome) ? a.filter((x) => x !== m.nome) : [...a, m.nome]))}><I size={20} /><span>{m.nome}</span><ChevronDown size={16} className={aberto ? styles.virado : ""} /></button>
                {aberto && <div className={styles.sub}>{filhos.map((f) => <Link key={f.href} href={f.href} className={rota === f.href ? styles.subAtivo : ""} aria-current={rota === f.href ? "page" : undefined}>{f.nome}</Link>)}</div>}
              </div>;
            }
            if (!m.href || !pode(m.exige)) return <span key={m.nome} className={styles.embreve} aria-disabled="true"><I size={20} /><span>{m.nome}</span><small>em breve</small></span>;
            const ativo = !!rota.startsWith(m.href);
            return <Link key={m.nome} href={m.href} className={ativo ? styles.ativo : styles.item} aria-current={ativo ? "page" : undefined}><I size={20} /><span>{m.nome}</span></Link>;
          })}
        </nav>
        <div className={styles.pessoa}>
          {pessoa.avatar ? <img src={pessoa.avatar} alt="" className={styles.avatar} /> : <span className={styles.avatar}>{iniciais(pessoa.name)}</span>}
          <span><b>{pessoa.name}</b><small>{pessoa.jobTitle || pessoa.organization?.name}</small></span>
        </div>
        <Link href="/perfil" className={styles.acaoLateral}>Meu perfil</Link>
        <button type="button" className={styles.acaoLateral} onClick={() => { void sair().finally(() => window.location.assign("/login")); }}><LogOut size={18} /> Sair</button>
      </aside>
      <div className={styles.area}>
        <header className={styles.topo}>
          <button type="button" className={styles.abrir} onClick={() => setMenu(!menu)} aria-label="Abrir menu" aria-expanded={menu}><Menu size={20} /></button>
          <div className={styles.busca}>
            <Search size={18} aria-hidden />
            <input aria-label="Pesquisar empresa" placeholder="Pesquise por empresa ou CNPJ…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            {busca.trim() && <div className={styles.resultados}>{achadas.length ? achadas.map((e) => <a key={e.id} href={`/notas/nfse?empresa=${e.id}`}><b>{e.razao || "(sem nome)"}</b><small>{formatarCnpj(e.cnpj)}</small></a>) : <p>Nenhuma empresa encontrada.</p>}</div>}
          </div>
          <span className={styles.espaco} />
          <div className={styles.sino}>
            <button type="button" aria-label={`Pendências: ${dados?.pendencias ?? 0}`} aria-expanded={sino} onClick={() => setSino(!sino)}><Bell size={22} />{!!dados?.pendencias && <i>{dados.pendencias > 99 ? "99+" : dados.pendencias}</i>}</button>
            {sino && <div className={styles.resultados}>{dados?.pendenciasLista.length ? dados.pendenciasLista.map((p) => <Link key={p.texto} href={p.rota}>{p.texto}</Link>) : <p>Nenhuma pendência.</p>}</div>}
          </div>
          <b className={styles.org}>{pessoa.organization?.name}</b>
          <Link href="/perfil" aria-label="Meu perfil">{pessoa.avatar ? <img src={pessoa.avatar} alt="" className={styles.avatarTopo} /> : <span className={styles.avatarTopo}>{iniciais(pessoa.name)}</span>}</Link>
        </header>
        <main className={styles.conteudo}>{children}</main>
        <footer className={styles.rodape}><img src="/neeko-marca.png" alt="" width={24} height={17} /><span>Neeko · Tecnologia que impulsiona sua contabilidade</span></footer>
      </div>
    </div>
  );
}
