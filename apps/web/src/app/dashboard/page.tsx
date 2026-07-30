"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  sectionStyle,
  h2Style,
  readySectionStyle,
  buttonStyle,
} from "@/components/dashboard-ui";
import type { RunRow, TitleEventRow, TitleRow } from "@/types/dashboard";

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
  const [credentialsConfigured, setCredentialsConfigured] = useState(false);
  const [categoriesCount, setCategoriesCount] = useState(0);

  const knownTitleStatusRef = useRef<Map<string, string>>(new Map());
  const initializedRef = useRef(false);

  const activeRun = runs.find(
    (r) => r.status === "pending" || r.status === "running",
  );
  const hasPublishedAny = runs.some((r) =>
    r.titles.some((t) => t.status === "success"),
  );

  useEffect(() => {
    (async () => {
      const [credRes, catRes] = await Promise.all([
        fetch("/api/credentials"),
        fetch("/api/categories"),
      ]);
      if (credRes.ok) {
        const data = await credRes.json();
        setCredentialsConfigured(Boolean(data.configured));
      }
      if (catRes.ok) {
        const data = await catRes.json();
        setCategoriesCount(data.categories?.length ?? 0);
      }
    })();
  }, []);

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
    // 4s en vez de 2s: reduce a la mitad el volumen de polling (ver también
    // el recorte de eventos en /api/runs) para no agotar la cuota gratuita
    // de transferencia de datos de Neon.
    const interval = setInterval(loadRuns, 4000);
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
                background: "#eafaf0",
                border: "1px solid #a8dfc0",
                fontSize: 13,
              }}
            >
              <span style={{ color: "#1e8a4b" }}>
                ✓ Artículo publicado: <strong>{n.text}</strong>
                {n.url && (
                  <>
                    {" — "}
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#2f5fdb" }}
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
                  color: "#6b7280",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <OnboardingWizard
        credentialsConfigured={credentialsConfigured}
        categoriesConfigured={categoriesCount > 0}
        hasPublishedAny={hasPublishedAny}
      />

      {activeRun ? (
        <LiveProgress run={activeRun} onCancelled={loadRuns} />
      ) : (
        <section style={{ ...sectionStyle, textAlign: "center" }}>
          <h2 style={h2Style}>No hay ninguna ejecución en curso</h2>
          <p style={{ fontSize: 13, color: "#6b7280" }}>
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

function OnboardingWizard({
  credentialsConfigured,
  categoriesConfigured,
  hasPublishedAny,
}: {
  credentialsConfigured: boolean;
  categoriesConfigured: boolean;
  hasPublishedAny: boolean;
}) {
  const steps = [
    {
      done: credentialsConfigured,
      title: "Configura tu usuario y contraseña de 10minutesWebsite",
      description:
        "Son las credenciales con las que entras a 10minutesWebsite, no las de Auto Artículos.",
      href: "/dashboard/configuracion",
      cta: "Ir a Configuración",
    },
    {
      done: categoriesConfigured,
      title: "Conecta tus categorías",
      description:
        "Sincroniza las categorías reales de tu cuenta para poder elegir dónde publicar.",
      href: "/dashboard/configuracion",
      cta: "Ir a Configuración",
    },
    {
      done: hasPublishedAny,
      title: "Publica tu primer artículo",
      description:
        "Pega al menos un título y deja que Auto Artículos lo publique por ti.",
      href: "/dashboard/publicar",
      cta: "Ir a Publicar",
    },
  ];

  const allDone = steps.every((s) => s.done);

  if (allDone) {
    return (
      <details style={{ ...sectionStyle, padding: "12px 20px" }}>
        <summary
          style={{
            cursor: "pointer",
            fontSize: 13,
            color: "#1e8a4b",
            fontWeight: 600,
          }}
        >
          ✓ Ya completaste los primeros pasos — haz clic para revisarlos
        </summary>
        <div style={{ marginTop: 12 }}>
          <OnboardingSteps steps={steps} />
        </div>
      </details>
    );
  }

  return (
    <section style={sectionStyle}>
      <h2 style={h2Style}>¡Bienvenido a Auto Artículos! 👋</h2>
      <p style={{ fontSize: 13, color: "#6b7280", marginTop: -6 }}>
        Estos son los primeros pasos para dejar todo listo. Puedes volver a esta
        lista cuando quieras si te pierdes en el camino.
      </p>
      <OnboardingSteps steps={steps} />
    </section>
  );
}

function OnboardingSteps({
  steps,
}: {
  steps: {
    done: boolean;
    title: string;
    description: string;
    href: string;
    cta: string;
  }[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {steps.map((step, index) => (
        <div
          key={step.title}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "10px 14px",
            borderRadius: 8,
            background: step.done ? "#f3fbf6" : "#f7f8fa",
            border: step.done ? "1px solid #a8dfc0" : "1px solid #dfe3e8",
          }}
        >
          <span
            style={{
              fontSize: 18,
              lineHeight: "22px",
              flexShrink: 0,
            }}
          >
            {step.done ? "✅" : `${index + 1}.`}
          </span>
          <div style={{ flex: 1 }}>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 600,
                color: step.done ? "#1e8a4b" : "#16181d",
              }}
            >
              {step.title}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>
              {step.description}
            </p>
            {!step.done && (
              <Link
                href={step.href}
                style={{
                  display: "inline-block",
                  marginTop: 8,
                  fontSize: 12,
                  color: "#2f5fdb",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                {step.cta} →
              </Link>
            )}
          </div>
        </div>
      ))}
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
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            {doneCount}/{total} completados —{" "}
            <strong style={{ color: "#16181d" }}>{percent}%</strong>
          </span>
          {confirmingCancel ? (
            <>
              <span style={{ fontSize: 12, color: "#8a6d1a" }}>
                ¿Cancelar todo el lote?
              </span>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                style={{
                  background: "#fde8e8",
                  color: "#d64545",
                  border: "1px solid #e8b4b4",
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
                  color: "#6b7280",
                  border: "1px solid #dfe3e8",
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
                color: "#d64545",
                border: "1px solid #fde8e8",
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
        <p style={{ fontSize: 12, color: "#d64545", margin: "6px 0 0" }}>
          {cancelError}
        </p>
      )}
      {nothingStartedYet && (
        <p
          style={{
            fontSize: 13,
            color: "#8a6d1a",
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
              border: "2px solid #f5e6c8",
              borderTopColor: "#8a6d1a",
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
          background: "#f7f8fa",
          borderRadius: 999,
          overflow: "hidden",
          margin: "10px 0 16px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percent}%`,
            background: "#2f5fdb",
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

  // El log completo (con imágenes de diagnóstico) se trae bajo demanda, no
  // en cada poll: ver el comentario en /api/runs/route.ts sobre el consumo
  // de transferencia de datos que esto evita.
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
    <div
      style={{
        background: "#f7f8fa",
        border: "1px solid #dfe3e8",
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
              color: "#6b7280",
              marginBottom: 3,
            }}
          >
            {lastStep && <span>{lastStep}</span>}
            <span style={{ marginLeft: "auto" }}>{titlePercent}%</span>
          </div>
          <div
            style={{
              height: 5,
              background: "#e9ecf1",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${titlePercent}%`,
                background: "#8a6d1a",
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
              color: "#1e8a4b",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            🔗 Ver artículo publicado
          </a>
          {title.finalTitle && title.finalTitle !== title.text && (
            <span style={{ display: "block", fontSize: 11, color: "#6b7280" }}>
              Publicado como: {title.finalTitle}
            </span>
          )}
        </p>
      )}

      {title.status === "error" && title.errorMessage && (
        <p style={{ margin: "6px 0 0 24px", fontSize: 13, color: "#d64545" }}>
          {title.errorMessage}
        </p>
      )}

      {title.attempts > 0 && (
        <details
          style={{ marginTop: 8, marginLeft: 24 }}
          onToggle={(e) => {
            if ((e.target as HTMLDetailsElement).open && !fullEvents) {
              loadFullEvents();
            }
          }}
        >
          <summary
            style={{ cursor: "pointer", fontSize: 11, color: "#6b7280" }}
          >
            Ver todos los pasos
          </summary>
          {loadingEvents && !fullEvents && (
            <p style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
              Cargando...
            </p>
          )}
          {fullEvents && (
            <ol
              style={{
                marginTop: 6,
                paddingLeft: 16,
                fontSize: 11,
                color: "#374151",
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
                    <span style={{ color: "#6b7280" }}>
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
                            border: "1px solid #dfe3e8",
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
