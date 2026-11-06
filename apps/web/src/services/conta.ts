import { api } from "./http";

export interface Eu { id: string; name: string; email: string; mustChangePassword: boolean; organization: { id: string; name: string; role: string } | null; permissions: string[]; availablePermissions: string[] }
export interface Usuario { id: string; name: string; email: string; role: string; status: "ACTIVE" | "SUSPENDED"; allCompanies: boolean; permissions: string[]; companyIds: string[]; mustChangePassword: boolean }
export const eu = () => api<Eu>("GET", "me");
export const entrar = (email: string, senha: string) => api<{ mustChangePassword: boolean }>("POST", "auth/login", { email, senha });
export const sair = () => api("POST", "auth/logout", {});
export const trocarSenha = (atual: string, nova: string) => api("POST", "auth/password", { atual, nova });
export async function listarUsuarios() { return (await api<{ usuarios: Usuario[] }>("GET", "users")).usuarios; }
export const criarUsuario = (u: { name: string; email: string; senhaProvisoria: string; role: string; permissions: string[]; allCompanies: boolean; companyIds: string[] }) => api("POST", "users", u);
export const alterarUsuario = (id: string, u: { role: string; status: string; permissions: string[]; allCompanies: boolean; companyIds: string[] }) => api("PATCH", `users/${id}`, u);
export const redefinirSenha = (id: string, senhaProvisoria: string) => api("POST", `users/${id}/reset-password`, { senhaProvisoria });
