import { Controller, Get } from "@nestjs/common";
import { hoje, CertificadosService } from "../certificates/certificates.service";
import { Contexto, Ctx, Exige } from "../common/auth";
import { EscopoService } from "../common/scope.service";
import { PrismaService } from "../prisma.service";

const AMB = "producao";
const ROTULOS: Record<string, string> = {
  "auth.login": "Entrou no sistema", "fiscal.certificate.imported": "Certificado importado", "fiscal.certificate.removed": "Certificado removido", "fiscal.nfse.exported": "XML de NFS-e baixado",
  "fiscal.dfe.exported": "XML de NF-e/CT-e baixado", "fiscal.dfe.ciencia.sent": "Ciência da operação enviada", "users.created": "Usuário criado", "users.access.changed": "Acesso de usuário alterado", "memoranda.created": "Memorando criado", "memoranda.updated": "Memorando alterado", "memoranda.status": "Situação de memorando alterada", "memoranda.client": "Situação de cliente alterada",
};
function meses(n: number): string[] {
  const d = new Date(Date.now() - 3 * 3600 * 1000), s: string[] = [];
  for (let i = n - 1; i >= 0; i--) { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)); s.push(x.toISOString().slice(0, 7)); }
  return s;
}
const variacao = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 1000) / 10 : null);

/** Só dados reais da organização, dentro das empresas que a pessoa pode ver. */
@Controller("fiscal/dashboard")
export class PainelController {
  constructor(private prisma: PrismaService, private escopo: EscopoService, private certs: CertificadosService) {}

