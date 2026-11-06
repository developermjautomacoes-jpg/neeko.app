"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EyeOff, Link2, Undo2, Upload } from "lucide-react";
import { Badge, Button, Card, DataTable, IconButton, Loading, Notice, PageHeader, Select, useToast } from "@neeko/ui";
import { SeletorEmpresa, moeda, useEmpresaBpo } from "@/features/bpo/comum";
import { dataBr } from "@/lib/format";
import { eu } from "@/services/conta";
import { conciliar, desfazerConciliacao, ignorarLinha, importarOfx, lerCadastros, lerExtrato, type ContaFin, type LinhaExtrato } from "@/services/bpo";
import styles from "@/features/bpo/bpo.module.css";

export default function Conciliacao() {
  const avisar = useToast();
  const { empresas, empresa, setEmpresa, erro: erroEmp, carregando: carregandoEmp } = useEmpresaBpo();
  const [contas, setContas] = useState<ContaFin[]>([]);
  const [conta, setConta] = useState("");
  const [linhas, setLinhas] = useState<LinhaExtrato[] | null>(null);
  const [filtro, setFiltro] = useState("pendentes");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [perms, setPerms] = useState<string[]>([]);
  useEffect(() => { eu().then((p) => setPerms(p.permissions)).catch(() => undefined); }, []);
  useEffect(() => { if (!empresa) return; setLinhas(null); lerCadastros(empresa).then((c) => { setContas(c.contas); setConta(c.contas[0]?.id ?? ""); setErro(""); }).catch((e: Error) => setErro(e.message)); }, [empresa]);
  const carregar = useCallback(async () => { if (!empresa || !conta) { setLinhas([]); return; } try { setLinhas(await lerExtrato(empresa, conta)); } catch (e) { setErro(e instanceof Error ? e.message : "Erro ao ler o extrato."); } }, [empresa, conta]);
  useEffect(() => { void carregar(); }, [carregar]);
  const vistas = useMemo(() => (linhas ?? []).filter((l) => filtro === "todas" || (filtro === "pendentes" ? !l.entryId && !l.ignored : filtro === "conciliadas" ? !!l.entryId : l.ignored)), [linhas, filtro]);
  const pendentes = (linhas ?? []).filter((l) => !l.entryId && !l.ignored).length;
  async function importar(arq: File | undefined) {
    if (!arq) return;
    setEnviando(true);
    try { const r = await importarOfx(empresa, conta, await arq.text()); await carregar(); avisar(`${r.lidas} linha(s) lida(s), ${r.novas} nova(s).`, "sucesso"); }
    catch (e) { avisar(e instanceof Error ? e.message : "Não foi possível importar.", "erro"); }
    finally { setEnviando(false); }
  }
  async function fazer(fn: () => Promise<unknown>, ok: string) { try { await fn(); await carregar(); avisar(ok, "sucesso"); } catch (e) { avisar(e instanceof Error ? e.message : "Erro.", "erro"); } }
  const baixa = perms.includes("finance.settle");

  if (carregandoEmp) return <Loading />;
  return (
    <>
      <PageHeader titulo="Conciliação bancária" descricao="Importe o extrato OFX do banco e ligue cada movimento à conta a pagar ou a receber." />
      {erroEmp ? <Notice tom="alerta">{erroEmp}</Notice> : !empresas.length ? <Notice>Nenhuma empresa disponível para você.</Notice> : <>
        <div className={styles.barra}>
          <SeletorEmpresa empresas={empresas} empresa={empresa} onTrocar={setEmpresa} />
          <Select rotulo="Conta bancária" value={conta} onChange={(e) => setConta(e.target.value)}>{!contas.length && <option value="">Nenhuma conta</option>}{contas.map((c) => <option key={c.id} value={c.id}>{c.name}{c.bank ? ` — ${c.bank}` : ""}</option>)}</Select>
          {perms.includes("finance.manage") && conta && <label><Button variante="primary" icone={<Upload size={16} />} carregando={enviando} onClick={(e) => (e.currentTarget.nextElementSibling as HTMLInputElement | null)?.click()}>Importar OFX</Button><input type="file" hidden accept=".ofx,.OFX" aria-label="Arquivo OFX" onChange={(e) => { void importar(e.target.files?.[0]); e.target.value = ""; }} /></label>}
        </div>
        {erro && <Notice tom="alerta">{erro}</Notice>}
        {!contas.length && !erro && <Notice>Cadastre a conta bancária da empresa em BPO Financeiro › Cadastros para importar o extrato.</Notice>}
        {!!contas.length && <Card semPadding>
          <div className={styles.filtros} style={{ paddingTop: "var(--space-4)" }}>
            <Select rotulo="Mostrar" value={filtro} onChange={(e) => setFiltro(e.target.value)}><option value="pendentes">Pendentes ({pendentes})</option><option value="conciliadas">Conciliadas</option><option value="ignoradas">Ignoradas</option><option value="todas">Todas</option></Select>
          </div>
          {!linhas ? <Loading /> : <DataTable linhas={vistas} chaveLinha={(l) => l.id} vazio={filtro === "pendentes" ? "Nada pendente. Importe um extrato OFX para começar." : "Nenhuma linha."} colunas={[
            { chave: "d", titulo: "Data", render: (l) => dataBr(l.date) },
            { chave: "m", titulo: "Histórico do banco", render: (l) => l.memo || "—" },
            { chave: "v", titulo: "Valor", alinhar: "direita", render: (l) => <span className={`${styles.valor} ${l.amount.startsWith("-") ? styles.saida : styles.entrada}`}>{moeda(l.amount)}</span> },
            { chave: "s", titulo: "Conciliação", render: (l) => l.entryId ? <Badge tom="sucesso">Conciliada</Badge> : l.ignored ? <Badge>Ignorada</Badge> : l.sugestoes.length ? <div className={styles.sugestao}>{l.sugestoes.map((s) => baixa
              ? <Button key={s.id} tamanho="sm" icone={<Link2 size={14} />} onClick={() => void fazer(() => conciliar(empresa, conta, l.id, s.id), "Conciliado e baixado.")}>{s.description} · venc. {dataBr(s.dueDate)}</Button>
              : <span key={s.id} className={styles.sub}>{s.description}</span>)}</div> : <span className={styles.sub}>Sem conta em aberto com o mesmo valor (até 7 dias do vencimento).</span> },
            { chave: "a", titulo: "", alinhar: "direita", render: (l) => baixa && <div className={styles.acoes}>
              {(l.entryId || l.ignored) ? <IconButton dica={l.entryId ? "Desfazer conciliação (a conta volta para em aberto)" : "Voltar para pendentes"} icone={<Undo2 size={16} />} onClick={() => void fazer(() => desfazerConciliacao(empresa, conta, l.id), "Desfeito.")} />
                : <IconButton dica="Ignorar (ex.: transferência entre contas)" icone={<EyeOff size={16} />} onClick={() => void fazer(() => ignorarLinha(empresa, conta, l.id), "Linha ignorada.")} />}
            </div> },
          ]} />}
        </Card>}
      </>}
    </>
  );
}
