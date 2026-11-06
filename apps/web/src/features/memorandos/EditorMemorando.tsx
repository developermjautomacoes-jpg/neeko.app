"use client";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, Button, Card, Input, Loading, Modal, Notice, PageHeader, Select, useToast } from "@neeko/ui";
import { eu } from "@/services/conta";
import { alterarMemorando, consultarCnpj, consultarIe, criarMemorando, equipe, lerMemorando, type MemorandoCompleto } from "@/services/fiscal";
import { baixarMemo, memoPdf } from "./documentos";
import { EMISSOES, FERRAMENTAS, anexoLabel, anexosAtuais, anexosAuto, carregarTabela, contatoVazio, dig, docInvalido, ehSimples, fmtCnae, fmtCnpj, fmtDoc, infoCnae, memoVazio, normalizarReceita, numeroTxt, parseNumero, servicos, type Memo, type Socio, type Tabela } from "./regras";
import styles from "./editor.module.css";

function Secao({ n, titulo, dica, children }: { n?: number; titulo: string; dica?: string; children: ReactNode }) {
  return <Card titulo={<>{n && <span className={styles.n}>{n}</span>}{titulo}</>} descricao={dica}>{children}</Card>;
}
function Chips({ lista, marcadas, alternar, rotulo = (x: string) => x }: { lista: string[]; marcadas: string[]; alternar: (v: string) => void; rotulo?: (x: string) => string }) {
  return <div className={styles.chips}>{lista.map((x) => { const on = marcadas.includes(x); return <label key={x} className={on ? styles.chipOn : styles.chip}><input type="checkbox" checked={on} onChange={() => alternar(x)} />{rotulo(x)}</label>; })}</div>;
}

