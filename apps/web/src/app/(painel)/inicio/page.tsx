"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, Building2, CheckCircle2, CircleAlert, CircleDollarSign, FileSearch, FileText, Mail, ShieldCheck, TriangleAlert, Users, Zap, type LucideIcon } from "lucide-react";
import { Loading, Modal, Notice } from "@neeko/ui";
import { centavos } from "@/lib/format";
import { eu, type Eu } from "@/services/conta";
import { lerPainel, type Painel } from "@/services/fiscal";
import { formatarCnpj } from "@/lib/format";
import styles from "./inicio.module.css";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const ATALHOS: { href: string; nome: string; icone: LucideIcon; exige: string }[] = [
  { href: "/empresas/nova", nome: "Nova empresa", icone: Mail, exige: "memoranda.manage" },
  { href: "/notas/nfse", nome: "Capturar NFS-e", icone: FileText, exige: "fiscal.capture" }, { href: "/notas/nfe-cte", nome: "NF-e e CT-e", icone: FileSearch, exige: "fiscal.documents.read" },
  { href: "/certificados", nome: "Certificados", icone: ShieldCheck, exige: "fiscal.credentials.manage" }, { href: "/usuarios", nome: "Usuários", icone: Users, exige: "users.manage" },
];

function Variacao({ v }: { v: number | null }) {
  if (v === null) return null;
  const I = v >= 0 ? ArrowUp : ArrowDown;
  return <span className={v >= 0 ? styles.sobe : styles.desce}><I size={13} aria-hidden />{Math.abs(v).toLocaleString("pt-BR")}%</span>;
}
function Faisca({ valores, cor }: { valores: number[]; cor: string }) {
  const max = Math.max(...valores, 1), P = valores.map((v, i) => `${(i * 110) / (valores.length - 1)},${44 - (v / max) * 40}`);
  return <svg className={styles.faisca} viewBox="0 0 110 46" aria-hidden><polygon points={`0,46 ${P.join(" ")} 110,46`} fill={cor} opacity=".14" /><polyline points={P.join(" ")} fill="none" stroke={cor} strokeWidth="2" /></svg>;
}
function Indicador({ icone: I, cor, fundo, rotulo, valor, variacao, serie, href, onClick }: { icone: LucideIcon; cor: string; fundo: string; rotulo: string; valor: string; variacao?: number | null; serie?: number[]; href?: string; onClick?: () => void }) {
  const miolo = <>
    <span className={styles.icone} style={{ color: cor, background: fundo }}><I size={28} /></span>
    <div className={styles.indTexto}><span>{rotulo}</span><b>{valor}</b>{variacao !== undefined && <Variacao v={variacao} />}</div>
    {serie && <Faisca valores={serie} cor={cor} />}
  </>;
  return href ? <Link href={href} className={styles.indicador}>{miolo}</Link> : <button type="button" className={styles.indicador} onClick={onClick}>{miolo}</button>;
}

