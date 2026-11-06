"use client";
import { use, useEffect, useState } from "react";
import { Loading, Notice } from "@neeko/ui";
import { TelaLogin } from "@/features/TelaLogin";
import { aplicarPaleta } from "@/features/paleta";
import { lerEscritorioPublico } from "@/services/conta";
import styles from "../../auth.module.css";

export default function EntradaEscritorio({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [o, setO] = useState<{ name: string; logo: string | null; colorPrimary: string | null; colorDark: string | null } | null>(null);
  const [erro, setErro] = useState(false);
  useEffect(() => { lerEscritorioPublico(slug).then((x) => { aplicarPaleta(x.colorPrimary, x.colorDark); setO(x); }).catch(() => setErro(true)); }, [slug]);
  if (erro) return <div className={styles.fundo}><div className={styles.caixa}><Notice tom="erro">Este link de acesso não está disponível. Fale com seu escritório.</Notice></div></div>;
  if (!o) return <div className={styles.fundo}><Loading /></div>;
  return <TelaLogin escritorio={slug}
    marca={o.logo ? <img src={o.logo} alt={o.name} className={styles.logoEscritorio} /> : <p className={styles.nomeEscritorio}>{o.name}</p>}
    rodape={<p className={styles.assinatura}><img src="/logo-neeko.png" alt="Neeko" width={66} height={18} /></p>} />;
}
