"use client";
import { useEffect, useState } from "react";
import { Select } from "@neeko/ui";
import { formatarCnpj } from "@/lib/format";
import { empresasBpo, type EmpresaBpo } from "@/services/bpo";
import styles from "./bpo.module.css";

const CHAVE = "neeko:bpo:empresa";
/** Empresa em atendimento no BPO: vale para todas as telas do módulo. */
export function useEmpresaBpo() {
  const [empresas, setEmpresas] = useState<EmpresaBpo[]>([]);
  const [empresa, setEmpresaId] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    empresasBpo().then((l) => {
      setEmpresas(l);
      let salva = ""; try { salva = localStorage.getItem(CHAVE) ?? ""; } catch { /* sem armazenamento */ }
      setEmpresaId(l.some((e) => e.id === salva) ? salva : l[0]?.id ?? "");
    }).catch((e: Error) => setErro(e.message)).finally(() => setCarregando(false));
  }, []);
  const setEmpresa = (id: string) => { setEmpresaId(id); try { localStorage.setItem(CHAVE, id); } catch { /* idem */ } };
  return { empresas, empresa, setEmpresa, erro, carregando };
}

export function SeletorEmpresa({ empresas, empresa, onTrocar }: { empresas: EmpresaBpo[]; empresa: string; onTrocar: (id: string) => void }) {
  return <div className={styles.seletor}>
    <Select rotulo="Empresa" value={empresa} onChange={(e) => onTrocar(e.target.value)}>
      {empresas.map((e) => <option key={e.id} value={e.id}>{e.razao || "(sem nome)"} — {formatarCnpj(e.cnpj)}</option>)}
    </Select>
  </div>;
}

/** "1234.5" → "R$ 1.234,50" sem passar por soma em ponto flutuante. */
export function moeda(v: string | null | undefined) {
  const m = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(v ?? "0");
  if (!m) return v ?? "";
  const int = m[2].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${m[1]}R$\u00a0${int},${(m[3] ?? "").padEnd(2, "0")}`;
}
/** Aceita "1.234,56", "1234,56" ou "1234.56" e devolve "1234.56" (ou "" se não for valor). */
export function paraValor(t: string) {
  let s = t.trim().replace(/^R\$\s*/, "").replace(/\s/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  return /^\d{1,13}(\.\d{1,2})?$/.test(s) ? s : "";
}
/** "1234.56" → "1234,56" para mostrar no campo. */
export const paraCampo = (v: string | null | undefined) => (v ?? "").replace(".", ",");
export const hojeIso = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
export const mesNome = (c: string) => { const [a, m] = c.split("-"); return `${["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][+m - 1]}/${a}`; };