export function EditorMemorando({ id }: { id?: string }) {
  const avisar = useToast(), router = useRouter(), params = useSearchParams();
  const [T, setT] = useState<Tabela | null>(null);
  const [d, setD] = useState<Memo>(memoVazio);
  const [registro, setRegistro] = useState<MemorandoCompleto | null>(null);
  const [numero, setNumero] = useState("");
  const [team, setTeam] = useState<string[]>([]);
  const [pode, setPode] = useState(true);
  const [q, setQ] = useState(params?.get("cnpj") ? fmtCnpj(params.get("cnpj") ?? "") : "");
  const [status, setStatus] = useState("");
  const [ieInfo, setIeInfo] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState("");
  const [previa, setPrevia] = useState("");
  const [novoCnae, setNovoCnae] = useState("");
  const [novoSv, setNovoSv] = useState({ item: "", desc: "", anexo: "" });
  const [novoDep, setNovoDep] = useState("");
  const set = useCallback((c: Partial<Memo>) => setD((x) => ({ ...x, ...c })), []);
  useEffect(() => {
    carregarTabela().then(setT).catch(() => setErro("Não foi possível carregar a tabela CNAE."));
    equipe().then(setTeam).catch(() => undefined);
    eu().then((p) => setPode(p.permissions.includes("memoranda.manage"))).catch(() => undefined);
    if (id) lerMemorando(id).then((m) => { setRegistro(m); setD({ ...memoVazio(), ...(m.data as Partial<Memo>) }); setNumero(numeroTxt(m.seq, m.ano)); }).catch((x: Error) => setErro(x.message));
    else if (params?.get("cnpj")) set({ e_cnpj: fmtCnpj(params.get("cnpj") ?? "") });
  }, [id, params, set]);
  useEffect(() => () => { if (previa) URL.revokeObjectURL(previa); }, [previa]);
  const campo = (k: string, rotulo: string, extra: Record<string, unknown> = {}) => <Input rotulo={rotulo} value={String(d[k] ?? "")} disabled={!pode} onChange={(e) => set({ [k]: e.target.value })} {...extra} />;
  const anos = useMemo(() => +String(d.m_data || new Date().toISOString()).slice(0, 4), [d.m_data]);

  async function buscarIe(cnpj: string, endereco: string, auto: boolean) {
    setIeInfo("Consultando a SEFAZ…");
    try {
      const r = await consultarIe(cnpj, /\/([A-Z]{2})\b/.exec(endereco)?.[1] ?? "ES");
      if (!r.cadastros.length) { setIeInfo(`SEFAZ: ${r.cStat ? `${r.cStat} – ` : ""}${r.xMotivo || "sem inscrição estadual encontrada"}`); return; }
      const h = r.cadastros.find((x) => x.situacao === "Habilitado") ?? r.cadastros[0];
      setD((x) => (x.e_ie?.trim() && auto ? x : { ...x, e_ie: h.ie }));
      setIeInfo(`SEFAZ: IE ${h.ie} · ${h.situacao}${h.regime ? ` · ${h.regime}` : ""}`);
    } catch (x) { setIeInfo(auto ? "" : `SEFAZ: ${x instanceof Error ? x.message : "não foi possível consultar"}`); }
  }
  async function buscar() {
    const c = dig(q); if (c.length !== 14) { setStatus("Digite os 14 dígitos do CNPJ."); return; }
    setStatus("Consultando…");
    try {
      const o = normalizarReceita(await consultarCnpj(c));
      setD((x) => {
        const por = new Map(x.socios.map((s) => [s.nome.trim().toUpperCase(), s]));
        return { ...x, e_razao: o.razao || x.e_razao, e_fantasia: o.fantasia || x.e_fantasia, e_cnpj: o.cnpj || x.e_cnpj, e_abertura: o.abertura || x.e_abertura, e_situacao: o.situacao || x.e_situacao, e_natureza: o.natureza || x.e_natureza, e_capital: o.capital || x.e_capital, e_endereco: o.endereco || x.e_endereco, e_tel: o.tel || x.e_tel, e_email: o.email || x.e_email, t_simples: o.simples || x.t_simples, t_regime: o.regime || x.t_regime,
          socios: o.socios.length ? o.socios.map((n) => ({ ...n, cpf: por.get(n.nome.trim().toUpperCase())?.cpf || n.cpf })) : x.socios, ...(o.cnaes.length ? { atividades: o.cnaes, svOff: {}, anexosManual: null } : {}) };
      });
      setStatus(`Dados carregados: ${o.razao ?? ""} · ${o.cnaes.length} CNAE(s) · ${o.socios.length} sócio(s)${o.regimeDica ? ". Última declaração no Lucro Real: informe se é anual ou trimestral" : ""}.`);
      void buscarIe(c, o.endereco ?? "", true);
    } catch (x) { setStatus(x instanceof Error ? x.message : "Não foi possível consultar."); }
  }
  function numeroValido() { if (!numero.trim()) return null; const n = parseNumero(numero, anos); if (!n) throw new Error("Número inválido. Use, por exemplo, 05/2026."); return n; }
  async function salvar() {
    setSalvando("salvar");
    try {
      const n = numeroValido();
      if (id) { const m = await alterarMemorando(id, d, n); setRegistro(m); setNumero(numeroTxt(m.seq, m.ano)); avisar("Cadastro salvo.", "sucesso"); }
      else { const m = await criarMemorando(d, n); avisar(`Empresa cadastrada no memorando Nº ${numeroTxt(m.seq, m.ano)}.`, "sucesso"); router.replace(`/empresas/${m.id}`); }
    } catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível salvar.", "erro"); }
    finally { setSalvando(""); }
  }
  const numeros = () => { const n = parseNumero(numero, anos); return { seq: n?.seq ?? registro?.seq ?? 0, ano: n?.ano ?? registro?.ano ?? anos }; };
  async function visualizar() {
    setSalvando("previa");
    try { const n = numeros(); setPrevia(URL.createObjectURL(await memoPdf(d, n.seq, n.ano, registro?.status === "cancelado"))); }
    catch { avisar("Não foi possível gerar a prévia.", "erro"); }
    finally { setSalvando(""); }
  }
  async function arquivo(t: "pdf" | "docx") {
    setSalvando(t);
    try { const n = numeros(); await baixarMemo(t, d, n.seq, n.ano, registro?.status === "cancelado"); }
    catch { avisar("Não foi possível gerar o arquivo.", "erro"); }
    finally { setSalvando(""); }
  }
  function incluirCnae() {
    if (!T) return;
    const c = dig(novoCnae).padStart(7, "0"); if (dig(novoCnae).length < 5) { avisar("Informe o CNAE.", "erro"); return; }
    if (d.atividades.some((a) => a.cod === c)) { avisar("Esse CNAE já está na lista.", "erro"); return; }
    set({ atividades: [...d.atividades, { cod: c, desc: infoCnae(T, c).desc, tipo: "Incluída", on: true }] }); setNovoCnae("");
  }
  if (erro) return <Notice tom="erro">{erro}</Notice>;
  if (!T || (id && !registro)) return <Loading />;
  const cur = anexosAtuais(T, d), auto = anexosAuto(T, d), sv = servicos(T, d), reg = d.t_regime ?? "";
  const fr = d.atividades.filter((a) => a.on && infoCnae(T, a.cod).fatorR).map((a) => fmtCnae(a.cod)), semAnexo = d.atividades.filter((a) => a.on && !infoCnae(T, a.cod).anexos.length).map((a) => fmtCnae(a.cod));
  const socio = (i: number, c: Partial<Socio>) => set({ socios: d.socios.map((s, k) => (k === i ? { ...s, ...c } : s)) });
  const contato = (i: number, c: Partial<Memo["contatos"][number]>) => set({ contatos: d.contatos.map((s, k) => (k === i ? { ...s, ...c } : s)) });
  const dep = (i: number, c: Partial<Memo["deps"][number]>) => set({ deps: d.deps.map((s, k) => (k === i ? { ...s, ...c } : s)) });
  return (
    <>
      <PageHeader titulo={id ? (d.e_razao || "Cadastro da empresa") : "Nova empresa"} descricao={id ? `Memorando Nº ${registro ? numeroTxt(registro.seq, registro.ano) : ""}` : "Cadastro da empresa. Ao salvar, ela entra na carteira e na captura de notas."} acoes={<Link href="/memorandos" className={styles.voltar}>Voltar à lista</Link>} />
      {registro?.status === "cancelado" && <Notice tom="alerta">Este memorando está cancelado.</Notice>}
      {registro?.clientStatus === "inativa" && <Notice tom="alerta">Este cliente saiu da carteira.</Notice>}
      <fieldset className={styles.corpo} disabled={!pode}>
        {!id && <Secao n={1} titulo="Consulta do CNPJ" dica="Busca razão social, abertura, atividades, endereço, sócios e situação no Simples. Anexo e código de serviço saem da tabela CNAE.">
          <div className={styles.linha}><Input rotulo="CNPJ" inputMode="numeric" placeholder="00.000.000/0000-00" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void buscar(); } }} /><Button variante="primary" onClick={buscar}>Buscar CNPJ</Button></div>
          {status && <p className={styles.status} role="status">{status}</p>}
        </Secao>}
        <Secao n={2} titulo="Memorando"><div className={styles.g4}>
          <Input rotulo="Número" placeholder="Automático" dica="Em branco usa o próximo do ano." value={numero} onChange={(e) => setNumero(e.target.value)} />{campo("m_data", "Data do memorando", { type: "date" })}<div className={styles.s2}>{campo("m_assunto", "Assunto")}</div>
        </div></Secao>
        <Secao n={3} titulo="Dados da empresa"><div className={styles.g4}>
          <div className={styles.s4}>{campo("e_razao", "Nome (razão social)")}</div><div className={styles.s2}>{campo("e_fantasia", "Nome fantasia")}</div>{campo("e_cnpj", "CNPJ", id ? { disabled: true, dica: "Não muda depois de salvo." } : {})}{campo("e_abertura", "Data de abertura", { type: "date" })}{campo("e_desde", "Cliente desde", { type: "date" })}{campo("e_situacao", "Situação cadastral")}<div className={styles.s2}>{campo("e_natureza", "Natureza jurídica")}</div>{campo("e_capital", "Capital social")}{campo("e_nire", "NIRE")}
          <div><Input rotulo="Inscrição estadual" value={d.e_ie ?? ""} onChange={(e) => set({ e_ie: e.target.value })} dica={ieInfo} /><Button tamanho="sm" onClick={() => void buscarIe(dig(d.e_cnpj), d.e_endereco ?? "", false)}>Buscar na SEFAZ</Button></div>
          {campo("e_im", "Inscrição municipal")}<div className={styles.s4}>{campo("e_endereco", "Endereço")}</div>{campo("e_tel", "Telefone da empresa")}<div className={styles.s2}>{campo("e_email", "E-mail da empresa")}</div>
        </div>
          <h4 className={styles.sub}>Quadro societário</h4>
          {d.socios.length === 0 && <p className={styles.vazio}>Sem sócios. A consulta do CNPJ preenche o quadro.</p>}
          {d.socios.map((s, i) => <div key={i} className={styles.linhaSocio}>
            <Input rotulo="Nome" value={s.nome} onChange={(e) => socio(i, { nome: e.target.value })} /><Input rotulo="CPF / CNPJ" value={s.cpf} placeholder={s.cpfReceita || "000.000.000-00"} erro={docInvalido(s.cpf) ? "Documento inválido" : undefined} onChange={(e) => socio(i, { cpf: e.target.value })} onBlur={(e) => socio(i, { cpf: fmtDoc(e.target.value) })} /><Input rotulo="Qualificação" value={s.qualificacao} onChange={(e) => socio(i, { qualificacao: e.target.value })} /><Input rotulo="Entrada" type="date" value={s.entrada} onChange={(e) => socio(i, { entrada: e.target.value })} /><Button tamanho="sm" variante="danger" aria-label="Remover sócio" onClick={() => set({ socios: d.socios.filter((_, k) => k !== i) })}>Remover</Button>
          </div>)}
          <Button tamanho="sm" onClick={() => set({ socios: [...d.socios, { nome: "", cpf: "", qualificacao: "", entrada: "" }] })}>Adicionar sócio</Button>
        </Secao>
        <Secao n={4} titulo="Regime tributário"><div className={styles.g4}>
          <Select rotulo="Opção tributária" value={reg} onChange={(e) => set({ t_regime: e.target.value })}><option value="">Selecionar…</option><optgroup label="Simples Nacional"><option>Simples Nacional</option><option>MEI (SIMEI)</option></optgroup><optgroup label="Regime normal"><option>Lucro Presumido</option><option>Lucro Real Trimestral</option><option>Lucro Real Anual</option><option>Lucro Arbitrado</option></optgroup><optgroup label="Outros"><option>Imune / Isenta</option></optgroup></Select>
          {reg === "Simples Nacional" && <Select rotulo="Simples: IBS/CBS" value={d.t_modalidade ?? ""} onChange={(e) => set({ t_modalidade: e.target.value })}><option value="">Selecionar…</option><option value="Puro">Puro (IBS/CBS dentro do DAS)</option><option value="Híbrido">Híbrido (IBS/CBS pelo regime regular)</option></Select>}
          <div className={styles.s2}>{campo("t_simples", "Situação no Simples (Receita)")}</div>
        </div>
          {!reg && <Notice tom="alerta">Informe a opção tributária da empresa.</Notice>}
          {reg === "Simples Nacional" && !d.t_modalidade && <Notice tom="alerta">Informe se a empresa do Simples é Puro ou Híbrido.</Notice>}
          {/simples/i.test(reg) && <><h4 className={styles.sub}>Anexos do Simples Nacional <small>{d.anexosManual ? "· marcados manualmente" : auto.length ? "· sugeridos pelos CNAEs" : ""}</small></h4>
            <Chips lista={["I", "II", "III", "IV", "V"]} marcadas={cur} rotulo={(a) => `Anexo ${a}`} alternar={(a) => set({ anexosManual: ["I", "II", "III", "IV", "V"].filter((x) => (x === a ? !cur.includes(x) : cur.includes(x))) })} />
            {d.anexosManual && <Button tamanho="sm" onClick={() => set({ anexosManual: null })}>Voltar à sugestão</Button>}
            {fr.length > 0 && <p className={styles.vazio}>Sujeito ao fator r: {fr.join(", ")} (Anexo V, ou III se a folha for ≥ 28% da receita).</p>}
            {semAnexo.length > 0 && <Notice tom="alerta">Sem anexo definido na tabela: {semAnexo.join(", ")}. Marque o anexo correspondente.</Notice>}</>}
        </Secao>
        <Secao n={5} titulo="Atividades que podem ser exercidas" dica="CNAE principal e secundários. Desmarque o que não deve sair no memorando.">
          <div className={styles.tabela}><table><thead><tr><th /><th>CNAE</th><th>Atividade</th><th>Anexo</th><th>Cód. serviço</th></tr></thead><tbody>
            {d.atividades.length === 0 && <tr><td colSpan={5}>Busque o CNPJ ou inclua os CNAEs manualmente.</td></tr>}
            {d.atividades.map((a, ix) => { const i = infoCnae(T, a.cod); return <tr key={a.cod} className={a.on ? "" : styles.off}><td><input type="checkbox" aria-label={`Incluir CNAE ${fmtCnae(a.cod)}`} checked={a.on} onChange={() => set({ atividades: d.atividades.map((x, k) => (k === ix ? { ...x, on: !x.on } : x)) })} /></td><td>{fmtCnae(a.cod)}<br /><small>{a.tipo}</small></td><td>{a.desc || i.desc}{i.origem !== "tabela" && i.origem !== "verificar" && <><br /><small>Anexo {i.origem.startsWith("pelo") ? "" : "pela "}{i.origem}</small></>}</td><td><Badge tom={i.origem === "verificar" ? "alerta" : "sucesso"}>{anexoLabel(i)}</Badge></td><td>{i.itens.join(", ") || "—"}</td></tr>; })}
          </tbody></table></div>
          <div className={styles.linha}><Input rotulo="Incluir CNAE" placeholder="0000-0/00" value={novoCnae} onChange={(e) => setNovoCnae(e.target.value)} /><Button onClick={incluirCnae}>Incluir</Button></div>
        </Secao>
        <Secao n={6} titulo="Códigos de serviço (LC 116)" dica="Montado a partir dos CNAEs marcados, com o anexo da natureza do serviço.">
          <div className={styles.tabela}><table><thead><tr><th /><th>Código</th><th>Descrição</th><th>Anexo</th><th>ISS</th></tr></thead><tbody>
            {sv.length === 0 && <tr><td colSpan={5}>Nenhum código de serviço nas atividades marcadas.</td></tr>}
            {sv.map((s) => <tr key={s.k} className={s.on ? "" : styles.off}><td>{s.extra ? <Button tamanho="sm" variante="danger" aria-label="Remover código" onClick={() => set({ svExtra: d.svExtra.filter((_, k) => k !== s.ix) })}>Remover</Button> : <input type="checkbox" aria-label={`Incluir código ${s.item}`} checked={s.on} onChange={() => { const n = { ...d.svOff }; if (s.on) n[s.k] = true; else delete n[s.k]; set({ svOff: n }); }} />}</td><td><b>{s.item}</b></td><td>{s.desc || "—"}</td><td>{s.anexo || "—"}</td><td>{s.iss}</td></tr>)}
          </tbody></table></div>
          <div className={styles.linha}><Input rotulo="Código" placeholder="00.00" value={novoSv.item} onChange={(e) => setNovoSv({ ...novoSv, item: e.target.value })} /><Input rotulo="Descrição" value={novoSv.desc} onChange={(e) => setNovoSv({ ...novoSv, desc: e.target.value })} /><Select rotulo="Anexo" value={novoSv.anexo} onChange={(e) => setNovoSv({ ...novoSv, anexo: e.target.value })}><option />{["I", "II", "III", "IV", "V"].map((a) => <option key={a}>{a}</option>)}</Select><Button onClick={() => { if (!novoSv.item.trim()) return; set({ svExtra: [...d.svExtra, novoSv] }); setNovoSv({ item: "", desc: "", anexo: "" }); }}>Incluir</Button></div>
        </Secao>
        <Secao n={7} titulo="Departamentos e responsáveis" dica="Marque os setores que vão atender a empresa e quem é o responsável.">
          <datalist id="equipe">{team.map((n) => <option key={n} value={n} />)}</datalist>
          {d.deps.map((x, i) => <div key={x.nome} className={styles.dep}><label className={x.on ? styles.chipOn : styles.chip}><input type="checkbox" checked={x.on} onChange={() => dep(i, { on: !x.on })} />{x.nome}</label><input className={styles.campo} list="equipe" aria-label={`Responsável ${x.nome}`} placeholder="Responsável" disabled={!x.on} value={x.resp} onChange={(e) => dep(i, { resp: e.target.value })} /></div>)}
          <div className={styles.linha}><Input rotulo="Outro setor" placeholder="Ex.: Planejamento tributário" value={novoDep} onChange={(e) => setNovoDep(e.target.value)} /><Button onClick={() => { const n = novoDep.trim(); if (!n || d.deps.some((x) => x.nome === n)) return; set({ deps: [...d.deps, { nome: n, on: true, resp: "" }] }); setNovoDep(""); }}>Incluir setor</Button></div>
        </Secao>
        <Secao n={8} titulo="Contatos da empresa" dica="Para cada contato, marque os setores com quem ele vai tratar.">
          {d.contatos.map((c, i) => <div key={i} className={styles.contato}><div className={styles.g4}><Input rotulo="Nome" value={c.nome} onChange={(e) => contato(i, { nome: e.target.value })} /><Input rotulo="Cargo" value={c.cargo} onChange={(e) => contato(i, { cargo: e.target.value })} /><Input rotulo="Telefone / WhatsApp" value={c.telefone} onChange={(e) => contato(i, { telefone: e.target.value })} /><Input rotulo="E-mail" value={c.email} onChange={(e) => contato(i, { email: e.target.value })} /></div><Chips lista={d.deps.map((x) => x.nome)} marcadas={c.setores} alternar={(n) => contato(i, { setores: c.setores.includes(n) ? c.setores.filter((x) => x !== n) : [...c.setores, n] })} />{d.contatos.length > 1 && <Button tamanho="sm" variante="danger" onClick={() => set({ contatos: d.contatos.filter((_, k) => k !== i) })}>Remover</Button>}</div>)}
          <Button tamanho="sm" onClick={() => set({ contatos: [...d.contatos, contatoVazio()] })}>Adicionar contato</Button>
        </Secao>
        <Secao n={9} titulo="Rotinas, acessos e obrigações" dica="O memorando fica visível para a equipe. Em vez de senhas, informe onde estão guardadas (ex.: salva no cofre).">
          <div className={styles.g4}>{campo("r_prolabore", "Pró-labore")}{campo("r_folha", "Folha de pagamento")}{campo("r_cert", "Certificado digital", { placeholder: "Ex.: A1 salvo na pasta" })}{campo("r_dominio", "Domínio", { placeholder: "Ex.: cadastro básico" })}{campo("r_sintegra", "Sintegra")}
            <Select rotulo="SPED Contábil" value={String(d.r_spedc ?? "")} onChange={(e) => set({ r_spedc: e.target.value })}><option /><option>Sim</option><option>Não</option></Select><Select rotulo="SPED Fiscal" value={String(d.r_spedf ?? "")} onChange={(e) => set({ r_spedf: e.target.value })}><option /><option>Sim</option><option>Não</option></Select>
            {campo("r_loginNfse", "Login NFS-e")}{campo("r_senhaNfse", "Senha NFS-e", { placeholder: "Ex.: salva no cofre" })}{campo("r_codSimples", "Código de acesso do Simples", { placeholder: "Ex.: salvo no cofre" })}{campo("r_sefaz", "Senha SEFAZ-ES AGV", { placeholder: "Ex.: salva no cofre" })}{campo("r_cpfAdm", "CPF administrador")}{campo("r_pis", "PIS")}<div className={styles.s4}>{campo("r_docs", "Os documentos da empresa se encontram digitalizados em")}</div></div>
          <h4 className={styles.sub}>Ferramentas a serem configuradas</h4><Chips lista={FERRAMENTAS} marcadas={d.ferramentas} alternar={(f) => set({ ferramentas: d.ferramentas.includes(f) ? d.ferramentas.filter((x) => x !== f) : FERRAMENTAS.filter((x) => x === f || d.ferramentas.includes(x)) })} />
          <h4 className={styles.sub}>Fará a emissão de</h4><Chips lista={EMISSOES} marcadas={d.emissao} alternar={(e) => set({ emissao: d.emissao.includes(e) ? d.emissao.filter((x) => x !== e) : e === "Não emite" ? ["Não emite"] : [...d.emissao.filter((x) => x !== "Não emite"), e] })} />
        </Secao>
        <Secao n={10} titulo="Observações"><textarea aria-label="Observações" className={styles.texto} rows={7} value={d.obs ?? ""} onChange={(e) => set({ obs: e.target.value })} /></Secao>
        {registro && registro.history.length > 0 && <Card titulo="Histórico do memorando"><ol className={styles.hist}>{[...registro.history].reverse().map((h, i) => <li key={i}><b>{h.acao}</b>{h.campos?.length ? `: ${h.campos.join(", ")}` : ""}<br /><small>{h.por} · {new Date(h.em).toLocaleString("pt-BR")}</small></li>)}</ol></Card>}
      </fieldset>
      <div className={styles.acoes}>
        {pode && <Button variante="primary" carregando={salvando === "salvar"} onClick={salvar}>Salvar cadastro</Button>}
        <Button carregando={salvando === "previa"} onClick={visualizar}>Visualizar memorando</Button>
        <Button carregando={salvando === "pdf"} onClick={() => arquivo("pdf")}>Exportar memorando em PDF</Button>
        <Button carregando={salvando === "docx"} onClick={() => arquivo("docx")}>Exportar memorando em Word</Button>
      </div>
      <Modal aberto={!!previa} titulo="Prévia do memorando" largura="lg" onFechar={() => setPrevia("")}><iframe title="Prévia do memorando" src={previa} className={styles.previa} /></Modal>
    </>
  );
}
