import type { CSSProperties } from "react";
import type { RunStatus, TitleStatus } from "@/types/dashboard";

export const sectionStyle: CSSProperties = {
  background: "rgba(13, 26, 51, 0.65)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  color: "#f5f5f7",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: 16,
  padding: 20,
  marginTop: 20,
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
  boxSizing: "border-box",
  width: "100%",
};

export const h2Style: CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  letterSpacing: "-0.01em",
  color: "#f5f5f7",
  marginTop: 0,
  marginBottom: 12,
};

export const inputStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255, 255, 255, 0.15)",
  background: "rgba(5, 12, 28, 0.6)",
  color: "#f5f5f7",
  fontSize: 14,
  boxSizing: "border-box",
  maxWidth: "100%",
  transition: "all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)",
};

export const buttonStyle: CSSProperties = {
  marginTop: 12,
  padding: "10px 18px",
  borderRadius: 10,
  border: "none",
  background: "#0071e3",
  color: "#ffffff",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0, 113, 227, 0.35)",
  transition: "all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

export const secondaryButtonStyle: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid rgba(255, 255, 255, 0.15)",
  background: "rgba(255, 255, 255, 0.08)",
  color: "#f5f5f7",
  fontWeight: 500,
  fontSize: 14,
  cursor: "pointer",
  transition: "all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)",
};

export const thStyle: CSSProperties = {
  padding: "10px 12px",
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: "0.03em",
  color: "#98a2b3",
};

export const tdStyle: CSSProperties = {
  padding: "10px 12px",
  fontSize: 13,
  color: "#f5f5f7",
};

export function readySectionStyle(ready: boolean): CSSProperties {
  if (!ready) return sectionStyle;
  return {
    ...sectionStyle,
    background: "rgba(48, 209, 88, 0.08)",
    border: "1px solid rgba(48, 209, 88, 0.25)",
  };
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
        color: "#30d158",
        background: "rgba(48, 209, 88, 0.15)",
        border: "1px solid rgba(48, 209, 88, 0.3)",
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
