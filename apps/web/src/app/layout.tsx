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
  themeColor: "#031537",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#031537",
          color: "#e8ecf5",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
