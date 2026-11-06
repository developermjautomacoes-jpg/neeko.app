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
import { limparConfig } from "../config";

const A = "11222333000181", B = "99888777000166";
const CH1 = "1".repeat(50), CH2 = "2".repeat(50);
const CHN = "32261011222333000181550010000001231000000010";
let base = "", adn: Server, sefaz: Server;
let fila: ((path: string) => { status: number; body: unknown; headers?: Record<string, string> })[] = [];
let soap: ((body: string) => string)[] = [];
const pedidos: string[] = [], corpos: string[] = [];
let app: { close(): Promise<void> };
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
async function logar(email: string, senha: string) { const s = new Sessao(); const r = await s.post("/auth/login", { email, senha }); assert.equal(r.status, 200); return s; }

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
  const a = await criarApp(); await a.listen(0); app = a;
  prisma = a.get(PrismaService); await primeiraPessoa(prisma); await primeiraPessoa(prisma);
  base = `http://127.0.0.1:${(a.getHttpServer().address() as AddressInfo).port}`;
});
after(async () => { await app.close(); adn.close(); sefaz.close(); });

let ana: Sessao, empresa: string, certOk: Buffer;
test("primeiro acesso exige trocar a senha provisória", async () => {
  ana = await logar("ana@a.test", "Provisoria123");
  assert.equal((await ana.get("/fiscal/companies")).corpo.code, "PASSWORD_CHANGE_REQUIRED");
  assert.equal((await ana.get("/me")).corpo.mustChangePassword, true);
  assert.equal((await ana.post("/auth/password", { atual: "errada", nova: "NovaSenha123" })).status, 400);
  assert.equal((await ana.post("/auth/password", { atual: "Provisoria123", nova: "fraca" })).status, 400);
  assert.equal((await ana.post("/auth/password", { atual: "Provisoria123", nova: "NovaSenha123" })).status, 200);
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
test("importa certificado cifrado e cria a empresa", async () => {
  const g = gerarPfx(`EMPRESA A LTDA:${A}`, "abc123"); certOk = g.pfx;
  assert.equal((await ana.post("/certificates", { pfx: g.pfx.toString("base64"), senha: "errada" })).status, 400);
  const r = await ana.post("/certificates", { pfx: g.pfx.toString("base64"), senha: "abc123" });
  assert.equal(r.status, 200);
  const salvo = await prisma.fiscalCertificate.findFirst({});
  assert.ok(!Buffer.from(salvo.pfxEncrypted).includes(g.pfx.subarray(0, 64)));
  const lista = (await ana.get("/certificates")).corpo.certificados;
  assert.equal(JSON.stringify(lista).includes("Encrypted"), false);
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
  assert.equal((await new Sessao().post("/auth/login", { email: "bruno@a.test", senha: "SenhaBruno123" })).status, 200);
});
test("sem escalada: não concede o que não tem", async () => {
  const o = await prisma.organization.findFirst({}); const u = await prisma.user.findUnique({ where: { email: "ana@a.test" } });
  await prisma.membershipPermission.deleteMany({ where: { permission: "audit.read", membership: { userId: u.id } } });
  assert.equal((await ana.post("/users", { name: "Carla", email: "c@a.test", senhaProvisoria: "Provisoria456", role: "STAFF", permissions: ["audit.read"], allCompanies: true, companyIds: [] })).status, 403);
  void o;
});
test("isolamento entre organizações", async () => {
  const { hashSenha } = await import("../common/passwords");
  await prisma.user.create({ data: { email: "o@b.test", name: "O", passwordHash: await hashSenha("SenhaOutra123"), mustChangePassword: false, memberships: { create: { role: "ORG_OWNER", allCompanies: true, organization: { create: { name: "Org B" } }, permissions: { create: ["companies.read", "companies.manage", "fiscal.documents.read", "fiscal.capture", "fiscal.credentials.manage", "fiscal.ciencia.send", "users.manage"].map((permission) => ({ permission })) } } } } });
  outra = await logar("o@b.test", "SenhaOutra123");
  assert.deepEqual((await outra.get("/fiscal/companies")).corpo.empresas, []);
  assert.deepEqual((await outra.get("/certificates")).corpo.certificados, []);
  assert.equal((await outra.get(`/fiscal/nfse/${empresa}/documents`)).status, 404);
  assert.equal((await outra.post(`/fiscal/nfse/${empresa}/capture`)).status, 404);
  assert.equal((await outra.post(`/fiscal/nfse/${empresa}/zip`, { competencia: "2026-10" })).status, 404);
  assert.equal((await outra.post(`/fiscal/dfe/${empresa}/ciencia/send`)).status, 404);
  const certA = (await ana.get("/certificates")).corpo.certificados[0].id;
  assert.equal((await outra.pedir("DELETE", `/certificates/${certA}`)).status, 404);
  assert.equal((await outra.pedir("DELETE", `/companies/${empresa}`)).status, 404);
  assert.equal((await outra.pedir("PUT", "/fiscal/procurator", { id: certA })).status, 404);
  const mesmo = await outra.post("/companies", { cnpj: A, razao: "Mesmo CNPJ noutra org" }); assert.equal(mesmo.status, 201); empresaB = mesmo.corpo.id;
  assert.notEqual(empresaB, empresa);
  assert.equal((await outra.get(`/fiscal/nfse/${empresaB}/documents`)).corpo.notas.length, 0);
  const r = (await outra.post(`/fiscal/nfse/${empresaB}/capture`)).corpo; assert.match(r.mensagem, /Nenhum e-CNPJ/);
  assert.equal((await outra.post("/users", { name: "X", email: "x@b.test", senhaProvisoria: "Provisoria456", role: "STAFF", permissions: [], allCompanies: false, companyIds: [empresa] })).status, 400);
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
