import { Injectable } from "@nestjs/common";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

interface Assunto { id: string; nome: string; descricao: string; area: string; icone: string }
interface Bloco { assunto: string; titulo: string; texto: string; arquivo: string; termos: Map<string, number>; tamanho: number; tituloTermos: Set<string> }

const RAIZ = join(process.cwd(), "knowledge");
/** Trechos com orientação de uso da skill, e não conteúdo para quem pergunta. */
const INTERNO = /^(quando a usu|formato da resposta|como responder|checagens|cuidados|fonte|fontes|fluxo|modo de uso|como usar|instru|regras? de resposta|exemplos? de uso|sa[ií]da)/i;
const VAZIAS = new Set("a o as os um uma uns umas de do da dos das em no na nos nas por para pra com sem sobre que qual quais quando como onde quem e ou se eu tu ele ela nos me meu minha ao aos à às é são ser estar tem ter há isso esse essa este esta preciso quero posso pode devo deve fazer faz saber ver orientacao orientacoes duvida duvidas ajuda quanto relacao tem empresa empresas".split(" ").map(dobrar));
/** Palavras que já indicam o assunto: a busca fica só nele. */
const ALIAS: Record<string, string> = { efd: "especialista-efd-icms-ipi", sped: "especialista-efd-icms-ipi", nfe: "especialista-nfe", nfce: "especialista-nfe", danfe: "especialista-nfe", cstat: "especialista-nfe", rejeicao: "especialista-nfe", mei: "simples-nacional-cgsn140", da: "simples-nacional-cgsn140", pgdas: "simples-nacional-cgsn140", ibs: "especialista-reforma-tributaria", cbs: "especialista-reforma-tributaria", invest: "especialista-invest-es", fundap: "especialista-invest-es" };
const SINONIMOS: Record<string, string[]> = { item: ["produto"], produto: ["item"], mercadoria: ["item", "produto"], nota: ["nfe", "documento"], rejeicao: ["cstat"], imposto: ["tributo"], aliquota: ["percentual"], alterar: ["alteracao", "corrigir"], alteracao: ["alterar"], corrigir: ["correcao", "alterar"], excluir: ["exclusao"], cancelar: ["cancelamento"], cancelamento: ["cancelar"] };

