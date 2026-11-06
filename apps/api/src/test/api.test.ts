import { gerarPfx, gravarTmp, nfseXml, zipB64 } from "./support";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer, Server } from "node:http";
import { createServer as createHttps } from "node:https";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import { readFileSync } from "node:fs";
import { Client } from "pg";
import { aplicarMigracoes } from "../migrate";
import { CorreioService } from "../common/mail.service";
import { limparConfig } from "../config";
import { createCipheriv, pbkdf2Sync, randomBytes } from "node:crypto";

const A = "11222333000181", B = "99888777000166";
const CH1 = "1".repeat(50), CH2 = "2".repeat(50);
const CHN = "32261011222333000181550010000001231000000010";
let base = "", adn: Server, sefaz: Server;
let fila: ((path: string) => { status: number; body: unknown; headers?: Record<string, string> })[] = [];
let soap: ((body: string) => string)[] = [];
const pedidos: string[] = [], corpos: string[] = [];
let app: { close(): Promise<void> };
let correio: CorreioService;
let prisma: any;

class Sessao {
  cookie = "";
  async pedir(metodo: string, rota: string, corpo?: unknown) {
    const r = await fetch(base + "/api/v1" + rota, { method: metodo, headers: { "content-type": "application/json", cookie: this.cookie }, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
    const c = r.headers.get("set-cookie"); if (c) this.cookie = c.split(";")[0];
    const ct = r.headers.get("content-type") ?? "";
    return { status: r.status, corpo: (ct.includes("json") ? await r.json() : Buffer.from(await r.arrayBuffer())) as any };
  }
  get = (r: string) => this.pedir("GET", r);
  post = (r: string, c: unknown = {}) => this.pedir("POST", r, c);
}
async function corpoLogin(email: string, senha: string) { const m = await prisma.organizationMembership.findFirst({ where: { user: { email } }, include: { organization: true } }); return { email, senha, ...(m && !m.organization.internal ? { escritorio: m.organization.slug } : {}) }; }
async function logar(email: string, senha: string) { const s = new Sessao(); const r = await s.post("/auth/login", await corpoLogin(email, senha)); assert.equal(r.status, 200); return s; }
const b32d = (t: string) => { let bits = ""; for (const c of t) bits += "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c).toString(2).padStart(5, "0"); return Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2))); };
async function ativarMfa(s: Sessao) { const { totp } = await import("../identity/mfa.controller"); const r = (await s.post("/auth/mfa/setup")).corpo, seg = b32d(r.chave); const a = await s.post("/auth/mfa/enable", { codigo: totp(seg, Math.floor(Date.now() / 30000)) }); assert.equal(a.status, 200); return { seg, codigos: a.corpo.codigos as string[] }; }

before(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect();
  await c.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"); await c.end();
  await aplicarMigracoes(process.env.DATABASE_URL!, "../../database/prisma/migrations", () => undefined);
  await aplicarMigracoes(process.env.DATABASE_URL!, "../../database/prisma/migrations", () => assert.fail("reaplicou"));
  adn = createServer((q, s) => { pedidos.push(q.url!); const f = fila.shift(); if (!f) { s.writeHead(404, { "content-type": "application/json" }); s.end(JSON.stringify({ StatusProcessamento: "NENHUM_DOCUMENTO_LOCALIZADO" })); return; } const r = f(q.url!); s.writeHead(r.status, { "content-type": "application/json", ...r.headers }); s.end(JSON.stringify(r.body)); });
  sefaz = createServer((q, s) => { let b = ""; q.on("data", (d) => (b += d)); q.on("end", () => { corpos.push(b); s.writeHead(200, { "content-type": "application/soap+xml" }); s.end(soap.shift()?.(b) ?? "<x/>"); }); });
  await Promise.all([new Promise<void>((r) => adn.listen(0, r)), new Promise<void>((r) => sefaz.listen(0, r))]);
  const uS = `http://127.0.0.1:${(sefaz.address() as AddressInfo).port}/ws`;
  Object.assign(process.env, { NFSE_ADN_URL: `http://127.0.0.1:${(adn.address() as AddressInfo).port}/contribuintes`, DFE_URL_NFE: uS, DFE_URL_CTE: uS, DFE_URL_EVENTO: uS, BOOTSTRAP_ORG_NAME: "Org A", BOOTSTRAP_ADMIN_EMAIL: "ana@a.test", BOOTSTRAP_ADMIN_PASSWORD: "Provisoria123", BOOTSTRAP_ADMIN_NAME: "Ana" });
  limparConfig();
  const { criarApp } = await import("../main"); const { PrismaService } = await import("../prisma.service"); const { primeiraPessoa } = await import("../bootstrap");
  const a = await criarApp(); await a.listen(0); app = a; correio = a.get(CorreioService);
  prisma = a.get(PrismaService); await primeiraPessoa(prisma); await primeiraPessoa(prisma);
  base = `http://127.0.0.1:${(a.getHttpServer().address() as AddressInfo).port}`;
});
after(async () => { await app.close(); adn.close(); sefaz.close(); });

let mfaAna: { seg: Buffer; codigos: string[] };
let ana: Sessao, empresa: string, certOk: Buffer, memo: string;
test("primeiro acesso exige trocar a senha provisória", async () => {
  ana = await logar("ana@a.test", "Provisoria123");
  assert.equal((await ana.get("/fiscal/companies")).corpo.code, "PASSWORD_CHANGE_REQUIRED");
  assert.equal((await ana.get("/me")).corpo.mustChangePassword, true);
  assert.equal((await ana.post("/auth/password", { atual: "errada", nova: "NovaSenha123" })).status, 400);
  assert.equal((await ana.post("/auth/password", { atual: "Provisoria123", nova: "fraca" })).status, 400);
  assert.equal((await ana.post("/auth/password", { atual: "Provisoria123", nova: "NovaSenha123" })).status, 200);
  assert.equal((await ana.get("/fiscal/companies")).status, 200, "duas etapas é opcional");
  ana = await logar("ana@a.test", "NovaSenha123");
  assert.equal((await ana.get("/me")).corpo.mfaSetupRequired, false);
  mfaAna = await ativarMfa(ana);
  assert.equal((await ana.get("/fiscal/companies")).status, 200);
  const antiga = new Sessao(); assert.equal((await antiga.post("/auth/login", { email: "ana@a.test", senha: "Provisoria123" })).status, 401);
});
test("sem sessão responde 401; health é público e não expõe nada", async () => {
  assert.equal((await new Sessao().get("/fiscal/companies")).status, 401);
  assert.deepEqual((await new Sessao().get("/health")).corpo, { status: "ok" });
});
test("bloqueia depois de 5 senhas erradas", async () => {
  const s = new Sessao();
  for (let i = 0; i < 5; i++) assert.equal((await s.post("/auth/login", { email: "x@y.test", senha: "n" })).status, 401);
  assert.equal((await s.post("/auth/login", { email: "x@y.test", senha: "n" })).status, 429);
});
test("importa certificado cifrado; a empresa nasce do memorando", async () => {
  const g = gerarPfx(`EMPRESA A LTDA:${A}`, "abc123"); certOk = g.pfx;
  assert.equal((await ana.post("/certificates", { pfx: g.pfx.toString("base64"), senha: "errada" })).status, 400);
  const r = await ana.post("/certificates", { pfx: g.pfx.toString("base64"), senha: "abc123" });
  assert.equal(r.status, 200);
  const salvo = await prisma.fiscalCertificate.findFirst({});
  assert.ok(!Buffer.from(salvo.pfxEncrypted).includes(g.pfx.subarray(0, 64)));
  const lista = (await ana.get("/certificates")).corpo.certificados;
  assert.equal(JSON.stringify(lista).includes("Encrypted"), false);
  assert.deepEqual((await ana.get("/fiscal/companies")).corpo.empresas, [], "certificado não cadastra empresa");
  const m = await ana.post("/memoranda", { numero: null, memo: { e_cnpj: "11.222.333/0001-81", e_razao: "EMPRESA A LTDA", m_data: "2026-11-05", deps: [{ nome: "Fiscal", on: true, resp: "Ana" }] } });
  assert.equal(m.status, 201); assert.equal(m.corpo.seq, 1); assert.equal(m.corpo.ano, 2026); memo = m.corpo.id;
  const l = (await ana.get("/fiscal/companies")).corpo.empresas;
  assert.equal(l[0].cnpj, A); assert.equal(l[0].certificado.documento, A); empresa = l[0].id;
});
test("NFS-e: captura em lotes, retoma pelo NSU, respeita pausa e cancelamento", async () => {
  fila.push((p) => { assert.match(p, new RegExp(`/DFe/0\\?cnpjConsulta=${A}&lote=true`)); return { status: 200, body: { StatusProcessamento: "DOCUMENTOS_LOCALIZADOS", LoteDFe: [
    { NSU: 2, TipoDocumento: "NFSE", ChaveAcesso: CH2, ArquivoXml: zipB64(nfseXml({ chave: CH2, prest: B, toma: A, valor: "50.00", numero: "13" })) },
    { NSU: 1, TipoDocumento: "NFSE", ChaveAcesso: CH1, ArquivoXml: zipB64(nfseXml({ chave: CH1, prest: A, toma: B, valor: "1000.10" })) },
    { NSU: 3, TipoDocumento: "NFSE", ChaveAcesso: "curta", ArquivoXml: zipB64("<x/>") },
  ] } }; });
  const u = `/fiscal/nfse/${empresa}`;
  const p1 = (await ana.post(`${u}/capture`)).corpo;
  assert.deepEqual([p1.status, p1.ultimoNsu, p1.notas, p1.falhas], ["lote", 3, 2, 1]);
  fila.push(() => ({ status: 429, body: {}, headers: { "retry-after": "1" } }));
  const p2 = (await ana.post(`${u}/capture`)).corpo; assert.equal(p2.status, "aguardar");
  assert.equal((await ana.post(`${u}/capture`)).corpo.status, "aguardar");
  await new Promise((r) => setTimeout(r, 1100));
  fila.push((p) => { assert.match(p, /\/DFe\/3\?/); return { status: 200, body: { StatusProcessamento: "DOCUMENTOS_LOCALIZADOS", LoteDFe: [{ NSU: 4, TipoDocumento: "EVENTO", ChaveAcesso: CH2, TipoEvento: "CANCELAMENTO", DataHoraGeracao: "2026-10-06T10:00:00", ArquivoXml: zipB64("<e><chNFSe>" + CH2 + "</chNFSe></e>") }] } }; });
  assert.equal((await ana.post(`${u}/capture`)).corpo.eventos, 1);
  assert.equal((await ana.post(`${u}/capture`)).corpo.status, "fim");
  const n = (await ana.get(`${u}/documents`)).corpo;
  assert.equal(n.competencia, "2026-10"); assert.equal(n.notas.length, 2); assert.equal(n.falhas.length, 1);
  assert.equal(n.notas.find((x: any) => x.chave === CH1).vServ, "1000.10");
  assert.equal(n.notas.find((x: any) => x.chave === CH2).situacao, "cancelada");
  assert.equal(JSON.stringify(n).includes("xmlGz"), false);
  const z = await ana.post(`${u}/zip`, { competencia: "2026-10" }); assert.equal(z.status, 200); assert.equal(z.corpo.subarray(0, 2).toString(), "PK");
  assert.ok((await ana.post(`${u}/xmls`, { chaves: [CH1] })).corpo.notas[0].xml.includes("<NFSe"));
  await ana.post(`${u}/restart`); fila.push((p) => { assert.match(p, /\/DFe\/0\?/); return { status: 200, body: { StatusProcessamento: "DOCUMENTOS_LOCALIZADOS", LoteDFe: [{ NSU: 1, TipoDocumento: "NFSE", ChaveAcesso: CH1, ArquivoXml: zipB64(nfseXml({ chave: CH1, prest: A, toma: B, valor: "1000.10" })) }] } }; });
  const rep = (await ana.post(`${u}/capture`)).corpo; assert.deepEqual([rep.notas, rep.repetidas], [0, 1]);
});
test("captura rejeitada pelo ADN registra o erro", async () => {
  const u = `/fiscal/nfse/${empresa}`;
  fila.push(() => ({ status: 400, body: { StatusProcessamento: "REJEICAO", Erros: [{ Codigo: "E1", Descricao: "Sem acesso" }] } }));
  const r = (await ana.post(`${u}/capture`)).corpo; assert.equal(r.status, "erro"); assert.match(r.mensagem, /E1 Sem acesso/);
  assert.match((await ana.get("/fiscal/companies")).corpo.empresas[0].ultimoErro, /E1/);
});
const dist = (cStat: string, ult: number, max: number, docs: string[] = []) => `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body><r><retDistDFeInt xmlns="http://www.portalfiscal.inf.br/nfe"><cStat>${cStat}</cStat><xMotivo>m</xMotivo><ultNSU>${String(ult).padStart(15, "0")}</ultNSU><maxNSU>${String(max).padStart(15, "0")}</maxNSU><loteDistDFeInt>${docs.map((d, i) => `<docZip NSU="${i + ult - docs.length + 1}">${zipB64(d)}</docZip>`).join("")}</loteDistDFeInt></retDistDFeInt></r></soap:Body></soap:Envelope>`;
const hojeMes = new Date().toISOString().slice(0, 7);
test("NF-e: resumo, ciência assinada, XML completo e bloqueio de 1 hora", async () => {
  await ana.pedir("PATCH", `/fiscal/dfe/${empresa}/auto-ciencia`, { ativo: true });
  const resumo = `<resNFe xmlns="http://www.portalfiscal.inf.br/nfe"><chNFe>${CHN}</chNFe><CNPJ>${B}</CNPJ><xNome>FORN</xNome><dhEmi>${hojeMes}-01T10:00:00-03:00</dhEmi><tpNF>1</tpNF><vNF>10.50</vNF><cSitNFe>1</cSitNFe></resNFe>`;
  soap.push((b) => { assert.match(b, /<cUFAutor>32<\/cUFAutor>/); assert.match(b, /<ultNSU>000000000000000<\/ultNSU>/); return dist("138", 1, 2, [resumo]); });
  const u = `/fiscal/dfe/${empresa}`;
  const p = (await ana.post(`${u}/nfe/capture`)).corpo; assert.deepEqual([p.status, p.notas], ["lote", 1]);
  assert.equal((await ana.get(`${u}/nfe/documents`)).corpo.documentos[0].ciencia, "pendente");
  soap.push((b) => { assert.match(b, /<tpEvento>210210<\/tpEvento>/); return `<a><retEnvEvento><cStat>128</cStat><xMotivo>ok</xMotivo><retEvento><infEvento><chNFe>${CHN}</chNFe><cStat>135</cStat><xMotivo>ok</xMotivo></infEvento></retEvento></retEnvEvento></a>`; });
  const c = (await ana.post(`${u}/ciencia/send`)).corpo; assert.deepEqual([c.enviadas, c.restantes], [1, 0]);
  const cAss = corpos[corpos.length - 1].match(/<evento .*<\/evento>/)![0];
  // Mesma canonicalização usada pelo sistema de origem (PHP DOM): confere digest e assinatura.
  const php = `$d=new DOMDocument();$d->load($argv[1]);$g=fn($n)=>$d->getElementsByTagName($n)->item(0);$ok=base64_encode(sha1($g("infEvento")->C14N(false,false),true))===$g("DigestValue")->textContent;$pem="-----BEGIN CERTIFICATE-----\n".chunk_split($g("X509Certificate")->textContent,64,"\n")."-----END CERTIFICATE-----\n";echo ($ok&&openssl_verify($g("SignedInfo")->C14N(false,false),base64_decode($g("SignatureValue")->textContent),$pem,OPENSSL_ALGO_SHA1)===1)?"ok":"falhou";`;
  assert.equal(execFileSync("php", ["-r", php, gravarTmp("e.xml", cAss)]).toString().trim(), "ok");
  const nfe = `<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe${CHN}"><ide><dhEmi>${hojeMes}-01T10:00:00-03:00</dhEmi><tpNF>1</tpNF></ide><emit><CNPJ>${B}</CNPJ><xNome>F</xNome></emit><dest><CNPJ>${A}</CNPJ></dest><total><ICMSTot><vNF>10.50</vNF></ICMSTot></total></infNFe></NFe><protNFe><infProt><cStat>100</cStat></infProt></protNFe></nfeProc>`;
  soap.push(() => dist("138", 2, 2, [nfe]));
  assert.equal((await ana.post(`${u}/nfe/capture`)).corpo.status, "fim");
  const d = (await ana.get(`${u}/nfe/documents`)).corpo.documentos[0]; assert.equal(d.conteudo, "completa"); assert.equal(d.ciencia, "enviada");
  const n = corpos.length; const esp = (await ana.post(`${u}/nfe/capture`)).corpo;
  assert.equal(esp.status, "aguardar"); assert.ok(esp.segundos > 3000); assert.equal(corpos.length, n, "não pode consultar antes de 1 hora");
  assert.equal((await ana.post(`${u}/nfe/zip`, { competencia: hojeMes })).corpo.subarray(0, 2).toString(), "PK");
});
test("CT-e: 656 segue do NSU informado pela SEFAZ", async () => {
  const u = `/fiscal/dfe/${empresa}`;
  soap.push(() => dist("656", 77, 90));
  assert.equal((await ana.post(`${u}/cte/capture`)).corpo.status, "aguardar");
  const e = (await ana.get("/fiscal/dfe/companies")).corpo.empresas[0];
  assert.equal(e.cte.ultimoNsu, 77); assert.match(e.cte.ultimoErro, /Outro sistema/);
});

let bruno: Sessao, outra: Sessao, empresaB: string;
test("cada pessoa tem login próprio e só o que recebeu", async () => {
  const novo = (await ana.post("/users", { name: "Bruno", email: "bruno@a.test", senhaProvisoria: "Provisoria456", role: "STAFF", permissions: ["companies.read", "fiscal.documents.read"], allCompanies: false, companyIds: [] }));
  assert.equal(novo.status, 201);
  assert.equal((await ana.post("/users", { name: "Dup", email: "bruno@a.test", senhaProvisoria: "Provisoria456", role: "STAFF", permissions: [], allCompanies: false, companyIds: [] })).status, 409);
  bruno = await logar("bruno@a.test", "Provisoria456");
  await bruno.post("/auth/password", { atual: "Provisoria456", nova: "SenhaBruno123" });
  bruno = await logar("bruno@a.test", "SenhaBruno123");
  assert.deepEqual((await bruno.get("/fiscal/companies")).corpo.empresas, []);
  assert.equal((await bruno.get(`/fiscal/nfse/${empresa}/documents`)).status, 404);
  assert.equal((await bruno.post(`/fiscal/nfse/${empresa}/capture`)).status, 403);
  assert.equal((await bruno.get("/certificates")).status, 403);
  assert.equal((await bruno.get("/users")).status, 403);
  await ana.pedir("PATCH", `/users/${novo.corpo.id}`, { role: "STAFF", status: "ACTIVE", permissions: ["companies.read", "fiscal.documents.read"], allCompanies: false, companyIds: [empresa] });
  assert.equal((await bruno.get("/me")).status, 401, "alterar acesso encerra a sessão");
  bruno = await logar("bruno@a.test", "SenhaBruno123");
  assert.equal((await bruno.get(`/fiscal/nfse/${empresa}/documents`)).corpo.notas.length, 2);
  await ana.pedir("PATCH", `/users/${novo.corpo.id}`, { role: "STAFF", status: "SUSPENDED", permissions: [], allCompanies: false, companyIds: [] });
  assert.equal((await new Sessao().post("/auth/login", { email: "bruno@a.test", senha: "SenhaBruno123" })).status, 403, "membro suspenso não entra");
});
test("perfil: cada pessoa altera nome e foto próprios", async () => {
  const foto = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
  assert.equal((await ana.pedir("PATCH", "/me", { name: "Monique Jesus", phone: "", avatar: foto })).status, 200);
  const e = (await ana.get("/me")).corpo; assert.equal(e.name, "Monique Jesus"); assert.equal(e.avatar, foto); assert.equal(e.email, "ana@a.test");
  assert.equal((await ana.pedir("PATCH", "/me", { name: "Monique Jesus", avatar: "data:text/html;base64,PHNjcmlwdD4=" })).status, 400);
  assert.equal((await ana.pedir("PATCH", "/me", { name: "Monique Jesus", avatar: "javascript:alert(1)" })).status, 400);
  assert.equal((await new Sessao().pedir("PATCH", "/me", { name: "Xx", avatar: null })).status, 401);
});
test("sem escalada: não concede o que não tem", async () => {
  const o = await prisma.organization.findFirst({}); const u = await prisma.user.findUnique({ where: { email: "ana@a.test" } });
  await prisma.membershipPermission.deleteMany({ where: { permission: "audit.read", membership: { userId: u.id } } });
  assert.equal((await ana.post("/users", { name: "Carla", email: "c@a.test", senhaProvisoria: "Provisoria456", role: "STAFF", permissions: ["audit.read"], allCompanies: true, companyIds: [] })).status, 403);
  void o;
});
test("duas etapas: exige código e aceita recuperação uma vez", async () => {
  const { totp } = await import("../identity/mfa.controller");
  const s = await logar("ana@a.test", "NovaSenha123");
  assert.equal((await s.get("/fiscal/companies")).corpo.code, "MFA_REQUIRED");
  assert.equal((await s.post("/auth/password", { atual: "NovaSenha123", nova: "OutraSenha123" })).corpo.code, "MFA_REQUIRED");
  assert.equal((await s.post("/auth/mfa/verify", { codigo: "000000" })).status, 400);
  assert.equal((await s.post("/auth/mfa/verify", { codigo: mfaAna.codigos[0] })).status, 200);
  assert.equal((await s.get("/fiscal/companies")).status, 200);
  const s2 = await logar("ana@a.test", "NovaSenha123");
  assert.equal((await s2.post("/auth/mfa/verify", { codigo: mfaAna.codigos[0] })).status, 400, "código de recuperação só vale uma vez");
  await new Promise((r) => setTimeout(r, 0));
  const passo = Math.floor(Date.now() / 30000) + 1;
  const ok = await s2.post("/auth/mfa/verify", { codigo: totp(mfaAna.seg, passo) }); assert.equal(ok.status, 200);
  const s3 = await logar("ana@a.test", "NovaSenha123");
  assert.equal((await s3.post("/auth/mfa/verify", { codigo: totp(mfaAna.seg, passo) })).status, 400, "código usado não vale de novo");
});
test("mensagens: direta, geral, menção e isolamento", async () => {
  const senha = "Provisoria456", u = async (nome: string, email: string) => { const r = await ana.post("/users", { name: nome, email, senhaProvisoria: senha, role: "STAFF", permissions: [], allCompanies: false, companyIds: [], jobTitle: "Assistente" }); assert.equal(r.status, 201, JSON.stringify(r.corpo)); await prisma.user.update({ where: { email }, data: { mustChangePassword: false } }); return logar(email, senha); };
  const bia = await u("Bia Souza", "bia@a.test"), caio = await u("Caio Lima", "caio@a.test");
  const id = async (email: string) => (await prisma.user.findUnique({ where: { email } })).id, iBia = await id("bia@a.test"), iCaio = await id("caio@a.test");
  assert.equal((await bia.post(`/messages/${iCaio}`, { texto: "   " })).status, 400);
  assert.equal((await bia.post(`/messages/${iCaio}`, { texto: "Oi Caio" })).status, 201);
  assert.equal((await caio.get("/messages")).corpo.total, 1); assert.equal((await ana.get("/messages")).corpo.total, 0, "terceiro não recebe");
  assert.equal((await ana.get(`/messages/${iCaio}`)).corpo.mensagens.length, 0, "terceiro não lê conversa alheia");
  const aviso = (await caio.get("/messages")).corpo.avisos[0]; assert.equal(aviso.de, "Bia Souza"); assert.equal(aviso.conversa, iBia);
  assert.equal((await caio.post(`/messages/${iBia}/read`)).status, 200); assert.equal((await caio.get("/messages")).corpo.total, 0);
  assert.equal((await bia.post("/messages/geral", { texto: "Bom dia @Caio Lima, veja o memorando" })).status, 201);
  const c2 = (await caio.get("/messages")).corpo; assert.equal(c2.total, 1); assert.equal(c2.avisos[0].mencao, true);
  const a2 = (await ana.get("/messages")).corpo; assert.equal(a2.total, 1, "Geral avisa todos"); assert.equal(a2.avisos[0].mencao, false);
  assert.equal((await bia.get("/messages")).corpo.total, 0, "quem envia não recebe aviso");
  assert.equal((await caio.get("/messages/geral")).corpo.mensagens[0].mencionou, true);
  assert.equal((await bia.get(`/messages/${iBia}`)).status, 404, "não conversa consigo");
  const de = await prisma.organizationMembership.findFirst({ where: { user: { email: "bia@a.test" } } });
  const dd = { name: "Bia Souza", email: "bia@a.test" };
  assert.equal((await bia.pedir("PUT", `/users/${de.id}/details`, { ...dd, jobTitle: "Diretora" })).status, 403, "cargo é do administrador");
  assert.equal((await ana.pedir("PUT", `/users/${de.id}/details`, { ...dd, name: "Bia Lima", jobTitle: "Analista" })).status, 200); const eub = (await bia.get("/me")).corpo; assert.equal(eub.jobTitle, "Analista"); assert.equal(eub.name, "Bia Lima");
  assert.equal((await ana.pedir("PUT", `/users/${de.id}/details`, { ...dd, email: "caio@a.test" })).corpo.code, "EMAIL_IN_USE"); await ana.pedir("PUT", `/users/${de.id}/details`, { ...dd, jobTitle: "Analista" });
  await bia.pedir("PATCH", "/me", { name: "Bia Souza", jobTitle: "Sócia", phone: "", avatar: null }); assert.equal((await bia.get("/me")).corpo.jobTitle, "Analista", "o perfil não muda o cargo");
  const iAna = await id("ana@a.test");
  const pv = await bia.post("/messages/groups", { nome: "Fechamento", privado: true, pessoas: [iAna] }); assert.equal(pv.status, 201);
  assert.equal((await bia.post("/messages/groups", { nome: "X", privado: true, pessoas: [] })).status, 400);
  assert.equal((await bia.post("/messages/groups", { nome: "Fora", privado: true, pessoas: ["00000000-0000-4000-8000-000000000000"] })).status, 400);
  assert.equal((await caio.get(`/messages/${pv.corpo.id}`)).status, 404, "privado não aparece a quem não participa");
  assert.equal((await caio.post(`/messages/${pv.corpo.id}`, { texto: "oi" })).status, 404);
  assert.equal((await caio.get("/messages")).corpo.grupos.length, 0);
  const msg = await bia.post(`/messages/${pv.corpo.id}`, { texto: "Reunião @Ana hoje @Caio Lima" }); assert.equal(msg.status, 201);
  assert.equal((await prisma.message.findUnique({ where: { id: msg.corpo.id } })).mentions.includes(iCaio), false, "não marca quem está fora do privado");
  const gid = pv.corpo.id.slice(2);
  assert.equal((await caio.post(`/messages/groups/${gid}/members`, { pessoas: [iCaio] })).status, 404, "não se inclui em privado");
  assert.equal((await bia.post(`/messages/groups/${gid}/members`, { pessoas: [iCaio] })).status, 200);
  assert.equal((await caio.get(`/messages/${pv.corpo.id}`)).corpo.mensagens.length, 1, "incluído lê a conversa");
  const zc = (await caio.get("/messages")).corpo; assert.equal(zc.grupos[0].participa, true); assert.equal(zc.grupos[0].naoLidas, 1);
  assert.equal((await caio.post(`/messages/${pv.corpo.id}/${msg.corpo.id}/forward`, { destino: iBia })).status, 201);
  const fw = (await bia.get(`/messages/${iCaio}`)).corpo.mensagens.at(-1); assert.equal(fw.encaminhadaDe, "Bia Souza"); assert.equal(fw.texto, "Reunião @Ana hoje @Caio Lima");
  assert.equal((await caio.post(`/messages/groups/${gid}/leave`)).status, 200); assert.equal((await caio.get(`/messages/${pv.corpo.id}`)).status, 404, "quem saiu perde o acesso");
  assert.equal((await caio.post(`/messages/${iBia}/${msg.corpo.id}/forward`, { destino: iBia })).status, 404, "não encaminha o que não lê");
  assert.equal((await bia.pedir("PATCH", `/messages/groups/${gid}`, { privado: false })).status, 200);
  const ab = (await caio.get("/messages")).corpo.grupos[0]; assert.equal(ab.participa, false); assert.equal(ab.naoLidas, 0, "grupo aberto não notifica quem não entrou");
  assert.equal((await caio.post(`/messages/${pv.corpo.id}`, { texto: "Entrei" })).status, 201); assert.equal((await caio.get("/messages")).corpo.grupos[0].participa, true);
  const dono = await prisma.organizationMembership.findFirst({ where: { user: { email: "ana@a.test" } } }), mc = await prisma.organizationMembership.findFirst({ where: { user: { email: "caio@a.test" } } });
  assert.equal((await ana.pedir("DELETE", `/users/${dono.id}`)).status, 403, "proprietária não é excluída");
  assert.equal((await bia.pedir("DELETE", `/users/${mc.id}`)).status, 403, "exige users.manage");
  assert.equal((await ana.pedir("DELETE", `/users/${mc.id}`)).status, 200); assert.equal(await prisma.user.count({ where: { email: "caio@a.test" } }), 0); assert.equal((await caio.get("/me")).status, 401, "quem foi excluído perde o acesso");
  await prisma.chat.deleteMany({}); await prisma.message.deleteMany({}); await prisma.user.delete({ where: { email: "bia@a.test" } });
});
test("redefinir senha por código enviado no e-mail", async () => {
  const c = new Sessao(), { hashSenha } = await import("../common/passwords");
  assert.equal((await c.post("/auth/forgot-password", { email: "ana@a.test" })).status, 503, "sem SMTP avisa");
  const caixa: { assunto: string }[] = [];
  correio.configurado = () => true; correio.enviar = async (_p, assunto) => { caixa.push({ assunto }); };
  const email = "esqueceu@a.test";
  await prisma.user.create({ data: { email, name: "Esqueceu", passwordHash: await hashSenha("Provisoria456") } });
  assert.equal((await c.post("/auth/forgot-password", { email: "ninguem@a.test" })).status, 200, "não revela quem existe"); assert.equal(caixa.length, 0);
  assert.equal((await c.post("/auth/forgot-password", { email })).status, 200); assert.equal(caixa.length, 1);
  const codigo = /(\d{6})/.exec(caixa[0].assunto)![1], errado = codigo === "000000" ? "000001" : "000000";
  assert.equal((await prisma.passwordReset.findFirst({ where: { user: { email } } })).codeHash.includes(codigo), false, "código não fica aberto");
  assert.equal((await c.post("/auth/reset-password", { email, codigo: errado, nova: "NovaSenhaBoa123" })).corpo.code, "CODE_INVALID");
  assert.equal((await c.post("/auth/reset-password", { email, codigo, nova: "curta" })).status, 400);
  assert.equal((await c.post("/auth/reset-password", { email, codigo, nova: "NovaSenhaBoa123" })).status, 200);
  assert.equal((await c.post("/auth/reset-password", { email, codigo, nova: "OutraSenhaBoa123" })).corpo.code, "CODE_INVALID", "código vale uma vez");
  await c.post("/auth/forgot-password", { email }); const novo = /(\d{6})/.exec(caixa[1].assunto)![1], ruim = novo === "000000" ? "000001" : "000000";
  for (let i = 0; i < 5; i++) await c.post("/auth/reset-password", { email, codigo: ruim, nova: "NovaSenhaBoa123" });
  assert.equal((await c.post("/auth/reset-password", { email, codigo: novo, nova: "OutraSenhaBoa123" })).corpo.code, "CODE_INVALID", "5 erros invalidam o código");
  for (let i = 0; i < 3; i++) await c.post("/auth/forgot-password", { email }); assert.equal(caixa.length, 4, "no máximo 3 pedidos em 15 minutos");
  await prisma.user.delete({ where: { email } });
});
test("CNPJ do escritório fica só com a proprietária e quem ela liberar", async () => {
  const org = (await prisma.organization.findFirst({ where: { internal: true } })).id, senha = "Provisoria456";
  await prisma.organization.update({ where: { id: org }, data: { cnpj: "11.222.333/0001-81" } });
  const perms = ["companies.read", "fiscal.documents.read", "fiscal.credentials.manage", "memoranda.read", "memoranda.manage"];
  const nova = await ana.post("/users", { name: "Equipe", email: "equipe@a.test", senhaProvisoria: senha, role: "STAFF", permissions: perms, allCompanies: true, companyIds: [] }); assert.equal(nova.status, 201, JSON.stringify(nova.corpo));
  await prisma.user.update({ where: { email: "equipe@a.test" }, data: { mustChangePassword: false } });
  const eq = await logar("equipe@a.test", senha);
  const veA = async (s: Sessao) => JSON.stringify([(await s.get("/fiscal/companies")).corpo, (await s.get("/memoranda")).corpo, (await s.get("/fiscal/dashboard")).corpo, (await s.get("/certificates")).corpo]).includes(A.slice(0, 8));
  assert.equal(await veA(ana), true, "proprietária vê"); assert.equal(await veA(eq), false, "equipe com carteira toda não vê");
  assert.equal((await eq.post("/memoranda", { numero: null, memo: { e_cnpj: A, e_razao: "Própria", m_data: "2026-11-06" } })).corpo.code, "RESTRICTED_CNPJ", "nem cadastra");
  assert.equal((await eq.get(`/fiscal/nfse/${empresa}/documents?ambiente=2`)).status, 404, "nem por id");
  assert.equal((await eq.post("/users", { name: "Outro", email: "x2@a.test", senhaProvisoria: senha, role: "STAFF", permissions: ["companies.read"], allCompanies: false, companyIds: [] })).status, 403);
  const id = (await prisma.organizationMembership.findFirst({ where: { user: { email: "equipe@a.test" } } })).id;
  assert.equal((await ana.pedir("PATCH", `/users/${id}`, { role: "STAFF", status: "ACTIVE", permissions: [...perms, "companies.restricted"], allCompanies: true, companyIds: [] })).status, 200);
  assert.equal(await veA(await logar("equipe@a.test", senha)), true, "quem ela libera passa a ver");
  await prisma.organization.update({ where: { id: org }, data: { cnpj: "" } }); await prisma.user.delete({ where: { email: "equipe@a.test" } });
});
test("escritório acessa só os módulos liberados", async () => {
  const org = await prisma.organization.findFirst({ where: { internal: true } });
  await prisma.organization.update({ where: { id: org.id }, data: { internal: false } });
  assert.equal((await ana.get("/fiscal/dfe/companies")).corpo.code, "MODULE_DISABLED"); assert.equal((await ana.get("/fiscal/companies")).status, 200); assert.equal((await ana.get("/memoranda")).status, 200); assert.equal((await ana.get("/users")).status, 200);
  await prisma.organization.update({ where: { id: org.id }, data: { internal: true } });
});
test("importa pacote da Facilitar só para o próprio escritório", async () => {
  const empacotar = (dados: unknown, frase: string) => { const salt = randomBytes(16), iv = randomBytes(12), k = pbkdf2Sync(frase, salt, 210000, 32, "sha256"), c = createCipheriv("aes-256-gcm", k, iv), data = Buffer.concat([c.update(JSON.stringify(dados), "utf8"), c.final()]); return JSON.stringify({ formato: "neeko-migracao", versao: 1, iter: 210000, salt: salt.toString("base64"), iv: iv.toString("base64"), tag: c.getAuthTag().toString("base64"), data: data.toString("base64") }); };
  const raiz = "55443322", cnpj = `${raiz}000170`, p = gerarPfx(`IMPORTADA LTDA:${cnpj}`, "senhacert");
  const pacote = empacotar({ memorandos: [
    { seq: 71, ano: 2024, status: "ativo", situacaoCliente: "ativa", e_cnpj: "55.443.322/0001-70", e_razao: "Importada Ltda", m_data: "2024-03-01", criadoPorNome: "Equipe", criadoEm: "2024-03-01T10:00:00-03:00", historico: [{ acao: "Criou o memorando", por: "Equipe", em: "2024-03-01T10:00:00-03:00" }] },
    { seq: 72, ano: 2024, status: "cancelado", situacaoCliente: "inativa", dataSaida: "2024-06-01", motivoSaida: "Encerrou", e_cnpj: "22.333.444/0001-81", e_razao: "Saiu Ltda" },
    { seq: 73, ano: 2024, status: "ativo", e_cnpj: "123", e_razao: "Sem CNPJ" },
    { seq: 74, ano: 2024, status: "ativo", e_cnpj: "55.443.322/0001-70", e_razao: "Importada Ltda" },
  ], certificados: [{ id: "abc", apelido: "Matriz", pfx: p.pfx.toString("base64"), senha: "senhacert" }, { id: "ruim", pfx: "AAAA", senha: "x" }], nfse: { procurador: "abc", modos: { [cnpj]: "procuracao" } }, restritas: ["77665544"] }, "frase bem longa 123");
  assert.equal((await ana.post("/office/import", { pacote, frase: "frase bem longa 123" })).corpo.code, "MODULE_DISABLED", "desligada por padrão");
  process.env.OFFICE_IMPORT_ENABLED = "true"; limparConfig();
  assert.equal((await ana.post("/office/import", { pacote, frase: "frase errada 12345" })).status, 400);
  const r = await ana.post("/office/import", { pacote, frase: "frase bem longa 123" }); assert.equal(r.status, 200, JSON.stringify(r.corpo));
  assert.equal(r.corpo.memorandos.importados, 2); assert.equal(r.corpo.memorandos.pulados.length, 2); assert.equal(r.corpo.certificados.importados, 1); assert.equal(r.corpo.certificados.pulados.length, 1);
  const o = await prisma.organization.findFirst({ where: { internal: true } }), org = o.id; assert.deepEqual(o.restrictedRoots, ["77665544"]);
  const m = await prisma.memorandum.findFirst({ where: { organizationId: org, seq: 71, ano: 2024 }, include: { company: true } });
  assert.equal(m.company.cnpj, cnpj); assert.equal(m.company.nfseMode, "procuracao"); assert.equal(m.createdByName, "Equipe"); assert.equal(m.data.e_razao, "Importada Ltda"); assert.equal(m.data.seq, undefined);
  assert.equal(m.createdAt.toISOString(), "2024-03-01T13:00:00.000Z");
  const s = await prisma.memorandum.findFirst({ where: { organizationId: org, seq: 72 }, include: { company: true } }); assert.equal(s.status, "cancelado"); assert.equal(s.clientStatus, "inativa"); assert.equal(s.exitReason, "Encerrou"); assert.equal(s.company.active, false);
  const cert = await prisma.fiscalCertificate.findFirst({ where: { organizationId: org, document: cnpj } }); assert.equal(cert.nickname, "Matriz"); assert.equal(Buffer.from(cert.pfxEncrypted).includes(p.pfx.subarray(0, 40)), false, "guarda cifrado");
  assert.equal((await prisma.fiscalSettings.findUnique({ where: { organizationId: org } })).procuratorCertificateId, cert.id);
  assert.equal((await ana.post("/office/import", { pacote, frase: "frase bem longa 123" })).corpo.memorandos.importados, 0, "repetir não duplica");
  await prisma.organization.update({ where: { id: org }, data: { restrictedRoots: [] } });
  delete process.env.OFFICE_IMPORT_ENABLED; limparConfig();
  assert.equal((await ana.get("/me")).corpo.organization.theme, "verde", "a Neeko começa no verde");
  assert.equal((await ana.pedir("PUT", "/office/theme", { tema: "rosa" })).status, 400);
  assert.equal((await ana.pedir("PUT", "/office/theme", { tema: "marinho" })).status, 200);
  assert.equal((await ana.get("/me")).corpo.organization.theme, "marinho");
});
test("plataforma: Neeko gerencia escritórios sem ver dados deles", async () => {
  const u = await prisma.user.findUnique({ where: { email: "ana@a.test" } });
  assert.equal(u.globalRole, "NEEKO_SUPERADMIN"); assert.equal((await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } })).internal, true);
  assert.deepEqual((await ana.get("/platform/plans")).corpo.planos.map((x: any) => [x.name, x.maxCompanies, x.maxUsers, x.monthlyPrice]), [["Piloto", null, null, "0.00"], ["Neeko Essencial", 15, 3, "149.90"], ["Neeko Profissional", 50, 10, "299.90"], ["Neeko Premium", 150, 30, "599.90"]]);
  const p = await ana.post("/platform/plans", { name: "Básico", maxCompanies: 1, maxUsers: 2, monthlyPrice: "199.90" }); assert.equal(p.status, 201);
  const es = await ana.post("/platform/offices", { name: "Escritório Beta", cnpj: "11.444.777/0001-61", planId: p.corpo.id, paidUntil: "2026-12-10", gestorNome: "Gestora Beta", gestorEmail: "gestora@beta.test", senhaProvisoria: "Provisoria789" });
  assert.equal(es.status, 201);
  assert.equal((await ana.post("/platform/offices", { name: "Dup", cnpj: "", planId: null, gestorNome: "Dup", gestorEmail: "gestora@beta.test", senhaProvisoria: "Provisoria789" })).status, 409);
  const lista = (await ana.get("/platform/offices")).corpo.escritorios, beta = lista.find((o: any) => o.id === es.corpo.id);
  assert.equal(beta.plano, "Básico"); assert.equal(beta.usuarios, 1); assert.equal(beta.gestorEmail, "gestora@beta.test");
  assert.equal(JSON.stringify(lista).match(/xmlGz|pfx|data"/), null);
  let g = await logar("gestora@beta.test", "Provisoria789"); await g.post("/auth/password", { atual: "Provisoria789", nova: "SenhaBeta1234" }); g = await logar("gestora@beta.test", "SenhaBeta1234"); await ativarMfa(g);
  assert.equal((await g.get("/platform/offices")).status, 403, "gestor não acessa a plataforma");
  assert.equal((await g.post("/memoranda", { memo: { e_cnpj: "11444777000161", e_razao: "Primeira" } })).status, 201);
  const lim = await g.post("/memoranda", { memo: { e_cnpj: "11444777000242", e_razao: "Segunda" } }); assert.equal(lim.status, 403); assert.equal(lim.corpo.code, "LIMIT_COMPANIES");
  const n = { role: "STAFF", permissions: [], allCompanies: false, companyIds: [], senhaProvisoria: "Provisoria456" };
  assert.equal((await g.post("/users", { ...n, name: "Um", email: "um@beta.test" })).status, 201);
  assert.equal((await g.post("/users", { ...n, name: "Dois", email: "dois@beta.test" })).status, 201, "o plano limita acessos simultâneos, não cadastros");
  await prisma.user.updateMany({ where: { email: { in: ["um@beta.test", "dois@beta.test"] } }, data: { mustChangePassword: false } });
  const um = await logar("um@beta.test", "Provisoria456");
  const cheio = await new Sessao().post("/auth/login", await corpoLogin("dois@beta.test", "Provisoria456")); assert.equal(cheio.status, 403); assert.equal(cheio.corpo.code, "LIMIT_SIMULTANEOUS");
  assert.equal((await ana.get("/platform/offices")).corpo.escritorios.find((o: any) => o.id === es.corpo.id).emUso, 2);
  await logar("gestora@beta.test", "SenhaBeta1234"); await prisma.session.updateMany({ where: { user: { email: "gestora@beta.test" } }, data: { mfaVerified: true } });
  await prisma.session.updateMany({ where: { user: { email: "um@beta.test" } }, data: { lastSeenAt: new Date(Date.now() - 20 * 60000) } });
  const dois = await logar("dois@beta.test", "Provisoria456");
  assert.equal((await um.get("/memoranda")).corpo.code, "LIMIT_SIMULTANEOUS", "sessão parada não fura o limite");
  await dois.post("/auth/logout", {}); assert.notEqual((await um.get("/memoranda")).corpo.code, "LIMIT_SIMULTANEOUS", "quem sai libera o acesso");
  const png = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]).toString("base64")}`;
  assert.equal((await g.pedir("PUT", "/office", { logo: "data:text/html;base64,AAAA", contactEmail: "", contactPhone: "" })).status, 400);
  assert.equal((await g.pedir("PUT", "/office", { logo: png, contactEmail: "a@beta.test", contactPhone: "27" })).status, 200);
  assert.equal((await g.get("/me")).corpo.organization.logo, png);
  assert.equal((await um.pedir("PUT", "/office", { logo: null, contactEmail: "", contactPhone: "" })).status, 403, "só quem gerencia o escritório");
  assert.equal(JSON.stringify((await ana.get("/platform/offices")).corpo).includes(png), false);
  assert.equal((await ana.pedir("PATCH", `/platform/offices/${es.corpo.id}`, { name: "Escritório Beta", cnpj: "", billingExempt: true, planId: p.corpo.id })).status, 200);
  assert.equal((await ana.get("/platform/offices")).corpo.escritorios.find((o: any) => o.id === es.corpo.id).billingExempt, true);
  assert.equal((await ana.get(`/fiscal/nfse/${(await g.get("/memoranda")).corpo.memorandos[0].id}/documents`)).status, 404, "Neeko não entra nos dados do escritório");
  assert.equal((await ana.post(`/platform/offices/${es.corpo.id}/status`, { status: "SUSPENDED" })).status, 200);
  assert.equal((await g.get("/memoranda")).status, 401, "suspensão encerra as sessões");
  const g2 = await logar("gestora@beta.test", "SenhaBeta1234");
  const { totp } = await import("../identity/mfa.controller"); void totp;
  await prisma.session.updateMany({ where: { user: { email: "gestora@beta.test" } }, data: { mfaVerified: true } });
  assert.equal((await g2.get("/memoranda")).corpo.code, "OFFICE_SUSPENDED");
  await ana.post(`/platform/offices/${es.corpo.id}/status`, { status: "ACTIVE" });
  assert.equal((await g2.get("/memoranda")).status, 401, "reativar também pede novo login");
  const g3 = await logar("gestora@beta.test", "SenhaBeta1234"); await prisma.session.updateMany({ where: { user: { email: "gestora@beta.test" } }, data: { mfaVerified: true } });
  assert.equal((await g3.get("/memoranda")).status, 200);
  const interna = lista.find((o: any) => o.internal); assert.equal((await ana.post(`/platform/offices/${interna.id}/status`, { status: "SUSPENDED" })).status, 400);
  assert.equal((await ana.post(`/platform/offices/${es.corpo.id}/reset-manager`, { senhaProvisoria: "Provisoria555" })).status, 200);
  assert.equal((await new Sessao().post("/auth/login", await corpoLogin("gestora@beta.test", "Provisoria555"))).corpo.mustChangePassword, true);
  const slug = (await ana.get("/platform/offices")).corpo.escritorios.find((o: any) => o.id === es.corpo.id).slug; assert.equal(slug, "escritorio-beta");
  assert.deepEqual(Object.keys((await new Sessao().get(`/public/offices/${slug}`)).corpo).sort(), ["logo", "name", "theme"]);
  assert.equal((await new Sessao().get(`/public/offices/${interna.slug}`)).status, 404, "a organização interna não tem link público");
  assert.equal((await new Sessao().post("/auth/login", { email: "gestora@beta.test", senha: "Provisoria555" })).corpo.code, "USE_OFFICE_LINK", "gestor não entra pelo link da Neeko");
  assert.equal((await new Sessao().post("/auth/login", { email: "gestora@beta.test", senha: "Provisoria555", escritorio: "outro" })).status, 401);
  assert.equal((await new Sessao().post("/auth/login", { email: "o@b.test", senha: "NovaSenha123", escritorio: slug })).status, 401, "link de outro escritório recusa");
  await prisma.organizationMembership.create({ data: { organizationId: es.corpo.id, role: "STAFF", userId: (await prisma.user.findFirstOrThrow({ where: { email: "ana@a.test" } })).id } });
  await ana.post("/platform/plans", { name: "Sem limite", maxCompanies: null, maxUsers: null, monthlyPrice: "1" });
  const cliente = new Sessao(); assert.equal((await cliente.post("/auth/login", { email: "ana@a.test", senha: "NovaSenha123", escritorio: slug })).status, 200);
  await prisma.session.updateMany({ where: { user: { email: "ana@a.test" }, portal: "escritorio" }, data: { mfaVerified: true } });
  assert.equal((await cliente.get("/platform/offices")).status, 403, "link do escritório não abre o gerencial");
  assert.equal((await cliente.get("/me")).corpo.platformAdmin, false);
  assert.equal((await ana.pedir("PATCH", `/platform/offices/${es.corpo.id}`, { name: "Escritório Beta", cnpj: "", planId: p.corpo.id, slug: interna.slug })).status, 409, "link repetido");
  assert.equal((await ana.pedir("PATCH", `/platform/offices/${es.corpo.id}`, { name: "Escritório Beta", cnpj: "", planId: p.corpo.id, slug: "Com Espaço" })).status, 400);
  assert.equal((await ana.pedir("DELETE", `/platform/offices/${interna.id}`, { nome: interna.name })).status, 400, "interna não é excluída");
  assert.equal((await ana.pedir("DELETE", `/platform/offices/${es.corpo.id}`, { nome: "Outro" })).status, 400, "nome precisa conferir");
  const g4 = await logar("gestora@beta.test", "Provisoria555"); await prisma.user.updateMany({ where: { email: "gestora@beta.test" }, data: { mustChangePassword: false } });
  const nega = await g4.pedir("DELETE", `/platform/offices/${es.corpo.id}`, { nome: "Escritório Beta" }); assert.equal(nega.status, 403, "gestor não exclui"); assert.equal(nega.corpo.code, "FORBIDDEN");
  assert.equal((await prisma.organization.count({ where: { id: es.corpo.id } })), 1);
  assert.equal((await ana.pedir("DELETE", `/platform/offices/${es.corpo.id}`, { nome: "Escritório Beta" })).status, 200);
  assert.equal(await prisma.company.count({ where: { organizationId: es.corpo.id } }), 0); assert.equal(await prisma.user.count({ where: { email: { endsWith: "@beta.test" } } }), 0);
  assert.equal((await new Sessao().post("/auth/login", { email: "gestora@beta.test", senha: "Provisoria555" })).status, 401);
  assert.equal((await ana.get("/me")).status, 200, "a conta Neeko segue ativa");
});
test("isolamento entre organizações", async () => {
  const { hashSenha } = await import("../common/passwords");
  await prisma.user.create({ data: { email: "o@b.test", name: "O", passwordHash: await hashSenha("SenhaOutra123"), mustChangePassword: false, memberships: { create: { role: "STAFF", allCompanies: true, organization: { create: { name: "Org B" } }, permissions: { create: ["companies.read", "companies.manage", "fiscal.documents.read", "fiscal.capture", "fiscal.credentials.manage", "fiscal.ciencia.send", "users.manage", "memoranda.read", "memoranda.manage"].map((permission) => ({ permission })) } } } } });
  outra = await logar("o@b.test", "SenhaOutra123");
  const anaId = (await prisma.user.findUnique({ where: { email: "ana@a.test" } })).id; assert.equal((await outra.post(`/messages/${anaId}`, { texto: "oi" })).status, 404, "mensagem não atravessa escritório"); assert.equal((await outra.get(`/messages/${anaId}`)).status, 404);
  const mAna = await prisma.organizationMembership.findFirst({ where: { user: { email: "ana@a.test" } } }); assert.equal((await outra.pedir("DELETE", `/users/${mAna.id}`)).status, 404, "pessoa de outro escritório");
  const cha = await ana.post("/messages/groups", { nome: "Aberto A", privado: false, pessoas: [] }); assert.equal((await outra.get(`/messages/${cha.corpo.id}`)).status, 404, "grupo aberto não atravessa escritório"); assert.equal((await outra.post("/messages/groups", { nome: "Grupo B", privado: false, pessoas: [anaId] })).status, 400); await prisma.chat.deleteMany({});
  await prisma.organization.updateMany({ where: { memberships: { some: { user: { email: "o@b.test" } } } }, data: { internal: true } }); // libera NF-e/CT-e para testar o isolamento
  assert.deepEqual((await outra.get("/fiscal/companies")).corpo.empresas, []);
  assert.deepEqual((await outra.get("/certificates")).corpo.certificados, []);
  assert.equal((await outra.get(`/fiscal/nfse/${empresa}/documents`)).status, 404);
  assert.equal((await outra.post(`/fiscal/nfse/${empresa}/capture`)).status, 404);
  assert.equal((await outra.post(`/fiscal/nfse/${empresa}/zip`, { competencia: "2026-10" })).status, 404);
  assert.equal((await outra.post(`/fiscal/dfe/${empresa}/ciencia/send`)).status, 404);
  const certA = (await ana.get("/certificates")).corpo.certificados[0].id;
  assert.equal((await outra.pedir("DELETE", `/certificates/${certA}`)).status, 404);
  assert.equal((await outra.get(`/memoranda/${memo}`)).status, 404);
  assert.deepEqual((await outra.get("/memoranda")).corpo.memorandos, []);
  assert.equal((await outra.post(`/memoranda/${memo}/status`, { status: "cancelado" })).status, 404);
  assert.equal((await outra.pedir("PUT", `/memoranda/${memo}`, { memo: { e_cnpj: A, e_razao: "Invadida" } })).status, 404);
  assert.equal((await outra.pedir("PUT", "/fiscal/procurator", { id: certA })).status, 404);
  const mesmo = await outra.post("/memoranda", { numero: null, memo: { e_cnpj: A, e_razao: "Mesmo CNPJ noutra org", m_data: "2026-11-05" } }); assert.equal(mesmo.status, 201); assert.equal(mesmo.corpo.seq, 1, "numeração é por organização"); empresaB = mesmo.corpo.companyId;
  assert.notEqual(empresaB, empresa);
  assert.equal((await outra.get(`/fiscal/nfse/${empresaB}/documents`)).corpo.notas.length, 0);
  const r = (await outra.post(`/fiscal/nfse/${empresaB}/capture`)).corpo; assert.match(r.mensagem, /Nenhum e-CNPJ/);
  assert.equal((await outra.post("/users", { name: "X", email: "x@b.test", senhaProvisoria: "Provisoria456", role: "STAFF", permissions: [], allCompanies: false, companyIds: [empresa] })).status, 400);
});
test("memorando é o cadastro único", async () => {
  const dup = await ana.post("/memoranda", { numero: null, memo: { e_cnpj: A, e_razao: "Dup" } }); assert.equal(dup.status, 409); assert.match(dup.corpo.message, /01\/2026/);
  assert.equal((await ana.post("/memoranda", { numero: null, memo: { e_cnpj: "11222333000182", e_razao: "X" } })).status, 400, "CNPJ inválido");
  assert.equal((await ana.post("/memoranda", { numero: { seq: 1, ano: 2026 }, memo: { e_cnpj: "11444777000161", e_razao: "Outra" } })).status, 409, "número em uso");
  const b = await ana.post("/memoranda", { numero: { seq: 7, ano: 2026 }, memo: { e_cnpj: "11.444.777/0001-61", e_razao: "Segunda Ltda" } }); assert.equal(b.status, 201);
  const cA = (await ana.post("/memoranda", { numero: null, memo: { e_cnpj: "11444777000242", e_razao: "Terceira" } })); assert.equal(cA.status, 201); assert.equal(cA.corpo.seq, 8, "continua do maior número");
  const atual = (await ana.get(`/memoranda/${memo}`)).corpo;
  assert.equal((await ana.pedir("PUT", `/memoranda/${memo}`, { numero: null, memo: { ...atual.data, e_cnpj: "11444777000161" } })).status, 400, "CNPJ não muda");
  const ed = await ana.pedir("PUT", `/memoranda/${memo}`, { numero: { seq: 3, ano: 2026 }, memo: { ...atual.data, e_razao: "EMPRESA A NOVA LTDA", e_ie: "123" } }); assert.equal(ed.status, 200);
  const h = ed.corpo.history.at(-1); assert.match(h.acao, /Renumerou de 01\/2026 para 03\/2026/); assert.ok(h.campos.includes("Razão social")); assert.ok(h.campos.includes("Inscrição estadual"));
  assert.equal((await ana.get("/fiscal/companies")).corpo.empresas.find((e: any) => e.id === empresa).razao, "EMPRESA A NOVA LTDA");
  assert.equal((await ana.post(`/memoranda/${b.corpo.id}/client`, { situacao: "inativa", dataSaida: "2026-11-01", motivo: "Inadimplência" })).status, 200);
  assert.equal((await ana.post(`/fiscal/nfse/${b.corpo.companyId}/capture`)).status, 404, "quem saiu não captura");
  assert.equal((await ana.get("/fiscal/companies")).corpo.empresas.some((e: any) => e.id === b.corpo.companyId), false);
  assert.equal((await ana.get("/memoranda")).corpo.memorandos.find((m: any) => m.id === b.corpo.id).clientStatus, "inativa");
  await ana.post(`/memoranda/${b.corpo.id}/client`, { situacao: "ativa" }); assert.ok((await ana.get("/fiscal/companies")).corpo.empresas.some((e: any) => e.id === b.corpo.companyId));
  await ana.post(`/memoranda/${b.corpo.id}/status`, { status: "cancelado" }); assert.equal((await ana.get("/fiscal/companies")).corpo.empresas.some((e: any) => e.id === b.corpo.companyId), false);
  const de = await ana.post("/memoranda", { numero: null, memo: { e_cnpj: "11444777000161", e_razao: "Segunda de volta" } }); assert.equal(de.status, 201, "cancelado libera a empresa");
  assert.equal((await ana.post(`/memoranda/${b.corpo.id}/status`, { status: "ativo" })).status, 409, "um ativo por empresa");
});
test("colaborador sem permissão não vê memorandos", async () => {
  const novo = await ana.post("/users", { name: "Carla", email: "carla@a.test", senhaProvisoria: "Provisoria456", role: "STAFF", permissions: ["memoranda.read"], allCompanies: false, companyIds: [] });
  let s = await logar("carla@a.test", "Provisoria456"); await s.post("/auth/password", { atual: "Provisoria456", nova: "SenhaCarla123" }); s = await logar("carla@a.test", "SenhaCarla123");
  assert.deepEqual((await s.get("/memoranda")).corpo.memorandos, []); assert.equal((await s.get(`/memoranda/${memo}`)).status, 404);
  assert.equal((await s.post("/memoranda", { memo: { e_cnpj: A, e_razao: "X" } })).status, 403);
  void novo;
});
test("painel mostra só dados da organização", async () => {
  const a = (await ana.get("/fiscal/dashboard")).corpo;
  assert.ok(a.empresas >= 1); assert.equal(a.serie.length, 12);
  assert.equal(a.serie.find((p: any) => p.competencia === "2026-10").valor, "1000.10", "nota cancelada fica fora");
  const b = (await outra.get("/fiscal/dashboard")).corpo;
  assert.equal(b.notasMes, 0); assert.ok(b.empresasLista.every((e: any) => e.id !== empresa)); assert.deepEqual(b.atividade, []);
});
test("certificado de uma organização não abre com a chave de outra", async () => {
  const { decifrar } = await import("../common/cipher");
  const c = await prisma.fiscalCertificate.findFirst({});
  assert.throws(() => decifrar(Buffer.from(c.pfxEncrypted), "outra-org"));
  void certOk;
});
test("auditoria registra ações sensíveis sem segredos", async () => {
  const a = await prisma.auditEvent.findMany({});
  const acoes = new Set(a.map((x: any) => x.action));
  for (const e of ["auth.login", "fiscal.certificate.imported", "fiscal.nfse.exported", "fiscal.dfe.ciencia.sent", "users.created", "users.access.changed"]) assert.ok(acoes.has(e), e);
  assert.equal(JSON.stringify(a).includes("abc123"), false);
});
test("conexão mútua apresenta o certificado da empresa e valida o servidor", async () => {
  const { chamar } = await import("../fiscal/http");
  const s = gerarPfx("localhost", "a"), c = gerarPfx(`X:${A}`, "a");
  let visto = "";
  const h = createHttps({ key: s.key, cert: s.cert, requestCert: true, rejectUnauthorized: false }, (q, r) => { visto = (q.socket as any).getPeerCertificate().subject?.CN ?? ""; r.end("{}"); });
  await new Promise<void>((r) => h.listen(0, "127.0.0.1", r));
  const url = `https://localhost:${(h.address() as AddressInfo).port}/`;
  assert.equal((await chamar({ url, cert: c.cert, key: c.key, ca: [s.cert] })).http, 200);
  assert.equal(visto, `X:${A}`);
  const semCa = await chamar({ url, cert: c.cert, key: c.key });
  assert.equal(semCa.http, 0); assert.match(semCa.erroCodigo, /SELF_SIGNED/);
  h.close(); void readFileSync;
});
