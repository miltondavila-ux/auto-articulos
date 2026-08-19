import type { ReactNode } from "react";
import {
  DEFAULT_PLATFORM_DOMAIN,
  platformContactEmail,
} from "@auto-articulos/shared";

const linkStyle = { color: "#f5f5f7", textDecoration: "none" } as const;

export function PublicInfoPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 15% 0%, #12336b 0%, #031537 42%, #020d22 100%)",
        color: "#e8ecf5",
        padding: "48px 20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 860, margin: "0 auto" }}>
        <nav
          aria-label="Información pública"
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
            paddingBottom: 28,
            borderBottom: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <a href="/acerca-de" style={{ ...linkStyle, fontWeight: 800 }}>
            Auto Artículos
          </a>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <a href="/privacidad" style={linkStyle}>
              Privacidad
            </a>
            <a href="/terminos" style={linkStyle}>
              Condiciones
            </a>
            <a href="/login" style={linkStyle}>
              Iniciar sesión
            </a>
          </div>
        </nav>

        <article
          style={{
            marginTop: 36,
            padding: "clamp(24px, 5vw, 52px)",
            border: "1px solid rgba(102,217,232,0.2)",
            borderRadius: 20,
            background: "rgba(8, 27, 62, 0.72)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.24)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#f5f5f7",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </p>
          <h1
            style={{
              margin: "10px 0 14px",
              fontSize: "clamp(30px, 5vw, 48px)",
              lineHeight: 1.08,
            }}
          >
            {title}
          </h1>
          <p style={{ color: "#b9c4d8", fontSize: 17, lineHeight: 1.7 }}>
            {intro}
          </p>
          <div
            style={{
              marginTop: 34,
              color: "#d7deea",
              fontSize: 15,
              lineHeight: 1.75,
            }}
          >
            {children}
          </div>
        </article>

        <footer
          style={{
            marginTop: 26,
            color: "#8e9bb2",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          © 2026 Auto Artículos · Contacto: {platformContactEmail(DEFAULT_PLATFORM_DOMAIN)}
        </footer>
      </div>
    </main>
  );
}

export const publicHeadingStyle = {
  margin: "34px 0 8px",
  color: "#ffffff",
  fontSize: 20,
} as const;

export const publicLinkStyle = linkStyle;
