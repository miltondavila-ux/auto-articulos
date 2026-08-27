"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import ModuleIntro, { IntroP, Modulo } from "@/components/ModuleIntro";
import {
  sectionStyle,
  h2Style,
  thStyle,
  tdStyle,
  statusLabel,
  runStatusLabel,
  secondaryButtonStyle,
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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <ModuleIntro titulo="Historial">
        <IntroP>
          Todo lo que la plataforma ha publicado por ti queda registrado aquí: artículos y publicaciones en redes, con su fecha, su estado y el enlace a lo que se publicó.
        </IntroP>
        <IntroP>
          Sirve para dos cosas muy concretas: comprobar que algo salió bien de verdad, y encontrar rápido un artículo cuando lo necesitas para compartirlo o revisarlo.
        </IntroP>
        <IntroP>
          Si un trabajo todavía no aparece aquí, es que sigue en marcha: míralo en <Modulo id="publicaciones-en-curso" />.
        </IntroP>
      </ModuleIntro>
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
    <details className="panel" style={sectionStyle}>
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
        <div>
          <p className="eyebrow" style={{ margin: "0 0 2px" }}>Registro</p>
          <h2 style={{ ...h2Style, margin: 0 }}>Artículos publicados</h2>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>
          {runs.length} ejecución{runs.length !== 1 ? "es" : ""}
        </span>
      </summary>
      <div style={{ marginTop: 14 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "flex-end",
            gap: 8,
            marginBottom: 12,
          }}
        >
          {hasDeletableRuns &&
            (confirmingDelete ? (
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "#8a4b08" }}>
                  ¿Borrar historial? No se puede deshacer.
                </span>
                <button
                  onClick={handleDeleteHistory}
                  disabled={deleting}
                  className="secondary"
                  style={{
                    ...secondaryButtonStyle,
                    color: "#ff3b30",
                    padding: "4px 10px",
                    fontSize: 12,
                  }}
                >
                  {deleting ? "Borrando..." : "Sí, borrar"}
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className="secondary"
                  style={{
                    ...secondaryButtonStyle,
                    padding: "4px 10px",
                    fontSize: 12,
                  }}
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="secondary"
                style={{
                  ...secondaryButtonStyle,
                  color: "#ff3b30",
                  padding: "4px 10px",
                  fontSize: 12,
                }}
              >
                Borrar historial
              </button>
            ))}
        </div>
        {deleteError && (
          <p style={{ fontSize: 12, color: "#ff3b30", marginTop: 6 }}>
            {deleteError}
          </p>
        )}
        {runs.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>
            Aún no hay ejecuciones en el historial.
          </p>
        ) : (
          runsByCategory.map(([categoryName, categoryRuns]) => (
            <CategoryGroup
              key={categoryName}
              categoryName={categoryName}
              runs={categoryRuns}
              onRetried={loadRuns}
            />
          ))
        )}
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

  return (
    <details
      className="row"
      style={{
        marginBottom: 10,
        background: "#ffffff",
        border: "1px solid #e5e5ea",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 600,
          color: "#1d1d1f",
          listStyle: "none",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          userSelect: "none",
        }}
      >
        <span>{categoryName}</span>
        <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
          — {runs.length} ejecución{runs.length !== 1 ? "es" : ""} ({totalSuccess}/{totalTitles} publicados)
        </span>
      </summary>
      <div style={{ padding: "0 16px 16px 16px" }}>
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
  titleId: string | null;
  createdAt: string;
  publishedAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  // Imagen y prompt exactos usados cuando la publicación usó el generador
  // de imágenes con IA — pedido explícito de Milton (22/8/2026) para ver
  // esto en el histórico sin tener que revisar los logs de GitHub Actions.
  imageUrl: string | null;
  aiImagePrompt: string | null;
}

