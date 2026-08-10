"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <HistorialEjecuciones />
      <HistorialRedes />
    </div>
  );
}

function HistorialEjecuciones() {
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

  const runsByCategory = useMemo(() => {
    const map = new Map<string, RunRow[]>();
    for (const run of runs) {
      const cat = run.category?.name ?? "Sin categoría";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(run);
    }
    return Array.from(map.entries());
  }, [runs]);

  return (
    <details open={false} style={sectionStyle}>
      <summary
        style={{
          cursor: "pointer",
          listStyle: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          userSelect: "none",
        }}
      >
        <h2 style={{ ...h2Style, margin: 0 }}>Historial de ejecuciones</h2>
        <span style={{ fontSize: 12, color: "#6b7280" }}>
          {runs.length} ejecución{runs.length !== 1 ? "es" : ""}
        </span>
      </summary>
      <div style={{ marginTop: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginBottom: 10,
          }}
        >
          {hasDeletableRuns &&
            (confirmingDelete ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "#8a6d1a" }}>
                  ¿Borrar todo? No se puede deshacer.
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
          <p style={{ fontSize: 13, color: "#6b7280" }}>
            Todavía no hay ejecuciones.
          </p>
        )}
        {runsByCategory.map(([categoryName, categoryRuns]) => (
          <CategoryGroup
            key={categoryName}
            categoryName={categoryName}
            runs={categoryRuns}
            onRetried={loadRuns}
          />
        ))}
      </div>
    </details>
  );
}

function CategoryGroup({
  categoryName,
  runs,
  onRetried,
}: {
  categoryName: string;
  runs: RunRow[];
  onRetried: () => void;
}) {
  const totalSuccess = runs.reduce(
    (acc, r) => acc + r.titles.filter((t) => t.status === "success").length,
    0,
  );
  const totalTitles = runs.reduce((acc, r) => acc + r.titles.length, 0);
  const hasErrors = runs.some((r) => r.status === "halted");

  return (
    <details
      open={false}
      style={{
        marginBottom: 8,
        background: hasErrors ? "#fff8e6" : "#f7f8fa",
        border: hasErrors ? "1px solid #f0deac" : "1px solid #dfe3e8",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 700,
          color: "#16181d",
          listStyle: "none",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          userSelect: "none",
        }}
      >
        <span style={{ fontSize: 11, color: "#6b7280" }}>▶</span>
        <span>{categoryName}</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: "#6b7280" }}>
          — {runs.length} ejecución{runs.length !== 1 ? "es" : ""}
        </span>
        <span style={{ fontSize: 12, fontWeight: 500, color: "#6b7280" }}>
          — {totalSuccess}/{totalTitles} publicados
        </span>
      </summary>
      <div style={{ padding: "0 14px 14px 14px" }}>
        {runs.map((run) => (
          <HistoryEntry key={run.id} run={run} onRetried={onRetried} />
        ))}
      </div>
    </details>
  );
}

interface SocialOpportunity {
  id: string;
  articleTitle: string;
  articleUrl: string;
  platform: string;
  suggestedText: string;
  status: string;
  postId: string | null;
  errorLog: string | null;
  createdAt: string;
  publishedAt: string | null;
}

