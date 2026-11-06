import type { ZodTypeAny, z } from "zod";
import { invalido } from "./errors";

export function validar<T extends ZodTypeAny>(esquema: T, dado: unknown): z.infer<T> {
  const r = esquema.safeParse(dado);
  if (!r.success) throw invalido(r.error.issues[0]?.message ?? "Dados inválidos.");
  return r.data;
}
