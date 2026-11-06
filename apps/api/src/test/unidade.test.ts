import "./support";
import assert from "node:assert/strict";
import { createVerify, X509Certificate } from "node:crypto";
import { test } from "node:test";
import { DOMParser } from "@xmldom/xmldom";
import { completarCadeia } from "../certificates/chain";
import { abrirPfx, infoCert } from "../certificates/pkcs12";
import { cifrar, decifrar } from "../common/cipher";
import { conferirSenha, hashSenha, senhaFraca } from "../common/passwords";
import { dataHoraBr, eventoCiencia } from "../fiscal/ciencia";
import { lerCte, lerNfe, lerResumoNfe, pelaChave } from "../fiscal/dfe-parser";
import { lerNota, situacaoPorEventos } from "../fiscal/nfse-parser";
import { lerXml } from "../fiscal/xml";
import { ipPublico } from "../certificates/chain";
import { gerarPfx, nfseXml } from "./support";
void DOMParser;

const A = "11222333000181", B = "99888777000166";
test("senha individual: hash único e conferência", async () => {
  const a = await hashSenha("Senha12345"), b = await hashSenha("Senha12345");
  assert.notEqual(a, b); assert.ok(!a.includes("Senha12345"));
  assert.equal(await conferirSenha("Senha12345", a), true);
  assert.equal(await conferirSenha("Outra12345", a), false);
  assert.ok(senhaFraca("curta1")); assert.ok(senhaFraca("semnumerosaqui")); assert.equal(senhaFraca("boa-senha-123"), null);
});
test("cifra presa à organização", () => {
  const c = cifrar(Buffer.from("segredo"), "org-a");
  assert.equal(decifrar(c, "org-a").toString(), "segredo");
  assert.throws(() => decifrar(c, "org-b"));
});
test("lê .pfx moderno e legado (3DES) e o CN no padrão ICP-Brasil", () => {
  for (const legado of [false, true]) {
    const g = gerarPfx(`EMPRESA TESTE LTDA:${A}`, "abc123", legado);
    const p = abrirPfx(g.pfx, "abc123"); assert.ok(p);
    const i = infoCert(p!.certPem);
    assert.equal(i.document, A); assert.equal(i.kind, "e-CNPJ"); assert.equal(i.holder, "EMPRESA TESTE LTDA");
    assert.equal(abrirPfx(g.pfx, "errada"), null);
  }
});
test("NFS-e: papel, valores exatos e competência", () => {
  const n = lerNota(nfseXml({ chave: "1".repeat(50), prest: A, toma: B, valor: "1000.10" }), A)!;
  assert.equal(n.papel, "prestador"); assert.equal(n.vServ, "1000.10"); assert.equal(n.competencia, "2026-10"); assert.equal(n.prestNome, "PRESTADORA"); assert.equal(n.tomaNome, "TOMADORA");
  assert.equal(lerNota(nfseXml({ chave: "1".repeat(50), prest: A, toma: B, valor: "1" }), B)!.papel, "tomador");
});
test("recusa XML com DOCTYPE", () => { assert.equal(lerXml('<!DOCTYPE a [<!ENTITY x SYSTEM "file:///etc/passwd">]><a>&x;</a>'), null); });
test("situação segue a ordem dos eventos", () => {
  assert.equal(situacaoPorEventos([]), "normal");
  assert.equal(situacaoPorEventos(["101103", "105105"]), "normal");
  assert.equal(situacaoPorEventos(["101103", "105104"]), "cancelada");
  assert.equal(situacaoPorEventos(["105102", "305103"]), "substituida");
  assert.equal(situacaoPorEventos(["305102"]), "bloqueada");
});
const CH = "32261011222333000181550010000001231000000010";
test("NF-e: resumo e nota completa", () => {
  assert.deepEqual(pelaChave(CH), { modelo: "55", serie: "1", numero: "123" });
  const r = lerResumoNfe(lerXml(`<resNFe><chNFe>${CH}</chNFe><CNPJ>${B}</CNPJ><xNome>X</xNome><dhEmi>2026-10-01T10:00:00-03:00</dhEmi><tpNF>1</tpNF><vNF>10.50</vNF><cSitNFe>3</cSitNFe></resNFe>`)!, A);
  assert.equal(r.situacao, "cancelada"); assert.equal(r.vTotal, "10.50");
  const c = lerNfe(lerXml(`<nfeProc><NFe><infNFe Id="NFe${CH}"><ide><dhEmi>2026-10-01T10:00:00-03:00</dhEmi><tpNF>1</tpNF></ide><emit><CNPJ>${B}</CNPJ><xNome>E</xNome></emit><dest><CNPJ>${A}</CNPJ><xNome>D</xNome></dest><total><ICMSTot><vNF>99.90</vNF></ICMSTot></total></infNFe></NFe><protNFe><infProt><cStat>100</cStat></infProt></protNFe></nfeProc>`)!, A)!;
  assert.equal(c.papel, "destinatario"); assert.equal(c.chave, CH); assert.equal(c.vTotal, "99.90"); assert.equal(c.situacao, "normal");
});
test("CT-e: identifica o tomador", () => {
  const c = lerCte(lerXml(`<cteProc><CTe><infCte Id="CTe${CH}"><ide><dhEmi>2026-10-01T10:00:00-03:00</dhEmi><toma3><toma>3</toma></toma3></ide><emit><CNPJ>${B}</CNPJ></emit><rem><CNPJ>${B}</CNPJ></rem><dest><CNPJ>${A}</CNPJ></dest><vPrest><vTPrest>5.00</vTPrest></vPrest></infCte></CTe></cteProc>`)!, A)!;
  assert.equal(c.papel, "tomador"); assert.equal(c.destDoc, A);
});
test("ciência: assinatura confere", () => {
  const g = gerarPfx(`X:${A}`, "a");
  const xml = eventoCiencia("producao", A, CH, g.key, g.cert, new Date("2026-10-05T15:00:00Z"));
  assert.ok(xml.includes("<dhEvento>2026-10-05T12:00:00-03:00</dhEvento>"));
  const si = /<SignedInfo>.*<\/SignedInfo>/.exec(xml)![0].replace("<SignedInfo>", '<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">');
  const ass = /<SignatureValue>(.*)<\/SignatureValue>/.exec(xml)![1];
  assert.equal(createVerify("RSA-SHA1").update(si).verify(new X509Certificate(g.cert).publicKey, ass, "base64"), true);
});
test("data no horário de Brasília", () => { assert.equal(dataHoraBr(new Date("2026-01-01T02:00:00Z")), "2025-12-31T23:00:00-03:00"); });
test("download de AC recusa endereço interno", () => {
  for (const ip of ["127.0.0.1", "10.0.0.5", "192.168.1.1", "169.254.169.254", "::1"]) assert.equal(ipPublico(ip), false);
  assert.equal(ipPublico("8.8.8.8"), true);
});
test("cadeia: certificado autoassinado já está completo", async () => {
  const g = gerarPfx("Raiz", "a");
  assert.deepEqual(await completarCadeia(g.cert, [], async () => null), { cadeia: [], completa: true });
});
