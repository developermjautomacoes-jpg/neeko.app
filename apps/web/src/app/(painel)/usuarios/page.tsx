"use client";
import { KeyRound, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog, Badge, Button, Card, DataTable, Input, Loading, Modal, Notice, PageHeader, Select, useToast, IconButton } from "@neeko/ui";
import { formatarCnpj } from "@/lib/format";
import { excluirUsuario, salvarDados, alterarUsuario, criarUsuario, eu, listarUsuarios, redefinirSenha, type Eu, type Usuario } from "@/services/conta";
import { listarEmpresas } from "@/services/fiscal";
import type { EmpresaNfse } from "@/types/nfse";
import styles from "../pagina.module.css";

const NOMES: Record<string, string> = {
  "companies.read": "Ver empresas", "companies.manage": "Gerenciar empresas", "fiscal.documents.read": "Ver e baixar notas", "fiscal.capture": "Capturar notas", "fiscal.credentials.manage": "Gerenciar certificados",
  "fiscal.ciencia.send": "Registrar ciência da operação", "fiscal.schedule.manage": "Configurar captura noturna", "users.manage": "Gerenciar usuários", "audit.read": "Ver auditoria", "memoranda.read": "Ver cadastro de empresas", "memoranda.manage": "Cadastrar e alterar empresas", "office.manage": "Alterar perfil do escritório", "companies.restricted": "Ver a empresa do próprio escritório",
};
const PAPEIS: Record<string, string> = { ORG_OWNER: "Proprietária", ORG_ADMIN: "Administração", STAFF: "Colaborador", COMPANY_USER: "Usuário de empresa" };
interface Form { id?: string; jobTitle: string; name: string; email: string; senhaProvisoria: string; role: string; status: string; permissions: string[]; allCompanies: boolean; companyIds: string[] }
const vazio: Form = { jobTitle: "", name: "", email: "", senhaProvisoria: "", role: "STAFF", status: "ACTIVE", permissions: ["companies.read", "fiscal.documents.read", "memoranda.read"], allCompanies: false, companyIds: [] };
const alternar = (l: string[], v: string) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]);

