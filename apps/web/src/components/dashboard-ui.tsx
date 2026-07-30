import type { CSSProperties } from "react";
import type { RunStatus, TitleStatus } from "@/types/dashboard";

export const sectionStyle: CSSProperties = {
  background: "#181b21",
  borderRadius: 12,
  padding: 20,
  marginTop: 20,
};

export const h2Style: CSSProperties = { fontSize: 16, marginTop: 0 };

export const inputStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #2a2f3a",
  background: "#0f1115",
  color: "#e6e6e6",
  fontSize: 14,
};

export const buttonStyle: CSSProperties = {
  marginTop: 12,
  padding: "10px 16px",
  borderRadius: 8,
  border: "none",
  background: "#4f7cff",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};

export const secondaryButtonStyle: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 8,
  border: "none",
  background: "#2a2f3a",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};

export const thStyle: CSSProperties = { padding: "6px 8px", fontWeight: 500 };
export const tdStyle: CSSProperties = { padding: "6px 8px" };

export function readySectionStyle(ready: boolean): CSSProperties {
  if (!ready) return sectionStyle;
  return {
    ...sectionStyle,
    background: "#132018",
    border: "1px solid #2f6b46",
  };
}

export function disabledStyle(
  style: CSSProperties,
  disabled: boolean,
): CSSProperties {
  if (!disabled) return style;
  return { ...style, opacity: 0.4, cursor: "not-allowed" };
}

export function ReadyBadge() {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "#7fd99a",
        background: "#1c3324",
        padding: "2px 8px",
        borderRadius: 999,
        marginLeft: 8,
        verticalAlign: "middle",
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
      return "Detenido";
    case "cancelled":
      return "Cancelado";
  }
}
