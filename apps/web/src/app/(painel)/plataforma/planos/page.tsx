"use client";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, DataTable, Input, Loading, Modal, Notice, PageHeader, useToast } from "@neeko/ui";
import { listarPlanos, salvarPlano, type Plano } from "@/services/conta";
import styles from "../../pagina.module.css";

interface F { id?: string; name: string; maxCompanies: string; maxUsers: string; monthlyPrice: string; active: boolean }
const brl = (v: string) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const lim = (v: string) => (v.trim() === "" ? null : Number(v));

export default function Planos() {
  const avisar = useToast();
  const [lista, setLista] = useState<Plano[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [f, setF] = useState<F | null>(null);
  const carregar = useCallback(() => listarPlanos().then(setLista).catch((x: Error) => setErro(x.message)).finally(() => setCarregando(false)), []);
  useEffect(() => { void carregar(); }, [carregar]);
  async function salvar() {
    if (!f) return;
    try { await salvarPlano(f.id, { name: f.name, maxCompanies: lim(f.maxCompanies), maxUsers: lim(f.maxUsers), monthlyPrice: f.monthlyPrice.replace(",", "."), active: f.active }); setF(null); await carregar(); avisar("Plano salvo.", "sucesso"); }
    catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível salvar.", "erro"); }
  }
  return <>
    <PageHeader titulo="Planos" descricao="Limites e mensalidade dos escritórios. Em branco significa sem limite." acoes={<Button variante="primary" onClick={() => setF({ name: "", maxCompanies: "", maxUsers: "", monthlyPrice: "0.00", active: true })}>Novo plano</Button>} />
    {erro && <Notice tom="erro">{erro}</Notice>}
    <Card semPadding titulo="Planos cadastrados">{carregando ? <Loading /> : <DataTable linhas={lista} chaveLinha={(p) => p.id} vazio="Nenhum plano cadastrado."
      colunas={[{ chave: "n", titulo: "Plano", render: (p) => <b>{p.name}</b> }, { chave: "e", titulo: "Empresas", render: (p) => p.maxCompanies ?? "Sem limite" }, { chave: "u", titulo: "Usuários", render: (p) => p.maxUsers ?? "Sem limite" }, { chave: "m", titulo: "Mensalidade", alinhar: "direita", render: (p) => brl(p.monthlyPrice) }, { chave: "q", titulo: "Escritórios", alinhar: "direita", render: (p) => p.escritorios }, { chave: "s", titulo: "Situação", render: (p) => <Badge tom={p.active ? "sucesso" : "neutro"}>{p.active ? "ativo" : "inativo"}</Badge> },
        { chave: "a", titulo: "", alinhar: "direita", render: (p) => <Button tamanho="sm" onClick={() => setF({ id: p.id, name: p.name, maxCompanies: p.maxCompanies?.toString() ?? "", maxUsers: p.maxUsers?.toString() ?? "", monthlyPrice: p.monthlyPrice, active: p.active })}>Editar</Button> }]} />}</Card>
    <Modal aberto={!!f} titulo={f?.id ? "Editar plano" : "Novo plano"} onFechar={() => setF(null)} rodape={<><Button onClick={() => setF(null)}>Voltar</Button><Button variante="primary" onClick={salvar}>Salvar</Button></>}>
      {f && <div className={styles.form}><Input rotulo="Nome" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /><div className={styles.colunas}><Input rotulo="Limite de empresas" inputMode="numeric" value={f.maxCompanies} onChange={(e) => setF({ ...f, maxCompanies: e.target.value })} /><Input rotulo="Limite de usuários" inputMode="numeric" value={f.maxUsers} onChange={(e) => setF({ ...f, maxUsers: e.target.value })} /></div><Input rotulo="Mensalidade (R$)" inputMode="decimal" value={f.monthlyPrice} onChange={(e) => setF({ ...f, monthlyPrice: e.target.value })} /><label className={styles.check}><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Disponível para novos escritórios</label></div>}
    </Modal>
  </>;
}
