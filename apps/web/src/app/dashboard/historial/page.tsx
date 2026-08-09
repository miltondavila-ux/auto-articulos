"use client";

import { useEffect, useState, useCallback } from "react";
import {
  sectionStyle,
  h2Style,
  thStyle,
  tdStyle,
  statusLabel,
  runStatusLabel,
} from "@/components/dashboard-ui";
import type {
  RunRow,
  RunStatus,
  TitleEventRow,
  TitleRow,
} from "@/types/dashboard";
import GoogleIndexingStatus from "@/components/GoogleIndexingStatus";

export default function HistorialPage() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    const res = await fetch("/api/runs");
    if (res.ok) {
      const data = await res.json();
      setRuns(data.runs);
    }
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  async function handleDeleteHistory() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/runs", { method: "DELETE" });
      if (!res.ok) {
        setDeleteError("No se pudo borrar el historial.");
        return;
      }
      setConfirmingDelete(false);
      await loadRuns();
    } finally {
      setDeleting(false);
    }
  }

  const hasDeletableRuns = runs.some(
    (r) => r.status !== "pending" && r.status !== "running",
  );

  return (
    <>
      <section style={sectionStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <h2 style={h2Style}>Historial de ejecuciones</h2>
          {hasDeletableRuns &&
            (confirmingDelete ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "#8a6d1a" }}>
                  ¿Borrar todo el historial? No se puede deshacer.
                </span>
                <button
                  onClick={handleDeleteHistory}
                  disabled={deleting}
                  style={{
                    background: "#fde8e8",
                    color: "#d64545",
                    border: "1px solid #e8b4b4",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: deleting ? "default" : "pointer",
                  }}
                >
                  {deleting ? "Borrando..." : "Sí, borrar"}
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  style={{
                    background: "none",
                    color: "#6b7280",
                    border: "1px solid #dfe3e8",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 12,
                    cursor: deleting ? "default" : "pointer",
                  }}
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                style={{
                  background: "none",
                  color: "#d64545",
                  border: "1px solid #fde8e8",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🗑 Borrar historial
              </button>
            ))}
        </div>
        {deleteError && (
          <p style={{ fontSize: 12, color: "#d64545", marginTop: 6 }}>
            {deleteError}
          </p>
        )}
        {runs.length === 0 && (
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 12 }}>
            Todavía no hay ejecuciones.
          </p>
        )}
        {runs.map((run, index) => (
          <HistoryEntry
            key={run.id}
            run={run}
            defaultOpen={index === 0}
            onRetried={loadRuns}
          />
        ))}
      </section>

      <SocialOpportunitiesHistory />
    </>
  );
}

interface SocialOpportunity {
  id: string;
  articleTitle: string;
  articleUrl: string;
  platform: string;
  suggestedText: string;
  status: string; // "pending" | "published" | "skipped" | "error"
  postId: string | null;
  errorLog: string | null;
  createdAt: string;
  publishedAt: string | null;
}

