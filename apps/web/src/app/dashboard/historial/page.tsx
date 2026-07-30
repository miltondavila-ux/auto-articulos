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
import type { RunRow, RunStatus, TitleRow } from "@/types/dashboard";

export default function HistorialPage() {
  const [runs, setRuns] = useState<RunRow[]>([]);

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

  return (
    <section style={sectionStyle}>
      <h2 style={h2Style}>Historial de ejecuciones</h2>
      {runs.length === 0 && (
        <p style={{ fontSize: 13, color: "#9aa1ac" }}>
          Todavía no hay ejecuciones.
        </p>
      )}
      {runs.map((run, index) => (
        <HistoryEntry key={run.id} run={run} defaultOpen={index === 0} />
      ))}
    </section>
  );
}

function HistoryEntry({
  run,
  defaultOpen,
}: {
  run: RunRow;
  defaultOpen: boolean;
}) {
  const successCount = run.titles.filter((t) => t.status === "success").length;

  return (
    <details
      open={defaultOpen}
      style={{
        marginBottom: 10,
        background: "#0f1115",
        border: "1px solid #2a2f3a",
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
        <span style={{ color: "#e6e6e6", fontWeight: 600 }}>
          {new Date(run.createdAt).toLocaleString()}
        </span>
        <span style={{ color: "#9aa1ac" }}>— {run.category?.name ?? "—"}</span>
        <span style={{ color: "#9aa1ac" }}>
          — {successCount}/{run.titles.length} publicados
        </span>
        <span style={{ color: "#9aa1ac" }}>
          — duración: {formatDuration(run.createdAt, run.finishedAt)}
        </span>
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
      ? "#ff8787"
      : status === "cancelled"
        ? "#9aa1ac"
        : "#7fd99a";
  const background =
    status === "halted"
      ? "#3a1414"
      : status === "cancelled"
        ? "#2a2f3a"
        : "#1c3324";
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
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ textAlign: "left", color: "#9aa1ac" }}>
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
  );
}

function TitleRowWithLog({ title }: { title: TitleRow }) {
  // El log queda visible siempre (no solo en errores): sirve para revisar
  // el paso a paso incluso de títulos ya publicados con éxito.
  return (
    <tr style={{ borderTop: "1px solid #2a2f3a" }}>
      <td style={tdStyle}>
        {title.text}
        {title.finalTitle && title.finalTitle !== title.text && (
          <div style={{ fontSize: 11, color: "#9aa1ac", marginTop: 4 }}>
            Publicado como: {title.finalTitle}
          </div>
        )}
      </td>
      <td style={tdStyle}>{statusLabel(title.status)}</td>
      <td style={tdStyle}>{title.attempts}</td>
      <td style={tdStyle}>
        {title.articleUrl ? (
          <a
            href={title.articleUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              color: "#7fd99a",
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            🔗 Ver artículo publicado
          </a>
        ) : (
          (title.errorMessage ?? "—")
        )}
      </td>
      <td style={tdStyle}>
        {title.events.length > 0 && (
          <details>
            <summary style={{ cursor: "pointer", color: "#9aa1ac" }}>
              Ver log ({title.events.length})
            </summary>
            <ul
              style={{
                margin: "8px 0 0",
                paddingLeft: 18,
                color: "#9aa1ac",
                fontSize: 12,
              }}
            >
              {title.events.map((e) => {
                const imageMatch = e.message.match(
                  /^DIAGNÓSTICO \[(.+)\]: (data:image\/[a-z]+;base64,.+)$/,
                );
                return (
                  <li key={e.id} style={{ marginBottom: 4 }}>
                    <span style={{ color: "#6c7280" }}>
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
                            border: "1px solid #2a2f3a",
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
          </details>
        )}
      </td>
    </tr>
  );
}
