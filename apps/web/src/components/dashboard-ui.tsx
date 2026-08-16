import type { CSSProperties } from "react";
import type { RunStatus, TitleStatus } from "@/types/dashboard";

export const sectionStyle: CSSProperties = {
  background: "rgba(255, 255, 255, 0.88)",
  color: "#1d1d1f",
  border: "1px solid rgba(0, 0, 0, 0.07)",
  borderRadius: 22,
  padding: 24,
  marginTop: 20,
  boxShadow: "0 12px 38px rgba(0, 0, 0, 0.06)",
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
  borderRadius: 11,
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
  borderRadius: 10,
  border: "none",
  background: "#0071e3",
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
  borderRadius: 10,
  border: "1px solid #d2d2d7",
  background: "#ffffff",
  color: "#0071e3",
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
