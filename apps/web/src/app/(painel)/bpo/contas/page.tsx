"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Check, CircleDollarSign, Paperclip, Pencil, Plus, Undo2, X } from "lucide-react";
import { Badge, Button, Card, ConfirmDialog, DataTable, IconButton, Input, KpiCard, Loading, Modal, Notice, PageHeader, Select, Textarea, useToast } from "@neeko/ui";
import { SeletorEmpresa, hojeIso, moeda, paraCampo, paraValor, useEmpresaBpo } from "@/features/bpo/comum";
import { arquivoParaBase64, centavos, dataBr } from "@/lib/format";
import { eu } from "@/services/conta";
import { alterarLancamento, anexarArquivo, baixarLancamento, cancelarLancamento, criarLancamento, decidirLancamento, estornarLancamento, lerCadastros, listarLancamentos, urlAnexo, type Cadastros, type Lancamento, type Tipo } from "@/services/bpo";
import styles from "@/features/bpo/bpo.module.css";

const SITUACAO: Record<string, [string, "neutro" | "sucesso" | "alerta" | "perigo"]> = { aberto: ["Em aberto", "neutro"], aguardando: ["Aguardando aprovação", "alerta"], pago: ["Pago", "sucesso"], cancelado: ["Cancelado", "neutro"], rejeitado: ["Rejeitado", "perigo"] };
interface Form { id?: string; kind: Tipo; description: string; partyName: string; partyDoc: string; docNumber: string; categoryId: string; costCenterId: string; accountId: string; issueDate: string; dueDate: string; valor: string; notes: string; parcelas: string; frequencia: string; erro: string }
const novoForm = (kind: Tipo): Form => ({ kind, description: "", partyName: "", partyDoc: "", docNumber: "", categoryId: "", costCenterId: "", accountId: "", issueDate: hojeIso(), dueDate: hojeIso(), valor: "", notes: "", parcelas: "1", frequencia: "mensal", erro: "" });
const somaC = (l: Lancamento[]) => l.reduce((t, x) => t + centavos(x.amount), 0);
const brl = (c: number) => moeda(`${c < 0 ? "-" : ""}${Math.floor(Math.abs(c) / 100)}.${String(Math.abs(c) % 100).padStart(2, "0")}`);

