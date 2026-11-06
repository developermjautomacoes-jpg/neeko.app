"use client";
import { KeyRound, Link2, PauseCircle, Pencil, PlayCircle, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, ConfirmDialog, DataTable, Input, KpiCard, Loading, Modal, Notice, PageHeader, Select, useToast, IconButton } from "@neeko/ui";
import { formatarCnpj } from "@/lib/format";
import { alterarEscritorio, criarEscritorio, excluirEscritorio, listarEscritorios, listarPlanos, redefinirGestor, situacaoEscritorio, type Escritorio, type Plano } from "@/services/conta";
import styles from "../../pagina.module.css";

interface F { id?: string; slug: string; name: string; cnpj: string; contactEmail: string; contactPhone: string; planId: string; billingExempt: boolean; bpo: boolean; paidUntil: string; notes: string; gestorNome: string; gestorEmail: string; senhaProvisoria: string }
const vazio: F = { slug: "", name: "", cnpj: "", contactEmail: "", contactPhone: "", planId: "", billingExempt: false, bpo: false, paidUntil: "", notes: "", gestorNome: "", gestorEmail: "", senhaProvisoria: "" };
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const cents = (v: string) => Math.round(Number(v) * 100);
const dataBr = (d: string) => d.split("-").reverse().join("/");
const semCobranca = (e: Escritorio) => e.billingExempt || (!!e.planId && cents(e.mensalidade) === 0);
const hoje = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);

