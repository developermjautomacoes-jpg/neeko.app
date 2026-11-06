"use client";
import { useEffect, useState } from "react";
import { Card, DataTable, Input, KpiCard, Loading, Notice, PageHeader } from "@neeko/ui";
import { SeletorEmpresa, hojeIso, mesNome, moeda, useEmpresaBpo } from "@/features/bpo/comum";
import { centavos } from "@/lib/format";
import { lerFluxo, type Fluxo } from "@/services/bpo";
import styles from "@/features/bpo/bpo.module.css";

const inicioAno = () => `${hojeIso().slice(0, 4)}-01-01`;
const fimAno = () => `${hojeIso().slice(0, 4)}-12-31`;

export default function FluxoCaixa() {
  const { empresas, empresa, setEmpresa, erro: erroEmp, carregando: carregandoEmp } = useEmpresaBpo();
  const [de, setDe] = useState(inicioAno());
  const [ate, setAte] = useState(fimAno());
  const [f, setF] = useState<Fluxo | null>(null);
  const [erro, setErro] = useState("");
  useEffect(() => {
    if (!empresa || !de || !ate) return;
    if (de > ate) { setErro("A data inicial é depois da final."); return; }
    lerFluxo(empresa, de, ate).then((x) => { setF(x); setErro(""); }).catch((e: Error) => setErro(e.message));
  }, [empresa, de, ate]);
  if (carregandoEmp) return <Loading />;
  const soma = (k: "entradas" | "saidas") => moeda(((t) => `${t < 0 ? "-" : ""}${Math.floor(Math.abs(t) / 100)}.${String(Math.abs(t) % 100).padStart(2, "0")}`)(f?.serie.reduce((t, m) => t + centavos(m[k]), 0) ?? 0));
  const maior = Math.max(1, ...(f?.serie.flatMap((m) => [centavos(m.entradas) + centavos(m.previstoEntradas), centavos(m.saidas) + centavos(m.previstoSaidas)]) ?? [1]));
  const alt = (v: string) => `${Math.max(2, (centavos(v) / maior) * 140)}px`;
  return (
    <>
      <PageHeader titulo="Fluxo de caixa" descricao="Realizado pela data de pagamento e previsto pelo vencimento das contas em aberto." />
      {erroEmp ? <Notice tom="alerta">{erroEmp}</Notice> : !empresas.length ? <Notice>Nenhuma empresa disponível para você.</Notice> : <>
        <div className={styles.barra}>
          <SeletorEmpresa empresas={empresas} empresa={empresa} onTrocar={setEmpresa} />
          <Input rotulo="De" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          <Input rotulo="Até" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
        {erro && <Notice tom="alerta">{erro}</Notice>}
        {!f ? <Loading /> : <>
          <div className={`${styles.kpis} ${styles.kpis3}`}>
            <KpiCard rotulo="Saldo no início" valor={moeda(f.saldoInicial)} />
            <KpiCard rotulo="Entradas no período" valor={<span className={styles.entrada}>{soma("entradas")}</span>} />
            <KpiCard rotulo="Saídas no período" valor={<span className={styles.saida}>{soma("saidas")}</span>} />
            <KpiCard rotulo="Saldo no fim" valor={moeda(f.saldoFinal)} destaque />
            <KpiCard rotulo="Total a receber" valor={moeda(f.aReceber)} detalhe={`Vencido: ${moeda(f.vencidoReceber)}`} />
            <KpiCard rotulo="Total a pagar" valor={moeda(f.aPagar)} detalhe={`Vencido: ${moeda(f.vencidoPagar)}`} />
          </div>
          <Card titulo="Entradas e saídas por mês" semPadding>
            {!f.serie.length ? <p className={styles.legenda}>Sem movimento no período.</p> : <>
              <div className={styles.grafico} role="img" aria-label="Gráfico de entradas e saídas por mês">
                {f.serie.map((m) => <div key={m.competencia} className={styles.mes} title={`${mesNome(m.competencia)} — entradas ${moeda(m.entradas)}, saídas ${moeda(m.saidas)}`}>
                  <div className={styles.barras}>
                    <i className={styles.barraEntrada} style={{ height: alt(m.entradas) }} />
                    <i className={styles.barraSaida} style={{ height: alt(m.saidas) }} />
                    {(centavos(m.previstoEntradas) > 0 || centavos(m.previstoSaidas) > 0) && <><i className={styles.barraEntrada} style={{ height: alt(m.previstoEntradas), opacity: 0.35 }} /><i className={styles.barraSaida} style={{ height: alt(m.previstoSaidas), opacity: 0.35 }} /></>}
                  </div>
                  <small>{mesNome(m.competencia)}</small>
                </div>)}
              </div>
              <div className={styles.legenda}><span><i className={styles.barraEntrada} />Entradas</span><span><i className={styles.barraSaida} />Saídas</span><span><i className={styles.barraEntrada} style={{ opacity: 0.35 }} />Previsto (em aberto)</span></div>
            </>}
            <DataTable linhas={f.serie} chaveLinha={(m) => m.competencia} vazio="Sem movimento no período." colunas={[
              { chave: "m", titulo: "Mês", render: (m) => mesNome(m.competencia) },
              { chave: "e", titulo: "Entradas", alinhar: "direita", render: (m) => <span className={`${styles.valor} ${styles.entrada}`}>{moeda(m.entradas)}</span> },
              { chave: "s", titulo: "Saídas", alinhar: "direita", render: (m) => <span className={`${styles.valor} ${styles.saida}`}>{moeda(m.saidas)}</span> },
              { chave: "pe", titulo: "A receber", alinhar: "direita", render: (m) => <span className={styles.valor}>{moeda(m.previstoEntradas)}</span> },
              { chave: "ps", titulo: "A pagar", alinhar: "direita", render: (m) => <span className={styles.valor}>{moeda(m.previstoSaidas)}</span> },
              { chave: "sa", titulo: "Saldo realizado", alinhar: "direita", render: (m) => <b className={styles.valor}>{moeda(m.saldo)}</b> },
            ]} />
          </Card>
          <div style={{ height: "var(--space-4)" }} />
          <Card titulo="Realizado por categoria" semPadding>
            <DataTable linhas={f.categorias} chaveLinha={(c) => c.kind + c.nome} vazio="Nada pago ou recebido no período." colunas={[
              { chave: "n", titulo: "Categoria", render: (c) => c.nome },
              { chave: "k", titulo: "Tipo", render: (c) => (c.kind === "receber" ? "Entrada" : "Saída") },
              { chave: "t", titulo: "Total", alinhar: "direita", render: (c) => <span className={`${styles.valor} ${c.kind === "receber" ? styles.entrada : styles.saida}`}>{moeda(c.total)}</span> },
            ]} />
          </Card>
        </>}
      </>}
    </>
  );
}
