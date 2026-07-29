import type { ReactNode } from "react";

export const metadata = {
  title: "Auto Artículos",
  description: "Publicación automática de artículos en 10minutesWebsite",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#0f1115",
          color: "#e6e6e6",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