export default function Escritorios() {
  const avisar = useToast();
  const [lista, setLista] = useState<Escritorio[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [f, setF] = useState<F | null>(null);
  const [suspender, setSuspender] = useState<Escritorio | null>(null);
  const [reset, setReset] = useState<Escritorio | null>(null);
  const [senha, setSenha] = useState("");
  const [excluir, setExcluir] = useState<Escritorio | null>(null);
  const [nomeConfirma, setNomeConfirma] = useState("");
  const carregar = useCallback(async () => { try { const [e, p] = await Promise.all([listarEscritorios(), listarPlanos()]); setLista(e); setPlanos(p); } catch (x) { setErro(x instanceof Error ? x.message : "Não foi possível carregar."); } finally { setCarregando(false); } }, []);
  useEffect(() => { void carregar(); }, [carregar]);
  const clientes = useMemo(() => lista.filter((e) => !e.internal), [lista]);
  const ativos = clientes.filter((e) => e.status === "ACTIVE"), cobrados = ativos.filter((e) => !semCobranca(e)), mrr = cobrados.reduce((t, e) => t + cents(e.mensalidade), 0), vencidos = cobrados.filter((e) => e.paidUntil && e.paidUntil < hoje()).length;
  async function salvar() {
    if (!f) return;
    const base = { slug: f.slug, name: f.name, cnpj: f.cnpj, contactEmail: f.contactEmail, contactPhone: f.contactPhone, planId: f.planId || null, billingExempt: f.billingExempt, modules: f.bpo ? ["bpo"] : [], paidUntil: f.paidUntil, notes: f.notes };
    try { if (f.id) await alterarEscritorio(f.id, base); else await criarEscritorio({ ...base, gestorNome: f.gestorNome, gestorEmail: f.gestorEmail, senhaProvisoria: f.senhaProvisoria }); setF(null); await carregar(); avisar("Escritório salvo.", "sucesso"); }
    catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível salvar.", "erro"); }
  }
  async function copiar(e: Escritorio) { const link = `${window.location.origin}/e/${e.slug}`; try { await navigator.clipboard.writeText(link); avisar("Link copiado.", "sucesso"); } catch { avisar(link, "sucesso"); } }
  async function trocar(e: Escritorio, status: string) { try { await situacaoEscritorio(e.id, status); await carregar(); avisar(status === "ACTIVE" ? "Escritório reativado." : "Escritório suspenso.", "sucesso"); } catch (x) { avisar(x instanceof Error ? x.message : "Erro.", "erro"); } finally { setSuspender(null); } }
  async function apagar() { if (!excluir) return; try { await excluirEscritorio(excluir.id, nomeConfirma); setExcluir(null); setNomeConfirma(""); await carregar(); avisar("Escritório excluído.", "sucesso"); } catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível excluir.", "erro"); } }
  async function redefinir() { if (!reset) return; try { await redefinirGestor(reset.id, senha); setReset(null); setSenha(""); avisar("Senha provisória definida. O gestor troca a senha no próximo acesso.", "sucesso"); } catch (x) { avisar(x instanceof Error ? x.message : "Erro.", "erro"); } }
  return <>
    <PageHeader titulo="Escritórios" descricao="Escritórios que usam a Neeko. Aqui aparecem só dados gerenciais, sem notas, memorandos, finanças ou certificados dos clientes." acoes={<Button variante="primary" onClick={() => setF({ ...vazio })}>Novo escritório</Button>} />
    {erro && <Notice tom="erro">{erro}</Notice>}
    <div className={styles.kpis}><KpiCard rotulo="Escritórios ativos" valor={ativos.length} /><KpiCard rotulo="Suspensos" valor={clientes.length - ativos.length} /><KpiCard rotulo="Mensalidades ativas" valor={brl(mrr)} /><KpiCard rotulo="Pagamento vencido" valor={vencidos} /></div>
    <Card semPadding titulo="Lista de escritórios">{carregando ? <Loading /> : <DataTable linhas={lista} chaveLinha={(e) => e.id} vazio="Nenhum escritório."
      colunas={[
        { chave: "n", titulo: "Escritório", render: (e) => <><b>{e.name}</b>{e.internal && <> <Badge>Neeko</Badge></>}{semCobranca(e) && <> <Badge tom="sucesso">Piloto · sem cobrança</Badge></>}<br /><small>{formatarCnpj(e.cnpj)}</small></> },
        { chave: "g", titulo: "Gestor", render: (e) => <>{e.gestor}<br /><small>{e.gestorEmail}</small></> },
        { chave: "p", titulo: "Plano", render: (e) => e.plano || "—" },
        { chave: "u", titulo: "Uso", render: (e) => <small>{e.empresas}{e.maxCompanies !== null ? ` de ${e.maxCompanies}` : ""} empresas<br />{e.usuarios} usuários<br />{e.emUso}{e.maxUsers !== null ? ` de ${e.maxUsers}` : ""} em uso agora</small> },
        { chave: "v", titulo: "Pago até", render: (e) => (e.paidUntil ? (e.paidUntil < hoje() && !e.internal && !semCobranca(e) ? <Badge tom="perigo">{dataBr(e.paidUntil)}</Badge> : dataBr(e.paidUntil)) : "—") },
        { chave: "s", titulo: "Situação", render: (e) => <Badge tom={e.status === "ACTIVE" ? "sucesso" : "perigo"}>{e.status === "ACTIVE" ? "ativo" : "suspenso"}</Badge> },
        { chave: "a", titulo: "", alinhar: "direita", render: (e) => <div className={styles.acoes}><IconButton dica="Editar" icone={<Pencil size={16} />} onClick={() => setF({ ...vazio, id: e.id, slug: e.slug, name: e.name, cnpj: e.cnpj, contactEmail: e.contactEmail, contactPhone: e.contactPhone, planId: e.planId ?? "", billingExempt: e.billingExempt, bpo: e.modules.includes("bpo"), paidUntil: e.paidUntil, notes: e.notes })} />
          {!e.internal && <IconButton dica="Copiar link do escritório" icone={<Link2 size={16} />} onClick={() => void copiar(e)} />}
          {!e.internal && <IconButton dica="Reiniciar senha" icone={<KeyRound size={16} />} onClick={() => setReset(e)} />}
          {!e.internal && (e.status === "ACTIVE" ? <IconButton dica="Suspender" variante="danger" icone={<PauseCircle size={16} />} onClick={() => setSuspender(e)} /> : <IconButton dica="Reativar" icone={<PlayCircle size={16} />} onClick={() => void trocar(e, "ACTIVE")} />)}
          {!e.internal && <IconButton dica="Excluir" variante="danger" icone={<Trash2 size={16} />} onClick={() => setExcluir(e)} />}</div> },
      ]} />}</Card>
    <Modal aberto={!!f} largura="lg" titulo={f?.id ? "Editar escritório" : "Novo escritório"} onFechar={() => setF(null)} rodape={<><Button onClick={() => setF(null)}>Voltar</Button><Button variante="primary" onClick={salvar}>Salvar</Button></>}>
      {f && <div className={styles.form}><div className={styles.colunas}><Input rotulo="Nome do escritório" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /><Input rotulo="CNPJ" value={f.cnpj} onChange={(e) => setF({ ...f, cnpj: e.target.value })} /><Input rotulo="E-mail de contato" value={f.contactEmail} onChange={(e) => setF({ ...f, contactEmail: e.target.value })} /><Input rotulo="Telefone" value={f.contactPhone} onChange={(e) => setF({ ...f, contactPhone: e.target.value })} />
        <Select rotulo="Plano" value={f.planId} onChange={(e) => setF({ ...f, planId: e.target.value })}><option value="">Sem plano</option>{planos.filter((p) => p.active || p.id === f.planId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select><Input rotulo="Pago até" type="date" value={f.paidUntil} onChange={(e) => setF({ ...f, paidUntil: e.target.value })} /></div>
        <Input rotulo="Link do escritório (depois de /e/)" placeholder="Gerado pelo nome, se ficar em branco" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} />
        <label className={styles.check}><input type="checkbox" checked={f.billingExempt} onChange={(e) => setF({ ...f, billingExempt: e.target.checked })} /> Cliente piloto, sem cobrança</label>
        <label className={styles.check}><input type="checkbox" checked={f.bpo} onChange={(e) => setF({ ...f, bpo: e.target.checked })} /> Liberar módulo BPO Financeiro</label>
        <Input rotulo="Observações" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        {!f.id && <><p className={styles.titulo}>Gestor do escritório</p><div className={styles.colunas}><Input rotulo="Nome do gestor" value={f.gestorNome} onChange={(e) => setF({ ...f, gestorNome: e.target.value })} /><Input rotulo="E-mail de acesso" type="email" value={f.gestorEmail} onChange={(e) => setF({ ...f, gestorEmail: e.target.value })} /><Input rotulo="Senha provisória" autoComplete="off" dica="Ao menos 10 caracteres, com letras e números." value={f.senhaProvisoria} onChange={(e) => setF({ ...f, senhaProvisoria: e.target.value })} /></div></>}</div>}
    </Modal>
    <ConfirmDialog aberto={!!suspender} titulo="Suspender escritório" confirmar="Suspender" perigo onCancelar={() => setSuspender(null)} onConfirmar={() => { if (suspender) void trocar(suspender, "SUSPENDED"); }}><p>A equipe de <b>{suspender?.name}</b> perde o acesso, e a captura noturna para. Os dados continuam guardados.</p></ConfirmDialog>
    <Modal aberto={!!reset} largura="sm" titulo="Reiniciar senha provisória" onFechar={() => { setReset(null); setSenha(""); }} rodape={<><Button onClick={() => { setReset(null); setSenha(""); }}>Voltar</Button><Button variante="primary" onClick={redefinir}>Reiniciar senha</Button></>}><div className={styles.form}><p>Gestor: <b>{reset?.gestor}</b> ({reset?.gestorEmail}). Ele entra com esta senha e cria uma nova no próximo acesso.</p><Input rotulo="Nova senha provisória" autoComplete="off" value={senha} onChange={(e) => setSenha(e.target.value)} /></div></Modal>
    <ConfirmDialog aberto={!!excluir} titulo="Excluir escritório" confirmar="Excluir definitivamente" perigo onCancelar={() => { setExcluir(null); setNomeConfirma(""); }} onConfirmar={() => void apagar()}><div className={styles.form}><Notice tom="erro">Esta ação não pode ser desfeita. Serão apagados os usuários, empresas, memorandos, notas e certificados de <b>{excluir?.name}</b>.</Notice><Input rotulo="Digite o nome do escritório para confirmar" autoComplete="off" value={nomeConfirma} onChange={(e) => setNomeConfirma(e.target.value)} /></div></ConfirmDialog>
  </>;
}
