"use client";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Building2, ChevronDown, FileBadge, FileStack, Handshake, Home, Landmark, LogOut, Menu, MessageCircle, PieChart, Search, Settings, Wallet } from "lucide-react";
import { Loading, Notice } from "@neeko/ui";
import { formatarCnpj } from "@/lib/format";
import { destinoApos, eu, sair, type Eu, resumoMensagens, type ResumoMensagens } from "@/services/conta";
import { lerPainel, type Painel as DadosPainel } from "@/services/fiscal";
import { telaEntrada } from "@/services/http";
import { logoParaMenu } from "@/features/logoMenu";
import { aplicarTema, menuClaro } from "@/features/temas";
import styles from "./painel.module.css";

interface Item { plataforma?: boolean; nome: string; icone: ComponentType<{ size?: number }>; href?: string; exige?: string; filhos?: { href: string; nome: string; exige: string }[] }
const MENU: Item[] = [
  { nome: "Início", icone: Home, href: "/inicio" },
  { nome: "Fiscal", icone: Landmark },
  { nome: "Documentos Fiscais", icone: FileStack, filhos: [{ href: "/notas/nfse", nome: "NFS-e", exige: "fiscal.documents.read" }, { href: "/notas/nfe-cte", nome: "NF-e e CT-e", exige: "fiscal.documents.read" }] },
  { nome: "Emissão de NFS-e", icone: FileBadge },
  { nome: "BPO Financeiro", icone: Wallet },
  { nome: "Contratos", icone: Handshake },
  { nome: "Mensagens", icone: MessageCircle, href: "/mensagens" },
  { nome: "Relatórios", icone: PieChart },
  { nome: "Neeko Gerencial", icone: Building2, plataforma: true, filhos: [{ href: "/plataforma/escritorios", nome: "Escritórios", exige: "" }, { href: "/plataforma/planos", nome: "Planos", exige: "" }, { href: "/plataforma/solicitacoes", nome: "Solicitações", exige: "" }] },
  { nome: "Administração", icone: Settings, filhos: [{ href: "/escritorio", nome: "Perfil do escritório", exige: "office.manage" }, { href: "/empresas", nome: "Empresas", exige: "memoranda.read" }, { href: "/atividades", nome: "Histórico de atividades", exige: "gestao" }, { href: "/certificados", nome: "Certificados", exige: "fiscal.credentials.manage" }, { href: "/usuarios", nome: "Usuários", exige: "users.manage" }] },
];
/** Por enquanto, escritórios usam só NFS-e, memorandos, usuários e administração. */
const LIBERADOS = ["Início", "Documentos Fiscais", "Mensagens", "Administração"];
const doEscritorio = (m: Item): Item => ({ ...m, filhos: m.filhos?.filter((f) => f.href !== "/notas/nfe-cte") });
const iniciais = (n: string) => { const p = n.trim().split(/\s+/); return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); };

