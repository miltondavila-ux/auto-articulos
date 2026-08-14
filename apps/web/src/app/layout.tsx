import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://auto-articulos-web.vercel.app"),
  title: "Creador de artículos en secuencia",
  description:
    "Crea artículos en secuencias. Herramienta exclusiva para el programa de posicionamiento de 10minutesWebsite.",
  appleWebApp: {
    // iOS ignora el manifest.json de Android; esto es lo que hace que
    // "Agregar a inicio" use el ícono y el nombre en vez de una captura
    // de la página.
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Auto Artículos",
  },
  openGraph: {
    title: "Creador de artículos en secuencia",
    description:
      "Crea artículos en secuencias. Herramienta exclusiva para el programa de posicionamiento de 10minutesWebsite.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070d1a",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'SF Pro', system-ui, sans-serif",
          background: "var(--apple-bg, #070d1a)",
          color: "var(--apple-text-primary, #f5f5f7)",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