function dobrar(t: string) { return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
function termos(t: string) { return (dobrar(t).match(/[a-z0-9]+/g) ?? []).filter((x) => x.length > 1 && !VAZIAS.has(x)).map((x) => (x.length > 4 && x.endsWith("s") ? x.slice(0, -1) : x)); }
function limpar(t: string) { return t.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/\*\*|__|`/g, "").split("\n").filter((l) => !/^[\s|:-]{4,}$/.test(l)).join("\n").trim(); }
function arquivos(p: string): string[] { return readdirSync(p).flatMap((n) => { const c = join(p, n); return statSync(c).isDirectory() ? arquivos(c) : /\.(md|txt)$/.test(n) ? [c] : []; }); }

/** Busca sem IA nas bases das skills: nada sai do servidor e nenhuma pergunta é guardada. */
@Injectable()
export class AssistenteService {
  readonly assuntos: Assunto[] = JSON.parse(readFileSync(join(RAIZ, "assuntos.json"), "utf8"));
  private blocos: Bloco[] = [];
  private df = new Map<string, number>();
  private media = 1;
  constructor() {
    for (const a of this.assuntos) for (const f of arquivos(join(RAIZ, a.id))) this.indexar(a.id, f);
    for (const b of this.blocos) for (const t of b.termos.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
    this.media = this.blocos.reduce((s, b) => s + b.tamanho, 0) / Math.max(1, this.blocos.length);
  }
  private indexar(assunto: string, arquivo: string) {
    const nome = arquivo.split("/").pop() ?? "", base = nome.replace(/\.(md|txt)$/, "").replace(/[-_]/g, " ");
    let titulo = base, buffer: string[] = [];
    const fechar = () => {
      const txt = limpar(buffer.join("\n")); buffer = [];
      if (txt.length < 40 || INTERNO.test(titulo) || nome === "INDICE.md") return;
      for (let i = 0; i < txt.length; i += 1400) this.gravar(assunto, titulo, txt.slice(i, i + 1500), nome);
    };
    for (const linha of limpar(readFileSync(arquivo, "utf8")).split("\n")) {
      const h = /^#{1,4}\s+(.+)/.exec(linha);
      if (h) { fechar(); titulo = h[1].trim(); } else buffer.push(linha);
    }
    fechar();
  }
  private gravar(assunto: string, titulo: string, texto: string, arquivo: string) {
    const t = new Map<string, number>(), tt = termos(`${titulo} ${texto}`);
    tt.forEach((x) => t.set(x, (t.get(x) ?? 0) + 1));
    this.blocos.push({ assunto, titulo, texto, arquivo, termos: t, tamanho: tt.length, tituloTermos: new Set(termos(titulo)) });
  }
  /** Mostra a parte do bloco em que a pergunta aparece. */
  private trecho(texto: string, chaves: string[]) {
    if (texto.length <= 900) return texto;
    const linhas = texto.split("\n"), nota = linhas.map((l) => { const t = new Set(termos(l)); return chaves.filter((c) => t.has(c)).length; });
    let i = nota.indexOf(Math.max(...nota)); i = Math.max(0, i - 1);
    const saida: string[] = []; let n = 0;
    for (; i < linhas.length && n < 900; i++) { saida.push(linhas[i]); n += linhas[i].length + 1; }
    const t = saida.join("\n").slice(0, 900);
    return n > 900 ? `${t.replace(/\s+\S*$/, "")}…` : t;
  }
  buscar(pergunta: string, assunto?: string) {
    let q = [...new Set(termos(pergunta))];
    const indicado = assunto ?? q.map((t) => ALIAS[t]).find(Boolean);
    if (!assunto && indicado) q = q.filter((t) => !ALIAS[t] && t !== "icms" && t !== "ipi");
    if (!q.length) return [];
    const n = this.blocos.length, idf = (t: string) => Math.log(1 + (n - (this.df.get(t) ?? 0) + 0.5) / ((this.df.get(t) ?? 0) + 0.5));
    const pesos = new Map<string, number>(); q.forEach((t) => pesos.set(t, 1));
    q.forEach((t) => (SINONIMOS[t] ?? []).forEach((s) => { if (!pesos.has(s)) pesos.set(s, 0.5); }));
    const conhecidos = q.filter((t) => this.df.has(t) || (SINONIMOS[t] ?? []).some((s) => this.df.has(s)));
    if (conhecidos.length / q.length < (q.length <= 2 ? 1 : q.length >= 5 ? 0.45 : 0.6)) return [];
    const r: { b: Bloco; nota: number; achados: number }[] = [];
    for (const b of this.blocos) {
      if (indicado && b.assunto !== indicado) continue;
      let nota = 0, achados: number;
      for (const [t, p] of pesos) {
        const f = b.termos.get(t); if (!f) continue;
        nota += p * idf(t) * ((f * 2.2) / (f + 1.2 * (0.25 + (0.75 * b.tamanho) / this.media))) * (b.tituloTermos.has(t) ? 2.5 : 1);
      }
      achados = q.filter((t) => b.termos.has(t) || (SINONIMOS[t] ?? []).some((x) => b.termos.has(x))).length;
      if (achados && achados / q.length >= (q.length <= 2 ? 1 : q.length >= 5 ? 0.45 : 0.6)) r.push({ b, nota, achados });
    }
    const nomes = new Map(this.assuntos.map((a) => [a.id, a.nome])), vistos = new Set<string>();
    return r.sort((a, c) => c.achados - a.achados || c.nota - a.nota).filter((x) => { const k = `${x.b.assunto}|${x.b.titulo}`; if (vistos.has(k)) return false; vistos.add(k); return true; }).slice(0, 4)
      .map(({ b }) => ({ assunto: nomes.get(b.assunto) ?? "", titulo: b.titulo, trecho: this.trecho(b.texto, [...pesos.keys()]) }));
  }
}