export default function Painel({ children }: { children: ReactNode }) {
  const [pessoa, setPessoa] = useState<Eu | null>(null);
  useEffect(() => { aplicarTema(pessoa?.organization?.theme); }, [pessoa]);
  const [logoMenu, setLogoMenu] = useState("");
  useEffect(() => {
    const o = pessoa?.organization; if (!o?.logo) return;
    logoParaMenu(o.logo, menuClaro(o.theme)).then(setLogoMenu).catch(() => setLogoMenu(o.logo ?? ""));
  }, [pessoa?.organization?.logo, pessoa?.organization?.theme]);
  const [dados, setDados] = useState<DadosPainel | null>(null);
  const [menu, setMenu] = useState(false);
  const [abertos, setAbertos] = useState<string[]>(["Documentos Fiscais"]);
  const [busca, setBusca] = useState("");
  const [sino, setSino] = useState(false);
  const rota = usePathname();
  const [msgs, setMsgs] = useState<ResumoMensagens | null>(null);
  useEffect(() => {
    if (!pessoa?.organization) return;
    const ler = () => { resumoMensagens().then(setMsgs).catch(() => undefined); };
    ler(); const t = setInterval(ler, 20000);
    window.addEventListener("neeko:mensagens", ler);
    return () => { clearInterval(t); window.removeEventListener("neeko:mensagens", ler); };
  }, [pessoa?.organization]);
  useEffect(() => {
    eu().then((p) => { const d = destinoApos(p); if (d !== "/inicio") window.location.assign(d); else { setPessoa(p); if (p.permissions.includes("fiscal.documents.read")) lerPainel().then(setDados).catch(() => undefined); } }).catch(() => undefined);
  }, []);
  useEffect(() => { setMenu(false); setSino(false); setBusca(""); }, [rota]);
  useEffect(() => {
    const atualizar = () => { eu().then(setPessoa).catch(() => undefined); };
    window.addEventListener("neeko:perfil", atualizar);
    return () => window.removeEventListener("neeko:perfil", atualizar);
  }, []);
  const avisos = (dados?.pendencias ?? 0) + (msgs?.total ?? 0);
  const achadas = useMemo(() => {
    const q = busca.trim().toLowerCase(); if (!q) return [];
    const n = q.replace(/\D/g, "");
    return (dados?.empresasLista ?? []).filter((e) => e.razao.toLowerCase().includes(q) || (n && e.cnpj.includes(n))).slice(0, 6);
  }, [busca, dados]);
  if (!pessoa) return <Loading />;
  if (!pessoa.organization && !pessoa.platformAdmin) return <div className={styles.conteudo}><Notice tom="alerta">O acesso deste escritório está suspenso. Fale com a Neeko.</Notice></div>;
  const pode = (p?: string) => p === "gestao" ? pessoa?.organization?.role === "ORG_OWNER" || pessoa?.organization?.role === "ORG_ADMIN" : !p || pessoa.permissions.includes(p);
  return (
    <div className={styles.painel}>
      <aside className={[styles.lateral, menu ? styles.aberta : ""].join(" ")}>
        {!pessoa.organization?.internal && pessoa.organization?.logo ? <div className={styles.marcaEscritorio}>{logoMenu && <img src={logoMenu} alt={pessoa.organization.name} />}</div> : <div className={styles.marcaNeeko}><img src={menuClaro(pessoa.organization?.theme) ? "/logo-neeko.png" : "/logo-neeko-clara.png"} alt="Neeko Automação Inteligente" /></div>}
        <nav aria-label="Menu principal" className={styles.nav}>
          {(pessoa?.organization && !pessoa.organization.internal ? MENU.filter((m) => LIBERADOS.includes(m.nome)).map(doEscritorio) : MENU).map((m) => {
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
          <span><b>{pessoa.name}</b><small>{pessoa.organization?.name}</small></span>
        </div>
        <Link href="/perfil" className={styles.acaoLateral}>Meu perfil</Link>
        <button type="button" className={styles.acaoLateral} onClick={() => { void sair().finally(() => window.location.assign(telaEntrada())); }}><LogOut size={18} /> Sair</button>
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
            <button type="button" aria-label={`Notificações: ${avisos}`} aria-expanded={sino} onClick={() => setSino(!sino)}><Bell size={22} />{!!avisos && <i>{avisos > 99 ? "99+" : avisos}</i>}</button>
            {sino && <div className={styles.resultados}>
              {msgs?.avisos.map((a) => <Link key={a.conversa + a.em} href={`/mensagens?c=${a.conversa}`}><b>{a.mencao ? `${a.de} marcou você` : `Mensagem de ${a.de}`}</b><small>{a.texto}</small></Link>)}
              {dados?.pendenciasLista.map((p) => <Link key={p.texto} href={p.rota}>{p.texto}</Link>)}
              {!avisos && <p>Nenhuma notificação.</p>}
            </div>}
          </div>
          <b className={styles.org}>{pessoa.organization?.name}</b>
          <Link href="/perfil" aria-label="Meu perfil">{pessoa.avatar ? <img src={pessoa.avatar} alt="" className={styles.avatarTopo} /> : <span className={styles.avatarTopo}>{iniciais(pessoa.name)}</span>}</Link>
        </header>
        <main className={styles.conteudo}>{children}</main>
        <footer className={styles.rodape}><img src="/logo-neeko.png" alt="Neeko" width={73} height={20} /></footer>
      </div>
    </div>
  );
}