export default function ContasBpo() {
  const avisar = useToast();
  const { empresas, empresa, setEmpresa, erro: erroEmp, carregando: carregandoEmp } = useEmpresaBpo();
  const [kind, setKind] = useState<Tipo>("pagar");
  const [status, setStatus] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [busca, setBusca] = useState("");
  const [lista, setLista] = useState<Lancamento[]>([]);
  const [cad, setCad] = useState<Cadastros | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [perms, setPerms] = useState<string[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [baixa, setBaixa] = useState<{ l: Lancamento; data: string; valor: string; conta: string; erro: string } | null>(null);
  const [confirmar, setConfirmar] = useState<{ titulo: string; texto: string; acao: () => Promise<unknown> } | null>(null);
  useEffect(() => { eu().then((p) => setPerms(p.permissions)).catch(() => undefined); }, []);
  const pode = (p: string) => perms.includes(p);
  const carregar = useCallback(async () => {
    if (!empresa) return;
    setCarregando(true);
    try { const [l, c] = await Promise.all([listarLancamentos(empresa, { kind, status: status || undefined, de: de || undefined, ate: ate || undefined }), lerCadastros(empresa)]); setLista(l); setCad(c); setErro(""); }
    catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível carregar."); }
    finally { setCarregando(false); }
  }, [empresa, kind, status, de, ate]);
  useEffect(() => { void carregar(); }, [carregar]);
  const hoje = hojeIso();
  const vistos = useMemo(() => { const q = busca.trim().toLowerCase(); return lista.filter((x) => !q || `${x.description} ${x.partyName} ${x.docNumber}`.toLowerCase().includes(q)); }, [lista, busca]);
  const abertos = vistos.filter((x) => x.status === "aberto" || x.status === "aguardando");
  const nomeCat = (id: string | null) => cad?.categorias.find((c) => c.id === id)?.name ?? "";
  const categorias = cad?.categorias.filter((c) => c.kind === (form?.kind === "receber" ? "receita" : "despesa")) ?? [];

  async function salvar() {
    if (!form || !empresa) return;
    const amount = paraValor(form.valor);
    if (!amount || +amount <= 0) { setForm({ ...form, erro: "Informe um valor maior que zero, por exemplo 1.250,00." }); return; }
    setSalvando(true);
    const d = { kind: form.kind, description: form.description, partyName: form.partyName, partyDoc: form.partyDoc, docNumber: form.docNumber, categoryId: form.categoryId || null, costCenterId: form.costCenterId || null, accountId: form.accountId || null, issueDate: form.issueDate, dueDate: form.dueDate, amount, notes: form.notes };
    try {
      const r = form.id ? await alterarLancamento(empresa, form.id, d) : await criarLancamento(empresa, { ...d, parcelas: Math.max(1, +form.parcelas || 1), frequencia: form.frequencia });
      setForm(null); await carregar();
      avisar(r.status === "aguardando" ? "Lançamento salvo. Acima do limite: aguarda aprovação." : "Lançamento salvo.", "sucesso");
    } catch (e) { setForm({ ...form, erro: e instanceof Error ? e.message : "Não foi possível salvar." }); }
    finally { setSalvando(false); }
  }
  async function darBaixa() {
    if (!baixa || !empresa) return;
    const v = paraValor(baixa.valor);
    if (!v) { setBaixa({ ...baixa, erro: "Valor pago inválido." }); return; }
    if (!baixa.conta) { setBaixa({ ...baixa, erro: "Escolha a conta." }); return; }
    try { await baixarLancamento(empresa, baixa.l.id, { paidDate: baixa.data, paidAmount: v, accountId: baixa.conta }); setBaixa(null); await carregar(); avisar("Baixa registrada.", "sucesso"); }
    catch (e) { setBaixa({ ...baixa, erro: e instanceof Error ? e.message : "Não foi possível dar baixa." }); }
  }
  async function executar(fn: () => Promise<unknown>, ok: string) {
    try { await fn(); await carregar(); avisar(ok, "sucesso"); } catch (e) { avisar(e instanceof Error ? e.message : "Não foi possível concluir.", "erro"); }
  }
  async function anexar(l: Lancamento, arq: File | undefined) {
    if (!arq || !empresa) return;
    if (!["application/pdf", "image/png", "image/jpeg"].includes(arq.type)) { avisar("Envie PDF, PNG ou JPG.", "erro"); return; }
    if (arq.size > 5 * 1024 * 1024) { avisar("Envie um arquivo de até 5 MB.", "erro"); return; }
    await executar(async () => anexarArquivo(empresa, l.id, { name: arq.name, mime: arq.type, base64: await arquivoParaBase64(arq) }), "Arquivo anexado.");
  }
  const editar = (l: Lancamento) => setForm({ id: l.id, kind: l.kind, description: l.description, partyName: l.partyName, partyDoc: l.partyDoc, docNumber: l.docNumber, categoryId: l.categoryId ?? "", costCenterId: l.costCenterId ?? "", accountId: l.accountId ?? "", issueDate: l.issueDate, dueDate: l.dueDate, valor: paraCampo(l.amount), notes: l.notes, parcelas: "1", frequencia: "mensal", erro: "" });

  if (carregandoEmp) return <Loading />;
  const rotulo = kind === "pagar" ? "a pagar" : "a receber";
  return (
    <>
      <PageHeader titulo="Contas a pagar e a receber" descricao="Lançamentos, vencimentos, aprovações e baixas da empresa atendida." acoes={pode("finance.manage") && empresa ? <Button variante="primary" icone={<Plus size={16} />} onClick={() => setForm(novoForm(kind))}>Novo lançamento</Button> : undefined} />
      {erroEmp ? <Notice tom="alerta">{erroEmp}</Notice> : !empresas.length ? <Notice tom="info">Nenhuma empresa disponível para você. Peça acesso à administração do escritório.</Notice> : <>
        <div className={styles.barra}>
          <SeletorEmpresa empresas={empresas} empresa={empresa} onTrocar={setEmpresa} />
          <div className={styles.abas} role="group" aria-label="Tipo de conta">
            <button type="button" aria-pressed={kind === "pagar"} onClick={() => setKind("pagar")}>A pagar</button>
            <button type="button" aria-pressed={kind === "receber"} onClick={() => setKind("receber")}>A receber</button>
          </div>
        </div>
        {erro && <Notice tom="alerta">{erro}</Notice>}
        <div className={styles.kpis}>
          <KpiCard rotulo={`Em aberto ${rotulo}`} valor={brl(somaC(abertos))} detalhe={`${abertos.length} lançamento(s)`} />
          <KpiCard rotulo="Vencidos" valor={brl(somaC(abertos.filter((x) => x.dueDate < hoje)))} detalhe={`${abertos.filter((x) => x.dueDate < hoje).length} lançamento(s)`} />
          <KpiCard rotulo="Vencem em 7 dias" valor={brl(somaC(abertos.filter((x) => x.dueDate >= hoje && Date.parse(x.dueDate) - Date.parse(hoje) <= 7 * 864e5)))} />
          {kind === "pagar" && <KpiCard rotulo="Aguardando aprovação" valor={String(vistos.filter((x) => x.status === "aguardando").length)} detalhe={cad?.limiteAprovacao ? `Acima de ${moeda(cad.limiteAprovacao)}` : "Sem limite definido"} />}
          <KpiCard rotulo={kind === "pagar" ? "Pago" : "Recebido"} valor={brl(vistos.filter((x) => x.status === "pago").reduce((t, x) => t + centavos(x.paidAmount ?? x.amount), 0))} />
        </div>
        <Card semPadding>
          <div className={styles.filtros} style={{ paddingTop: "var(--space-4)" }}>
            <Select rotulo="Situação" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todas</option><option value="aberto">Em aberto</option><option value="vencido">Vencidas</option><option value="aguardando">Aguardando aprovação</option><option value="pago">{kind === "pagar" ? "Pagas" : "Recebidas"}</option><option value="cancelado">Canceladas</option><option value="rejeitado">Rejeitadas</option>
            </Select>
            <Input rotulo="Vencimento de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
            <Input rotulo="até" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
            <span />
            <Input rotulo="Buscar" placeholder="Descrição, fornecedor/cliente ou documento" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          {carregando && !lista.length ? <Loading /> : <DataTable
            linhas={vistos} chaveLinha={(x) => x.id} vazio={`Nenhuma conta ${rotulo} com esses filtros.`}
            linhaClasse={(x) => (x.status === "aberto" || x.status === "aguardando") && x.dueDate < hoje ? styles.vencido : undefined}
            colunas={[
              { chave: "v", titulo: "Vencimento", render: (x) => <>{dataBr(x.dueDate)}{x.installments > 1 && <span className={styles.sub}>Parcela {x.installment}/{x.installments}</span>}</> },
              { chave: "d", titulo: "Descrição", render: (x) => <><b>{x.description}</b><span className={styles.sub}>{[x.partyName, nomeCat(x.categoryId), x.docNumber && `Doc. ${x.docNumber}`].filter(Boolean).join(" · ")}</span>
                {!!x.attachments.length && <span className={styles.anexos}>{x.attachments.map((a) => <a key={a.id} href={urlAnexo(empresa, x.id, a.id)}>{a.name}</a>)}</span>}</> },
              { chave: "s", titulo: "Situação", render: (x) => <><Badge tom={(x.status === "aberto" || x.status === "aguardando") && x.dueDate < hoje ? "perigo" : SITUACAO[x.status][1]}>{(x.status === "aberto" || x.status === "aguardando") && x.dueDate < hoje ? "Vencido" : SITUACAO[x.status][0]}</Badge>
                {x.status === "pago" && <span className={styles.sub}>em {dataBr(x.paidDate)}</span>}{x.approvedByName && <span className={styles.sub}>{x.status === "rejeitado" ? "Rejeitado" : "Aprovado"} por {x.approvedByName}</span>}</> },
              { chave: "val", titulo: "Valor", alinhar: "direita", render: (x) => <span className={styles.valor}>{moeda(x.status === "pago" ? x.paidAmount ?? x.amount : x.amount)}</span> },
              { chave: "a", titulo: "", alinhar: "direita", render: (x) => <div className={styles.acoes}>
                {x.status === "aberto" && pode("finance.settle") && <IconButton dica={kind === "pagar" ? "Dar baixa (pago)" : "Dar baixa (recebido)"} icone={<CircleDollarSign size={16} />} onClick={() => setBaixa({ l: x, data: hoje, valor: paraCampo(x.amount), conta: x.accountId ?? cad?.contas[0]?.id ?? "", erro: "" })} />}
                {x.status === "aguardando" && pode("finance.approve") && <><IconButton dica="Aprovar pagamento" icone={<Check size={16} />} onClick={() => void executar(() => decidirLancamento(empresa, x.id, true), "Pagamento aprovado.")} /><IconButton dica="Rejeitar pagamento" icone={<X size={16} />} onClick={() => setConfirmar({ titulo: "Rejeitar pagamento", texto: `Rejeitar "${x.description}"?`, acao: () => decidirLancamento(empresa, x.id, false) })} /></>}
                {x.status === "pago" && pode("finance.settle") && <IconButton dica="Estornar baixa" icone={<Undo2 size={16} />} onClick={() => setConfirmar({ titulo: "Estornar baixa", texto: `A conta "${x.description}" volta para em aberto.`, acao: () => estornarLancamento(empresa, x.id) })} />}
                {pode("finance.manage") && x.status !== "cancelado" && <label className={styles.acoes} title="Anexar boleto ou comprovante"><IconButton dica="Anexar boleto ou comprovante" icone={<Paperclip size={16} />} onClick={(e) => (e.currentTarget.nextElementSibling as HTMLInputElement | null)?.click()} /><input type="file" hidden accept="application/pdf,image/png,image/jpeg" onChange={(e) => { void anexar(x, e.target.files?.[0]); e.target.value = ""; }} /></label>}
                {pode("finance.manage") && (x.status === "aberto" || x.status === "aguardando" || x.status === "rejeitado") && <><IconButton dica="Editar" icone={<Pencil size={16} />} onClick={() => editar(x)} /><IconButton dica="Cancelar lançamento" icone={<Ban size={16} />} onClick={() => setConfirmar({ titulo: "Cancelar lançamento", texto: `Cancelar "${x.description}"? Ele continua no histórico como cancelado.`, acao: () => cancelarLancamento(empresa, x.id) })} /></>}
              </div> },
            ]} />}
        </Card>
      </>}

      <Modal aberto={!!form} titulo={form?.id ? "Editar lançamento" : form?.kind === "receber" ? "Nova conta a receber" : "Nova conta a pagar"} onFechar={() => setForm(null)} largura="lg"
        rodape={<><Button onClick={() => setForm(null)}>Cancelar</Button><Button variante="primary" carregando={salvando} onClick={() => void salvar()}>Salvar</Button></>}>
        {form && <div className={styles.form}>
          {form.erro && <Notice tom="alerta">{form.erro}</Notice>}
          {!form.id && <div className={styles.abas} role="group" aria-label="Tipo">
            <button type="button" aria-pressed={form.kind === "pagar"} onClick={() => setForm({ ...form, kind: "pagar", categoryId: "" })}>A pagar</button>
            <button type="button" aria-pressed={form.kind === "receber"} onClick={() => setForm({ ...form, kind: "receber", categoryId: "" })}>A receber</button>
          </div>}
          <Input rotulo="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={form.kind === "pagar" ? "Ex.: Aluguel da sala" : "Ex.: Venda para cliente"} />
          <div className={styles.grade3}>
            <Input rotulo={form.kind === "pagar" ? "Fornecedor" : "Cliente"} value={form.partyName} onChange={(e) => setForm({ ...form, partyName: e.target.value })} />
            <Input rotulo="CNPJ/CPF" value={form.partyDoc} onChange={(e) => setForm({ ...form, partyDoc: e.target.value })} />
            <Input rotulo="Nº do documento" value={form.docNumber} onChange={(e) => setForm({ ...form, docNumber: e.target.value })} />
          </div>
          <div className={styles.grade3}>
            <Input rotulo="Valor (R$)" inputMode="decimal" placeholder="0,00" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
            <Input rotulo="Emissão" type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
            <Input rotulo={form.id || form.parcelas === "1" ? "Vencimento" : "1º vencimento"} type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <div className={styles.grade3}>
            <Select rotulo="Categoria" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">Sem categoria</option>{categorias.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            <Select rotulo="Centro de custo" value={form.costCenterId} onChange={(e) => setForm({ ...form, costCenterId: e.target.value })}><option value="">Nenhum</option>{cad?.centros.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            <Select rotulo="Conta prevista" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}><option value="">Definir na baixa</option>{cad?.contas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          </div>
          {!form.id && <div className={styles.grade2}>
            <Input rotulo="Parcelas / repetições" type="number" min={1} max={120} value={form.parcelas} onChange={(e) => setForm({ ...form, parcelas: e.target.value })} dica="Cada parcela repete o valor informado." />
            <Select rotulo="Frequência" value={form.frequencia} disabled={form.parcelas === "1"} onChange={(e) => setForm({ ...form, frequencia: e.target.value })}><option value="mensal">Mensal</option><option value="quinzenal">Quinzenal</option><option value="semanal">Semanal</option><option value="anual">Anual</option></Select>
          </div>}
          <Textarea rotulo="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
        </div>}
      </Modal>

      <Modal aberto={!!baixa} titulo={kind === "pagar" ? "Registrar pagamento" : "Registrar recebimento"} onFechar={() => setBaixa(null)} largura="sm"
        rodape={<><Button onClick={() => setBaixa(null)}>Cancelar</Button><Button variante="primary" onClick={() => void darBaixa()}>Confirmar baixa</Button></>}>
        {baixa && <div className={styles.form}>
          {baixa.erro && <Notice tom="alerta">{baixa.erro}</Notice>}
          <p style={{ margin: 0 }}><b>{baixa.l.description}</b><span className={styles.sub}>Vencimento {dataBr(baixa.l.dueDate)} · {moeda(baixa.l.amount)}</span></p>
          {!cad?.contas.length && <Notice tom="info">Cadastre uma conta bancária ou caixa em BPO Financeiro › Cadastros.</Notice>}
          <Input rotulo="Data" type="date" value={baixa.data} onChange={(e) => setBaixa({ ...baixa, data: e.target.value })} />
          <Input rotulo="Valor pago (R$)" inputMode="decimal" value={baixa.valor} onChange={(e) => setBaixa({ ...baixa, valor: e.target.value })} dica="Ajuste se houve juros, multa ou desconto." />
          <Select rotulo="Conta" value={baixa.conta} onChange={(e) => setBaixa({ ...baixa, conta: e.target.value })}><option value="">Escolha</option>{cad?.contas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        </div>}
      </Modal>

      <ConfirmDialog aberto={!!confirmar} titulo={confirmar?.titulo ?? ""} confirmar={confirmar?.titulo.split(" ")[0] ?? "Confirmar"} perigo onCancelar={() => setConfirmar(null)} onConfirmar={() => { const c = confirmar; setConfirmar(null); if (c) void executar(c.acao, "Feito."); }}>{confirmar?.texto}</ConfirmDialog>
    </>
  );
}