function SocialOpportunitiesHistory() {
  const [opportunities, setOpportunities] = useState<SocialOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletingHistory, setDeletingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadOpportunities() {
    try {
      const res = await fetch("/api/social-opportunities");
      if (res.ok) {
        const data = await res.json();
        const list = data.opportunities || [];
        // Filtrar solo las que ya se procesaron (publicadas o error)
        setOpportunities(list.filter((o: any) => o.status !== "pending"));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOpportunities();
  }, []);

  async function handleDeleteHistory() {
    setDeletingHistory(true);
    setError(null);
    try {
      const res = await fetch("/api/social-opportunities", { method: "DELETE" });
      if (res.ok) {
        setConfirmingDelete(false);
        loadOpportunities();
      } else {
        const data = await res.json();
        setError(data.error || "No se pudo borrar el historial.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingHistory(false);
    }
  }

  if (loading) {
    return (
      <section style={{ ...sectionStyle, marginTop: 20 }}>
        <p style={{ fontSize: 13, color: "#6b7280" }}>Cargando historial de redes sociales...</p>
      </section>
    );
  }

  return (
    <section style={{ ...sectionStyle, marginTop: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          borderBottom: "1px solid rgba(232, 236, 245, 0.15)",
          paddingBottom: 10,
          marginBottom: 15,
        }}
      >
        <h2 style={h2Style}>Historial de Publicaciones en Redes</h2>
        {opportunities.length > 0 &&
          (confirmingDelete ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#d64545" }}>
                ¿Borrar todo el historial? No se puede deshacer.
              </span>
              <button
                onClick={handleDeleteHistory}
                disabled={deletingHistory}
                style={{
                  background: "#fde8e8",
                  color: "#d64545",
                  border: "1px solid #e8b4b4",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: deletingHistory ? "default" : "pointer",
                }}
              >
                {deletingHistory ? "Borrando..." : "Sí, borrar"}
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deletingHistory}
                style={{
                  background: "none",
                  color: "#6b7280",
                  border: "1px solid #dfe3e8",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 12,
                  cursor: deletingHistory ? "default" : "pointer",
                }}
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              style={{
                background: "none",
                color: "#d64545",
                border: "1px solid #fde8e8",
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🗑 Borrar historial
            </button>
          ))}
      </div>

      {error && (
        <p style={{ fontSize: 12, color: "#d64545", marginTop: 6 }}>{error}</p>
      )}

      {opportunities.length === 0 ? (
        <p style={{ fontSize: 13, color: "#6b7280" }}>
          Aún no hay publicaciones de redes sociales en el historial.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(232, 236, 245, 0.15)", textAlign: "left" }}>
                <th style={{ padding: "10px 8px", color: "#6b7280" }}>Fecha</th>
                <th style={{ padding: "10px 8px", color: "#6b7280" }}>Red</th>
                <th style={{ padding: "10px 8px", color: "#6b7280" }}>Artículo</th>
                <th style={{ padding: "10px 8px", color: "#6b7280" }}>Copy Publicado</th>
                <th style={{ padding: "10px 8px", color: "#6b7280", textAlign: "right" }}>Estado / Enlace</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opp) => (
                <tr key={opp.id} style={{ borderBottom: "1px solid rgba(232, 236, 245, 0.08)" }}>
                  <td style={{ padding: "12px 8px", whiteSpace: "nowrap", color: "#16181d" }}>
                    {new Date(opp.publishedAt || opp.createdAt).toLocaleString("es-US", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td style={{ padding: "12px 8px", whiteSpace: "nowrap" }}>
                    <span style={{ fontWeight: 600, color: opp.platform === "threads" ? "#0f1419" : "#6b7280" }}>
                      {opp.platform === "threads" ? "🌀 Threads" : opp.platform.toUpperCase()}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "12px 8px",
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "#16181d",
                    }}
                    title={opp.articleTitle}
                  >
                    {opp.articleTitle}
                  </td>
                  <td
                    style={{
                      padding: "12px 8px",
                      maxWidth: 350,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "#4b5563",
                    }}
                    title={opp.suggestedText}
                  >
                    "{opp.suggestedText}"
                  </td>
                  <td style={{ padding: "12px 8px", textAlign: "right", whiteSpace: "nowrap" }}>
                    {opp.status === "published" ? (
                      <a
                        href={opp.platform === "threads" ? `https://www.threads.net/t/${opp.postId}` : "#"}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: "#16a34a",
                          textDecoration: "none",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        ✓ Ver post ↗
                      </a>
                    ) : (
                      <span style={{ color: "#dc2626" }} title={opp.errorLog || "Error desconocido"}>
                        ✗ Error
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function HistoryEntry({
  run,
  defaultOpen,
  onRetried,
}: {
  run: RunRow;
  defaultOpen: boolean;
  onRetried: () => void;
}) {
  const successCount = run.titles.filter((t) => t.status === "success").length;
  const hasErrors = run.status === "halted";
  const [retrying, setRetrying] = useState(false);

  async function handleRetryRun(e: React.MouseEvent) {
    e.preventDefault();
    setRetrying(true);
    try {
      await fetch(`/api/runs/${run.id}/retry`, { method: "POST" });
      onRetried();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <details
      open={defaultOpen}
      style={{
        marginBottom: 10,
        background: hasErrors ? "#fff8e6" : "#f7f8fa",
        border: hasErrors ? "1px solid #f0deac" : "1px solid #dfe3e8",
        borderRadius: 8,
        padding: "10px 14px",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          fontSize: 13,
          listStyle: "none",
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "#16181d", fontWeight: 600 }}>
          {new Date(run.createdAt).toLocaleString()}
        </span>
        <span style={{ color: "#6b7280" }}>— {run.category?.name ?? "—"}</span>
        <span style={{ color: "#6b7280" }}>
          — {successCount}/{run.titles.length} publicados
        </span>
        <span style={{ color: "#6b7280" }}>
          — duración: {formatDuration(run.createdAt, run.finishedAt)}
        </span>
        {hasErrors && (
          <button
            onClick={handleRetryRun}
            disabled={retrying}
            style={{
              background: "#8a6d1a",
              color: "#fff8e6",
              border: "none",
              borderRadius: 6,
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              cursor: retrying ? "default" : "pointer",
            }}
          >
            {retrying ? "Reintentando..." : "Reintentar"}
          </button>
        )}
        <RunStatusBadge status={run.status} />
      </summary>
      <div style={{ marginTop: 12 }}>
        <RunTable titles={run.titles} />
      </div>
    </details>
  );
}

function formatDuration(startIso: string, endIso: string | null): string {
  if (!endIso) return "en curso";
  const totalSeconds = Math.max(
    0,
    Math.round(
      (new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000,
    ),
  );
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}min`;
  if (minutes > 0) return `${minutes}min ${seconds}s`;
  return `${seconds}s`;
}

function RunStatusBadge({ status }: { status: RunStatus }) {
  const color =
    status === "halted"
      ? "#8a6d1a"
      : status === "cancelled"
        ? "#6b7280"
        : "#1e8a4b";
  const background =
    status === "halted"
      ? "#fff8e6"
      : status === "cancelled"
        ? "#dfe3e8"
        : "#dff5e6";
  return (
    <span
      style={{
        marginLeft: "auto",
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 999,
        color,
        background,
      }}
    >
      {runStatusLabel(status)}
    </span>
  );
}

function RunTable({ titles }: { titles: TitleRow[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        className="responsive-table"
        style={{
          width: "100%",
          minWidth: 600,
          borderCollapse: "collapse",
          fontSize: 13,
        }}
      >
        <thead>
          <tr style={{ textAlign: "left", color: "#6b7280" }}>
            <th style={thStyle}>Título</th>
            <th style={thStyle}>Estado</th>
            <th style={thStyle}>Intentos</th>
            <th style={thStyle}>Enlace / Error</th>
            <th style={thStyle}>Log</th>
          </tr>
        </thead>
        <tbody>
          {titles.map((title) => (
            <TitleRowWithLog key={title.id} title={title} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TitleRowWithLog({ title }: { title: TitleRow }) {
  // El log queda visible siempre (no solo en errores): sirve para revisar
  // el paso a paso incluso de títulos ya publicados con éxito. El log
  // completo (con imágenes de diagnóstico) se trae bajo demanda al abrir
  // "Ver log", no en la carga inicial del historial — ver el comentario en
  // /api/runs/route.ts sobre el consumo de transferencia de datos.
  const [fullEvents, setFullEvents] = useState<TitleEventRow[] | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(false);

  async function loadFullEvents() {
    setLoadingEvents(true);
    try {
      const res = await fetch(`/api/titles/${title.id}/events`);
      if (res.ok) {
        const data = await res.json();
        setFullEvents(data.events);
      }
    } finally {
      setLoadingEvents(false);
    }
  }

  return (
    <tr style={{ borderTop: "1px solid #dfe3e8" }}>
      <td style={tdStyle} data-label="Título">
        {title.text}
        {title.finalTitle && title.finalTitle !== title.text && (
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
            Publicado como: {title.finalTitle}
          </div>
        )}
      </td>
      <td style={tdStyle} data-label="Estado">
        {statusLabel(title.status)}
      </td>
      <td style={tdStyle} data-label="Intentos">
        {title.attempts}
      </td>
      <td style={tdStyle} data-label="Enlace / Error">
        {title.articleUrl ? (
          <div>
            <a
              href={title.articleUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                color: "#031537",
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              🔗 Ver artículo publicado
            </a>
            <GoogleIndexingStatus title={title} />
            {title.threadsPublishStatus && (
              <div
                style={{
                  fontSize: 11,
                  color: "#6b7280",
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {title.threadsPublishStatus === "success" ? (
                  <>
                    <span>🌀</span>
                    <a
                      href={title.threadsPostId ? `https://www.threads.net/t/${title.threadsPostId}` : "#"}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: "#0f1419",
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      Ver post en Threads
                    </a>
                  </>
                ) : title.threadsPublishStatus === "error" ? (
                  <span style={{ color: "#d64545" }} title={title.threadsPublishError ?? undefined}>
                    🌀 Error en Threads
                  </span>
                ) : title.threadsPublishStatus === "not_configured" ? (
                  <span style={{ color: "#9ca3af" }}>
                    🌀 Threads no configurado
                  </span>
                ) : (
                  <span style={{ color: "#b45309" }}>
                    🌀 Threads: {title.threadsPublishStatus}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          (title.errorMessage ?? "—")
        )}
      </td>
      <td style={tdStyle} data-label="Log">
        {title.attempts > 0 && (
          <details
            onToggle={(e) => {
              if ((e.target as HTMLDetailsElement).open && !fullEvents) {
                loadFullEvents();
              }
            }}
          >
            <summary style={{ cursor: "pointer", color: "#6b7280" }}>
              Ver log
            </summary>
            {loadingEvents && !fullEvents && (
              <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
                Cargando...
              </p>
            )}
            {fullEvents && (
              <ul
                style={{
                  margin: "8px 0 0",
                  paddingLeft: 18,
                  color: "#6b7280",
                  fontSize: 12,
                }}
              >
                {fullEvents.map((e) => {
                  const imageMatch = e.message.match(
                    /^DIAGNÓSTICO \[(.+)\]: (data:image\/[a-z]+;base64,.+)$/,
                  );
                  return (
                    <li key={e.id} style={{ marginBottom: 4 }}>
                      <span style={{ color: "#6b7280" }}>
                        {new Date(e.createdAt).toLocaleTimeString()}
                      </span>{" "}
                      {imageMatch ? (
                        <>
                          — {imageMatch[1]}
                          <br />
                          <img
                            src={imageMatch[2]}
                            alt={imageMatch[1]}
                            style={{
                              maxWidth: "100%",
                              marginTop: 6,
                              borderRadius: 6,
                              border: "1px solid #dfe3e8",
                            }}
                          />
                        </>
                      ) : (
                        <>— {e.message}</>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </details>
        )}
      </td>
    </tr>
  );
}
