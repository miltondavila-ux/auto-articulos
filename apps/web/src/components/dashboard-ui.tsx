import type { CSSProperties } from "react";
import type { RunStatus, TitleStatus } from "@/types/dashboard";

export const sectionStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e8ec",
  borderRadius: 12,
  padding: 20,
  marginTop: 20,
  boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
};

export const h2Style: CSSProperties = { fontSize: 16, marginTop: 0 };

export const inputStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #dfe3e8",
  background: "#f7f8fa",
  color: "#16181d",
  fontSize: 14,
};

export const buttonStyle: CSSProperties = {
  marginTop: 12,
  padding: "10px 16px",
  borderRadius: 8,
  border: "none",
  background: "#2f5fdb",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};

export const secondaryButtonStyle: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 8,
  border: "1px solid #dfe3e8",
  background: "#f7f8fa",
  color: "#16181d",
  fontWeight: 600,
  cursor: "pointer",
};

export const thStyle: CSSProperties = { padding: "6px 8px", fontWeight: 500 };
export const tdStyle: CSSProperties = { padding: "6px 8px" };

export function readySectionStyle(ready: boolean): CSSProperties {
  if (!ready) return sectionStyle;
  return {
    ...sectionStyle,
    background: "#f3fbf6",
    border: "1px solid #a8dfc0",
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
        color: "#1e8a4b",
        background: "#dff5e6",
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
      return "Con errores";
    case "cancelled":
      return "Cancelado";
  }
}
