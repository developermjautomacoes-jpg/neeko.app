import { z } from "zod";

const esquema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  /** 32 bytes em base64: cifra os certificados. Trocar invalida os certificados guardados. */
  CERT_ENCRYPTION_KEY: z.string().refine((v) => Buffer.from(v, "base64").length === 32, "CERT_ENCRYPTION_KEY deve ter 32 bytes em base64"),
  /** Só no primeiro início: cria a organização e a primeira pessoa. Senha provisória, trocada no primeiro acesso. */
  BOOTSTRAP_ORG_NAME: z.string().optional(),
  BOOTSTRAP_ADMIN_NAME: z.string().optional(),
  BOOTSTRAP_ADMIN_EMAIL: z.string().email().optional(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(10).optional(),
  /** Emergência: limpa a verificação em duas etapas desse e-mail ao iniciar. Remova depois de usar. */
  MFA_RESET_EMAIL: z.string().email().optional(),
  RUN_MIGRATIONS: z.enum(["true", "false"]).default("false"),
  MIGRATIONS_DIR: z.string().default("../../database/prisma/migrations"),
  SCHEDULER_ENABLED: z.enum(["true", "false"]).default("true"),
  /** Cadeia ICP-Brasil em PEM, quando o servidor fiscal não for reconhecido. */
  FISCAL_CA_FILE: z.string().optional(),
  NFSE_ADN_URL: z.string().url().optional(),
  DFE_URL_NFE: z.string().url().optional(),
  DFE_URL_CTE: z.string().url().optional(),
  DFE_URL_EVENTO: z.string().url().optional(),
  /** Primeira etapa: empresas do ES. */
  DFE_CUF_AUTOR: z.string().regex(/^\d{2}$/).default("32"),
});
export type Config = z.infer<typeof esquema>;

let cache: Config | null = null;
/** Configuração inválida derruba o início, com a lista do que falta. */
export function config(): Config {
  if (cache) return cache;
  const r = esquema.safeParse(process.env);
  if (!r.success) throw new Error("Configuração inválida: " + r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  return (cache = r.data);
}
export function limparConfig() { cache = null; }
