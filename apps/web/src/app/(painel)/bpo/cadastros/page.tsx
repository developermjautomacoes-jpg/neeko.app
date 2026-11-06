"use client";
import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input, Loading, Notice, PageHeader, Select, useToast } from "@neeko/ui";
import { SeletorEmpresa, moeda, paraCampo, paraValor, useEmpresaBpo } from "@/features/bpo/comum";
import { eu } from "@/services/conta";
import { criarCategoria, criarCentro, criarContaFin, definirLimite, lerCadastros, type Cadastros } from "@/services/bpo";
import styles from "@/features/bpo/bpo.module.css";

export default function CadastrosBpo() {
  const avisar = useToast();
  const { empresas, empresa, setEmpresa, erro: erroEmp, carregando: carregandoEmp } = useEmpresaBpo();
  const [cad, setCad] = useState<Cadastros | null>(null);
  const [erro, setErro] = useState("");
  const [perms, setPerms] = useState<string[]>([]);
  const [conta, setConta] = useState({ name: "", bank: "", saldo: "" });
  const [cat, setCat] = useState({ name: "", kind: "despesa" });
  const [centro, setCentro] = useState("");
  const [limite, setLimite] = useState("");
  useEffect(() => { eu().then((p) => setPerms(p.permissions)).catch(() => undefined); }, []);
  const carregar = useCallback(async () => { if (!empresa) return; try { const c = await lerCadastros(empresa); setCad(c); setLimite(paraCampo(c.limiteAprovacao)); setErro(""); } catch (e) { setErro(e instanceof Error ? e.message : "Erro."); } }, [empresa]);
  useEffect(() => { setCad(null); void carregar(); }, [carregar]);
  const gere = perms.includes("finance.manage");
  async function fazer(fn: () => Promise<unknown>, ok: string, limpar: () => void) { try { await fn(); limpar(); await carregar(); avisar(ok, "sucesso"); } catch (e) { avisar(e instanceof Error ? e.message : "Erro.", "erro"); } }
  function salvarConta() {
    const saldo = conta.saldo.trim() ? paraValor(conta.saldo.replace(/^-/, "")) : "0";
    if (!saldo) { avisar("Saldo inicial inválido.", "erro"); return; }
    void fazer(() => criarContaFin(empresa, { name: conta.name, bank: conta.bank, openingBalance: conta.saldo.trim().startsWith("-") ? `-${saldo}` : saldo }), "Conta cadastrada.", () => setConta({ name: "", bank: "", saldo: "" }));
  }
  function salvarLimite() {
    const v = limite.trim() ? paraValor(limite) : null;
    if (limite.trim() && !v) { avisar("Valor inválido.", "erro"); return; }
    void fazer(() => definirLimite(empresa, v), v ? "Limite de aprovação salvo." : "Aprovação desligada.", () => undefined);
  }

  if (carregandoEmp) return <Loading />;
  return (
    <>
      <PageHeader titulo="Cadastros do BPO" descricao="Contas bancárias, categorias, centros de custo e regra de aprovação de cada empresa." />
      {erroEmp ? <Notice tom="alerta">{erroEmp}</Notice> : !empresas.length ? <Notice>Nenhuma empresa disponível para você.</Notice> : <>
        <div className={styles.barra}><SeletorEmpresa empresas={empresas} empresa={empresa} onTrocar={setEmpresa} /></div>
        {erro && <Notice tom="alerta">{erro}</Notice>}
        {!cad ? <Loading /> : <div className={styles.cadastros}>
          <Card titulo="Contas bancárias e caixa" descricao="Onde o dinheiro entra e sai.">
            {gere && <div className={styles.form}>
              <div className={styles.grade2}><Input rotulo="Nome" placeholder="Ex.: Itaú conta corrente" value={conta.name} onChange={(e) => setConta({ ...conta, name: e.target.value })} /><Input rotulo="Banco" value={conta.bank} onChange={(e) => setConta({ ...conta, bank: e.target.value })} /></div>
              <div className={styles.linhaForm}><Input rotulo="Saldo inicial (R$)" inputMode="decimal" placeholder="0,00" value={conta.saldo} onChange={(e) => setConta({ ...conta, saldo: e.target.value })} /><Button variante="primary" onClick={salvarConta}>Adicionar</Button></div>
            </div>}
            <ul className={styles.lista}>{cad.contas.length ? cad.contas.map((c) => <li key={c.id}><span>{c.name}{c.bank && <span className={styles.sub}>{c.bank}</span>}</span><span className={styles.valor}>Saldo inicial {moeda(c.openingBalance)}</span></li>) : <li>Nenhuma conta cadastrada.</li>}</ul>
          </Card>
          <Card titulo="Aprovação de pagamentos" descricao="Contas a pagar acima do limite só podem ser baixadas depois de aprovadas por outra pessoa.">
            {perms.includes("finance.approve") ? <div className={styles.linhaForm}><Input rotulo="Limite (R$)" inputMode="decimal" placeholder="Em branco = sem aprovação" value={limite} onChange={(e) => setLimite(e.target.value)} /><Button variante="primary" onClick={salvarLimite}>Salvar</Button></div>
              : <p className={styles.sub}>{cad.limiteAprovacao ? `Acima de ${moeda(cad.limiteAprovacao)}.` : "Sem aprovação."}</p>}
          </Card>
          <Card titulo="Categorias" descricao="Classificam receitas e despesas no fluxo de caixa.">
            {gere && <div className={styles.linhaForm}><Input rotulo="Nova categoria" value={cat.name} onChange={(e) => setCat({ ...cat, name: e.target.value })} /><Select rotulo="Tipo" value={cat.kind} onChange={(e) => setCat({ ...cat, kind: e.target.value })}><option value="despesa">Despesa</option><option value="receita">Receita</option></Select><Button variante="primary" onClick={() => void fazer(() => criarCategoria(empresa, cat), "Categoria criada.", () => setCat({ ...cat, name: "" }))}>Adicionar</Button></div>}
            <ul className={styles.lista}>{cad.categorias.map((c) => <li key={c.id}><span>{c.name}</span><span className={c.kind === "receita" ? styles.entrada : styles.saida}>{c.kind === "receita" ? "Receita" : "Despesa"}</span></li>)}</ul>
          </Card>
          <Card titulo="Centros de custo" descricao="Opcional: separe gastos por área, obra ou filial.">
            {gere && <div className={styles.linhaForm}><Input rotulo="Novo centro de custo" value={centro} onChange={(e) => setCentro(e.target.value)} /><Button variante="primary" onClick={() => void fazer(() => criarCentro(empresa, centro), "Centro de custo criado.", () => setCentro(""))}>Adicionar</Button></div>}
            <ul className={styles.lista}>{cad.centros.length ? cad.centros.map((c) => <li key={c.id}>{c.name}</li>) : <li>Nenhum centro de custo.</li>}</ul>
          </Card>
        </div>}
      </>}
    </>
  );
}