function HistorialRedes() {
  const [opportunities, setOpportunities] = useState<SocialOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletingHistory, setDeletingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socialEvents, setSocialEvents] = useState<Record<string, TitleEventRow[]>>({});
  const [loadingSocialEvent, setLoadingSocialEvent] = useState<string | null>(null);

  async function loadSocialEvents(titleId: string) {
    if (socialEvents[titleId]) return;
    setLoadingSocialEvent(titleId);
    try {
      const res = await fetch(`/api/titles/${titleId}/events`);
      if (res.ok) {
        const data = await res.json();
        setSocialEvents((prev) => ({ ...prev, [titleId]: data.events || [] }));
      }
    } catch {
      // ignore
    } finally {
      setLoadingSocialEvent(null);
    }
  }

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
    <details open={false} className="panel" style={sectionStyle}>
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
        <div>
          <p className="eyebrow" style={{ margin: "0 0 2px" }}>Redes Sociales</p>
          <h2 style={{ ...h2Style, margin: 0 }}>Publicaciones en redes sociales</h2>
        </div>
        {!loading && (
          <span className="muted" style={{ fontSize: 13 }}>
            {opportunities.length} publicación{opportunities.length !== 1 ? "es" : ""}
          </span>
        )}
      </summary>
      <div style={{ marginTop: 14 }}>
        {loading ? (
          <p className="muted" style={{ fontSize: 13 }}>Cargando...</p>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginBottom: 12,
              }}
            >
              {opportunities.length > 0 &&
                (confirmingDelete ? (
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "#8a4b08" }}>
                      ¿Borrar todo? No se puede deshacer.
                    </span>
                    <button
                      onClick={handleDeleteHistory}
                      disabled={deletingHistory}
                      className="secondary"
                      style={{
                        ...secondaryButtonStyle,
                        color: "#ff3b30",
                        padding: "4px 10px",
                        fontSize: 12,
                      }}
                    >
                      {deletingHistory ? "Borrando..." : "Sí, borrar"}
                    </button>
                    <button
                      onClick={() => setConfirmingDelete(false)}
                      disabled={deletingHistory}
                      className="secondary"
                      style={{
                        ...secondaryButtonStyle,
                        padding: "4px 10px",
                        fontSize: 12,
                      }}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    className="secondary"
                    style={{
                      ...secondaryButtonStyle,
                      color: "#ff3b30",
                      padding: "4px 10px",
                      fontSize: 12,
                    }}
                  >
                    Borrar historial
                  </button>
                ))}
            </div>
            {error && (
              <p style={{ fontSize: 12, color: "#ff3b30", marginTop: 6 }}>{error}</p>
            )}
            {opportunities.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>
                Aún no hay publicaciones en el historial.
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                {opportunities.map((opp) => (
                  <details
                    key={opp.id}
                    open={false}
                    className="row"
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e5e5ea",
                      borderRadius: 12,
                      padding: "12px 16px",
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
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#1d1d1f", fontWeight: 600 }}>
                          {new Date(opp.publishedAt || opp.finishedAt || opp.createdAt).toLocaleString("es-US", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="muted">—</span>
                        <span style={{ fontWeight: 600, color: "#1d1d1f", textTransform: "uppercase", fontSize: 11 }}>
                          {opp.platform}
                        </span>
                        <span className="muted">—</span>
                        <span style={{ color: "#1d1d1f", fontWeight: 500 }}>
                          {opp.articleTitle}
                        </span>
                      </div>
                      <div>
                        {opp.status === "published" ? (
                          <span style={{ color: "#16803c", fontWeight: 600, fontSize: 12 }}>✓ Publicado</span>
                        ) : (
                          <span style={{ color: "#ff3b30", fontWeight: 600, fontSize: 12 }}>✕ Error</span>
                        )}
                      </div>
                    </summary>
                    <div style={{ marginTop: 12, paddingLeft: 12, borderLeft: "2px solid #e5e5ea" }}>
                      <p style={{ margin: "0 0 6px 0", color: "#1d1d1f", fontSize: 13, fontWeight: 500 }}>
                        Copy publicado:
                      </p>
                      <blockquote style={{ margin: "0 0 12px 0", color: "#6e6e73", fontSize: 13, lineHeight: "1.5" }}>
                        &ldquo;{opp.suggestedText}&rdquo;
                      </blockquote>
                      <div style={{ display: "flex", gap: 15, fontSize: 12, flexWrap: "wrap", marginTop: 10 }}>
                        <a
                          href={opp.articleUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="link-button"
                        >
                          Ver artículo original &rarr;
                        </a>
                        {opp.status === "published" && opp.postId && (
                          <a
                            href={opp.postId.startsWith("http") ? opp.postId : (opp.platform === "threads" ? `https://www.threads.net/t/${opp.postId}` : opp.platform === "x" ? `https://x.com/i/status/${opp.postId}` : opp.platform === "linkedin" ? `https://www.linkedin.com/feed/update/${opp.postId}` : "#")}
                            target="_blank"
                            rel="noreferrer"
                            className="link-button"
                            style={{ color: "#16803c" }}
                          >
                            Ver en la red social &rarr;
                          </a>
                        )}
                      </div>
                      {opp.imageUrl && (
                        <div style={{ marginTop: 12 }}>
                          <p style={{ margin: "0 0 6px 0", color: "#1d1d1f", fontSize: 13, fontWeight: 500 }}>
                            Imagen generada con IA:
                          </p>
                          <img
                            src={opp.imageUrl}
                            alt="Imagen generada con IA"
                            style={{ maxWidth: 220, borderRadius: 8, border: "1px solid #e5e5ea", display: "block" }}
                          />
                          <a
                            href={opp.imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="link-button"
                            style={{ display: "inline-block", marginTop: 6, fontSize: 12 }}
                          >
                            Abrir imagen en tamaño completo &rarr;
                          </a>
                          {opp.aiImagePrompt && (
                            <>
                              <p style={{ margin: "10px 0 6px 0", color: "#1d1d1f", fontSize: 13, fontWeight: 500 }}>
                                Prompt exacto usado:
                              </p>
                              <div
                                style={{
                                  padding: 10,
                                  background: "#f5f5f7",
                                  borderRadius: 8,
                                  fontSize: 12,
                                  color: "#6e6e73",
                                  fontFamily: "monospace",
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                }}
                              >
                                {opp.aiImagePrompt}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      {opp.errorLog && (
                        <div
                          style={{
                            marginTop: 12,
                            padding: 10,
                            background: "#fff2f1",
                            color: "#ff3b30",
                            borderRadius: 8,
                            fontSize: 12,
                            border: "1px solid rgba(255, 59, 48, 0.2)",
                          }}
                        >
                          <strong>Error:</strong> {opp.errorLog}
                        </div>
                      )}
                      {opp.titleId && (
                        <details
                          style={{ marginTop: 12 }}
                          onToggle={(e) => {
                            if ((e.target as HTMLDetailsElement).open) loadSocialEvents(opp.titleId!);
                          }}
                        >
                          <summary style={{ cursor: "pointer", color: "#6e6e73", fontSize: 12 }}>
                            Ver log del proceso
                          </summary>
                          {loadingSocialEvent === opp.titleId && !socialEvents[opp.titleId] && (
                            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Cargando...</p>
                          )}
                          {socialEvents[opp.titleId] && (() => {
                            // El artículo puede tener eventos de otras publicaciones (otra red,
                            // sitemap, etc.) mezclados en el mismo título — nos quedamos solo con
                            // los que ocurrieron durante ESTE intento de publicación específico
                            // (con un margen de 2s por si el evento se registró justo al borde).
                            const start = opp.startedAt ? new Date(opp.startedAt).getTime() - 2000 : null;
                            const end = start
                              ? (opp.finishedAt ? new Date(opp.finishedAt).getTime() : Date.now()) + 2000
                              : null;
                            const filtered = start !== null && end !== null
                              ? socialEvents[opp.titleId].filter((e) => {
                                  const t = new Date(e.createdAt).getTime();
                                  return t >= start && t <= end;
                                })
                              : [];
                            if (filtered.length === 0) {
                              return (
                                <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                                  Sin eventos registrados para este intento de publicación.
                                </p>
                              );
                            }
                            return (
                              <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "#6e6e73", fontSize: 12 }}>
                                {filtered.map((e) => (
                                  <li key={e.id} style={{ marginBottom: 3 }}>
                                    <span>{new Date(e.createdAt).toLocaleTimeString()}</span> — {e.message}
                                  </li>
                                ))}
                              </ul>
                            );
                          })()}
                        </details>
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
        background: "#ffffff",
        border: "1px solid #e5e5ea",
        borderRadius: 8,
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
          padding: "10px 14px",
          userSelect: "none",
        }}
      >
        <span style={{ color: "#1d1d1f", fontWeight: 600 }}>
          Inicio: {new Date(run.createdAt).toLocaleString()}
        </span>
        <span className="muted">
          — {successCount}/{run.titles.length} publicados
        </span>
        <span className="muted">
          — {formatDuration(run.createdAt, run.finishedAt)}
        </span>
        {hasErrors && (
          <button
            onClick={handleRetryRun}
            disabled={retrying}
            className="secondary"
            style={{
              ...secondaryButtonStyle,
              color: "#ff3b30",
              padding: "2px 8px",
              fontSize: 11,
            }}
          >
            {retrying ? "Reintentando..." : "Reintentar"}
          </button>
        )}
        <RunStatusBadge status={run.status} />
      </summary>
      <div style={{ padding: "0 14px 14px 14px" }}>
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
  const isOk = status === "success";
  const isErr = status === "halted";

  return (
    <span
      style={{
        marginLeft: "auto",
        fontSize: 11,
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: 999,
        color: isOk ? "#16803c" : isErr ? "#ff3b30" : "#6e6e73",
        background: isOk ? "rgba(52, 199, 89, 0.1)" : isErr ? "#fff2f1" : "#f5f5f7",
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
          <tr style={{ textAlign: "left", color: "#6e6e73" }}>
            <th style={thStyle}>Título</th>
            <th style={thStyle}>Estado</th>
            <th style={thStyle}>Intentos</th>
            <th style={thStyle}>Oportunidad creada</th>
            <th style={thStyle}>Publicado</th>
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

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
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
          className="link-button"
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
    <tr style={{ borderTop: "1px solid #e5e5ea" }}>
      <td style={tdStyle} data-label="Título">
        <span style={{ fontWeight: 500 }}>{title.text}</span>
        {title.finalTitle && title.finalTitle !== title.text && (
          <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
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
      <td style={tdStyle} data-label="Oportunidad creada">
        {title.opportunityCreatedAt ? (
          formatDateTime(title.opportunityCreatedAt)
        ) : (
          <span className="muted">No aplica</span>
        )}
      </td>
      <td style={tdStyle} data-label="Publicado">
        {title.publishedAt ? (
          formatDateTime(title.publishedAt)
        ) : title.status === "success" && title.processedAt ? (
          <span className="muted">Fecha antigua no registrada</span>
        ) : (
          <span className="muted">Pendiente</span>
        )}
      </td>
      <td style={tdStyle} data-label="Enlace / Error">
        {title.articleUrl ? (
          <div>
            <a
              href={title.articleUrl}
              target="_blank"
              rel="noreferrer"
              className="link-button"
            >
              Ver artículo &rarr;
            </a>
            <GoogleIndexingStatus title={title} />
            {title.threadsPublishStatus && (
              <div
                style={{
                  fontSize: 11,
                  color: "#6e6e73",
                  marginTop: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {title.threadsPublishStatus === "success" ? (
                  <a
                    href={title.threadsPostId ? (title.threadsPostId.startsWith("http") ? title.threadsPostId : `https://www.threads.net/t/${title.threadsPostId}`) : "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="link-button"
                    style={{ color: "#16803c" }}
                  >
                    Post en Threads &rarr;
                  </a>
                ) : (
                  <span style={{ color: "#ff3b30" }}>Threads: {title.threadsPublishStatus}</span>
                )}
              </div>
            )}
            {title.twitterPublishStatus && (
              <div
                style={{
                  fontSize: 11,
                  color: "#6e6e73",
                  marginTop: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {title.twitterPublishStatus === "success" ? (
                  <a
                    href={title.twitterPostId ? (title.twitterPostId.startsWith("http") ? title.twitterPostId : `https://x.com/i/status/${title.twitterPostId}`) : "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="link-button"
                    style={{ color: "#16803c" }}
                  >
                    Post en X &rarr;
                  </a>
                ) : (
                  <span style={{ color: "#ff3b30" }}>X: {title.twitterPublishStatus}</span>
                )}
              </div>
            )}
            {title.linkedinPublishStatus && (
              <div
                style={{
                  fontSize: 11,
                  color: "#6e6e73",
                  marginTop: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {title.linkedinPublishStatus === "success" ? (
                  <a
                    href={title.linkedinPostId ? (title.linkedinPostId.startsWith("http") ? title.linkedinPostId : `https://www.linkedin.com/feed/update/${title.linkedinPostId}`) : "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="link-button"
                    style={{ color: "#16803c" }}
                  >
                    Post en LinkedIn &rarr;
                  </a>
                ) : (
                  <span style={{ color: "#ff3b30" }}>LinkedIn: {title.linkedinPublishStatus}</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <span style={{ color: title.errorMessage ? "#ff3b30" : "inherit" }}>
            {title.errorMessage ?? "—"}
          </span>
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
            <summary style={{ cursor: "pointer", color: "#6e6e73" }}>
              Ver log
            </summary>
            {loadingEvents && !fullEvents && (
              <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                Cargando...
              </p>
            )}
            {fullEvents && (
              <ul
                style={{
                  margin: "8px 0 0",
                  paddingLeft: 16,
                  color: "#6e6e73",
                  fontSize: 12,
                }}
              >
                {fullEvents.map((e) => {
                  const imageMatch = e.message.match(
                    /^DIAGNÓSTICO \[(.+)\]: (data:image\/[a-z]+;base64,.+)$/,
                  );
                  return (
                    <li key={e.id} style={{ marginBottom: 4 }}>
                      <span style={{ color: "#86868b" }}>
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
                              border: "1px solid #e5e5ea",
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
