import { api } from "./http";

export interface Eu { id: string; name: string; email: string; platformAdmin: boolean; mfaEnabled: boolean; mfaPending: boolean; mfaSetupRequired: boolean; avatar: string | null; jobTitle: string; phone: string; mustChangePassword: boolean; organization: { logo: string | null; contactEmail: string; contactPhone: string; id: string; name: string; role: string } | null; permissions: string[]; availablePermissions: string[] }
export interface Usuario { id: string; name: string; email: string; role: string; status: "ACTIVE" | "SUSPENDED"; allCompanies: boolean; permissions: string[]; companyIds: string[]; mustChangePassword: boolean }
export const eu = () => api<Eu>("GET", "me");
export const entrar = (email: string, senha: string) => api<{ mustChangePassword: boolean; mfaRequired: boolean }>("POST", "auth/login", { email, senha });
export const sair = () => api("POST", "auth/logout", {});
export const trocarSenha = (atual: string, nova: string) => api("POST", "auth/password", { atual, nova });
export async function listarUsuarios() { return (await api<{ usuarios: Usuario[] }>("GET", "users")).usuarios; }
export const criarUsuario = (u: { name: string; email: string; senhaProvisoria: string; role: string; permissions: string[]; allCompanies: boolean; companyIds: string[] }) => api("POST", "users", u);
export const alterarUsuario = (id: string, u: { role: string; status: string; permissions: string[]; allCompanies: boolean; companyIds: string[] }) => api("PATCH", `users/${id}`, u);
export const redefinirSenha = (id: string, senhaProvisoria: string) => api("POST", `users/${id}/reset-password`, { senhaProvisoria });
export const salvarPerfil = (p: { name: string; jobTitle: string; phone: string; avatar: string | null }) => api("PATCH", "me", p);
export const salvarEscritorio = (p: { logo: string | null; contactEmail: string; contactPhone: string }) => api("PUT", "office", p);
export const iniciarMfa = () => api<{ chave: string; uri: string }>("POST", "auth/mfa/setup", {});
export const ativarMfa = (codigo: string) => api<{ codigos: string[] }>("POST", "auth/mfa/enable", { codigo });
export const verificarMfa = (codigo: string) => api("POST", "auth/mfa/verify", { codigo });
export const destinoApos = (p: Pick<Eu, "mfaPending" | "mustChangePassword" | "mfaSetupRequired">) => (p.mfaPending ? "/verificacao" : p.mustChangePassword ? "/trocar-senha" : p.mfaSetupRequired ? "/ativar-verificacao" : "/inicio");
export interface Plano { id: string; name: string; maxCompanies: number | null; maxUsers: number | null; monthlyPrice: string; active: boolean; escritorios: number }
export interface Escritorio { billingExempt: boolean; emUso: number; id: string; name: string; cnpj: string; contactEmail: string; contactPhone: string; status: "ACTIVE" | "SUSPENDED"; internal: boolean; planId: string | null; plano: string; mensalidade: string; maxCompanies: number | null; maxUsers: number | null; paidUntil: string; notes: string; empresas: number; usuarios: number; gestor: string; gestorEmail: string }
export const listarPlanos = async () => (await api<{ planos: Plano[] }>("GET", "platform/plans")).planos;
export const salvarPlano = (id: string | undefined, p: unknown) => (id ? api("PATCH", `platform/plans/${id}`, p) : api("POST", "platform/plans", p));
export const listarEscritorios = async () => (await api<{ escritorios: Escritorio[] }>("GET", "platform/offices")).escritorios;
export const criarEscritorio = (e: unknown) => api("POST", "platform/offices", e);
export const alterarEscritorio = (id: string, e: unknown) => api("PATCH", `platform/offices/${id}`, e);
export const situacaoEscritorio = (id: string, status: string) => api("POST", `platform/offices/${id}/status`, { status });
export const excluirEscritorio = (id: string, nome: string) => api("DELETE", `platform/offices/${id}`, { nome });
export const redefinirGestor = (id: string, senhaProvisoria: string) => api("POST", `platform/offices/${id}/reset-manager`, { senhaProvisoria });
