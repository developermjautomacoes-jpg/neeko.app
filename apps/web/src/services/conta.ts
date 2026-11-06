import { api } from "./http";

export interface Eu { id: string; name: string; email: string; platformAdmin: boolean; mfaEnabled: boolean; mfaPending: boolean; mfaSetupRequired: boolean; avatar: string | null; jobTitle: string; phone: string; mustChangePassword: boolean; organization: { slug: string; internal: boolean; theme: string; logo: string | null; contactEmail: string; contactPhone: string; id: string; name: string; role: string } | null; permissions: string[]; availablePermissions: string[] }
export interface Usuario { id: string; jobTitle: string; name: string; email: string; role: string; status: "ACTIVE" | "SUSPENDED"; allCompanies: boolean; permissions: string[]; companyIds: string[]; mustChangePassword: boolean }
export const eu = () => api<Eu>("GET", "me");
export const entrar = (email: string, senha: string, escritorio?: string) => api<{ mustChangePassword: boolean; mfaRequired: boolean }>("POST", "auth/login", { email, senha, escritorio });
export const lerEscritorioPublico = (slug: string) => api<{ name: string; logo: string | null; theme: string }>("GET", `public/offices/${encodeURIComponent(slug)}`);
export const sair = () => api("POST", "auth/logout", {});
export const trocarSenha = (atual: string, nova: string) => api("POST", "auth/password", { atual, nova });
export async function listarUsuarios() { return (await api<{ usuarios: Usuario[] }>("GET", "users")).usuarios; }
export const definirCargo = (id: string, cargo: string) => api("PUT", `users/${id}/job-title`, { cargo });
export const criarUsuario = (u: { jobTitle: string; name: string; email: string; senhaProvisoria: string; role: string; permissions: string[]; allCompanies: boolean; companyIds: string[] }) => api("POST", "users", u);
export const alterarUsuario = (id: string, u: { role: string; status: string; permissions: string[]; allCompanies: boolean; companyIds: string[] }) => api("PATCH", `users/${id}`, u);
export const redefinirSenha = (id: string, senhaProvisoria: string) => api("POST", `users/${id}/reset-password`, { senhaProvisoria });
export const salvarPerfil = (p: { name: string; phone: string; avatar: string | null }) => api("PATCH", "me", p);
export const salvarEscritorio = (p: { logo: string | null; contactEmail: string; contactPhone: string }) => api("PUT", "office", p);
export const salvarTema = (tema: string) => api("PUT", "office/theme", { tema });
export const iniciarMfa = () => api<{ chave: string; uri: string }>("POST", "auth/mfa/setup", {});
export const ativarMfa = (codigo: string) => api<{ codigos: string[] }>("POST", "auth/mfa/enable", { codigo });
export const verificarMfa = (codigo: string) => api("POST", "auth/mfa/verify", { codigo });
export const destinoApos = (p: Pick<Eu, "mfaPending" | "mustChangePassword" | "mfaSetupRequired">) => (p.mfaPending ? "/verificacao" : p.mustChangePassword ? "/trocar-senha" : p.mfaSetupRequired ? "/ativar-verificacao" : "/inicio");
export interface Plano { id: string; name: string; maxCompanies: number | null; maxUsers: number | null; monthlyPrice: string; active: boolean; escritorios: number }
export interface Escritorio { slug: string; billingExempt: boolean; emUso: number; id: string; name: string; cnpj: string; contactEmail: string; contactPhone: string; status: "ACTIVE" | "SUSPENDED"; internal: boolean; planId: string | null; plano: string; mensalidade: string; maxCompanies: number | null; maxUsers: number | null; paidUntil: string; notes: string; empresas: number; usuarios: number; gestor: string; gestorEmail: string }
export const listarPlanos = async () => (await api<{ planos: Plano[] }>("GET", "platform/plans")).planos;
export const salvarPlano = (id: string | undefined, p: unknown) => (id ? api("PATCH", `platform/plans/${id}`, p) : api("POST", "platform/plans", p));
export const listarEscritorios = async () => (await api<{ escritorios: Escritorio[] }>("GET", "platform/offices")).escritorios;
export const criarEscritorio = (e: unknown) => api("POST", "platform/offices", e);
export const alterarEscritorio = (id: string, e: unknown) => api("PATCH", `platform/offices/${id}`, e);
export const situacaoEscritorio = (id: string, status: string) => api("POST", `platform/offices/${id}/status`, { status });
export const excluirEscritorio = (id: string, nome: string) => api("DELETE", `platform/offices/${id}`, { nome });
export const redefinirGestor = (id: string, senhaProvisoria: string) => api("POST", `platform/offices/${id}/reset-manager`, { senhaProvisoria });
export const esqueciSenha = (email: string, escritorio?: string) => api("POST", "auth/forgot-password", { email, escritorio });
export const redefinirComCodigo = (email: string, codigo: string, nova: string) => api("POST", "auth/reset-password", { email, codigo, nova });
export interface ResultadoImportacao { memorandos: { importados: number; pulados: { numero: string; motivo: string }[] }; certificados: { importados: number; pulados: { nome: string; motivo: string }[] } }
export const importarPacote = (pacote: string, frase: string) => api<ResultadoImportacao>("POST", "office/import", { pacote, frase });
export interface AvisoMensagem { conversa: string; de: string; texto: string; em: string; mencao: boolean }
export interface PessoaChat { id: string; nome: string; cargo: string; naoLidas: number; ultima: { texto: string; em: string } | null }
export interface ResumoMensagens { total: number; avisos: AvisoMensagem[]; geral: { naoLidas: number; ultima: { texto: string; em: string } | null }; pessoas: PessoaChat[] }
export interface Mensagem { id: string; de: string; minha: boolean; texto: string; em: string; mencionou: boolean }
export const resumoMensagens = () => api<ResumoMensagens>("GET", "messages");
export const lerMensagens = async (c: string) => (await api<{ mensagens: Mensagem[] }>("GET", `messages/${c}`)).mensagens;
export const enviarMensagem = (c: string, texto: string) => api("POST", `messages/${c}`, { texto });
export const marcarLida = (c: string) => api("POST", `messages/${c}/read`, {});