  @Exige("fiscal.documents.read") @Get()
  async painel(@Ctx() c: Contexto) {
    const org = c.organizationId, empresas = await this.prisma.company.findMany({ where: this.escopo.filtro(c), orderBy: { legalName: "asc" } }), ids = empresas.map((e) => e.id);
    const serie = meses(12), onde = { organizationId: org, environment: AMB, companyId: { in: ids } }, noPeriodo = { ...onde, competencia: { gte: serie[0] } };
    const [valores, nfse, dfe, certs, procurador, nfseSt, dfeSt, falhasN, falhasD, ciencias] = await Promise.all([
      this.prisma.nfseDocument.groupBy({ by: ["competencia"], where: { ...noPeriodo, papel: "prestador", situacao: { notIn: ["cancelada", "substituida"] } }, _sum: { vServ: true } }),
      this.prisma.nfseDocument.groupBy({ by: ["competencia"], where: noPeriodo, _count: true }),
      this.prisma.dfeDocument.groupBy({ by: ["competencia"], where: noPeriodo, _count: true }),
      this.certs.listar(org), this.certs.procurador(org), this.prisma.nfseState.findMany({ where: onde }), this.prisma.dfeState.findMany({ where: onde }),
      this.prisma.nfseFailure.count({ where: onde }), this.prisma.dfeFailure.count({ where: onde }), this.prisma.dfeDocument.count({ where: { ...onde, ciencia: "pendente" } }),
    ]);
    const pontos = serie.map((competencia) => ({ competencia, valor: (valores.find((v) => v.competencia === competencia)?._sum.vServ?.toFixed(2)) ?? "0.00",
      notas: (nfse.find((n) => n.competencia === competencia)?._count ?? 0) + (dfe.find((n) => n.competencia === competencia)?._count ?? 0) }));
    const atual = pontos[11], anterior = pontos[10], dia = hoje(), em30 = new Date(Date.parse(dia) + 30 * 86400000).toISOString().slice(0, 10);
    const certDe = empresas.map((e) => (e.nfseMode === "procuracao" ? procurador : this.certs.escolher(certs, e.cnpj, e.certificateId)));
    const semCert = certDe.filter((x) => !x).length, vencidos = certDe.filter((x) => x && x.validUntil < dia).length, vencendo = certDe.filter((x) => x && x.validUntil >= dia && x.validUntil <= em30).length;
    const errosN = nfseSt.filter((s) => s.lastError).length, errosD = dfeSt.filter((s) => s.lastError).length, falhas = falhasN + falhasD;
    const pend = [
      { texto: `${semCert} empresa(s) sem certificado`, n: semCert, rota: "/certificados" }, { texto: `${vencidos} certificado(s) vencido(s)`, n: vencidos, rota: "/certificados" }, { texto: `${vencendo} certificado(s) vencendo em 30 dias`, n: vencendo, rota: "/certificados" },
      { texto: `${errosN} erro(s) na captura de NFS-e`, n: errosN, rota: "/notas/nfse" }, { texto: `${errosD} erro(s) na captura de NF-e/CT-e`, n: errosD, rota: "/notas/nfe-cte" }, { texto: `${falhas} documento(s) não lidos`, n: falhas, rota: "/notas/nfse" }, { texto: `${ciencias} ciência(s) pendente(s)`, n: ciencias, rota: "/notas/nfe-cte" },
    ].filter((p) => p.n > 0);
    const aptas = certDe.reduce((t, x, i) => t + (x && x.validUntil >= dia && !nfseSt.some((s) => s.companyId === empresas[i].id && s.lastError) && !dfeSt.some((s) => s.companyId === empresas[i].id && s.lastError) ? 1 : 0), 0);
    const atividade = c.permissions.has("audit.read") ? await this.prisma.auditEvent.findMany({ where: { organizationId: org, action: { in: Object.keys(ROTULOS) } }, orderBy: { createdAt: "desc" }, take: 5 }) : [];
    const estado = (ok: boolean, sim: string, nao: string) => ({ ok, detalhe: ok ? sim : nao });
    // Carteira que pede ação, da mais grave para a mais leve.
    const dias = (d: Date | string) => Math.floor((Date.parse(dia) - Date.parse(String(typeof d === "string" ? d : d.toISOString()).slice(0, 10))) / 86400000);
    const atencao = empresas.flatMap((e, i) => {
      const c = certDe[i], st = nfseSt.find((s) => s.companyId === e.id);
      const m = !c ? { grau: 1, motivo: e.nfseMode === "procuracao" ? "Procurador não cadastrado" : "Sem certificado" } : c.validUntil < dia ? { grau: 1, motivo: `Certificado vencido há ${dias(c.validUntil)} dia(s)` }
        : st?.lastError ? { grau: 2, motivo: "Erro na última captura" } : c.validUntil <= em30 ? { grau: 3, motivo: `Certificado vence em ${-dias(c.validUntil)} dia(s)` }
        : !st?.lastCaptureAt ? { grau: 4, motivo: "Notas nunca capturadas" } : dias(st.lastCaptureAt) > 7 ? { grau: 5, motivo: `Sem captura há ${dias(st.lastCaptureAt)} dias` } : null;
      return m ? [{ id: e.id, razao: e.legalName, cnpj: e.cnpj, ...m }] : [];
    }).sort((a, b) => a.grau - b.grau || a.razao.localeCompare(b.razao));
    return {
      empresas: empresas.length, notasMes: atual.notas, notasVariacao: variacao(atual.notas, anterior.notas), servicosMes: atual.valor, servicosVariacao: variacao(+atual.valor, +anterior.valor), pendencias: pend.reduce((t, p) => t + p.n, 0),
      serie: pontos, pendenciasLista: pend.map(({ texto, rota }) => ({ texto, rota })), empresasLista: empresas.map((e) => ({ id: e.id, cnpj: e.cnpj, razao: e.legalName })),
      saude: { percentual: empresas.length ? Math.round((aptas / empresas.length) * 100) : 0, itens: [
        { nome: "Certificados", ...estado(!semCert && !vencidos, "Válidos", `${semCert + vencidos} pendente(s)`) }, { nome: "Vencimento em 30 dias", ...estado(!vencendo, "Nenhum", `${vencendo} certificado(s)`) },
        { nome: "Captura de NFS-e", ...estado(!errosN, "Sem erros", `${errosN} com erro`) }, { nome: "Captura de NF-e/CT-e", ...estado(!errosD, "Sem erros", `${errosD} com erro`) }, { nome: "Documentos lidos", ...estado(!falhas, "Sem falhas", `${falhas} com falha`) },
      ] },
      atencao: { total: atencao.length, lista: atencao.slice(0, 8) },
      atividade: atividade.map((a) => ({ id: a.id, texto: ROTULOS[a.action], em: a.createdAt })),
    };
  }
}
