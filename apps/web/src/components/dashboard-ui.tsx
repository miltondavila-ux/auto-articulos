import type { CSSProperties } from "react";
import type { RunStatus, TitleStatus } from "@/types/dashboard";

// Lenguaje de las páginas de soporte de Apple, pedido por Milton (18/8/2026):
// fondo blanco inmaculado en todo el sistema y secciones separadas por una
// línea fina en vez de una sombra flotante. Sobre fondo blanco una sombra no
// delimita nada; la línea sí.
export const sectionStyle: CSSProperties = {
  background: "#ffffff",
  color: "#1d1d1f",
  borderBottom: "1px solid #e5e5ea",
  borderRadius: 6,
  padding: "20px 0 24px",
  marginTop: 0,
  boxShadow: "none",
  boxSizing: "border-box",
  width: "100%",
};

export const h2Style: CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  letterSpacing: "-0.025em",
  color: "#1d1d1f",
  marginTop: 0,
  marginBottom: 14,
};

export const inputStyle: CSSProperties = {
  padding: "11px 12px",
  borderRadius: 6,
  border: "1px solid #d2d2d7",
  background: "#ffffff",
  color: "#1d1d1f",
  fontSize: 14,
  boxSizing: "border-box",
  maxWidth: "100%",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
};

export const buttonStyle: CSSProperties = {
  marginTop: 12,
  padding: "11px 16px",
  borderRadius: 6,
  border: "none",
  background: "#1d1d1f",
  color: "#ffffff",
  fontWeight: 500,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "none",
  transition: "transform 0.15s ease, background 0.15s ease",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

export const secondaryButtonStyle: CSSProperties = {
  padding: "11px 16px",
  borderRadius: 6,
  border: "1px solid #d2d2d7",
  background: "#ffffff",
  color: "#1d1d1f",
  fontWeight: 500,
  fontSize: 14,
  cursor: "pointer",
  transition: "transform 0.15s ease, background 0.15s ease",
};

export const thStyle: CSSProperties = {
  padding: "10px 12px",
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: "0.03em",
  color: "#6e6e73",
};

export const tdStyle: CSSProperties = {
  padding: "12px",
  fontSize: 14,
  color: "#1d1d1f",
  wordBreak: "break-word",
};

export function readySectionStyle(_ready: boolean): CSSProperties {
  return sectionStyle;
}

export function disabledStyle(
  style: CSSProperties,
  disabled: boolean,
): CSSProperties {
  if (!disabled) return style;
  return { ...style, opacity: 0.45, cursor: "not-allowed" };
}

export function ReadyBadge() {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "#16803c",
        background: "rgba(52, 199, 89, 0.1)",
        padding: "2px 8px",
        borderRadius: 9999,
        marginLeft: 8,
        verticalAlign: "middle",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      ✓ Listo
    </span>
  );
}

export function statusLabel(status: TitleStatus) {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "processing":
      return "Procesando...";
    case "success":
      return "Publicado";
    case "error":
      return "Error";
    case "cancelled":
      return "Cancelado";
  }
}

export function runStatusLabel(status: RunStatus) {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "running":
      return "En curso";
    case "success":
      return "Completado";
    case "halted":
      return "Con errores";
    case "cancelled":
      return "Cancelado";
  }
}


export function ConnectionSuccess({
  title,
  label,
  value,
  description = "Todo funcionó correctamente. SEO TOTAL usará esta conexión para este servicio.",
}: {
  title: string;
  label: string;
  value?: string | null;
  description?: string;
}) {
  return (
    <div
      role="status"
      style={{
        marginTop: 12,
        padding: 18,
        borderRadius: 14,
        border: "1px solid rgba(26, 127, 55, 0.28)",
        background: "#f0fff4",
        color: "#1d1d1f",
      }}
    >
      <strong style={{ display: "block", fontSize: 18, color: "#1a7f37", marginBottom: 8 }}>
        ✓ {title}
      </strong>
      {value && (
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
          {label}: <strong>{value}</strong>.
        </p>
      )}
      <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5, color: "#1d1d1f" }}>
        {description}
      </p>
      <a
        href="/dashboard"
        style={{
          ...buttonStyle,
          display: "inline-block",
          marginTop: 16,
          textDecoration: "none",
        }}
      >
        Volver al Inicio
      </a>
    </div>
  );
}
