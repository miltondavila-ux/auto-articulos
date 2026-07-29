"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { sectionStyle, h2Style, readySectionStyle, buttonStyle } from "@/components/dashboard-ui";
import type { RunRow, TitleRow } from "@/types/dashboard";

interface PublishedNotification {
  id: string;
  text: string;
  url: string | null;
}

export default function InicioPage() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [notifications, setNotifications] = useState<PublishedNotification[]>([]);

  const knownTitleStatusRef = useRef<Map<string, string>>(new Map());
  const initializedRef = useRef(false);

  const activeRun = runs.find((r) => r.status === "pending" || r.status === "running");

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
              newlyPublished.push({ id: title.id, text: title.text, url: title.articleUrl });
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
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
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
                    <a href={n.url} target="_blank" rel="noreferrer" style={{ color: "#4f7cff" }}>
                      Ver artículo
                    </a>
                  </>
                )}
              </span>
              <button
                onClick={() => dismissNotification(n.id)}
                style={{ background: "none", border: "none", color: "#9aa1ac", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {activeRun ? (
        <LiveProgress run={activeRun} />
      ) : (
        <section style={{ ...sectionStyle, textAlign: "center" }}>
          <h2 style={h2Style}>No hay ninguna ejecución en curso</h2>
          <p style={{ fontSize: 13, color: "#9aa1ac" }}>
            Ve a "Publicar" para elegir una categoría, pegar títulos e iniciar una nueva tanda.
          </p>
          <Link href="/dashboard/publicar" style={{ textDecoration: "none" }}>
            <button style={buttonStyle}>Ir a Publicar</button>
          </Link>
        </section>
      )}
    </div>
  );
}

function LiveProgress({ run }: { run: RunRow }) {
  const total = run.titles.length;
  const doneCount = run.titles.filter((t) => t.status === "success" || t.status === "error").length;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const nothingStartedYet = run.titles.every((t) => t.status === "pending" && t.events.length === 0);

  return (
    <section style={readySectionStyle(true)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={h2Style}>Publicando — {run.category?.name ?? "—"}</h2>
        <span style={{ fontSize: 12, color: "#9aa1ac" }}>
          {doneCount}/{total} completados — <strong style={{ color: "#e6e6e6" }}>{percent}%</strong>
        </span>
      </div>
      {nothingStartedYet && (
        <p style={{ fontSize: 13, color: "#e8c777", margin: "8px 0 0" }}>
          ⏳ En cola para procesarse. El worker corre por horario y puede tardar hasta 15 minutos en
          recogerlo — esta pantalla se actualiza sola cuando arranque.
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

function TitleProgressRow({ index, title }: { index: number; title: TitleRow }) {
  const icon =
    title.status === "success"
      ? "✅"
      : title.status === "error"
        ? "❌"
        : title.status === "processing"
          ? "⏳"
          : "⬜";
  const lastStep = title.events.length > 0 ? title.events[title.events.length - 1].message : null;

  return (
    <div
      style={{
        background: "#0f1115",
        border: "1px solid #2a2f3a",
        borderRadius: 8,
        padding: "10px 14px",
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 13 }}>
        <span>{icon}</span>
        <span style={{ fontWeight: 600 }}>
          {index + 1}. {title.text}
        </span>
      </div>

      {title.status === "processing" && lastStep && (
        <p style={{ margin: "6px 0 0 24px", fontSize: 13, color: "#9aa1ac" }}>{lastStep}</p>
      )}

      {title.status === "success" && title.articleUrl && (
        <p style={{ margin: "6px 0 0 24px" }}>
          <a
            href={title.articleUrl}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#7fd99a", fontWeight: 600, textDecoration: "none" }}
          >
            🔗 Ver artículo publicado
          </a>
        </p>
      )}

      {title.status === "error" && title.errorMessage && (
        <p style={{ margin: "6px 0 0 24px", fontSize: 13, color: "#ff8787" }}>{title.errorMessage}</p>
      )}

      {title.events.length > 1 && (
        <details style={{ marginTop: 8, marginLeft: 24 }}>
          <summary style={{ cursor: "pointer", fontSize: 11, color: "#9aa1ac" }}>
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
            }}
          >
            {title.events.map((event) => (
              <li key={event.id}>
                <span style={{ color: "#9aa1ac" }}>{new Date(event.createdAt).toLocaleTimeString()}</span>{" "}
                {event.message}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
