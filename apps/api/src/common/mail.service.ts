import { Injectable } from "@nestjs/common";
import { createTransport } from "nodemailer";
import { config } from "../config";

@Injectable()
export class CorreioService {
  configurado() { return !!config().SMTP_HOST; }
  async enviar(para: string, assunto: string, texto: string) {
    const c = config();
    const t = createTransport({ host: c.SMTP_HOST, port: c.SMTP_PORT, secure: c.SMTP_PORT === 465, auth: c.SMTP_USER ? { user: c.SMTP_USER, pass: c.SMTP_PASS } : undefined });
    await t.sendMail({ from: c.SMTP_FROM || c.SMTP_USER, to: para, subject: assunto, text: texto });
  }
}
