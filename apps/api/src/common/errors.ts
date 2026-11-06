import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Response } from "express";

export class Erro extends HttpException {
  constructor(status: number, readonly codigo: string, mensagem: string) { super(mensagem, status); }
}
export const naoEncontrado = (m = "Registro não encontrado.") => new Erro(404, "NOT_FOUND", m);
export const invalido = (m: string) => new Erro(400, "INVALID", m);

/** Código estável, mensagem segura e correlation ID; nunca stack trace. */
@Catch()
export class FiltroErros implements ExceptionFilter {
  private log = new Logger("API");
  catch(e: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const correlationId = randomUUID();
    if (e instanceof Erro) { res.status(e.getStatus()).json({ code: e.codigo, message: e.message, correlationId }); return; }
    if (e instanceof HttpException && e.getStatus() < 500) { res.status(e.getStatus()).json({ code: "HTTP", message: e.message, correlationId }); return; }
    this.log.error(`${correlationId} ${e instanceof Error ? e.stack : String(e)}`);
    res.status(500).json({ code: "INTERNAL", message: "Erro interno. Informe o código ao suporte.", correlationId });
  }
}
