"use client";
import { FileText, RotateCcw, Settings, Stethoscope } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AgendaNfse, AmbienteNfse, CertificadoNfse, ModoBuscaNfse, EmpresaNfse, FalhaNfse, NotaNfse, PapelNfse, SituacaoNfse } from "@/types/nfse";
import { Badge, Button, Card, ConfirmDialog, DataTable, Input, KpiCard, Loading, Modal, Notice, PageHeader, Select, useToast, IconButton } from "@neeko/ui";
import { arquivoParaBase64, dataBr, dataHora, formatarCnpj } from "@/lib/format";
import { baixarXmls, buscarXmls, capturarLote, definirModo, definirProcurador, diagnosticar, enviarCertificado, lerAgenda, lerProcurador, listarEmpresas, listarNotas, reiniciarCaptura, salvarAgenda, verificarEventos } from "@/services/fiscal";
import { ROTULO_RET_ISS, ROTULO_SITUACAO, exportarExcel, issRetido, valida } from "./nfseExcel";
import { gerarDanfsePdf, mostrarPdf } from "./nfseDanfse";
import styles from "./NfsePage.module.css";

const PAUSA_LOTES_MS = 2500;   // entre lotes: o ADN bloqueia consultas em sequência rápida (HTTP 429)
const PAUSA_NOTAS_MS = 1500;   // entre consultas de eventos por nota
const ESPERA_MAXIMA_S = 180;   // pausas maiores passam para a próxima empresa; a captura dela continua depois
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const moeda = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hoje = () => new Date().toISOString().slice(0, 10);
const tomSituacao: Record<SituacaoNfse, "sucesso" | "perigo" | "alerta"> = { normal: "sucesso", cancelada: "perigo", substituida: "perigo", em_analise: "alerta", bloqueada: "alerta" };
const ROTULO_PAPEL: Record<PapelNfse, string> = { prestador: "Prestada", tomador: "Tomada", intermediario: "Intermediada", outro: "Outra" };

interface Progresso { empresa: string; indice: number; total: number; notas: number; eventos: number; texto: string }

