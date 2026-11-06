import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ToastProvider } from "@neeko/ui";
import "@neeko/ui/tokens.css";

export const metadata: Metadata = { title: "Neeko", description: "Plataforma Neeko", robots: { index: false, follow: false } };

export default function Raiz({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
