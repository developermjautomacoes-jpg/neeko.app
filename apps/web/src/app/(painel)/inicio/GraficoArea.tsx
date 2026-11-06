"use client";
import { useState } from "react";
import styles from "./inicio.module.css";

const MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const L = 640, A = 230, E = 44, B = 26, T = 14, D = 22;
const compacto = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)));
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Uma série só: linha de 2px, área suave, cruz e dica ao passar o mouse. Valores em centavos. */
export function GraficoArea({ pontos }: { pontos: { competencia: string; centavos: number }[] }) {
  const [foco, setFoco] = useState(pontos.length - 1);
  const max = Math.max(...pontos.map((p) => p.centavos), 100) / 100;
  const teto = Math.ceil(max / 10 ** Math.floor(Math.log10(max))) * 10 ** Math.floor(Math.log10(max));
  const x = (i: number) => E + (i * (L - E - D)) / (pontos.length - 1), y = (c: number) => T + (1 - c / 100 / teto) * (A - T - B);
  const linha = pontos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.centavos).toFixed(1)}`).join(" ");
  const p = pontos[foco];
  return (
    <div className={styles.grafico}>
      <svg viewBox={`0 0 ${L} ${A}`} role="img" aria-label="Serviços prestados por competência, nos últimos 12 meses" onMouseLeave={() => setFoco(pontos.length - 1)}>
        <defs><linearGradient id="areaNeeko" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1FCF8E" stopOpacity=".42" /><stop offset="1" stopColor="#1FCF8E" stopOpacity=".04" /></linearGradient></defs>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => <g key={f}><line x1={E} x2={L - D} y1={y(f * teto * 100)} y2={y(f * teto * 100)} stroke="var(--color-border)" /><text x={E - 8} y={y(f * teto * 100) + 4} textAnchor="end" className={styles.eixo}>{compacto(f * teto)}</text></g>)}
        <path d={`${linha} L${x(pontos.length - 1)} ${A - B} L${x(0)} ${A - B} Z`} fill="url(#areaNeeko)" />
        <path d={linha} fill="none" stroke="#12B97B" strokeWidth="2" strokeLinejoin="round" />
        {pontos.map((q, i) => <text key={q.competencia} x={x(i)} y={A - 7} textAnchor="middle" className={styles.eixo}>{MES[+q.competencia.slice(5) - 1]}</text>)}
        <line x1={x(foco)} x2={x(foco)} y1={T} y2={A - B} stroke="#12B97B" strokeDasharray="3 3" />
        <circle cx={x(foco)} cy={y(p.centavos)} r="5" fill="#12B97B" stroke="#fff" strokeWidth="2" />
        {pontos.map((q, i) => <rect key={q.competencia} x={x(i) - (L - E) / 24} y={0} width={(L - E) / 12} height={A} fill="transparent" onMouseEnter={() => setFoco(i)} onFocus={() => setFoco(i)} tabIndex={0} aria-label={`${q.competencia.split("-").reverse().join("/")}: ${brl(q.centavos)}`} />)}
      </svg>
      <span className={styles.dica} style={{ left: `${Math.min(84, (x(foco) / L) * 100)}%` }}>{MES[+p.competencia.slice(5) - 1]}: {brl(p.centavos)}</span>
    </div>
  );
}
