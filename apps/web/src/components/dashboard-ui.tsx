import type { CSSProperties } from "react";
import type { RunStatus, TitleStatus } from "@/types/dashboard";

export const sectionStyle: CSSProperties = {
  background: "#ffffff",
  color: "#1d1d1f",
  border: "1px solid rgba(0, 0, 0, 0.08)",
  borderRadius: 16,
  padding: 20,
  marginTop: 20,
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
  boxSizing: "border-box",
  width: "100%",
};

export const h2Style: CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  letterSpacing: "-0.01em",
  color: "#1d1d1f",
  marginTop: 0,
  marginBottom: 12,
};

export const inputStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #d2d2d7",
  background: "#ffffff",
  color: "#1d1d1f",
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
  boxShadow: "0 2px 8px rgba(0, 113, 227, 0.25)",
  transition: "all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

export const secondaryButtonStyle: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #d2d2d7",
  background: "#f5f5f7",
  color: "#1d1d1f",
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
  color: "#86868b",
};

export const tdStyle: CSSProperties = {
  padding: "10px 12px",
  fontSize: 13,
  color: "#1d1d1f",
};

export function readySectionStyle(ready: boolean): CSSProperties {
  if (!ready) return sectionStyle;
  return {
    ...sectionStyle,
    background: "#f2faf4",
    border: "1px solid rgba(52, 199, 89, 0.3)",
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
        color: "#34c759",
        background: "rgba(52, 199, 89, 0.12)",
        border: "1px solid rgba(52, 199, 89, 0.25)",
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