function HistorialRedes() {
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

  return (
    <details open={false} style={sectionStyle}>
      <summary
        style={{
          cursor: "pointer",
          listStyle: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          userSelect: "none",
        }}
      >
        <h2 style={{ ...h2Style, margin: 0 }}>Historial de Publicaciones en Redes</h2>
        {!loading && (
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            {opportunities.length} publicación{opportunities.length !== 1 ? "es" : ""}
          </span>
        )}
      </summary>
      <div style={{ marginTop: 12 }}>
        {loading ? (
          <p style={{ fontSize: 13, color: "#6b7280" }}>Cargando...</p>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginBottom: 10,
              }}
            >
              {opportunities.length > 0 &&
                (confirmingDelete ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "#d64545" }}>
                      ¿Borrar todo? No se puede deshacer.
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
                Aún no hay publicaciones en el historial.
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                {opportunities.map((opp) => (
                  <details
                    key={opp.id}
                    open={false}
                    style={{
                      background: opp.status === "error" ? "#fff8f8" : "#f7f8fa",
                      border: opp.status === "error" ? "1px solid #fecaca" : "1px solid #dfe3e8",
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
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ color: "#16181d", fontWeight: 600 }}>
                          {new Date(opp.publishedAt || opp.createdAt).toLocaleString("es-US", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span style={{ color: "#6b7280" }}>—</span>
                        <span style={{ fontWeight: 700, color: opp.platform === "threads" ? "#0f1419" : opp.platform === "x" ? "#1da1f2" : opp.platform === "linkedin" ? "#0077b5" : "#6b7280" }}>
                          {opp.platform === "threads" ? "🌀 Threads" : opp.platform === "x" ? "🐦 X (Twitter)" : opp.platform === "linkedin" ? "💼 LinkedIn" : opp.platform.toUpperCase()}
                        </span>
                        <span style={{ color: "#6b7280" }}>—</span>
                        <span style={{ color: "#16181d", fontWeight: 500 }}>
                          {opp.articleTitle}
                        </span>
                      </div>
                      <div>
                        {opp.status === "published" ? (
                          <span style={{ color: "#16a34a", fontWeight: 600 }}>✓ Publicado</span>
                        ) : (
                          <span style={{ color: "#dc2626", fontWeight: 600 }}>✗ Error</span>
                        )}
                      </div>
                    </summary>
                    <div style={{ marginTop: 12, paddingLeft: 10, borderLeft: "3px solid #dfe3e8" }}>
                      <p style={{ margin: "0 0 6px 0", color: "#16181d", fontSize: 13, fontWeight: 600 }}>
                        Copy publicado:
                      </p>
                      <blockquote style={{ margin: "0 0 12px 0", fontStyle: "italic", color: "#4b5563", fontSize: 13, lineHeight: "1.5" }}>
                        &ldquo;{opp.suggestedText}&rdquo;
                      </blockquote>
                      <div style={{ display: "flex", gap: 15, fontSize: 12, flexWrap: "wrap", marginTop: 10 }}>
                        <a
                          href={opp.articleUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#3b82f6", textDecoration: "none", fontWeight: 600 }}
                        >
                          Ver artículo original ↗
                        </a>
                        {opp.status === "published" && opp.postId && (
                          <a
                            href={opp.postId.startsWith("http") ? opp.postId : (opp.platform === "threads" ? `https://www.threads.net/t/${opp.postId}` : opp.platform === "x" ? `https://x.com/i/status/${opp.postId}` : opp.platform === "linkedin" ? `https://www.linkedin.com/feed/update/${opp.postId}` : "#")}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#16a34a", textDecoration: "none", fontWeight: 600 }}
                          >
                            Ver en la Red Social ↗
                          </a>
                        )}
                      </div>
                      {opp.errorLog && (
                        <div
                          style={{
                            marginTop: 12,
                            padding: 10,
                            background: "#fee2e2",
                            color: "#991b1b",
                            borderRadius: 6,
                            fontSize: 12,
                            border: "1px solid #fecaca",
                          }}
                        >
                          <strong>Log de error:</strong> {opp.errorLog}
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </details>
  );
}

function HistoryEntry({
  run,
  onRetried,
}: {
  run: RunRow;
  onRetried: () => void;
}) {
  const successCount = run.titles.filter((t) => t.status === "success").length;
  const hasErrors = run.status === "halted";
  const [retrying, setRetrying] = useState(false);

  async function handleRetryRun(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
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
      open={false}
      style={{
        marginBottom: 8,
        background: hasErrors ? "#fffdf5" : "#ffffff",
        border: hasErrors ? "1px solid #f0deac" : "1px solid #e8ecf1",
        borderRadius: 6,
        overflow: "hidden",
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
          padding: "8px 12px",
          userSelect: "none",
        }}
      >
        <span style={{ fontSize: 10, color: "#6b7280" }}>▶</span>
        <span style={{ color: "#16181d", fontWeight: 600 }}>
          {new Date(run.createdAt).toLocaleString()}
        </span>
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
      <div style={{ padding: "0 12px 12px 12px" }}>
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

function renderMessageWithLinks(message: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = message.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noreferrer"
          style={{ color: "#3b82f6", textDecoration: "underline", fontWeight: 600 }}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

function TitleRowWithLog({ title }: { title: TitleRow }) {
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
                      href={title.threadsPostId ? (title.threadsPostId.startsWith("http") ? title.threadsPostId : `https://www.threads.net/t/${title.threadsPostId}`) : "#"}
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
            {title.twitterPublishStatus && (
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
                {title.twitterPublishStatus === "success" ? (
                  <>
                    <span>🐦</span>
                    <a
                      href={title.twitterPostId ? (title.twitterPostId.startsWith("http") ? title.twitterPostId : `https://x.com/i/status/${title.twitterPostId}`) : "#"}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: "#1da1f2",
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      Ver post en X
                    </a>
                  </>
                ) : title.twitterPublishStatus === "error" ? (
                  <span style={{ color: "#d64545" }} title={title.twitterPublishError ?? undefined}>
                    🐦 Error en X
                  </span>
                ) : title.twitterPublishStatus === "not_configured" ? (
                  <span style={{ color: "#9ca3af" }}>
                    🐦 X no configurado
                  </span>
                ) : (
                  <span style={{ color: "#b45309" }}>
                    🐦 X: {title.twitterPublishStatus}
                  </span>
                )}
              </div>
            )}
            {title.linkedinPublishStatus && (
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
                {title.linkedinPublishStatus === "success" ? (
                  <>
                    <span>💼</span>
                    <a
                      href={title.linkedinPostId ? (title.linkedinPostId.startsWith("http") ? title.linkedinPostId : `https://www.linkedin.com/feed/update/${title.linkedinPostId}`) : "#"}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: "#0077b5",
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      Ver post en LinkedIn
                    </a>
                  </>
                ) : title.linkedinPublishStatus === "error" ? (
                  <span style={{ color: "#d64545" }} title={title.linkedinPublishError ?? undefined}>
                    💼 Error en LinkedIn
                  </span>
                ) : title.linkedinPublishStatus === "not_configured" ? (
                  <span style={{ color: "#9ca3af" }}>
                    💼 LinkedIn no configurado
                  </span>
                ) : (
                  <span style={{ color: "#b45309" }}>
                    💼 LinkedIn: {title.linkedinPublishStatus}
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
                        <>— {renderMessageWithLinks(e.message)}</>
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
