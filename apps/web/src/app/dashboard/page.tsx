"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  sectionStyle,
  h2Style,
  readySectionStyle,
  buttonStyle,
} from "@/components/dashboard-ui";
import type { RunRow, TitleRow } from "@/types/dashboard";

interface PublishedNotification {
  id: string;
  text: string;
  url: string | null;
}

export default function InicioPage() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [notifications, setNotifications] = useState<PublishedNotification[]>(
    [],
  );

  const knownTitleStatusRef = useRef<Map<string, string>>(new Map());
  const initializedRef = useRef(false);

  const activeRun = runs.find(
    (r) => r.status === "pending" || r.status === "running",
  );

  const loadRuns = useCallback(async () => {
    const res = await fetch("/api/runs");
    if (res.ok) {
      const data = await res.json();
      const newRuns: RunRow[] = data.runs;

      if (initializedRef.current) {
        const newlyPublished: PublishedNotification[] = [];
        for (const run of newRuns) {
          for (const title of run.titles) {
            const prevStatus = knownTitleStatusRef.current.get(title.id);
            if (title.status === "success" && prevStatus !== "success") {
              newlyPublished.push({
                id: title.id,
                text: title.text,
                url: title.articleUrl,
              });
            }
          }
        }
        if (newlyPublished.length > 0) {
          setNotifications((prev) => [...newlyPublished, ...prev].slice(0, 10));
        }
      } else {
        initializedRef.current = true;
      }

      for (const run of newRuns) {
        for (const title of run.titles) {
          knownTitleStatusRef.current.set(title.id, title.status);
        }
      }

      setRuns(newRuns);
    }
  }, []);

  function dismissNotification(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  useEffect(() => {
    if (!activeRun) return;
    const interval = setInterval(loadRuns, 2000);
    return () => clearInterval(interval);
  }, [activeRun, loadRuns]);

  return (
    <div>
      {notifications.length > 0 && (
        <div
          style={{
            marginTop: 20,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {notifications.map((n) => (
            <div
              key={n.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderRadius: 8,
                background: "#142a1b",
                border: "1px solid #2f6b46",
                fontSize: 13,
              }}
            >
              <span style={{ color: "#7fd99a" }}>
                ✓ Artículo publicado: <strong>{n.text}</strong>
                {n.url && (
                  <>
                    {" — "}
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#4f7cff" }}
                    >
                      Ver artículo
                    </a>
                  </>
                )}
              </span>
              <button
                onClick={() => dismissNotification(n.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#9aa1ac",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {activeRun ? (
        <LiveProgress run={activeRun} onCancelled={loadRuns} />
      ) : (
        <section style={{ ...sectionStyle, textAlign: "center" }}>
          <h2 style={h2Style}>No hay ninguna ejecución en curso</h2>
          <p style={{ fontSize: 13, color: "#9aa1ac" }}>
            Ve a "Publicar" para elegir una categoría, pegar títulos e iniciar
            una nueva tanda.
          </p>
          <Link href="/dashboard/publicar" style={{ textDecoration: "none" }}>
            <button style={buttonStyle}>Ir a Publicar</button>
          </Link>
        </section>
      )}
    </div>
  );
}

function LiveProgress({
  run,
  onCancelled,
}: {
  run: RunRow;
  onCancelled: () => void;
}) {
  const total = run.titles.length;
  const doneCount = run.titles.filter(
    (t) => t.status === "success" || t.status === "error",
  ).length;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const nothingStartedYet = run.titles.every(
    (t) => t.status === "pending" && t.events.length === 0,
  );

  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function handleCancel() {
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/runs/${run.id}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCancelError(data.error ?? "No se pudo cancelar la ejecución.");
        return;
      }
      setConfirmingCancel(false);
      onCancelled();
    } finally {
      setCancelling(false);
    }
  }

  return (
    <section style={readySectionStyle(true)}>
      <style>{`
        @keyframes auto-articulos-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h2 style={h2Style}>Publicando — {run.category?.name ?? "—"}</h2>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginLeft: "auto",
          }}
        >
          <span style={{ fontSize: 12, color: "#9aa1ac" }}>
            {doneCount}/{total} completados —{" "}
            <strong style={{ color: "#e6e6e6" }}>{percent}%</strong>
          </span>
          {confirmingCancel ? (
            <>
              <span style={{ fontSize: 12, color: "#e8c777" }}>
                ¿Cancelar todo el lote?
              </span>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                style={{
                  background: "#5c1f1f",
                  color: "#ff8787",
                  border: "1px solid #7a2b2b",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: cancelling ? "default" : "pointer",
                }}
              >
                {cancelling ? "Cancelando..." : "Sí, cancelar"}
              </button>
              <button
                onClick={() => setConfirmingCancel(false)}
                disabled={cancelling}
                style={{
                  background: "none",
                  color: "#9aa1ac",
                  border: "1px solid #2a2f3a",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 12,
                  cursor: cancelling ? "default" : "pointer",
                }}
              >
                No
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmingCancel(true)}
              style={{
                background: "none",
                color: "#ff8787",
                border: "1px solid #5c1f1f",
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ✕ Cancelar
            </button>
          )}
        </div>
      </div>
      {cancelError && (
        <p style={{ fontSize: 12, color: "#ff8787", margin: "6px 0 0" }}>
          {cancelError}
        </p>
      )}
      {nothingStartedYet && (
        <p
          style={{
            fontSize: 13,
            color: "#e8c777",
            margin: "8px 0 0",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 14,
              height: 14,
              border: "2px solid #4a4326",
              borderTopColor: "#e8c777",
              borderRadius: "50%",
              animation: "auto-articulos-spin 0.8s linear infinite",
              flexShrink: 0,
            }}
          />
          En cola para procesarse. El worker está arrancando — esta pantalla se
          actualiza sola cuando comience.
        </p>
      )}
      <div
        style={{
          height: 8,
          background: "#0f1115",
          borderRadius: 999,
          overflow: "hidden",
          margin: "10px 0 16px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percent}%`,
            background: "#4f7cff",
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {run.titles.map((title, index) => (
          <TitleProgressRow key={title.id} index={index} title={title} />
        ))}
      </div>
    </section>
  );
}

// Pasos reales que va reportando la automatización (ver onStep(...) en
// apps/worker/src/automation/10minutesWebsite.ts), en orden, con un % estimado
// de avance de UN artículo — para poder mostrar una barra de progreso
// individual mientras se está creando, no solo el % del lote completo.
const TITLE_PROGRESS_STEPS: {
  match: (msg: string) => boolean;
  percent: number;
}[] = [
  { match: (m) => m.startsWith("Intento"), percent: 2 },
  { match: (m) => m.startsWith("Iniciando sesión"), percent: 5 },
  {
    match: (m) =>
      m.startsWith("Sesión iniciada") || m.startsWith("Sesión ya activa"),
    percent: 10,
  },
  { match: (m) => m.startsWith("Abriendo formulario"), percent: 15 },
  { match: (m) => m.startsWith("Categoría seleccionada"), percent: 20 },
  { match: (m) => m.startsWith("Indexación en buscadores"), percent: 22 },
  { match: (m) => m.startsWith("Generando contenido"), percent: 28 },
  { match: (m) => m.startsWith("Contenido generado"), percent: 50 },
  { match: (m) => m.startsWith("Título asignado"), percent: 53 },
  { match: (m) => m.startsWith("Resumen recortado"), percent: 55 },
  { match: (m) => m.startsWith("Generando imagen"), percent: 60 },
  { match: (m) => m.includes("no parece corresponder al tema"), percent: 65 },
  { match: (m) => m.startsWith("Imagen generada"), percent: 78 },
  { match: (m) => m.startsWith("Preguntas frecuentes"), percent: 85 },
  { match: (m) => m.startsWith("Guardando y publicando"), percent: 90 },
  { match: (m) => m.startsWith("Diagnóstico de guardado"), percent: 92 },
  { match: (m) => m.startsWith("Buscando el artículo publicado"), percent: 96 },
  { match: (m) => m.startsWith("Artículo publicado con éxito"), percent: 100 },
];

function estimateTitleProgress(title: TitleRow): number {
  if (title.status === "success") return 100;
  if (title.status === "pending") return 0;
  for (let i = title.events.length - 1; i >= 0; i--) {
    const msg = title.events[i].message;
    const step = TITLE_PROGRESS_STEPS.find((s) => s.match(msg));
    if (step) return step.percent;
  }
  return title.events.length > 0 ? 5 : 0;
}

function TitleProgressRow({
  index,
  title,
}: {
  index: number;
  title: TitleRow;
}) {
  const icon =
    title.status === "success"
      ? "✅"
      : title.status === "error"
        ? "❌"
        : title.status === "cancelled"
          ? "🚫"
          : title.status === "processing"
            ? "⏳"
            : "⬜";
  const lastStep =
    title.events.length > 0
      ? title.events[title.events.length - 1].message
      : null;
  const titlePercent = estimateTitleProgress(title);

  return (
    <div
      style={{
        background: "#0f1115",
        border: "1px solid #2a2f3a",
        borderRadius: 8,
        padding: "10px 14px",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "baseline",
          fontSize: 13,
        }}
      >
        <span>{icon}</span>
        <span style={{ fontWeight: 600 }}>
          {index + 1}. {title.text}
        </span>
      </div>

      {title.status === "processing" && (
        <div style={{ margin: "6px 0 0 24px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "#9aa1ac",
              marginBottom: 3,
            }}
          >
            {lastStep && <span>{lastStep}</span>}
            <span style={{ marginLeft: "auto" }}>{titlePercent}%</span>
          </div>
          <div
            style={{
              height: 5,
              background: "#1a1d24",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${titlePercent}%`,
                background: "#e8c777",
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>
      )}

      {title.status === "success" && title.articleUrl && (
        <p style={{ margin: "6px 0 0 24px" }}>
          <a
            href={title.articleUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              color: "#7fd99a",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            🔗 Ver artículo publicado
          </a>
          {title.finalTitle && title.finalTitle !== title.text && (
            <span style={{ display: "block", fontSize: 11, color: "#9aa1ac" }}>
              Publicado como: {title.finalTitle}
            </span>
          )}
        </p>
      )}

      {title.status === "error" && title.errorMessage && (
        <p style={{ margin: "6px 0 0 24px", fontSize: 13, color: "#ff8787" }}>
          {title.errorMessage}
        </p>
      )}

      {title.events.length > 1 && (
        <details style={{ marginTop: 8, marginLeft: 24 }}>
          <summary
            style={{ cursor: "pointer", fontSize: 11, color: "#9aa1ac" }}
          >
            Ver todos los pasos
          </summary>
          <ol
            style={{
              marginTop: 6,
              paddingLeft: 16,
              fontSize: 11,
              color: "#c7ccd1",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              maxWidth: "100%",
              overflowWrap: "anywhere",
            }}
          >
            {title.events.map((event) => {
              const imageMatch = event.message.match(
                /^DIAGNÓSTICO \[(.+)\]: (data:image\/[a-z]+;base64,.+)$/,
              );
              return (
                <li key={event.id} style={{ overflowWrap: "anywhere" }}>
                  <span style={{ color: "#9aa1ac" }}>
                    {new Date(event.createdAt).toLocaleTimeString()}
                  </span>{" "}
                  {imageMatch ? (
                    <>
                      {imageMatch[1]}
                      <br />
                      <img
                        src={imageMatch[2]}
                        alt={imageMatch[1]}
                        style={{
                          maxWidth: "100%",
                          marginTop: 4,
                          borderRadius: 6,
                          border: "1px solid #2a2f3a",
                        }}
                      />
                    </>
                  ) : (
                    event.message
                  )}
                </li>
              );
            })}
          </ol>
        </details>
      )}
    </div>
  );
}
