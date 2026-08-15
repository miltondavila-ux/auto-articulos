import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://auto-articulos-web.vercel.app"),
  title: "Creador de artículos en secuencia",
  description:
    "Crea artículos en secuencias. Herramienta de posicionamiento web para creación de contenido en secuencia.",
  appleWebApp: {
    // iOS ignora el manifest.json de Android; esto es lo que hace que
    // "Agregar a inicio" use el ícono y el nombre en vez de una captura
    // de la página.
    capable: true,
    statusBarStyle: "default",
    title: "Auto Artículos",
  },
  openGraph: {
    title: "Creador de artículos en secuencia",
    description:
      "Crea artículos en secuencias. Herramienta de posicionamiento web para creación de contenido en secuencia.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f5f7",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'SF Pro', system-ui, sans-serif",
          background: "var(--apple-bg, #f5f5f7)",
          color: "var(--apple-text-primary, #1d1d1f)",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
