"use client";

import type { ReactNode } from "react";

/**
 * Círculo de ayuda. Abre el asistente con una pregunta ya escrita, para que la
 * persona resuelva la duda ahí y no tenga que escribirle a Milton.
 */
export function CirculoAyuda({ pregunta }: { pregunta: string }) {
  return (
    <button
      type="button"
      aria-label="Preguntar al asistente sobre esto"
      title="Preguntar al asistente"
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent("auto-articulos:preguntar", { detail: { pregunta } }),
        )
      }
      style={{
        flexShrink: 0,
        width: 24,
        height: 24,
        minHeight: 24,
        padding: 0,
        borderRadius: 980,
        border: "1px solid #d2d2d7",
        background: "#ffffff",
        color: "#6e6e73",
        fontSize: 13,
        fontWeight: 700,
        lineHeight: 1,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      ?
    </button>
  );
}

/**
 * Aviso destacado sobre el cupo de artículos.
 *
 * Milton pidió que estos mensajes se vean, no que pasen desapercibidos en una
 * línea de texto gris: son la diferencia entre que la persona entienda su
 * límite o le escriba preguntando qué pasó.
 */
export default function AvisoCupo({
  titulo,
  children,
  pregunta,
  accion,
}: {
  titulo: string;
  children: ReactNode;
  pregunta: string;
  accion?: ReactNode;
}) {
  return (
    <div
      role="status"
      style={{
        marginTop: 16,
        padding: "clamp(16px, 3vw, 22px)",
        borderRadius: 16,
        border: "1px solid #d2d2d7",
        background: "#f5f5f7",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <h3
          style={{
            margin: 0,
            flex: 1,
            fontSize: "clamp(17px, 2.5vw, 20px)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "#1d1d1f",
          }}
        >
          {titulo}
        </h3>
        <CirculoAyuda pregunta={pregunta} />
      </div>
      <div style={{ marginTop: 8, fontSize: 16, lineHeight: 1.55, color: "#1d1d1f" }}>
        {children}
      </div>
      {accion && <div style={{ marginTop: 16 }}>{accion}</div>}
    </div>
  );
}
