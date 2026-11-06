import { execFileSync } from "node:child_process";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://neeko:neeko@localhost:5432/neeko_test";
process.env.CERT_ENCRYPTION_KEY = randomBytes(32).toString("base64");
process.env.SCHEDULER_ENABLED = "false";
void generateKeyPairSync;

export const zipB64 = (x: string) => gzipSync(Buffer.from(x)).toString("base64");

/** Cria um .pfx de teste com CN no padrão ICP-Brasil. Nada aqui é certificado real. */
export function gerarPfx(cn: string, senha: string, legado = false): { pfx: Buffer; key: string; cert: string } {
  const d = mkdtempSync(join(tmpdir(), "neeko-"));
  const key = join(d, "k.pem"), crt = join(d, "c.pem"), pfx = join(d, "c.pfx");
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", crt, "-days", "30", "-subj", `/O=Teste/CN=${cn}`], { stdio: "ignore" });
  execFileSync("openssl", ["pkcs12", "-export", "-inkey", key, "-in", crt, "-out", pfx, "-passout", `pass:${senha}`, ...(legado ? ["-certpbe", "PBE-SHA1-3DES", "-keypbe", "PBE-SHA1-3DES", "-macalg", "sha1"] : [])], { stdio: "ignore" });
  return { pfx: readFileSync(pfx), key: readFileSync(key, "utf8"), cert: readFileSync(crt, "utf8") };
}
export const gravarTmp = (nome: string, c: string) => { const f = join(mkdtempSync(join(tmpdir(), "neeko-")), nome); writeFileSync(f, c); return f; };

export const nfseXml = (o: { chave: string; prest: string; toma: string; valor: string; comp?: string; numero?: string }) => `<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00"><infNFSe Id="NFS${o.chave}"><xLocIncid>Serra</xLocIncid><cLocIncid>3205002</cLocIncid><xTribNac>Serviços</xTribNac><nNFSe>${o.numero ?? "12"}</nNFSe><cStat>100</cStat><dhProc>2026-10-05T10:00:00-03:00</dhProc><emit><CNPJ>${o.prest}</CNPJ><xNome>PRESTADORA</xNome></emit><valores><vBC>${o.valor}</vBC><pAliqAplic>2.00</pAliqAplic><vISSQN>20.00</vISSQN><vLiq>${o.valor}</vLiq></valores><DPS versao="1.00"><infDPS Id="DPS1"><dhEmi>2026-10-05T09:00:00-03:00</dhEmi><serie>1</serie><nDPS>7</nDPS><dCompet>${o.comp ?? "2026-10-01"}</dCompet><prest><CNPJ>${o.prest}</CNPJ></prest><toma><CNPJ>${o.toma}</CNPJ><xNome>TOMADORA</xNome></toma><serv><cServ><cTribNac>010101</cTribNac><xDescServ>Consultoria</xDescServ></cServ></serv><valores><vServPrest><vServ>${o.valor}</vServ></vServPrest><trib><tribMun><tribISSQN>1</tribISSQN><tpRetISSQN>1</tpRetISSQN></tribMun></trib></valores></infDPS></DPS></infNFSe></NFSe>`;
