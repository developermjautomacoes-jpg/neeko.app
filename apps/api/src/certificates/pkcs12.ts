import { X509Certificate, createHash, createPrivateKey } from "node:crypto";
import forge from "node-forge";

export interface Pfx { certPem: string; keyPem: string; extras: string[] }
export interface InfoCert { holder: string; document: string; kind: string; validUntil: string; fingerprint: string }

/** node-forge lê também os .pfx antigos (RC2/3DES), sem depender do provedor legacy do OpenSSL. */
export function abrirPfx(pfx: Buffer, senha: string): Pfx | null {
  try {
    const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(pfx.toString("binary")), false, senha);
    const chaves = [...(p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? []), ...(p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ?? [])];
    const certs = (p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? []).flatMap((b) => (b.cert ? [forge.pki.certificateToPem(b.cert)] : []));
    const k = chaves[0]?.key;
    if (!k || !certs.length) return null;
    const keyPem = forge.pki.privateKeyToPem(k);
    const chave = createPrivateKey(keyPem);
    const certPem = certs.find((c) => new X509Certificate(c).checkPrivateKey(chave));
    if (!certPem) return null;
    return { certPem, keyPem, extras: certs.filter((c) => c !== certPem) };
  } catch { return null; }
}

export function infoCert(certPem: string): InfoCert {
  const x = new X509Certificate(certPem);
  const cn = /^CN=(.*)$/m.exec(x.subject)?.[1]?.trim() ?? "";
  const document = /:(\d{11}|[0-9A-Z]{12}\d{2})\s*$/.exec(cn)?.[1] ?? "";
  return { holder: cn.replace(/:\d+\s*$/, "").trim() || cn, document, kind: document.length === 14 ? "e-CNPJ" : document.length === 11 ? "e-CPF" : "Certificado A1",
    validUntil: new Date(x.validTo).toISOString().slice(0, 10), fingerprint: createHash("sha256").update(x.raw).digest("hex") };
}
