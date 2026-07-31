import type { ReactNode } from "react";

export const metadata = {
  title: "Creador de artículos en secuencia",
  description:
    "Crea artículos en secuencias. Herramienta exclusiva para el programa de posicionamiento de 10minutesWebsite.",
  openGraph: {
    title: "Creador de artículos en secuencia",
    description:
      "Crea artículos en secuencias. Herramienta exclusiva para el programa de posicionamiento de 10minutesWebsite.",
    images: [{ url: "/login-hero.jpg", width: 923, height: 1200 }],
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
