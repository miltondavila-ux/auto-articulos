"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Barra de progreso por etapas + bitácora para la sincronización de
 * categorías, en el mismo lenguaje visual que el generador de Oportunidades
 * de redes (ver dashboard/oportunidades-redes/page.tsx).
 *
 * Pedido explícito de Milton (15/8/2026): antes de esto solo había "un
 * pegoste de imagen con un reloj" que no decía si la cosa estaba funcionando
 * ni por dónde iba. Sincronizar categorías es el primer paso real de un
 * usuario nuevo — si se queda esperando sin señal, pierde la paciencia y no
 * vuelve. Se usa en los DOS lugares donde se sincroniza: el asistente de
 * Inicio y la pantalla de Configuración.
 *
 * Nota de honestidad sobre las etapas: el worker no reporta paso a paso lo
 * que hace con las categorías (a diferencia de la publicación de títulos, que
 * sí guarda TitleEvent). Lo único observable de verdad es el estado del job
 * (pending / running / success / error). Por eso las etapas se derivan de ESE
 * estado real, y la bitácora registra los cambios de estado con su hora real
 * — no se inventan pasos intermedios que nadie está midiendo.
 */

export type CategorySyncStatus = "pending" | "running" | "success" | "error";

const STAGES = [
  { key: "queued", label: "En cola" },
  { key: "running", label: "Entrando a tu plataforma" },
  { key: "done", label: "Guardando categorías" },
] as const;

function stageIndexFor(status: CategorySyncStatus | null): number {
  if (status === "pending") return 0;
  if (status === "running") return 1;
  if (status === "success" || status === "error") return 2;
  return 0;
}

interface LogEntry {
  at: Date;
  text: string;
  kind: "info" | "success" | "error";
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function CategorySyncProgress({
  status,
  categoriesCount,
  errorMessage,
  active,
}: {
  status: CategorySyncStatus | null;
  categoriesCount: number;
  errorMessage: string | null;
  /** true mientras la persona esté esperando este intento. */
  active: boolean;
}) {
  const [seconds, setSeconds] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const lastStatus = useRef<CategorySyncStatus | null>(null);

  // Cronómetro: arranca al activarse y se reinicia en cada intento nuevo.
  useEffect(() => {
    if (!active) return;
    setSeconds(0);
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  // Bitácora: se anota SOLO cuando el estado real cambia, con la hora real.
  useEffect(() => {
    if (!active && log.length === 0) return;
    if (status === lastStatus.current) return;
    lastStatus.current = status;

    const now = new Date();
    if (status === "pending") {
      setLog((prev) => [
        ...prev,
        {
          at: now,
          kind: "info",
          text: "Solicitud enviada. Esperando a que un procesador quede libre.",
        },
      ]);
    } else if (status === "running") {
      setLog((prev) => [
        ...prev,
        {
          at: now,
          kind: "info",
          text: "Un procesador tomó el trabajo: entrando a tu plataforma y leyendo tus categorías.",
        },
      ]);
    } else if (status === "success") {
      setLog((prev) => [
        ...prev,
        {
          at: now,
          kind: "success",
          text:
            categoriesCount > 0
              ? `Listo: se descargaron ${categoriesCount} categoría(s).`
              : "Se entró correctamente, pero tu sitio no tiene categorías creadas todavía.",
        },
      ]);
    } else if (status === "error") {
      setLog((prev) => [
        ...prev,
        {
          at: now,
          kind: "error",
          text: errorMessage || "No se pudo completar la sincronización.",
        },
      ]);
    }
  }, [status, active, categoriesCount, errorMessage, log.length]);

  const finished = status === "success" || status === "error";
  if (!active && log.length === 0) return null;

  const currentStage = stageIndexFor(status);
  // Sube rápido al principio y se frena cerca del final: nunca llega a 100%
  // hasta que el estado real diga que terminó, para no prometer un final que
  // todavía no ocurrió.
  const progress = finished ? 100 : Math.min(92, 8 + seconds * 2);
  const elapsed = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  const barColor =
    status === "error" ? "#ff3b30" : status === "success" ? "#34c759" : "#0071e3";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        marginTop: 12,
        padding: 16,
        border: "1px solid #e5e5ea",
        borderRadius: 14,
        background: "#f5f5f7",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <strong style={{ fontSize: 13, color: "#1d1d1f" }}>
          {status === "success"
            ? "Sincronización completada"
            : status === "error"
              ? "La sincronización no pudo completarse"
              : STAGES[currentStage].label}
        </strong>
        <span
          style={{
            fontSize: 12,
            color: "#6e6e73",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {elapsed}
        </span>
      </div>

      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: "rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: barColor,
            transition: "width 1s linear",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 8,
          marginTop: 12,
        }}
      >
        {STAGES.map((stage, index) => (
          <div
            key={stage.key}
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              color: index <= currentStage ? "#1d1d1f" : "#86868b",
              fontSize: 12,
              fontWeight: index === currentStage && !finished ? 600 : 400,
            }}
          >
            <span aria-hidden="true">
              {status === "error" && index === currentStage
                ? "✕"
                : index < currentStage || (finished && index === currentStage)
                  ? "✓"
                  : index === currentStage
                    ? "●"
                    : "○"}
            </span>
            <span>{stage.label}</span>
          </div>
        ))}
      </div>

      {!finished && (
        <p style={{ margin: "12px 0 0", fontSize: 12, color: "#6e6e73" }}>
          Puede tardar varios minutos según la cola de trabajo. Esta pantalla se
          actualiza sola: no hace falta que recargues ni que vuelvas a pulsar.
        </p>
      )}

      {log.length > 0 && (
        <details open style={{ marginTop: 12 }}>
          <summary
            style={{
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              color: "#1d1d1f",
            }}
          >
            Detalle del proceso
          </summary>
          <ul
            style={{
              listStyle: "none",
              margin: "8px 0 0",
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {log.map((entry, index) => (
              <li
                key={`${entry.at.getTime()}-${index}`}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  fontSize: 12,
                  lineHeight: 1.45,
                  color:
                    entry.kind === "error"
                      ? "#ff3b30"
                      : entry.kind === "success"
                        ? "#16803c"
                        : "#6e6e73",
                }}
              >
                <span
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    color: "#86868b",
                    flexShrink: 0,
                  }}
                >
                  {formatClock(entry.at)}
                </span>
                <span>{entry.text}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
