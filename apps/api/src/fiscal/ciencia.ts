import { createHash, createSign } from "node:crypto";

const NFE = "http://www.portalfiscal.inf.br/nfe", DS = "http://www.w3.org/2000/09/xmldsig#", C14N = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
/** Horário de Brasília no formato da NF-e. */
export function dataHoraBr(d = new Date()) { return new Date(d.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 19) + "-03:00"; }

/**
 * Evento 210210 (Ciência da Operação), assinado com SHA-1 como exige o leiaute da NF-e.
 * O XML é montado já na forma canônica; o conteúdo só tem dígitos e texto fixo, sem escape.
 */
export function eventoCiencia(ambiente: string, cnpj: string, chave: string, keyPem: string, certPem: string, agora = new Date()): string {
  const id = `ID210210${chave}01`;
  const miolo = `<infEvento#Id="${id}"><cOrgao>91</cOrgao><tpAmb>${ambiente === "producao" ? "1" : "2"}</tpAmb><CNPJ>${cnpj}</CNPJ><chNFe>${chave}</chNFe><dhEvento>${dataHoraBr(agora)}</dhEvento><tpEvento>210210</tpEvento><nSeqEvento>1</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>Ciencia da Operacao</descEvento></detEvento></infEvento>`;
  const digest = createHash("sha1").update(miolo.replace("#", ` xmlns="${NFE}" `)).digest("base64");
  const si = (ns: string) => `<SignedInfo${ns}><CanonicalizationMethod Algorithm="${C14N}"></CanonicalizationMethod><SignatureMethod Algorithm="${DS}rsa-sha1"></SignatureMethod><Reference URI="#${id}"><Transforms><Transform Algorithm="${DS}enveloped-signature"></Transform><Transform Algorithm="${C14N}"></Transform></Transforms><DigestMethod Algorithm="${DS}sha1"></DigestMethod><DigestValue>${digest}</DigestValue></Reference></SignedInfo>`;
  const assinatura = createSign("RSA-SHA1").update(si(` xmlns="${DS}"`)).sign(keyPem, "base64");
  const cert = certPem.replace(/-----[A-Z ]+-----|\s+/g, "");
  return `<evento xmlns="${NFE}" versao="1.00">${miolo.replace("#", " ")}<Signature xmlns="${DS}">${si("")}<SignatureValue>${assinatura}</SignatureValue><KeyInfo><X509Data><X509Certificate>${cert}</X509Certificate></X509Data></KeyInfo></Signature></evento>`;
}
