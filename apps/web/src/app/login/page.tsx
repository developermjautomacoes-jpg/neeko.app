"use client";
import { TelaLogin } from "@/features/TelaLogin";
import styles from "../auth.module.css";

export default function Login() {
  return <TelaLogin marca={<img src="/logo-neeko.png" alt="Neeko Automação Inteligente" className={styles.logo} width={450} height={124} />} />;
}
