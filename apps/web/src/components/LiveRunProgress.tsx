"use client";

import { useEffect, useState } from "react";
import { sectionStyle, h2Style, secondaryButtonStyle } from "@/components/dashboard-ui";
import type { RunRow, TitleEventRow, TitleRow } from "@/types/dashboard";
import GoogleIndexingStatus from "@/components/GoogleIndexingStatus";
import { platformHelpUrl, platformProductName } from "@auto-articulos/shared";
import { normalizeConnectionError } from "@/lib/connection-error";

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
  platformDomain = "net",
}: {
  index: number;
  title: TitleRow;
  platformDomain?: string;
}) {
  const productName = platformProductName(platformDomain);
  const helpUrl = platformHelpUrl(platformDomain);
  const icon =
    title.status === "success"
      ? "✓"
      : title.status === "error"
        ? "✕"
        : title.status === "cancelled"
          ? "–"
          : title.status === "processing"
            ? "●"
            : "○";
  const lastStep =
    title.events.length > 0
      ? title.events[title.events.length - 1].message
      : null;
  const titlePercent = estimateTitleProgress(title);

  const [fullEvents, setFullEvents] = useState<TitleEventRow[] | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  // Si la carga fallaba, el panel abría vacío y en silencio: `fullEvents`
  // quedaba en null, `loadingEvents` volvía a false, y el render no tenía
  // ninguna rama que mostrar. Reportado por Milton el 27/8/2026 ("no está
  // mostrando el tema de ver todos los pasos"). Ahora cada final posible deja
  // un mensaje: así se sabe si falló la petición o si de verdad no hay pasos.
  async function loadFullEvents() {
    setLoadingEvents(true);
    setEventsError(null);
    try {
      const res = await fetch(`/api/titles/${title.id}/events`);
      if (!res.ok) {
        setEventsError(
          `No se pudo cargar el log de este artículo (respuesta ${res.status}). Vuelve a abrirlo para reintentar.`,
        );
        return;
      }
      const data = await res.json();
      setFullEvents(data.events ?? []);
    } catch (err) {
      setEventsError(
        `No se pudo cargar el log de este artículo: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setLoadingEvents(false);
    }
  }

  async function handleRetry() {
    setRetrying(true);
    try {
      await fetch(`/api/titles/${title.id}/retry`, { method: "POST" });
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div
      className="row"
      style={{
        background: "#ffffff",
        color: "#1d1d1f",
        border: "1px solid #e5e5ea",
        borderRadius: 12,
        padding: "12px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          fontSize: 14,
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 600,
            background:
              title.status === "success"
                ? "rgba(52, 199, 89, 0.12)"
                : title.status === "error"
                  ? "#fff2f1"
                  : title.status === "processing"
                    ? "#f5f5f7"
                    : "#f5f5f7",
            color:
              title.status === "success"
                ? "#16803c"
                : title.status === "error"
                  ? "#ff3b30"
                  : title.status === "processing"
                    ? "#1d1d1f"
                    : "#6e6e73",
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <span style={{ fontWeight: 500, color: "#1d1d1f" }}>
          {index + 1}. {title.text}
        </span>
      </div>

      {title.status === "processing" && (
        <div style={{ margin: "8px 0 0 32px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "#6e6e73",
              marginBottom: 4,
            }}
          >
            {lastStep && <span>{lastStep}</span>}
            <span style={{ marginLeft: "auto", fontWeight: 500 }}>{titlePercent}%</span>
          </div>
          <div
            style={{
              height: 4,
              background: "rgba(0, 0, 0, 0.05)",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${titlePercent}%`,
                background: "#1d1d1f",
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="secondary"
              style={{
                ...secondaryButtonStyle,
                padding: "4px 10px",
                fontSize: 12,
              }}
            >
              {retrying ? "Reintentando..." : "Forzar reintento"}
            </button>
          </div>
        </div>
      )}

      {title.status === "success" && title.articleUrl && (
        <div style={{ margin: "6px 0 0 32px" }}>
          <a
            href={title.articleUrl}
            target="_blank"
            rel="noreferrer"
            className="link-button"
            style={{ fontSize: 13, fontWeight: 500 }}
          >
            Ver artículo publicado &rarr;
          </a>
          {title.finalTitle && title.finalTitle !== title.text && (
            <span className="muted" style={{ display: "block", fontSize: 12, marginTop: 2 }}>
              Publicado como: {title.finalTitle}
            </span>
          )}
          <GoogleIndexingStatus title={title} />
        </div>
      )}

      {title.status === "error" && title.errorMessage && (
        <div style={{ margin: "8px 0 0 32px" }}>
          {/créditos.*imagen|imagen.*créditos/i.test(title.errorMessage) ? (
            <div
              style={{
                background: "#fff4e5",
                border: "1px solid rgba(255, 149, 0, 0.3)",
                borderRadius: 12,
                padding: "12px 14px",
                marginBottom: 8,
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#8a4b08",
                  margin: 0,
                }}
              >
                Se agotaron los créditos de generación de imágenes en tu cuenta de {productName}
              </p>
              <p style={{ fontSize: 12, color: "#8a4b08", margin: "4px 0 0" }}>
                Solicita más créditos directamente con ellos y luego reintenta este artículo.
              </p>
              {helpUrl && (
                <a
                  href={helpUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="link-button"
                  style={{
                    display: "inline-block",
                    marginTop: 6,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Solicitar créditos en {productName} &rarr;
                </a>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#ff3b30", margin: 0 }}>
              {normalizeConnectionError(title.errorMessage)}
            </p>
          )}
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="secondary"
            style={{
              ...secondaryButtonStyle,
              marginTop: 6,
              padding: "4px 10px",
              fontSize: 12,
              color: "#ff3b30",
            }}
          >
            {retrying ? "Reintentando..." : "Reintentar"}
          </button>
        </div>
      )}

      {title.attempts > 0 && (
        <details
          style={{ marginTop: 8, marginLeft: 32 }}
          onToggle={(e) => {
            if ((e.target as HTMLDetailsElement).open && !fullEvents) {
              loadFullEvents();
            }
          }}
        >
          <summary
            style={{ cursor: "pointer", fontSize: 12, color: "#6e6e73" }}
          >
            Ver todos los pasos del proceso
          </summary>
          {loadingEvents && !fullEvents && (
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Cargando...
            </p>
          )}
          {!loadingEvents && eventsError && (
            <p style={{ fontSize: 12, marginTop: 4, color: "#ff3b30" }}>
              {eventsError}
            </p>
          )}
          {fullEvents?.length === 0 && (
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Todavía no hay pasos registrados para este artículo.
            </p>
          )}
          {fullEvents && fullEvents.length > 0 && (
            <ol
              style={{
                marginTop: 6,
                paddingLeft: 16,
                fontSize: 12,
                color: "#6e6e73",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                maxWidth: "100%",
                overflowWrap: "anywhere",
              }}
            >
              {fullEvents.map((event) => {
                const imageMatch = event.message.match(
                  /^DIAGNÓSTICO \[(.+)\]: (data:image\/[a-z]+;base64,.+)$/,
                );
                return (
                  <li key={event.id} style={{ overflowWrap: "anywhere" }}>
                    <span style={{ color: "#86868b" }}>
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
                            borderRadius: 8,
                            border: "1px solid #e5e5ea",
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
          )}
        </details>
      )}
    </div>
  );
}

export default function LiveProgress({
  run,
  onCancelled,
  platformDomain = "net",
}: {
  run: RunRow;
  onCancelled: () => void;
  platformDomain?: string;
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

  const [waitingSeconds, setWaitingSeconds] = useState(0);
  useEffect(() => {
    if (!nothingStartedYet) return;
    const startedAt = Date.now();
    const interval = setInterval(() => {
      setWaitingSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [nothingStartedYet]);

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
    <section className="panel" style={sectionStyle}>
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
        <div>
          <p className="eyebrow" style={{ margin: "0 0 4px" }}>Ejecución Activa</p>
          <h2 style={{ ...h2Style, margin: 0 }}>Publicando: {run.category?.name ?? "—"}</h2>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginLeft: "auto",
          }}
        >
          <span className="muted" style={{ fontSize: 13 }}>
            {doneCount}/{total} completados —{" "}
            <strong style={{ color: "#1d1d1f" }}>{percent}%</strong>
          </span>
          {confirmingCancel ? (
            <>
              <span style={{ fontSize: 12, color: "#8a4b08" }}>
                ¿Cancelar lote?
              </span>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="secondary"
                style={{
                  ...secondaryButtonStyle,
                  color: "#ff3b30",
                  padding: "4px 10px",
                  fontSize: 12,
                }}
              >
                {cancelling ? "Cancelando..." : "Sí, cancelar"}
              </button>
              <button
                onClick={() => setConfirmingCancel(false)}
                disabled={cancelling}
                className="secondary"
                style={{
                  ...secondaryButtonStyle,
                  padding: "4px 10px",
                  fontSize: 12,
                }}
              >
                No
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmingCancel(true)}
              className="secondary"
              style={{
                ...secondaryButtonStyle,
                color: "#ff3b30",
                padding: "4px 10px",
                fontSize: 12,
              }}
            >
              ✕ Cancelar
            </button>
          )}
        </div>
      </div>
      {cancelError && (
        <p style={{ fontSize: 12, color: "#ff3b30", margin: "6px 0 0" }}>
          {cancelError}
        </p>
      )}
      {nothingStartedYet && (
        <p
          style={{
            fontSize: 13,
            color: "#6e6e73",
            margin: "12px 0 0",
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
              border: "2px solid #d2d2d7",
              borderTopColor: "#1d1d1f",
              borderRadius: "50%",
              animation: "auto-articulos-spin 0.8s linear infinite",
              flexShrink: 0,
            }}
          />
          <span>
            En cola para procesarse. El worker está iniciando ({waitingSeconds}s).
          </span>
        </p>
      )}
      <div
        style={{
          height: 6,
          background: "rgba(0, 0, 0, 0.05)",
          borderRadius: 999,
          overflow: "hidden",
          margin: "14px 0 18px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percent}%`,
            background: "#1d1d1f",
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {run.titles.map((title, index) => (
          <TitleProgressRow
            key={title.id}
            index={index}
            title={title}
            platformDomain={platformDomain}
          />
        ))}
      </div>
    </section>
  );
}
