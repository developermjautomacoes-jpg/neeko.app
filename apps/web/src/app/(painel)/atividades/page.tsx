"use client";
import { useEffect, useState } from "react";
import { Card, DataTable, Input, Loading, Notice, PageHeader, Select } from "@neeko/ui";
import { dataHora } from "@/lib/format";
import { lerAtividades, type Atividade } from "@/services/conta";
import styles from "../pagina.module.css";

export default function Atividades() {
  const [lista, setLista] = useState<Atividade[]>([]);
  const [pessoas, setPessoas] = useState<{ id: string; nome: string }[]>([]);
  const [pessoa, setPessoa] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  useEffect(() => { setCarregando(true); lerAtividades({ pessoa, de, ate }).then((r) => { setLista(r.atividades); setPessoas(r.pessoas); setErro(""); }).catch((x: Error) => setErro(x.message)).finally(() => setCarregando(false)); }, [pessoa, de, ate]);
  return <>
    <PageHeader titulo="Histórico de atividades" descricao="O que cada pessoa do escritório fez no sistema. Visível só para a proprietária e a administração." />
    {erro && <Notice tom="erro">{erro}</Notice>}
    <div className={styles.filtros}>
      <Select rotulo="Pessoa" value={pessoa} onChange={(e) => setPessoa(e.target.value)}><option value="">Todas</option>{pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</Select>
      <Input rotulo="De" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
      <Input rotulo="Até" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
    </div>
    <Card semPadding titulo={`${lista.length} atividades`}>
      {carregando ? <Loading /> : <DataTable linhas={lista} chaveLinha={(a) => a.id} vazio="Nenhuma atividade nesse período."
        colunas={[{ chave: "d", titulo: "Data", render: (a) => dataHora(a.em) }, { chave: "p", titulo: "Pessoa", render: (a) => a.pessoa }, { chave: "a", titulo: "Atividade", render: (a) => a.acao }]} />}
    </Card>
  </>;
}
