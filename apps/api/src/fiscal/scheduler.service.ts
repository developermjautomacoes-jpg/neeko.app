import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { hoje, CertificadosService } from "../certificates/certificates.service";
import { config } from "../config";
import { PrismaService } from "../prisma.service";
import { DfeService, Servico } from "./dfe.service";
import { NfseService, Passo } from "./nfse.service";
import { espere } from "./xml";

const JANELA_MS = 6 * 3600 * 1000;  // começa até 6 h depois do horário e para ao fim delas
const ESPERA_MAXIMA_S = 300;        // pausa maior passa para a próxima empresa; continua na noite seguinte
const PAUSA_MS = 2500;
const AMB = "producao";

/** Captura noturna por organização. Roda numa só instância da API; não há fila enquanto não for preciso. */
@Injectable()
export class AgendadorService implements OnModuleInit, OnModuleDestroy {
  private log = new Logger("Agendador");
  private timer?: NodeJS.Timeout;
  private rodando = new Set<string>();
  constructor(private prisma: PrismaService, private nfse: NfseService, private dfe: DfeService, private certs: CertificadosService) {}
  onModuleInit() { if (config().SCHEDULER_ENABLED === "true") this.timer = setInterval(() => void this.conferir().catch((e) => this.log.error(String(e))), 60000); }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async conferir(agora = new Date()) {
    const br = new Date(agora.getTime() - 3 * 3600 * 1000);
    const dia = br.toISOString().slice(0, 10), ontem = new Date(br.getTime() - 86400000).toISOString().slice(0, 10);
    for (const s of await this.prisma.fiscalSettings.findMany({ where: { scheduleActive: true, organization: { status: "ACTIVE" } } })) {
      if (this.rodando.has(s.organizationId)) continue;
      for (const d of [dia, ontem]) { // a noite pertence ao dia em que o horário cai
        const inicio = Date.parse(`${d}T${s.scheduleTime}:00-03:00`), limite = inicio + JANELA_MS;
        if (agora.getTime() < inicio || agora.getTime() >= limite || s.lastRunDay >= d) continue;
        const r = await this.prisma.fiscalSettings.updateMany({ where: { organizationId: s.organizationId, lastRunDay: s.lastRunDay }, data: { lastRunDay: d, runStatus: "rodando", runStartedAt: agora, runFinishedAt: null, runLines: [] } });
        if (r.count) { this.rodando.add(s.organizationId); void this.executar(s.organizationId, limite).catch((e) => this.log.error(String(e))).finally(() => this.rodando.delete(s.organizationId)); }
        break;
      }
    }
  }

  private async repetir(passo: () => Promise<Passo>, limite: number, tot: { notas: number; eventos: number; falhas: number }): Promise<string> {
    while (Date.now() < limite) {
      const p = await passo();
      if (p.status === "lote" || p.status === "fim") {
        tot.notas += p.notas; tot.eventos += p.eventos; tot.falhas += p.falhas;
        if (p.status === "fim") return "";
        await espere(PAUSA_MS);
      } else if (p.status === "aguardar") {
        if (p.segundos > ESPERA_MAXIMA_S) return "pausada; continua na próxima noite";
        await espere(p.segundos * 1000);
      } else if (p.status === "erro") return p.mensagem;
    }
    return "fim da janela da noite; continua na próxima";
  }

  async executar(organizationId: string, limite: number) {
    const linhas: string[] = [];
    const empresas = await this.prisma.company.findMany({ where: { organizationId, active: true }, orderBy: { legalName: "asc" } });
    for (const e of empresas) {
      const nome = e.legalName || e.cnpj;
      const c = await this.certs.daNfse(e);
      if (c.cert && c.cert.validUntil >= hoje()) {
        const t = { notas: 0, eventos: 0, falhas: 0 };
        const texto = await this.repetir(() => this.nfse.capturar(e, AMB), limite, t);
        linhas.push(`NFS-e ${nome}: ${t.notas} nota(s) nova(s), ${t.eventos} evento(s)${t.falhas ? `, ${t.falhas} com falha` : ""}${texto ? ` (${texto})` : ""}`);
        await espere(PAUSA_MS);
      }
      // Só por escolha: outro sistema no mesmo CNPJ disputa a sequência de NSU da SEFAZ.
      const d = await this.certs.daDfe(e);
      if (!e.dfeAutoCapture || !d.cert || d.cert.validUntil < hoje()) continue;
      const t = { notas: 0, eventos: 0, falhas: 0 }; let texto = "";
      for (const s of ["nfe", "cte"] as Servico[]) { const m = await this.repetir(() => this.dfe.capturar(e, AMB, s), limite, t); if (m) texto = m; await espere(PAUSA_MS); }
      for (let i = 0; i < 100 && Date.now() < limite; i++) {
        const r = await this.dfe.enviarCiencias(e, AMB) as { status: string; mensagem?: string; enviadas?: number; restantes?: number };
        if (r.status === "erro") { texto = `ciência: ${r.mensagem}`; break; }
        if (!r.enviadas || !r.restantes) break;
        await espere(1500);
      }
      if (t.notas || t.eventos || t.falhas || texto) linhas.push(`NF-e/CT-e ${nome}: ${t.notas} documento(s) novo(s), ${t.eventos} evento(s)${t.falhas ? `, ${t.falhas} com falha` : ""}${texto ? ` (${texto})` : ""}`);
    }
    await this.prisma.fiscalSettings.update({ where: { organizationId }, data: { runStatus: "concluido", runFinishedAt: new Date(), runLines: (linhas.length ? linhas : ["Nenhuma empresa com certificado válido."]).slice(0, 500).map((l) => l.slice(0, 300)) } });
  }
}
