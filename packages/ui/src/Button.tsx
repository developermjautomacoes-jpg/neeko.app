import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

type Variante = "primary" | "secondary" | "ghost" | "danger";
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanho?: "sm" | "md";
  icone?: ReactNode;
  carregando?: boolean;
}

export function Button({ variante = "secondary", tamanho = "md", icone, carregando, children, className, disabled, ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || carregando}
      className={[styles.btn, styles[variante], styles[tamanho], className].filter(Boolean).join(" ")}
    >
      {icone && <span className={styles.icone} aria-hidden>{icone}</span>}
      {carregando ? "Aguarde…" : children}
    </button>
  );
}

/** Botão só com ícone: a dica aparece ao passar o cursor ou focar pelo teclado. */
export function IconButton({ dica, icone, variante = "secondary", carregando, disabled, className, ...rest }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { dica: string; icone: ReactNode; variante?: Variante; carregando?: boolean }) {
  return (
    <button type="button" {...rest} aria-label={dica} data-dica={dica} disabled={disabled || carregando}
      className={[styles.btn, styles[variante], styles.soIcone, carregando ? styles.carregando : "", className].filter(Boolean).join(" ")}>
      {icone}
    </button>
  );
}