export default function Usuarios() {
  const avisar = useToast();
  const [lista, setLista] = useState<Usuario[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaNfse[]>([]);
  const [pessoa, setPessoa] = useState<Eu | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [excluindo, setExcluindo] = useState<Usuario | null>(null);
  const [redefinir, setRedefinir] = useState<Usuario | null>(null);
  const [senhaNova, setSenhaNova] = useState("");
  const [salvando, setSalvando] = useState(false);
  const carregar = useCallback(async () => {
    try { const [u, e, p] = await Promise.all([listarUsuarios(), listarEmpresas("producao").catch(() => []), eu()]); setLista(u); setEmpresas(e); setPessoa(p); }
    catch (x) { setErro(x instanceof Error ? x.message : "Não foi possível carregar."); }
    finally { setCarregando(false); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);
  const soDados = !!form && (form.role === "ORG_OWNER" || form.email === pessoa?.email);
  async function salvar() {
    if (!form) return;
    setSalvando(true);
    try {
      const { role, status, permissions, allCompanies, companyIds } = form;
      if (form.id) {
        await salvarDados(form.id, { name: form.name, email: form.email, jobTitle: form.jobTitle });
        if (!soDados) await alterarUsuario(form.id, { role, status, permissions, allCompanies, companyIds });
      }
      else await criarUsuario({ jobTitle: form.jobTitle, name: form.name, email: form.email, senhaProvisoria: form.senhaProvisoria, role, permissions, allCompanies, companyIds });
      setForm(null); await carregar(); avisar("Usuário salvo.", "sucesso");
    } catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível salvar.", "erro"); }
    finally { setSalvando(false); }
  }
  async function excluir() {
    if (!excluindo) return;
    try { await excluirUsuario(excluindo.id); await carregar(); avisar("Usuário excluído.", "sucesso"); }
    catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível excluir.", "erro"); } finally { setExcluindo(null); }
  }
  async function salvarSenha() {
    if (!redefinir) return;
    setSalvando(true);
    try { await redefinirSenha(redefinir.id, senhaNova); setRedefinir(null); setSenhaNova(""); await carregar(); avisar("Senha provisória definida. Ela será trocada no próximo acesso.", "sucesso"); }
    catch (x) { avisar(x instanceof Error ? x.message : "Não foi possível redefinir.", "erro"); }
    finally { setSalvando(false); }
  }
  return (
    <>
      <PageHeader titulo="Usuários" descricao="Cada pessoa entra com o próprio e-mail e a própria senha. Você define só uma senha provisória, trocada por ela no primeiro acesso."
        acoes={<Button variante="primary" onClick={() => setForm({ ...vazio })}>Novo usuário</Button>} />
      {erro && <Notice tom="erro">{erro}</Notice>}
      <Card semPadding titulo="Pessoas da organização">
        {carregando ? <Loading /> : <DataTable linhas={lista} chaveLinha={(u) => u.id} vazio="Nenhum usuário."
          colunas={[
            { chave: "n", titulo: "Pessoa", render: (u) => <><b>{u.name}</b><br /><small>{u.email}</small></> },
            { chave: "p", titulo: "Papel", render: (u) => PAPEIS[u.role] ?? u.role },
            { chave: "c", titulo: "Cargo", render: (u) => u.jobTitle || "—" },
            { chave: "e", titulo: "Empresas", render: (u) => (u.allCompanies ? "Todas" : u.companyIds.length) },
            { chave: "s", titulo: "Situação", render: (u) => u.status === "SUSPENDED" ? <Badge tom="perigo">suspenso</Badge> : u.mustChangePassword ? <Badge tom="alerta">senha provisória</Badge> : <Badge tom="sucesso">ativo</Badge> },
            { chave: "a", titulo: "", alinhar: "direita", render: (u) => <div className={styles.acoes}>
              {(u.role !== "ORG_OWNER" || u.email === pessoa?.email || pessoa?.organization?.role === "ORG_ADMIN") && <IconButton dica="Editar" icone={<Pencil size={16} />} onClick={() => setForm({ ...vazio, ...u, senhaProvisoria: "" })} />}
              {u.role !== "ORG_OWNER" && <IconButton dica="Redefinir senha" icone={<KeyRound size={16} />} onClick={() => setRedefinir(u)} />}
              {u.role !== "ORG_OWNER" && u.email !== pessoa?.email && <IconButton dica="Excluir" variante="danger" icone={<Trash2 size={16} />} onClick={() => setExcluindo(u)} />}
            </div> },
          ]} />}
      </Card>
      <Modal aberto={!!form} titulo={form?.id ? "Editar usuário" : "Novo usuário"} largura="lg" onFechar={() => setForm(null)} rodape={<><Button onClick={() => setForm(null)}>Voltar</Button><Button variante="primary" carregando={salvando} onClick={salvar}>Salvar</Button></>}>
        {form && <div className={styles.form}>
          <div className={styles.colunas}>
            <Input rotulo="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input rotulo="Cargo" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
            <Input rotulo="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {!form.id && <Input rotulo="Senha provisória" type="text" autoComplete="off" dica="Ao menos 10 caracteres, com letras e números." value={form.senhaProvisoria} onChange={(e) => setForm({ ...form, senhaProvisoria: e.target.value })} />}
          </div>
          {!soDados && <><div className={styles.colunas}>
            <Select rotulo="Papel" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="STAFF">Colaborador</option><option value="ORG_ADMIN">Administração</option><option value="COMPANY_USER">Usuário de empresa</option>
            </Select>
            {form.id && <Select rotulo="Situação" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="ACTIVE">Ativo</option><option value="SUSPENDED">Suspenso</option></Select>}
          </div>
          {form.role === "ORG_ADMIN" ? <Notice>A administração pode criar, editar e excluir tudo no escritório e vê todas as empresas. Só não exclui a proprietária.</Notice> : <>
          <p className={styles.titulo}>Permissões</p>
          <div className={styles.lista}>{(pessoa?.permissions ?? []).map((p) => <label key={p} className={styles.check}><input type="checkbox" checked={form.permissions.includes(p)} onChange={() => setForm({ ...form, permissions: alternar(form.permissions, p) })} /> {NOMES[p] ?? p}</label>)}</div>
          <label className={styles.check}><input type="checkbox" checked={form.allCompanies} onChange={(e) => setForm({ ...form, allCompanies: e.target.checked })} /> Acesso a todas as empresas</label>
          {!form.allCompanies && <><p className={styles.titulo}>Empresas</p>
            <div className={styles.lista}>{empresas.length ? empresas.map((e) => <label key={e.id} className={styles.check}><input type="checkbox" checked={form.companyIds.includes(e.id)} onChange={() => setForm({ ...form, companyIds: alternar(form.companyIds, e.id) })} /> {e.razao || formatarCnpj(e.cnpj)}</label>) : <small>Nenhuma empresa cadastrada.</small>}</div></>}</>}</>}
        </div>}
      </Modal>
      <Modal aberto={!!redefinir} titulo="Redefinir senha" largura="sm" onFechar={() => setRedefinir(null)} rodape={<><Button onClick={() => setRedefinir(null)}>Voltar</Button><Button variante="primary" carregando={salvando} onClick={salvarSenha}>Definir</Button></>}>
        <div className={styles.form}>
          <p>As sessões de <b>{redefinir?.name}</b> serão encerradas, e a senha deverá ser trocada no próximo acesso.</p>
          <Input rotulo="Senha provisória" type="text" autoComplete="off" value={senhaNova} onChange={(e) => setSenhaNova(e.target.value)} />
        </div>
      </Modal>
      <ConfirmDialog aberto={!!excluindo} titulo="Excluir usuário" confirmar="Excluir" perigo onConfirmar={() => void excluir()} onCancelar={() => setExcluindo(null)}>
        <p><b>{excluindo?.name}</b> perde o acesso na hora, e o login deixa de existir. Memorandos e mensagens que essa pessoa fez continuam no sistema. Esta ação não pode ser desfeita.</p>
      </ConfirmDialog>
    </>
  );
}
