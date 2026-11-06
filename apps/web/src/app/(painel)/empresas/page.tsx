"use client";
import { Ban, Eye, FileText, FileType, LogOut, Pencil, RotateCcw, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, ConfirmDialog, DataTable, Input, Loading, Modal, Notice, PageHeader, Select, useToast, IconButton } from "@neeko/ui";
import { baixarMemo } from "@/features/memorandos/documentos";
import { MOTIVOS_SAIDA, br, fmtCnpj, hojeISO, type Memo } from "@/features/memorandos/regras";
import { eu } from "@/services/conta";
import { lerMemorando, listarMemorandos, situacaoCliente, situacaoMemorando, type MemorandoResumo } from "@/services/fiscal";
import styles from "../pagina.module.css";

type Filtro = "ativos" | "inativos" | "cancelado" | "";
type Acao = { tipo: "cancelar" | "reativar" | "voltou"; m: MemorandoResumo };

export default function Empresas() {
  const router = useRouter();
  const avisar = useToast();
  const [lista, setLista] = useState<MemorandoResumo[]>([]);
  const [sem, setSem] = useState<{ cnpj: string; legalName: string }[]>([]);
  const [pode, setPode] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [ano, setAno] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("ativos");
  const [acao, setAcao] = useState<Acao | null>(null);
  const [saida, setSaida] = useState<MemorandoResumo | null>(null);
  const [form, setForm] = useState({ dataSaida: hojeISO(), motivo: MOTIVOS_SAIDA[0], obs: "" });
  const [salvando, setSalvando] = useState("");
  const carregar = useCallback(async () => {
    try { const r = await listarMemorandos(); setLista(r.memorandos); setSem(r.semMemorando); setErro(""); }
    catch (x) { setErro(x instanceof Error ? x.message : "Não foi possível carregar."); }
    finally { setCarregando(false); }
  }, []);
  useEffect(() => { void carregar(); eu().then((p) => setPode(p.permissions.includes("memoranda.manage"))).catch(() => undefined); }, [carregar]);
  const anos = useMemo(() => [...new Set(lista.map((m) => m.ano))].sort((a, b) => b - a), [lista]);
  const vistos = useMemo(() => {
    const q = busca.trim().toLowerCase(), n = q.replace(/\D/g, "");
    return lista.filter((m) => (!ano || String(m.ano) === ano) && (filtro === "" || (filtro === "cancelado" ? m.status === "cancelado" : m.status !== "cancelado" && m.clientStatus === (filtro === "ativos" ? "ativa" : "inativa"))) && (!q || `${m.numero} ${m.razao} ${m.fantasia} ${m.regime} ${m.responsaveis.join(" ")}`.toLowerCase().includes(q) || (n.length >= 4 && m.cnpj.includes(n))));
  }, [lista, busca, ano, filtro]);
  async function executar(fn: () => Promise<unknown>, ok: string) {
    try { await fn(); avisar(ok, "sucesso"); await carregar(); }
    catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível concluir.", "erro"); }
    finally { setAcao(null); setSaida(null); }
  }
  async function documento(m: MemorandoResumo, tipo: "pdf" | "docx") {
    setSalvando(`${m.id}${tipo}`);
    try { const c = await lerMemorando(m.id); await baixarMemo(tipo, c.data as Memo, c.seq, c.ano, c.status === "cancelado"); }
    catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível gerar o arquivo.", "erro"); }
    finally { setSalvando(""); }
  }
  const textos = acao && { cancelar: ["Cancelar memorando", "Cancelar memorando", "O número continua reservado, e a empresa sai das capturas. As notas guardadas continuam."], reativar: ["Reativar memorando", "Reativar", "O memorando volta a valer, e a empresa volta às capturas."], voltou: ["Cliente voltou", "Reativar cliente", "A saída registrada é apagada, e a empresa volta às capturas."] }[acao.tipo];
  return (
    <>
      <PageHeader titulo="Empresas" descricao="Cadastro único: o preenchimento gera o memorando, coloca a empresa na carteira e libera a captura de notas."
        acoes={pode && <Link href="/empresas/nova" className={styles.botao}>Nova empresa</Link>} />
      {erro && <Notice tom="erro">{erro}</Notice>}
      {sem.length > 0 && <Notice tom="alerta">{sem.length} empresa(s) com cadastro incompleto: {sem.slice(0, 5).map((e, i) => <span key={e.cnpj}>{i > 0 && ", "}{pode ? <Link href={`/empresas/nova?cnpj=${e.cnpj}`}>{e.legalName || fmtCnpj(e.cnpj)}</Link> : e.legalName}</span>)}{sem.length > 5 ? "…" : ""}</Notice>}
      <div className={styles.filtros}>
        <Input rotulo="Pesquisar" type="search" placeholder="Número, empresa, CNPJ, regime ou responsável" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <Select rotulo="Ano" value={ano} onChange={(e) => setAno(e.target.value)}><option value="">Todos</option>{anos.map((a) => <option key={a}>{a}</option>)}</Select>
        <Select rotulo="Situação" value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)}><option value="ativos">Clientes ativos</option><option value="inativos">Clientes que saíram</option><option value="cancelado">Cadastros cancelados</option><option value="">Todos</option></Select>
      </div>
      <Card semPadding titulo={`${vistos.length} de ${lista.length} empresas`}>
        {carregando ? <Loading /> : <DataTable linhas={vistos} chaveLinha={(m) => m.id} vazio={lista.length ? "Nenhuma empresa para essa pesquisa." : "Cadastre a primeira empresa."}
          colunas={[
            { chave: "n", titulo: "Nº", render: (m) => <><b>{m.numero}</b><br /><small>{br(m.data)}</small></> },
            { chave: "e", titulo: "Empresa", render: (m) => <><b>{m.razao}</b><br /><small>{fmtCnpj(m.cnpj)}</small></> },
            { chave: "r", titulo: "Regime", render: (m) => m.regime || "—" },
            { chave: "s", titulo: "Situação", render: (m) => m.status === "cancelado" ? <Badge tom="perigo">cancelado</Badge> : m.clientStatus === "inativa" ? <><Badge tom="alerta">saiu</Badge><br /><small>{br(m.exitDate)}</small></> : <Badge tom="sucesso">ativo</Badge> },
            { chave: "a", titulo: "", alinhar: "direita", render: (m) => <div className={styles.acoes}>
              <IconButton dica={pode ? "Editar" : "Visualizar"} icone={pode ? <Pencil size={16} /> : <Eye size={16} />} onClick={() => router.push(`/empresas/${m.id}`)} />
              <IconButton dica="Exportar memorando em PDF" icone={<FileText size={16} />} carregando={salvando === `${m.id}pdf`} onClick={() => documento(m, "pdf")} />
              <IconButton dica="Exportar memorando em Word" icone={<FileType size={16} />} carregando={salvando === `${m.id}docx`} onClick={() => documento(m, "docx")} />
              {pode && m.status === "ativo" && (m.clientStatus === "ativa" ? <IconButton dica="Registrar saída do cliente" icone={<LogOut size={16} />} onClick={() => { setForm({ dataSaida: hojeISO(), motivo: MOTIVOS_SAIDA[0], obs: "" }); setSaida(m); }} /> : <IconButton dica="Cliente voltou" icone={<Undo2 size={16} />} onClick={() => setAcao({ tipo: "voltou", m })} />)}
              {pode && (m.status === "ativo" ? <IconButton dica="Cancelar cadastro" variante="danger" icone={<Ban size={16} />} onClick={() => setAcao({ tipo: "cancelar", m })} /> : <IconButton dica="Reativar cadastro" icone={<RotateCcw size={16} />} onClick={() => setAcao({ tipo: "reativar", m })} />)}
            </div> },
          ]} />}
      </Card>
      <ConfirmDialog aberto={!!acao} titulo={textos ? `${textos[0]} · Nº ${acao?.m.numero}` : ""} confirmar={textos?.[1] ?? ""} perigo={acao?.tipo === "cancelar"} onCancelar={() => setAcao(null)}
        onConfirmar={() => { if (!acao) return; const { tipo, m } = acao; void executar(() => (tipo === "voltou" ? situacaoCliente(m.id, { situacao: "ativa" }) : situacaoMemorando(m.id, tipo === "cancelar" ? "cancelado" : "ativo")), "Situação atualizada."); }}>
        <p><b>{acao?.m.razao}</b></p><p>{textos?.[2]}</p>
      </ConfirmDialog>
      <Modal aberto={!!saida} titulo="Registrar saída do cliente" onFechar={() => setSaida(null)} rodape={<><Button onClick={() => setSaida(null)}>Voltar</Button><Button variante="primary" onClick={() => { if (saida) void executar(() => situacaoCliente(saida.id, { situacao: "inativa", ...form }), "Saída registrada."); }}>Registrar saída</Button></>}>
        <div className={styles.form}>
          <p><b>{saida?.razao}</b> sai das capturas. As notas guardadas continuam.</p>
          <Input rotulo="Data de saída" type="date" value={form.dataSaida} onChange={(e) => setForm({ ...form, dataSaida: e.target.value })} />
          <Select rotulo="Motivo" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })}>{MOTIVOS_SAIDA.map((m) => <option key={m}>{m}</option>)}</Select>
          <Input rotulo="Observação" value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} />
        </div>
      </Modal>
    </>
  );
}