export function NfsePage() {
  const avisar = useToast();
  const [ambiente, setAmbiente] = useState<AmbienteNfse>("producao");
  const [empresas, setEmpresas] = useState<EmpresaNfse[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [progresso, setProgresso] = useState<Progresso | null>(null);
  const [relatorio, setRelatorio] = useState<string[]>([]);
  const parar = useRef(false);
  const [cnpjVista, setCnpjVista] = useState(() => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("empresa") ?? ""));
  const [competencia, setCompetencia] = useState("");
  const [competencias, setCompetencias] = useState<{ competencia: string; notas: number }[]>([]);
  const [notas, setNotas] = useState<NotaNfse[]>([]);
  const [falhas, setFalhas] = useState<FalhaNfse[]>([]);
  const [papel, setPapel] = useState<PapelNfse | "">("");
  const [busca, setBusca] = useState("");
  const [baixando, setBaixando] = useState("");
  const [verificando, setVerificando] = useState("");
  const [recomecar, setRecomecar] = useState<EmpresaNfse | null>(null);
  const [procurador, setProcurador] = useState<CertificadoNfse | null>(null);
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [config, setConfig] = useState(false);
  const [procArquivo, setProcArquivo] = useState<File | null>(null);
  const [procSenha, setProcSenha] = useState("");
  const [procApelido, setProcApelido] = useState("");
  const [procChave, setProcChave] = useState(0);
  const [enviandoProc, setEnviandoProc] = useState(false);
  const [agenda, setAgenda] = useState<AgendaNfse | null>(null);
  const [salvandoAgenda, setSalvandoAgenda] = useState(false);
  const [selecao, setSelecao] = useState<Set<string>>(new Set());
  const [diagnostico, setDiagnostico] = useState<string[] | null>(null);
  const [diagnosticando, setDiagnosticando] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setEmpresas(await listarEmpresas(ambiente)); setErro("");
    } catch (x) { setErro(x instanceof Error ? x.message : "Não foi possível carregar."); }
    finally { setCarregando(false); }
  }, [ambiente]);
  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { lerAgenda().then(setAgenda).catch(() => setAgenda(null)); lerProcurador().then(setProcurador).catch(() => setProcurador(null)); }, []);

  const carregarNotas = useCallback(async (cnpj: string, comp?: string) => {
    if (!cnpj) { setNotas([]); setCompetencias([]); setFalhas([]); setCompetencia(""); return; }
    try {
      const r = await listarNotas(ambiente, cnpj, comp);
      setSelecao(new Set());
      setNotas(r.notas); setCompetencias(r.competencias); setCompetencia(r.competencia); setFalhas(r.falhas);
    } catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível listar as notas.", "erro"); }
  }, [ambiente, avisar]);
  useEffect(() => { void carregarNotas(cnpjVista); }, [cnpjVista, carregarNotas]);

  const certVencido = (e: EmpresaNfse) => !!e.certificado?.validade && e.certificado.validade < hoje();
  const aptas = useMemo(() => empresas.filter((e) => e.certificado && !certVencido(e)), [empresas]);

  function marcar(cnpj: string) {
    setMarcadas((m) => { const n = new Set(m); if (n.has(cnpj)) n.delete(cnpj); else n.add(cnpj); return n; });
  }

  async function capturar(ids?: string[]) {
    const fila = aptas.filter((e) => (ids ? ids.includes(e.id) : marcadas.has(e.id)));
    if (!fila.length) { avisar("Marque ao menos uma empresa com certificado válido.", "erro"); return; }
    parar.current = false; setRelatorio([]);
    const saida: string[] = [];
    for (let i = 0; i < fila.length && !parar.current; i++) {
      const e = fila[i];
      let tot = { notas: 0, eventos: 0, falhas: 0 };
      const mostrar = (texto: string) => setProgresso({ empresa: e.razao || formatarCnpj(e.cnpj), indice: i + 1, total: fila.length, notas: tot.notas, eventos: tot.eventos, texto });
      mostrar("Consultando o Ambiente Nacional…");
      let linha = "";
      while (!parar.current) {
        try {
          const p = await capturarLote(ambiente, e.id);
          if (p.status === "lote" || p.status === "fim") {
            tot = { notas: tot.notas + p.notas, eventos: tot.eventos + p.eventos, falhas: tot.falhas + p.falhas };
            if (p.status === "fim") { linha = `${e.razao}: ${tot.notas} nota(s) nova(s), ${tot.eventos} evento(s)${tot.falhas ? `, ${tot.falhas} com falha` : ""}.`; break; }
            mostrar(`Lote recebido (NSU ${p.ultimoNsu}).`);
            await dormir(PAUSA_LOTES_MS);
          } else if (p.status === "aguardar") {
            if (p.segundos > ESPERA_MAXIMA_S) { linha = `${e.razao}: pausada por ${Math.ceil(p.segundos / 60)} min pelo ADN. Capture de novo depois; continua de onde parou.`; break; }
            for (let s = p.segundos; s > 0 && !parar.current; s--) { mostrar(`${p.mensagem} Nova tentativa em ${s}s.`); await dormir(1000); }
          } else if (p.status === "erro") { linha = `${e.razao}: ${p.mensagem}`; break; }
        } catch (x) { linha = `${e.razao}: ${x instanceof Error ? x.message : "erro na captura."}`; break; }
      }
      if (parar.current && !linha) linha = `${e.razao}: interrompida; continua de onde parou.`;
      saida.push(linha); setRelatorio([...saida]);
      if (i < fila.length - 1) await dormir(PAUSA_LOTES_MS);
    }
    setProgresso(null);
    await carregar();
    if (cnpjVista) await carregarNotas(cnpjVista, competencia || undefined);
  }

  /** Consulta os eventos nota a nota: garante cancelamentos mesmo que o evento não tenha vindo na fila por NSU. */
  async function verificar() {
    parar.current = false;
    const alvo = notas.filter(valida);
    let achados = 0;
    for (let i = 0; i < alvo.length && !parar.current; i++) {
      setVerificando(`${i + 1} de ${alvo.length}`);
      try {
        const r = await verificarEventos(ambiente, cnpjVista, alvo[i].chave);
        if (r.status === "erro") { avisar(r.mensagem, "erro"); break; }
        if (r.status === "aguardar") { if (r.segundos > ESPERA_MAXIMA_S) { avisar("O ADN pediu uma pausa longa. Tente mais tarde.", "erro"); break; } await dormir(r.segundos * 1000); i--; continue; }
        if (r.situacao !== "normal") achados++;
      } catch (x) { avisar(x instanceof Error ? x.message : "Erro ao verificar.", "erro"); break; }
      await dormir(PAUSA_NOTAS_MS);
    }
    setVerificando("");
    avisar(`Verificação concluída: ${achados} nota(s) com alteração de situação.`, "sucesso");
    await carregarNotas(cnpjVista, competencia);
  }

  async function rodarDiagnostico(cnpj: string) {
    setDiagnosticando(cnpj);
    try { setDiagnostico(await diagnosticar(ambiente, cnpj)); }
    catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível diagnosticar.", "erro"); }
    finally { setDiagnosticando(""); }
  }

  async function enviarProcurador() {
    if (!procArquivo) { avisar("Escolha o arquivo .pfx ou .p12 do procurador.", "erro"); return; }
    setEnviandoProc(true);
    try {
      const { id } = await enviarCertificado({ pfx: await arquivoParaBase64(procArquivo), senha: procSenha, apelido: procApelido.trim() });
      setProcurador(await definirProcurador(id)); await carregar();
      setProcArquivo(null); setProcSenha(""); setProcApelido(""); setProcChave((k) => k + 1);
      avisar("Certificado do procurador cadastrado.", "sucesso");
    } catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível cadastrar.", "erro"); }
    finally { setEnviandoProc(false); }
  }
  async function tirarProcurador() {
    try { setProcurador(await definirProcurador(null)); await carregar(); }
    catch (x) { avisar(x instanceof Error ? x.message : "Erro.", "erro"); }
  }
  async function trocarModo(cnpj: string, modo: ModoBuscaNfse) {
    try { await definirModo(cnpj, modo); await carregar(); setMarcadas((m) => { const n = new Set(m); n.delete(cnpj); return n; }); }
    catch (x) { avisar(x instanceof Error ? x.message : "Erro.", "erro"); }
  }

  async function gravarAgenda() {
    if (!agenda) return;
    setSalvandoAgenda(true);
    try { setAgenda(await salvarAgenda(agenda.ativo, agenda.hora)); avisar("Agendamento salvo.", "sucesso"); }
    catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível salvar.", "erro"); }
    finally { setSalvandoAgenda(false); }
  }

  async function confirmarRecomeco() {
    if (!recomecar) return;
    try { await reiniciarCaptura(ambiente, recomecar.id); await carregar(); avisar("A próxima captura começa do início.", "sucesso"); }
    catch (x) { avisar(x instanceof Error ? x.message : "Erro.", "erro"); }
    finally { setRecomecar(null); }
  }
  async function baixar(tipo: "xml" | "excel") {
    const empresa = empresas.find((e) => e.id === cnpjVista);
    setBaixando(tipo);
    try {
      if (tipo === "xml") await baixarXmls(ambiente, cnpjVista, competencia, selecao.size ? [...selecao] : undefined);
      else await exportarExcel(empresa?.razao ?? "", formatarCnpj(empresa?.cnpj), competencia, selecao.size ? notas.filter((n) => selecao.has(n.chave)) : notas, selecao.size > 0);
    } catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível gerar o arquivo.", "erro"); }
    finally { setBaixando(""); }
  }
  async function abrirDanfse(chaves: string[]) {
    const aba = window.open("", "_blank");
    setBaixando("danfse");
    try {
      const bytes = await gerarDanfsePdf(await buscarXmls(ambiente, cnpjVista, chaves));
      mostrarPdf(bytes, aba, `DANFSe-${empresas.find((e) => e.id === cnpjVista)?.cnpj ?? ""}-${competencia}.pdf`);
    } catch (x) { aba?.close(); avisar(x instanceof Error ? x.message : "Não foi possível gerar o DANFSe.", "erro"); }
    finally { setBaixando(""); }
  }
  function alternarNota(chave: string) {
    setSelecao((m) => { const n = new Set(m); if (n.has(chave)) n.delete(chave); else n.add(chave); return n; });
  }

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return notas.filter((n) => (!papel || n.papel === papel) && (!q || `${n.numero} ${n.prest_nome} ${n.toma_nome} ${n.prest_doc} ${n.toma_doc} ${n.chave}`.toLowerCase().includes(q)));
  }, [notas, papel, busca]);
  const soma = (l: NotaNfse[], f: (n: NotaNfse) => number) => l.filter(valida).reduce((s, n) => s + f(n), 0);
  const prestadas = notas.filter((n) => n.papel === "prestador");
  const tomadas = notas.filter((n) => n.papel === "tomador");
  const naoValidas = notas.filter((n) => !valida(n)).length;
  const ocupado = !!progresso || !!verificando;
  const vista = empresas.find((e) => e.id === cnpjVista);
  const listadas = useMemo(() => { const q = filtroEmpresa.trim().toLowerCase(), n = q.replace(/\D/g, ""); return empresas.filter((e) => !q || e.razao.toLowerCase().includes(q) || (!!n && e.cnpj.includes(n))); }, [empresas, filtroEmpresa]);
  const todasVisiveis = visiveis.length > 0 && visiveis.every((n) => selecao.has(n.chave));
  function alternarTodas() {
    setSelecao((m) => { const n = new Set(m); visiveis.forEach((v) => { if (todasVisiveis) n.delete(v.chave); else n.add(v.chave); }); return n; });
  }
  const alvo = selecao.size ? `${selecao.size} selecionada(s)` : "todas";

  return (
    <>
      <PageHeader titulo="Captura de NFS-e" descricao="Baixa do Ambiente de Dados Nacional as notas prestadas e tomadas de cada empresa, usando o certificado da empresa ou o do procurador."
        acoes={<div className={styles.topoAcoes}><Select rotulo="Ambiente" value={ambiente} disabled={ocupado} onChange={(e) => { setAmbiente(e.target.value as AmbienteNfse); setCnpjVista(""); setMarcadas(new Set()); }}>
          <option value="producao">Produção</option><option value="restrita">Produção restrita (testes)</option></Select><IconButton dica="Procurador e captura automática" icone={<Settings size={16} />} onClick={() => setConfig(true)} /></div>} />
      {erro && <Notice tom="erro">{erro}</Notice>}
      {ambiente === "restrita" && <Notice tom="alerta">Produção restrita: as notas deste ambiente não têm validade fiscal e ficam separadas das de produção.</Notice>}

      {progresso && (
        <div className={styles.progresso} role="status">
          <b>{progresso.empresa}</b> · empresa {progresso.indice} de {progresso.total} · {progresso.notas} nota(s) e {progresso.eventos} evento(s) nesta captura
          <small>{progresso.texto} Pode continuar usando o sistema em outra aba; mantenha esta aberta.</small>
        </div>
      )}
      {relatorio.length > 0 && <ul className={styles.relatorio}>{relatorio.map((l) => <li key={l}>{l}</li>)}</ul>}
      <div className={styles.grade}>
        <aside className={styles.lateral}>
          <Input rotulo="Empresas" type="search" placeholder="Buscar por nome ou CNPJ" value={filtroEmpresa} onChange={(e) => setFiltroEmpresa(e.target.value)} />
          <small className={styles.total}>{listadas.length} de {empresas.length} empresas</small>
          <div className={styles.barraLista}>
            <Button tamanho="sm" onClick={() => setMarcadas(new Set(aptas.map((e) => e.id)))} disabled={ocupado || !aptas.length}>Marcar aptas</Button>
            <Button tamanho="sm" onClick={() => setMarcadas(new Set())} disabled={ocupado}>Limpar</Button>
          </div>
          {progresso
            ? <Button variante="danger" onClick={() => { parar.current = true; }}>Interromper</Button>
            : <Button variante="primary" onClick={() => void capturar()} disabled={!marcadas.size || !!verificando}>Capturar selecionadas ({marcadas.size})</Button>}
          {carregando ? <Loading /> : !empresas.length ? <p className={styles.vazio}>Nenhuma empresa. Cadastre a primeira em Administração &gt; Empresas.</p> : (
            <ul className={styles.listaEmpresas}>{listadas.map((e) => (
              <li key={e.id} className={`${styles.empresa} ${cnpjVista === e.id ? styles.empresaAtual : ""}`}>
                <input type="checkbox" aria-label={`Selecionar ${e.razao}`} checked={marcadas.has(e.id)} disabled={ocupado || !e.certificado || certVencido(e)} onChange={() => marcar(e.id)} />
                <button type="button" onClick={() => setCnpjVista(e.id)}>
                  <b>{e.razao || "(sem nome)"}</b><small>{formatarCnpj(e.cnpj)}</small>
                  <small className={e.ultimoErro || !e.certificado || certVencido(e) ? styles.alertaLista : ""}>{e.ultimoErro ? "Erro na última captura" : !e.certificado ? "Sem certificado" : certVencido(e) ? "Certificado vencido" : `${e.notas} nota(s)`}</small>
                </button>
              </li>
            ))}</ul>
          )}
        </aside>
        <div className={styles.detalhe}>
          {!vista ? <Card><p className={styles.vazio}>Selecione uma empresa na lista para ver as notas capturadas.</p></Card> : <>
            <Card>
              <div className={styles.cabecaEmpresa}>
                <div><h2>{vista.razao || "(sem nome)"}</h2><small>{formatarCnpj(vista.cnpj)}</small></div>
                <div className={styles.acoes}>
                  <IconButton dica="Diagnosticar conexão" icone={<Stethoscope size={16} />} disabled={ocupado || !vista.certificado} carregando={diagnosticando === vista.id} onClick={() => rodarDiagnostico(vista.id)} />
                  <IconButton dica="Recomeçar a busca" icone={<RotateCcw size={16} />} disabled={ocupado || vista.ultimoNsu === 0} onClick={() => setRecomecar(vista)} />
                  <Button variante="primary" disabled={ocupado || !vista.certificado || certVencido(vista)} onClick={() => void capturar([vista.id])}>Capturar notas</Button>
                </div>
              </div>
              <div className={styles.dadosEmpresa}>
                <Select rotulo="Buscar por" value={vista.modo} disabled={ocupado} onChange={(x) => void trocarModo(vista.id, x.target.value as ModoBuscaNfse)}><option value="certificado">Certificado da empresa</option><option value="procuracao">Procuração</option></Select>
                <div><span>Certificado</span>{!vista.certificado ? <Badge tom="alerta">{vista.modo === "procuracao" ? "cadastre o procurador" : "sem certificado"}</Badge> : certVencido(vista) ? <Badge tom="perigo">vencido em {dataBr(vista.certificado.validade)}</Badge> : <p>{vista.certificado.nome}<small>até {dataBr(vista.certificado.validade)}</small></p>}</div>
                <div><span>Última captura</span>{vista.ultimoErro ? <p className={styles.erro}>{vista.ultimoErro}</p> : vista.ultimaCaptura ? <p>{dataHora(vista.ultimaCaptura)}<small>NSU {vista.ultimoNsu}</small></p> : <p>Nunca</p>}</div>
                <div><span>Notas</span><p>{vista.notas}{vista.falhas > 0 && <> <Badge tom="perigo">{vista.falhas} com falha</Badge></>}</p></div>
              </div>
            </Card>
            <div className={styles.notas}><Card titulo="Notas capturadas" descricao="Totais sem canceladas e substituídas.">
          <div className={styles.filtros}>
            <Select rotulo="Competência" value={competencia} disabled={!competencias.length} onChange={(e) => void carregarNotas(cnpjVista, e.target.value)}>
              {competencias.map((c) => <option key={c.competencia} value={c.competencia}>{c.competencia.split("-").reverse().join("/")} ({c.notas})</option>)}
            </Select>
            <Select rotulo="Tipo" value={papel} onChange={(e) => setPapel(e.target.value as PapelNfse | "")}>
              <option value="">Todas</option><option value="prestador">Prestadas</option><option value="tomador">Tomadas</option><option value="intermediario">Intermediadas</option>
            </Select>
            <Input rotulo="Buscar" placeholder="Número, nome ou CNPJ" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          {falhas.length > 0 && <Notice tom="erro">{falhas.length} documento(s) não puderam ser lidos: {falhas.slice(0, 3).map((f) => `NSU ${f.nsu} (${f.motivo})`).join("; ")}{falhas.length > 3 ? "…" : ""} Use “Recomeçar” para tentar de novo.</Notice>}
          {notas.length > 0 && <>
            <div className={styles.kpis}>
              <KpiCard rotulo="Prestadas" valor={moeda(soma(prestadas, (n) => n.v_serv))} detalhe={`${prestadas.filter(valida).length} nota(s)`} />
              <KpiCard rotulo="Tomadas" valor={moeda(soma(tomadas, (n) => n.v_serv))} detalhe={`${tomadas.filter(valida).length} nota(s)`} />
              <KpiCard rotulo="ISS retido nas tomadas" valor={moeda(soma(tomadas, issRetido))} detalhe="tpRetISSQN 2 ou 3" />
              <KpiCard rotulo="Fora dos totais" valor={naoValidas} detalhe="canceladas e substituídas" />
            </div>
            <div className={styles.barra}>
              <Button tamanho="sm" variante="primary" carregando={baixando === "excel"} onClick={() => baixar("excel")}>Baixar Excel ({alvo})</Button>
              <Button tamanho="sm" carregando={baixando === "xml"} onClick={() => baixar("xml")}>Baixar XML ({alvo})</Button>
              <Button tamanho="sm" carregando={baixando === "danfse"} onClick={() => abrirDanfse(selecao.size ? [...selecao] : notas.map((n) => n.chave))}>DANFSe em PDF ({alvo})</Button>
              <Button tamanho="sm" disabled={ocupado} onClick={verificar}>{verificando ? `Verificando ${verificando}` : "Verificar cancelamentos"}</Button>
            </div>
          </>}
          {cnpjVista && (
            <DataTable linhas={visiveis} chaveLinha={(n) => n.chave} vazio="Nenhuma nota com esses filtros."
              colunas={[
                { chave: "sel", titulo: <input type="checkbox" aria-label="Selecionar todas" checked={todasVisiveis} onChange={alternarTodas} />, largura: "36px", render: (n) => <input type="checkbox" aria-label={`Selecionar nota ${n.numero}`} checked={selecao.has(n.chave)} onChange={() => alternarNota(n.chave)} /> },
                { chave: "n", titulo: "Número", render: (n) => <><b>{n.numero}</b><br /><small>{dataBr(n.emissao)} · {ROTULO_PAPEL[n.papel]}</small></> },
                { chave: "c", titulo: "Contraparte", render: (n) => { const p = n.papel === "prestador"; return <>{(p ? n.toma_nome : n.prest_nome) || "(sem nome)"}<br /><small>{formatarCnpj(p ? n.toma_doc : n.prest_doc)} · <span title={n.desc_nac}>serviço {n.trib_nac}</span></small></>; } },
                { chave: "v", titulo: "Valor", alinhar: "direita", render: (n) => <>{moeda(n.v_serv)}{n.v_total_ret > 0 && <><br /><small>retenções {moeda(n.v_total_ret)}</small></>}</> },
                { chave: "i", titulo: "ISS", alinhar: "direita", render: (n) => <>{moeda(n.v_iss)}<br /><small>{ROTULO_RET_ISS[n.tp_ret_iss] ?? ""}</small></> },
                { chave: "x", titulo: "Situação", render: (n) => <Badge tom={tomSituacao[n.situacao]}>{ROTULO_SITUACAO[n.situacao]}</Badge> },
                { chave: "d", titulo: "", alinhar: "direita", render: (n) => <IconButton dica="Abrir DANFSe" icone={<FileText size={16} />} disabled={baixando === "danfse"} onClick={() => abrirDanfse([n.chave])} /> },
              ]} />
          )}
        </Card></div>
          </>}
        </div>
      </div>

      <Modal aberto={config} titulo="Configurações da captura" largura="lg" onFechar={() => setConfig(false)}>
      <div className={styles.notas}>
        <Card titulo="Certificado do procurador" descricao="Usado nas empresas marcadas com “Procuração”. Cada cliente precisa dar a procuração eletrônica para a NFS-e ao titular deste certificado, no Portal de Serviços da Receita Federal.">
          {procurador
            ? <p className={styles.procurador}><b>{procurador.nome}</b> · {procurador.documento} · {procurador.validade < hoje() ? <Badge tom="perigo">vencido em {dataBr(procurador.validade)}</Badge> : `até ${dataBr(procurador.validade)}`} <Button tamanho="sm" disabled={ocupado} onClick={tirarProcurador}>Retirar</Button></p>
            : <Notice tom="alerta">Nenhum certificado de procurador cadastrado.</Notice>}
          <div className={styles.procForm}>
            <Input key={procChave} rotulo={procurador ? "Trocar certificado (.pfx ou .p12)" : "Arquivo do certificado (.pfx ou .p12)"} type="file" accept=".pfx,.p12" onChange={(e) => setProcArquivo(e.target.files?.[0] ?? null)} />
            <Input rotulo="Senha do certificado" type="password" autoComplete="new-password" value={procSenha} onChange={(e) => setProcSenha(e.target.value)} />
            <Input rotulo="Apelido (opcional)" placeholder="Ex.: e-CNPJ do escritório" value={procApelido} onChange={(e) => setProcApelido(e.target.value)} />
            <Button variante="primary" carregando={enviandoProc} onClick={enviarProcurador}>Cadastrar procurador</Button>
          </div>
        </Card>
      </div>

      {agenda && (
        <div className={styles.notas}>
          <Card titulo="Captura automática" descricao="Roda no servidor, no horário de Brasília e em produção, para as empresas com certificado válido, sem precisar deixar o sistema aberto. A busca manual continua disponível.">
            <div className={styles.agenda}>
              <label className={styles.check}><input type="checkbox" checked={agenda.ativo} onChange={(e) => setAgenda({ ...agenda, ativo: e.target.checked })} /> Capturar todo dia</label>
              <Input rotulo="Horário" type="time" value={agenda.hora} onChange={(e) => setAgenda({ ...agenda, hora: e.target.value })} />
              <Button variante="primary" carregando={salvandoAgenda} onClick={gravarAgenda}>Salvar</Button>
            </div>
            <p className={styles.agendaInfo}>{agenda.status === "rodando" ? `Em andamento desde ${dataHora(agenda.inicio)}.` : agenda.fim ? `Última execução: ${dataHora(agenda.fim)}.` : "Ainda não executada."}</p>
            {agenda.linhas.length > 0 && <ul className={styles.relatorioAgenda}>{agenda.linhas.map((l) => <li key={l}>{l}</li>)}</ul>}
          </Card>
        </div>
      )}

      </Modal>

      <Modal aberto={!!diagnostico} titulo="Diagnóstico da conexão" largura="lg" onFechar={() => setDiagnostico(null)}
        rodape={<Button onClick={() => { void navigator.clipboard.writeText((diagnostico ?? []).join("\n")); avisar("Diagnóstico copiado.", "sucesso"); }}>Copiar</Button>}>
        <pre className={styles.diagnostico}>{(diagnostico ?? []).join("\n")}</pre>
      </Modal>
      <ConfirmDialog aberto={!!recomecar} titulo="Recomeçar captura" confirmar="Recomeçar" onConfirmar={confirmarRecomeco} onCancelar={() => setRecomecar(null)}>
        <p>A próxima captura de <b>{recomecar?.razao}</b> relê todos os documentos desde o início. As notas guardadas não duplicam, mas a leitura pode demorar.</p>
      </ConfirmDialog>
    </>
  );
}
