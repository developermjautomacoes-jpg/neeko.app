"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Pencil, Trash2 } from "lucide-react";
import { Badge, Button, Card, ConfirmDialog, DataTable, IconButton, Input, KpiCard, Loading, Modal, Notice, PageHeader, Select, useToast } from "@neeko/ui";
import { diasPara, exportarExcel, exportarPdf, situacao } from "@/features/certificados/relatorio";
import { arquivoParaBase64, dataBr, dataHora, formatarCnpj } from "@/lib/format";
import { alterarCertificado, enviarCertificado, lerCertificados, removerCertificado } from "@/services/fiscal";
import type { Certificado, EmpresaCert } from "@/types/nfse";
import styles from "../pagina.module.css";

export default function Certificados() {
  const avisar = useToast();
  const [lista, setLista] = useState<Certificado[]>([]);
  const [sem, setSem] = useState<EmpresaCert[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [tipo, setTipo] = useState("todos");
  const [exportando, setExportando] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState("");
  const [apelido, setApelido] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroImport, setErroImport] = useState("");
  const [removendo, setRemovendo] = useState<Certificado[] | null>(null);
  const [selecao, setSelecao] = useState<Set<string>>(new Set());
  const [editando, setEditando] = useState<{ c: Certificado; apelido: string; arquivo: File | null; senha: string; erro: string } | null>(null);
  const [salvandoEd, setSalvandoEd] = useState(false);
  const [vinculo, setVinculo] = useState("todos");
  const [venceAte, setVenceAte] = useState("");
  const [chave, setChave] = useState(0);
  const carregar = useCallback(() => lerCertificados().then((r) => { setLista(r.certificados); setSem(r.semCertificado); }).catch((e: Error) => setErro(e.message)).finally(() => setCarregando(false)), []);
  useEffect(() => { void carregar(); }, [carregar]);
  async function importar() {
    if (!arquivo) { avisar("Escolha o arquivo .pfx ou .p12.", "erro"); return; }
    setEnviando(true); setErroImport("");
    try {
      await enviarCertificado({ pfx: await arquivoParaBase64(arquivo), senha, apelido: apelido.trim() });
      setArquivo(null); setSenha(""); setApelido(""); setChave((k) => k + 1); await carregar();
      avisar("Certificado importado.", "sucesso");
    } catch (e) { const m = e instanceof Error ? e.message : "Não foi possível importar."; setErroImport(m); avisar(m, "erro"); }
    finally { setEnviando(false); }
  }
  async function salvarEdicao() {
    if (!editando) return;
    setSalvandoEd(true);
    try {
      await alterarCertificado(editando.c.id, { apelido: editando.apelido.trim(), ...(editando.arquivo ? { pfx: await arquivoParaBase64(editando.arquivo), senha: editando.senha } : {}) });
      setEditando(null); await carregar(); avisar(editando.arquivo ? "Certificado atualizado." : "Apelido salvo.", "sucesso");
    } catch (e) { setEditando({ ...editando, erro: e instanceof Error ? e.message : "Não foi possível salvar." }); } finally { setSalvandoEd(false); }
  }
  async function remover() {
    if (!removendo) return;
    try { for (const c of removendo) await removerCertificado(c.id); setSelecao(new Set()); await carregar(); avisar(removendo.length > 1 ? `${removendo.length} certificados removidos.` : "Certificado removido.", "sucesso"); }
    catch (e) { avisar(e instanceof Error ? e.message : "Erro.", "erro"); }
    finally { setRemovendo(null); }
  }
  const tipos = useMemo(() => [...new Set(lista.map((c) => c.kind))].sort(), [lista]);
  const vistos = useMemo(() => {
    const q = busca.trim().toLowerCase(), n = q.replace(/\D/g, "");
    return lista.filter((c) => (filtro === "todos" || situacao(c) === filtro) && (tipo === "todos" || c.kind === tipo)
      && (vinculo === "todos" || (vinculo === "com" ? c.empresas.length > 0 : c.empresas.length === 0)) && (!venceAte || c.validUntil <= venceAte)
      && (!q || c.holder.toLowerCase().includes(q) || c.nickname.toLowerCase().includes(q) || (!!n && c.document.includes(n)) || c.empresas.some((e) => e.razao.toLowerCase().includes(q))));
  }, [lista, busca, filtro, tipo, vinculo, venceAte]);
  const marcados = vistos.filter((c) => selecao.has(c.id)), todos = vistos.length > 0 && marcados.length === vistos.length;
  const alternar = (id: string) => setSelecao((m) => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const conta = (s: string) => lista.filter((c) => situacao(c) === s).length;
  async function exportar(f: "excel" | "pdf") {
    setExportando(f);
    try { await (f === "excel" ? exportarExcel : exportarPdf)(marcados.length ? marcados : vistos, sem); }
    catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível exportar.", "erro"); } finally { setExportando(""); }
  }
  const selo = (c: Certificado) => { const s = situacao(c), d = diasPara(c.validUntil); return s === "Vencido" ? <Badge tom="perigo">vencido há {-d} dia(s)</Badge> : s === "Válido" ? <Badge tom="sucesso">{d} dias</Badge> : <Badge tom="alerta">vence em {d} dia(s)</Badge>; };
  return (
    <>
      <PageHeader titulo="Certificados digitais" descricao="Certificados A1 da organização. Arquivo e senha ficam cifrados e nunca voltam para a tela." />
      {erro && <Notice tom="erro">{erro}</Notice>}
      <div className={styles.indicadores}>
        <KpiCard rotulo="Certificados" valor={lista.length} />
        <KpiCard rotulo="Válidos" valor={conta("Válido")} />
        <KpiCard rotulo="Vencem em até 60 dias" valor={conta("Vence em até 30 dias") + conta("Vence em até 60 dias")} />
        <KpiCard rotulo="Vencidos" valor={conta("Vencido")} />
        <KpiCard rotulo="Empresas sem certificado" valor={sem.length} />
      </div>
      <Card titulo="Importar certificado" descricao="O certificado é ligado à empresa pela raiz do CNPJ. A empresa é cadastrada no memorando.">
        <div className={styles.form4}>
          <Input key={chave} rotulo="Arquivo (.pfx ou .p12)" type="file" accept=".pfx,.p12" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
          <Input rotulo="Senha do certificado" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          <Input rotulo="Apelido (opcional)" value={apelido} onChange={(e) => setApelido(e.target.value)} />
          <Button variante="primary" carregando={enviando} onClick={importar}>Importar</Button>
        </div>
        {erroImport && <Notice tom="erro">{erroImport}</Notice>}
      </Card>
      <div className={styles.bloco}>
        <Card titulo="Controle de certificados" semPadding>
          <div className={styles.filtrosCert}>
            <Input rotulo="Pesquisar" placeholder="Titular, CNPJ ou empresa" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <Select rotulo="Situação" value={filtro} onChange={(e) => setFiltro(e.target.value)}><option value="todos">Todas</option>{["Válido", "Vence em até 60 dias", "Vence em até 30 dias", "Vencido"].map((o) => <option key={o}>{o}</option>)}</Select>
            <Select rotulo="Empresa vinculada" value={vinculo} onChange={(e) => setVinculo(e.target.value)}><option value="todos">Todos</option><option value="com">Com empresa</option><option value="sem">Sem empresa</option></Select>
            <Input rotulo="Vence até" type="date" value={venceAte} onChange={(e) => setVenceAte(e.target.value)} />
            <Select rotulo="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="todos">Todos</option>{tipos.map((o) => <option key={o}>{o}</option>)}</Select>
            <div className={styles.acoes}>
              <IconButton dica="Exportar Excel" icone={<FileSpreadsheet size={16} />} carregando={exportando === "excel"} disabled={!vistos.length} onClick={() => void exportar("excel")} />
              <IconButton dica="Exportar PDF" icone={<FileText size={16} />} carregando={exportando === "pdf"} disabled={!vistos.length} onClick={() => void exportar("pdf")} />
            </div>
          </div>
          {marcados.length > 0 && <div className={styles.barraSelecao}><b>{marcados.length} selecionado(s)</b><span>Exportar usa só os selecionados.</span><Button tamanho="sm" onClick={() => setSelecao(new Set())}>Limpar seleção</Button><Button tamanho="sm" variante="danger" onClick={() => setRemovendo(marcados)}>Remover selecionados</Button></div>}
          {carregando ? <Loading /> : <DataTable linhas={vistos} chaveLinha={(c) => c.id} vazio="Nenhum certificado encontrado."
            colunas={[
              { chave: "sel", largura: "36px", titulo: <input type="checkbox" aria-label="Selecionar todos" checked={todos} onChange={() => setSelecao(todos ? new Set() : new Set(vistos.map((c) => c.id)))} />, render: (c) => <input type="checkbox" aria-label={`Selecionar ${c.nickname || c.holder}`} checked={selecao.has(c.id)} onChange={() => alternar(c.id)} /> },
              { chave: "t", titulo: "Titular", render: (c) => <><b>{c.nickname || c.holder}</b><br /><small>{formatarCnpj(c.document)}</small></> },
              { chave: "k", titulo: "Tipo", render: (c) => c.kind },
              { chave: "v", titulo: "Validade", render: (c) => dataBr(c.validUntil) },
              { chave: "s", titulo: "Situação", render: selo },
              { chave: "e", titulo: "Empresas", render: (c) => c.empresas.length },
              { chave: "i", titulo: "Importado em", render: (c) => dataHora(c.createdAt) },
              { chave: "a", titulo: "", alinhar: "direita", render: (c) => <div className={styles.acoes}><IconButton dica="Editar ou atualizar arquivo" icone={<Pencil size={16} />} onClick={() => setEditando({ c, apelido: c.nickname, arquivo: null, senha: "", erro: "" })} /><IconButton dica="Remover" variante="danger" icone={<Trash2 size={16} />} onClick={() => setRemovendo([c])} /></div> },
            ]} />}
        </Card>
      </div>
      <Modal aberto={!!editando} titulo="Editar certificado" largura="sm" onFechar={() => setEditando(null)} rodape={<><Button onClick={() => setEditando(null)}>Voltar</Button><Button variante="primary" carregando={salvandoEd} onClick={() => void salvarEdicao()}>Salvar</Button></>}>
        {editando && <div className={styles.form}>
          <p><b>{editando.c.holder}</b><br /><small>{formatarCnpj(editando.c.document)} · válido até {dataBr(editando.c.validUntil)}</small></p>
          <Input rotulo="Apelido" value={editando.apelido} onChange={(e) => setEditando({ ...editando, apelido: e.target.value })} />
          <Input rotulo="Novo arquivo (opcional)" type="file" accept=".pfx,.p12" dica="Para renovar: envie o certificado novo do mesmo CNPJ/CPF." onChange={(e) => setEditando({ ...editando, arquivo: e.target.files?.[0] ?? null })} />
          {editando.arquivo && <Input rotulo="Senha do novo certificado" type="password" autoComplete="new-password" value={editando.senha} onChange={(e) => setEditando({ ...editando, senha: e.target.value })} />}
          {editando.erro && <Notice tom="erro">{editando.erro}</Notice>}
        </div>}
      </Modal>
      <ConfirmDialog aberto={!!removendo} titulo={removendo && removendo.length > 1 ? `Remover ${removendo.length} certificados` : "Remover certificado"} confirmar="Remover" perigo onConfirmar={remover} onCancelar={() => setRemovendo(null)}>
        <p>As capturas que usam <b>{removendo?.map((c) => c.nickname || c.holder).join(", ")}</b> param até um novo certificado ser importado. As notas guardadas continuam.</p>
      </ConfirmDialog>
    </>
  );
}
