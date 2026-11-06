"use client";
import { useEffect } from "react";
import { aplicarTema } from "@/features/temas";
import { TelaLogin } from "@/features/TelaLogin";
import styles from "../auth.module.css";

export default function Login() {
  useEffect(() => { aplicarTema("verde"); }, []);
  return <TelaLogin marca={<img src="/logo-neeko.png" alt="Neeko Automação Inteligente" className={styles.logo} width={450} height={124} />} />;
}