export default function Inicio() {
  const [pessoa, setPessoa] = useState<Eu | null>(null);
  const [d, setD] = useState<Painel | null>(null);
  const [erro, setErro] = useState("");
  useEffect(() => {
    eu().then((p) => { setPessoa(p); if (p.permissions.includes("fiscal.documents.read")) return lerPainel().then(setD); setErro("Peça a quem administra sua organização o acesso às notas."); }).catch((x: Error) => setErro(x.message));
  }, []);
  const nome = pessoa?.name.split(" ")[0] ?? "";
  const [pendencias, setPendencias] = useState(false);
  if (erro) return <Notice tom="alerta">{erro}</Notice>;
  if (!d) return <Loading />;
  const pontos = d.serie.map((p) => ({ competencia: p.competencia, centavos: centavos(p.valor) }));
  const r = 44, volta = 2 * Math.PI * r;
  return (
    <div className={styles.inicio}>
      <section className={styles.hero}>
        <div className={styles.saudacao}>
          <h1>Olá, {nome}! 👋</h1>
          <p>Acompanhe suas empresas, certificados e notas capturadas em um só lugar.</p>
          <Link href="/notas/nfse" className={styles.botaoVazado}>Ver minhas notas <ArrowRight size={16} /></Link>
        </div>
        <svg className={styles.ondas} viewBox="0 0 600 220" preserveAspectRatio="none" aria-hidden>
          {Array.from({ length: 16 }, (_, i) => <path key={i} d={`M0 ${190 - i * 2} C150 ${180 - i * 5}, 250 ${170 + i * 3}, 340 ${100 + i * 4} S520 ${10 + i * 7}, 600 ${50 + i * 6}`} fill="none" stroke="var(--hero-wave)" strokeOpacity={0.05 + i * 0.022} />)}
        </svg>
        <div className={styles.novidade}>
          <span className={styles.selo}>★ Captura</span>
          <h2>{pessoa?.organization?.internal ? "NFS-e, NF-e e CT-e direto do certificado" : "NFS-e direto do certificado"}</h2>
          <p>Em lote, com histórico e XML guardados.</p>
          <Link href="/notas/nfse" className={styles.botaoCheio}>Capturar agora <ArrowRight size={16} /></Link>
        </div>
      </section>

      <section className={styles.indicadores} aria-label="Indicadores">
        <Indicador icone={Building2} cor="var(--tom-1)" fundo="var(--tom-1-fundo)" rotulo="Empresas Atendidas" valor={String(d.empresas)} href="/empresas" />
        <Indicador icone={FileText} cor="var(--tom-2)" fundo="var(--tom-2-fundo)" rotulo="Notas Capturadas (Mês)" valor={d.notasMes.toLocaleString("pt-BR")} variacao={d.notasVariacao} serie={d.serie.map((p) => p.notas)} href="/notas/nfse" />
        <Indicador icone={CircleDollarSign} cor="var(--tom-3)" fundo="var(--tom-3-fundo)" rotulo="Serviços Prestados (Mês)" valor={brl(centavos(d.servicosMes))} variacao={d.servicosVariacao} serie={pontos.map((p) => p.centavos)} href="/notas/nfse" />
        <Indicador icone={TriangleAlert} cor="#F2780C" fundo="#FFE9D6" rotulo="Pendências Fiscais" valor={String(d.pendencias)} onClick={() => setPendencias(true)} />
      </section>

      <section className={styles.meio}>
        <article className={styles.cartao}>
          <header className={styles.cab}><h2>Empresas que pedem atenção</h2><span className={styles.periodo}>{d.atencao.total} de {d.empresas}</span></header>
          {d.atencao.lista.length ? <ul className={styles.atencao}>{d.atencao.lista.map((e) => <li key={e.id}><Link href={`/notas/nfse?empresa=${e.id}`}>
            <i className={styles[`grau${e.grau}`]} aria-hidden /><span><b>{e.razao || formatarCnpj(e.cnpj)}</b><small>{e.motivo}</small></span><ArrowRight size={16} aria-hidden />
          </Link></li>)}</ul> : <p className={styles.vazio}>Tudo em dia: certificados válidos e capturas recentes em todas as empresas.</p>}
          {d.atencao.total > d.atencao.lista.length && <Link href="/notas/nfse" className={styles.verTodas}>Ver todas na captura de NFS-e</Link>}
        </article>
        <article className={styles.escuro}>
          <header className={styles.cab}><h2>Saúde da Captura</h2><Link href="/notas/nfse">Ver todas <ArrowRight size={14} /></Link></header>
          <div className={styles.saude}>
            <svg viewBox="0 0 110 110" className={styles.anel} role="img" aria-label={`${d.saude.percentual}% das empresas aptas`}><circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="9" /><circle cx="55" cy="55" r={r} fill="none" stroke="var(--color-brand)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(d.saude.percentual / 100) * volta} ${volta}`} transform="rotate(-90 55 55)" /><text x="55" y="55" textAnchor="middle" className={styles.anelValor}>{d.saude.percentual}%</text><text x="55" y="71" textAnchor="middle" className={styles.anelRotulo}>aptas</text></svg>
            <ul>{d.saude.itens.map((i) => { const I = i.ok ? CheckCircle2 : CircleAlert; return <li key={i.nome}><I size={18} className={i.ok ? styles.okIcone : styles.alertaIcone} aria-hidden /><span>{i.nome}</span><em className={i.ok ? styles.ok : styles.alerta}>{i.detalhe}</em></li>; })}</ul>
          </div>
        </article>
        <article className={styles.cartao}>
          <header className={styles.cab}><h2><Zap size={20} className={styles.raio} aria-hidden /> Acesso Rápido</h2></header>
          <div className={styles.atalhos}>{ATALHOS.filter((a) => pessoa?.permissions.includes(a.exige) && (pessoa.organization?.internal || a.href !== "/notas/nfe-cte")).map((a) => { const I = a.icone; return <Link key={a.href + a.nome} href={a.href}><I size={26} aria-hidden /><span>{a.nome}</span></Link>; })}</div>
        </article>
      </section>

      <section className={styles.fim}>
        <article className={styles.cartao}>
          <header className={styles.cab}><h2><Users size={20} aria-hidden /> Equipe online</h2><span className={styles.periodo}>{d.online.length}</span></header>
          {d.online.length ? <ul className={styles.online}>{d.online.map((u) => <li key={u.id}>{u.avatar ? <img src={u.avatar} alt="" /> : <span className={styles.iniciais}>{u.nome.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}</span>}<b>{u.nome}</b><i aria-label="online" /></li>)}</ul> : <p className={styles.vazio}>Ninguém online agora.</p>}
        </article>
        <article className={styles.cartao}>
          <header className={styles.cab}><h2><TriangleAlert size={20} aria-hidden /> Pendências</h2></header>
          {d.pendenciasLista.length ? <ul className={styles.atividade}>{d.pendenciasLista.slice(0, 5).map((p) => <li key={p.texto}><i className={styles.pontoAlerta} aria-hidden /><Link href={p.rota}>{p.texto}</Link></li>)}</ul> : <p className={styles.vazio}>Nenhuma pendência.</p>}
        </article>
      </section>
      <Modal aberto={pendencias} titulo="Pendências" largura="sm" onFechar={() => setPendencias(false)}>
        {d.pendenciasLista.length ? <div className={styles.listaPendencias}>{d.pendenciasLista.map((p) => <Link key={p.texto} href={p.rota}>{p.texto}</Link>)}</div> : <p>Nenhuma pendência.</p>}
      </Modal>
    </div>
  );
}
