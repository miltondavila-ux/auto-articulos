import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://auto-articulos-web.vercel.app"),
  title: "Creador de artículos en secuencia",
  description:
    "Crea artículos en secuencias. Herramienta exclusiva para el programa de posicionamiento de 10minutesWebsite.",
  openGraph: {
    title: "Creador de artículos en secuencia",
    description:
      "Crea artículos en secuencias. Herramienta exclusiva para el programa de posicionamiento de 10minutesWebsite.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
  },
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
