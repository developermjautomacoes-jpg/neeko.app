"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownUp, History, Pencil, Plus } from "lucide-react";
import { Badge, Button, Card, DataTable, IconButton, Input, KpiCard, Loading, Modal, Notice, PageHeader, Select, useToast } from "@neeko/ui";
import { SeletorEmpresa, hojeIso, moeda, useEmpresaBpo } from "@/features/bpo/comum";
import { centavos, dataBr } from "@/lib/format";
import { eu } from "@/services/conta";
import { listarItens, listarMovimentos, movimentar, salvarItem, type ItemEstoque, type Movimento } from "@/services/bpo";
import styles from "@/features/bpo/bpo.module.css";

const num = (t: string) => { let s = t.trim().replace(/\s/g, ""); if (s.includes(",")) s = s.replace(/\./g, "").replace(",", "."); return s; };
const qtdBr = (v: string) => { const [i, d = ""] = v.split("."); const dd = d.replace(/0+$/, ""); return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}${dd ? `,${dd}` : ""}`; };
const TIPOS: Record<string, string> = { entrada: "Entrada", saida: "Saída", ajuste: "Ajuste de contagem" };

export default function Estoque() {
  const avisar = useToast();
  const { empresas, empresa, setEmpresa, erro: erroEmp, carregando: carregandoEmp } = useEmpresaBpo();
  const [itens, setItens] = useState<ItemEstoque[] | null>(null);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [so, setSo] = useState("ativos");
  const [perms, setPerms] = useState<string[]>([]);
  const [item, setItem] = useState<{ id?: string; code: string; name: string; unit: string; minQty: string; active: boolean; erro: string } | null>(null);
  const [mov, setMov] = useState<{ i: ItemEstoque; type: string; qty: string; unitCost: string; date: string; note: string; erro: string } | null>(null);
  const [hist, setHist] = useState<{ i: ItemEstoque; l: Movimento[] | null } | null>(null);
  useEffect(() => { eu().then((p) => setPerms(p.permissions)).catch(() => undefined); }, []);
  const carregar = useCallback(async () => { if (!empresa) return; try { setItens(await listarItens(empresa)); setErro(""); } catch (e) { setErro(e instanceof Error ? e.message : "Erro."); setItens([]); } }, [empresa]);
  useEffect(() => { setItens(null); void carregar(); }, [carregar]);
  const vistos = useMemo(() => { const q = busca.trim().toLowerCase(); return (itens ?? []).filter((i) => (so === "todos" || (so === "ativos" ? i.active : so === "baixo" ? i.active && +i.qty <= +i.minQty && +i.minQty > 0 : !i.active)) && (!q || `${i.code} ${i.name}`.toLowerCase().includes(q))); }, [itens, busca, so]);
  const ativos = (itens ?? []).filter((i) => i.active), baixos = ativos.filter((i) => +i.minQty > 0 && +i.qty <= +i.minQty);
  const total = ativos.reduce((t, i) => t + centavos(i.valor), 0);
  const gere = perms.includes("stock.manage");

  async function salvar() {
    if (!item) return;
    try { await salvarItem(empresa, item.id, { code: item.code.trim(), name: item.name.trim(), unit: item.unit.trim().toUpperCase() || "UN", minQty: num(item.minQty) || "0", active: item.active }); setItem(null); await carregar(); avisar("Item salvo.", "sucesso"); }
    catch (e) { setItem({ ...item, erro: e instanceof Error ? e.message : "Erro." }); }
  }
  async function movimentarItem() {
    if (!mov) return;
    try { await movimentar(empresa, mov.i.id, { type: mov.type, qty: num(mov.qty), unitCost: mov.type === "entrada" ? num(mov.unitCost) || "0" : "0", date: mov.date, note: mov.note }); setMov(null); await carregar(); avisar("Movimento registrado.", "sucesso"); }
    catch (e) { setMov({ ...mov, erro: e instanceof Error ? e.message : "Erro." }); }
  }
  async function abrirHistorico(i: ItemEstoque) { setHist({ i, l: null }); try { setHist({ i, l: await listarMovimentos(empresa, i.id) }); } catch (e) { avisar(e instanceof Error ? e.message : "Erro.", "erro"); setHist(null); } }

  if (carregandoEmp) return <Loading />;
  return (
    <>
      <PageHeader titulo="Estoque" descricao="Saldo, custo médio e movimentos dos itens da empresa." acoes={gere && empresa ? <Button variante="primary" icone={<Plus size={16} />} onClick={() => setItem({ code: "", name: "", unit: "UN", minQty: "0", active: true, erro: "" })}>Novo item</Button> : undefined} />
      {erroEmp ? <Notice tom="alerta">{erroEmp}</Notice> : !empresas.length ? <Notice>Nenhuma empresa disponível para você.</Notice> : <>
        <div className={styles.barra}><SeletorEmpresa empresas={empresas} empresa={empresa} onTrocar={setEmpresa} /></div>
        {erro && <Notice tom="alerta">{erro}</Notice>}
        <div className={styles.kpis}>
          <KpiCard rotulo="Itens ativos" valor={String(ativos.length)} />
          <KpiCard rotulo="Abaixo do mínimo" valor={String(baixos.length)} />
          <KpiCard rotulo="Valor em estoque (custo médio)" valor={moeda(`${Math.floor(total / 100)}.${String(total % 100).padStart(2, "0")}`)} />
        </div>
        <Card semPadding>
          <div className={styles.filtros} style={{ paddingTop: "var(--space-4)" }}>
            <Select rotulo="Mostrar" value={so} onChange={(e) => setSo(e.target.value)}><option value="ativos">Ativos</option><option value="baixo">Abaixo do mínimo</option><option value="inativos">Inativos</option><option value="todos">Todos</option></Select>
            <span /><span /><span />
            <Input rotulo="Buscar" placeholder="Código ou nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          {!itens ? <Loading /> : <DataTable linhas={vistos} chaveLinha={(i) => i.id} vazio="Nenhum item." colunas={[
            { chave: "c", titulo: "Código", render: (i) => i.code },
            { chave: "n", titulo: "Item", render: (i) => <>{i.name}{!i.active && <> <Badge>Inativo</Badge></>}{i.active && +i.minQty > 0 && +i.qty <= +i.minQty && <> <Badge tom="alerta">Abaixo do mínimo</Badge></>}</> },
            { chave: "q", titulo: "Saldo", alinhar: "direita", render: (i) => <span className={styles.valor}>{qtdBr(i.qty)} {i.unit}</span> },
            { chave: "m", titulo: "Mínimo", alinhar: "direita", render: (i) => <span className={styles.valor}>{qtdBr(i.minQty)}</span> },
            { chave: "cm", titulo: "Custo médio", alinhar: "direita", render: (i) => <span className={styles.valor}>{moeda((+i.avgCost).toFixed(2))}</span> },
            { chave: "v", titulo: "Valor", alinhar: "direita", render: (i) => <span className={styles.valor}>{moeda(i.valor)}</span> },
            { chave: "a", titulo: "", alinhar: "direita", render: (i) => <div className={styles.acoes}>
              {gere && i.active && <IconButton dica="Entrada, saída ou ajuste" icone={<ArrowDownUp size={16} />} onClick={() => setMov({ i, type: "entrada", qty: "", unitCost: "", date: hojeIso(), note: "", erro: "" })} />}
              <IconButton dica="Histórico de movimentos" icone={<History size={16} />} onClick={() => void abrirHistorico(i)} />
              {gere && <IconButton dica="Editar item" icone={<Pencil size={16} />} onClick={() => setItem({ id: i.id, code: i.code, name: i.name, unit: i.unit, minQty: qtdBr(i.minQty), active: i.active, erro: "" })} />}
            </div> },
          ]} />}
        </Card>
      </>}

      <Modal aberto={!!item} titulo={item?.id ? "Editar item" : "Novo item"} onFechar={() => setItem(null)} largura="sm" rodape={<><Button onClick={() => setItem(null)}>Cancelar</Button><Button variante="primary" onClick={() => void salvar()}>Salvar</Button></>}>
        {item && <div className={styles.form}>
          {item.erro && <Notice tom="alerta">{item.erro}</Notice>}
          <div className={styles.grade2}><Input rotulo="Código" value={item.code} onChange={(e) => setItem({ ...item, code: e.target.value })} /><Input rotulo="Unidade" value={item.unit} maxLength={6} onChange={(e) => setItem({ ...item, unit: e.target.value })} /></div>
          <Input rotulo="Nome" value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} />
          <Input rotulo="Estoque mínimo" inputMode="decimal" value={item.minQty} onChange={(e) => setItem({ ...item, minQty: e.target.value })} dica="Abaixo disso o item aparece em alerta." />
          {item.id && <label className={styles.sub}><input type="checkbox" checked={item.active} onChange={(e) => setItem({ ...item, active: e.target.checked })} /> Item ativo</label>}
        </div>}
      </Modal>

      <Modal aberto={!!mov} titulo={mov ? `Movimentar: ${mov.i.name}` : ""} onFechar={() => setMov(null)} largura="sm" rodape={<><Button onClick={() => setMov(null)}>Cancelar</Button><Button variante="primary" onClick={() => void movimentarItem()}>Registrar</Button></>}>
        {mov && <div className={styles.form}>
          {mov.erro && <Notice tom="alerta">{mov.erro}</Notice>}
          <p className={styles.sub} style={{ margin: 0 }}>Saldo atual: {qtdBr(mov.i.qty)} {mov.i.unit} · custo médio {moeda((+mov.i.avgCost).toFixed(2))}</p>
          <Select rotulo="Tipo" value={mov.type} onChange={(e) => setMov({ ...mov, type: e.target.value })}>{Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          <div className={styles.grade2}>
            <Input rotulo={mov.type === "ajuste" ? "Quantidade contada" : "Quantidade"} inputMode="decimal" value={mov.qty} onChange={(e) => setMov({ ...mov, qty: e.target.value })} />
            {mov.type === "entrada" ? <Input rotulo="Custo unitário (R$)" inputMode="decimal" value={mov.unitCost} onChange={(e) => setMov({ ...mov, unitCost: e.target.value })} /> : <Input rotulo="Data" type="date" value={mov.date} onChange={(e) => setMov({ ...mov, date: e.target.value })} />}
          </div>
          {mov.type === "entrada" && <Input rotulo="Data" type="date" value={mov.date} onChange={(e) => setMov({ ...mov, date: e.target.value })} />}
          <Input rotulo="Observação" value={mov.note} onChange={(e) => setMov({ ...mov, note: e.target.value })} placeholder="Ex.: NF 1234, inventário de novembro" />
        </div>}
      </Modal>

      <Modal aberto={!!hist} titulo={hist ? `Movimentos: ${hist.i.name}` : ""} onFechar={() => setHist(null)} largura="lg">
        {hist && (!hist.l ? <Loading /> : <DataTable linhas={hist.l} chaveLinha={(m) => m.id} vazio="Nenhum movimento." colunas={[
          { chave: "d", titulo: "Data", render: (m) => dataBr(m.date) },
          { chave: "t", titulo: "Tipo", render: (m) => TIPOS[m.type] },
          { chave: "q", titulo: "Quantidade", alinhar: "direita", render: (m) => `${qtdBr(m.qty)} ${hist.i.unit}` },
          { chave: "c", titulo: "Custo unit.", alinhar: "direita", render: (m) => moeda((+m.unitCost).toFixed(2)) },
          { chave: "n", titulo: "Observação", render: (m) => <>{m.note}<span className={styles.sub}>por {m.byName}</span></> },
        ]} />)}
      </Modal>
    </>
  );
}
