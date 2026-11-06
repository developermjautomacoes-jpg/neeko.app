import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ToastProvider } from "@neeko/ui";
import "@neeko/ui/tokens.css";

export const metadata: Metadata = { title: "Neeko", description: "Plataforma Neeko", robots: { index: false, follow: false } };
const tema = `try{var t=localStorage.getItem("neeko-theme");if(t==="light")document.documentElement.setAttribute("data-theme","light")}catch(e){}`;

export default function Raiz({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Poppins:wght@600;700&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: tema }} />
      </head>
      <body><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
