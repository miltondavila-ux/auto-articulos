import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://auto-articulos-web.vercel.app"),
  title: "SEO TOTAL — Artículos con IA que se publican solos",
  description:
    "SEO TOTAL investiga, escribe y publica artículos optimizados para tu sitio todos los días, sin que muevas un dedo.",
  appleWebApp: {
    // iOS ignora el manifest.json de Android; esto es lo que hace que
    // "Agregar a inicio" use el ícono y el nombre en vez de una captura
    // de la página.
    capable: true,
    statusBarStyle: "default",
    title: "SEO TOTAL",
  },
  openGraph: {
    title: "SEO TOTAL — Toda la inteligencia, al alcance de tu mano",
    description:
      "SEO TOTAL investiga, escribe y publica artículos optimizados para tu sitio todos los días, sin que muevas un dedo.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'SF Pro', system-ui, sans-serif",
          background: "var(--apple-bg, #ffffff)",
          color: "var(--apple-text-primary, #1d1d1f)",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
