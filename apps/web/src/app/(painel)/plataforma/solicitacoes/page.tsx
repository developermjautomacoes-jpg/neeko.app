"use client";
import { useEffect, useState } from "react";
import { Card, DataTable, Loading, Notice, PageHeader } from "@neeko/ui";
import { dataHora } from "@/lib/format";
import { lerSolicitacoes } from "@/services/conta";

export default function Solicitacoes() {
  const [lista, setLista] = useState<{ id: string; escritorio: string; texto: string; em: string }[] | null>(null);
  const [erro, setErro] = useState("");
  useEffect(() => { lerSolicitacoes().then(setLista).catch((x: Error) => setErro(x.message)); }, []);
  return <>
    <PageHeader titulo="Solicitações de assuntos" descricao="Novos assuntos pedidos ao Assistente Neeko pelos escritórios." />
    {erro && <Notice tom="erro">{erro}</Notice>}
    <Card semPadding titulo="Pedidos">{!lista && !erro ? <Loading /> : <DataTable linhas={lista ?? []} chaveLinha={(s) => s.id} vazio="Nenhum pedido ainda."
      colunas={[{ chave: "d", titulo: "Data", render: (s) => dataHora(s.em) }, { chave: "e", titulo: "Escritório", render: (s) => s.escritorio }, { chave: "t", titulo: "Assunto pedido", render: (s) => s.texto }]} />}</Card>
  </>;
}
