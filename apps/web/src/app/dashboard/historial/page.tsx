"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import ModuleIntro, { IntroP, Modulo } from "@/components/ModuleIntro";
import { useRouter } from "next/navigation";
import {
  sectionStyle,
  h2Style,
  thStyle,
  tdStyle,
  statusLabel,
  runStatusLabel,
  secondaryButtonStyle,
  buttonStyle,
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

  // Pedido directo de Milton (30/8/2026): los títulos que no se publican
  // porque ya existe un artículo igual (o muy parecido) en 10minutesWebsite
  // nunca van a lograrlo reintentando el mismo tema — se agrupan aparte,
  // con nombre propio, en vez de mezclarse con errores normales.
  const duplicateTitles = useMemo(() => {
    const items: TitleRow[] = [];
    for (const run of runs) {
      for (const title of run.titles) {
        if (title.errorMessage?.includes("ya existe un artículo")) {
          items.push(title);
        }
      }
    }
    return items;
  }, [runs]);

  // Pedido directo de Milton (30/8/2026): las ejecuciones sin publicación
  // confirmada (canceladas, con error, o atascadas) vivían adentro de
  // "Artículos publicados" — confuso, porque justamente no se publicó
  // nada. Se separan en su propia sección, fuera del conteo/panel de
  // publicados.
  const runsByPublicationDay = useMemo(() => {
    const map = new Map<string, RunRow[]>();
    for (const run of runs) {
      const publicationAt = latestPublicationAt(run.titles);
      if (!publicationAt) continue;
      const dayKey = localDayKey(publicationAt);
      if (!map.has(dayKey)) map.set(dayKey, []);
      map.get(dayKey)!.push(run);
    }
    return Array.from(map.entries()).sort(([dayA], [dayB]) =>
      dayB.localeCompare(dayA),
    );
  }, [runs]);

  const unconfirmedRuns = useMemo(
    () => runs.filter((run) => !latestPublicationAt(run.titles)),
    [runs],
  );
  const publishedRunsCount = runs.length - unconfirmedRuns.length;

  return (
    <>
      {duplicateTitles.length > 0 && (
        <DuplicateTitlesSection items={duplicateTitles} />
      )}
      <details className="panel" style={sectionStyle}>
      <summary
        style={{
          cursor: "pointer",
          listStyle: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          userSelect: "none",
        }}
      >
        <div>
          <p className="eyebrow" style={{ margin: "0 0 2px" }}>Registro</p>
          <h2 style={{ ...h2Style, margin: 0 }}>Artículos publicados</h2>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>
          {publishedRunsCount} ejecución{publishedRunsCount !== 1 ? "es" : ""}
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
        {publishedRunsCount === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>
            Aún no hay ejecuciones publicadas en el historial.
          </p>
        ) : (
          runsByPublicationDay.map(([dayKey, dayRuns]) => (
            <PublicationDayGroup
              key={dayKey}
              dayKey={dayKey}
              runs={dayRuns}
              onRetried={loadRuns}
            />
          ))
        )}
      </div>
      </details>
      {unconfirmedRuns.length > 0 && (
        <details className="panel" style={{ ...sectionStyle, borderColor: "#ffd8a8" }}>
          <summary
            style={{
              cursor: "pointer",
              listStyle: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
              userSelect: "none",
            }}
          >
            <div>
              <p className="eyebrow" style={{ margin: "0 0 2px", color: "#8a4b08" }}>
                Sin publicar
              </p>
              <h2 style={{ ...h2Style, margin: 0 }}>
                Ejecuciones sin publicación confirmada
              </h2>
            </div>
            <span className="muted" style={{ fontSize: 13 }}>
              {unconfirmedRuns.length} ejecución
              {unconfirmedRuns.length !== 1 ? "es" : ""}
            </span>
          </summary>
          <div style={{ marginTop: 14 }}>
            <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
              Canceladas, con error, o sin ningún título publicado todavía.
              Desde aquí puedes reintentarlas.
            </p>
            <PublicationDayGroup
              dayKey="no-confirmada"
              runs={unconfirmedRuns}
              onRetried={loadRuns}
            />
          </div>
        </details>
      )}
    </>
  );
}

/**
 * Sección propia, separada de "Artículos publicados", para títulos que
 * chocaron contra un artículo ya existente en 10minutesWebsite. Reintentar
 * no los va a resolver (mismo tema, título parecido, mismo choque), así que
 * no se mezclan con errores normales — se muestran con nombre propio y los
 * enlaces reales a lo que ya existe, tal como pidió Milton.
 */
function DuplicateTitlesSection({ items }: { items: TitleRow[] }) {
  // Pedido directo de Milton (30/8/2026): que también diga "Hoy", "Ayer",
  // etc. para ubicarse en el tiempo, igual que la lista principal de
  // Historial — se reutilizan los mismos helpers (localDayKey,
  // publicationDayLabel) en vez de inventar un formato nuevo.
  const groups = useMemo(() => {
    const map = new Map<string, TitleRow[]>();
    for (const title of items) {
      const dayKey = title.processedAt
        ? localDayKey(title.processedAt)
        : "no-confirmada";
      if (!map.has(dayKey)) map.set(dayKey, []);
      map.get(dayKey)!.push(title);
    }
    return Array.from(map.entries()).sort(([dayA], [dayB]) => {
      if (dayA === "no-confirmada") return 1;
      if (dayB === "no-confirmada") return -1;
      return dayB.localeCompare(dayA);
    });
  }, [items]);

  return (
    <details className="panel" style={{ ...sectionStyle, borderColor: "#ffd8a8" }}>
      <summary
        style={{
          cursor: "pointer",
          listStyle: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          userSelect: "none",
        }}
      >
        <div>
          <p className="eyebrow" style={{ margin: "0 0 2px", color: "#8a4b08" }}>
            No se publicarán
          </p>
          <h2 style={{ ...h2Style, margin: 0 }}>
            Artículos repetidos que no se publicarán
          </h2>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>
          {items.length} título{items.length !== 1 ? "s" : ""}
        </span>
      </summary>
      <div style={{ marginTop: 14 }}>
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Estos títulos ya existen (o son muy parecidos a uno que ya existe)
          en 10minutesWebsite. Reintentarlos con el mismo tema no los va a
          publicar — usa un título o tema distinto.
        </p>
        {groups.map(([dayKey, dayItems]) => (
          <div key={dayKey} style={{ marginBottom: 14 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#8a4b08",
                margin: "0 0 8px",
                textTransform: "uppercase",
                letterSpacing: "0.02em",
              }}
            >
              {publicationDayLabel(dayKey)}
            </p>
            {dayItems.map((title) => (
              <div
                key={title.id}
                style={{
                  padding: 12,
                  marginBottom: 8,
                  border: "1px solid #ffd8a8",
                  borderRadius: 10,
                  background: "#fff8ef",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <strong style={{ fontSize: 13, wordBreak: "break-word" }}>
                    {title.text}
                  </strong>
                  {title.processedAt && (
                    <span style={{ fontSize: 11, color: "#8a4b08" }}>
                      {formatDateTime(title.processedAt)}
                    </span>
                  )}
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "#6e6e73",
                    margin: "4px 0 0",
                    wordBreak: "break-word",
                  }}
                >
                  {linkifyMessage(title.errorMessage ?? "")}
                </p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </details>
  );
}

function linkifyMessage(message: string) {
  const parts = message.split(/(https?:\/\/\S+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer">
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function PublicationDayGroup({
  dayKey,
  runs,
  onRetried,
}: {
  dayKey: string;
  runs: RunRow[];
  onRetried: () => void;
}) {
  const totalSuccess = runs.reduce(
    (acc, r) => acc + r.titles.filter((t) => t.status === "success").length,
    0,
  );
  const totalTitles = runs.reduce((acc, r) => acc + r.titles.length, 0);
  const orderedRuns = [...runs].sort((a, b) => {
    const aDate = latestPublicationAt(a.titles) ?? a.createdAt;
    const bDate = latestPublicationAt(b.titles) ?? b.createdAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

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
          flexWrap: "wrap",
          padding: "12px 16px",
          userSelect: "none",
        }}
      >
        <span>{publicationDayLabel(dayKey)}</span>
        <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
          — {runs.length} ejecución{runs.length !== 1 ? "es" : ""} ({totalSuccess}/{totalTitles} publicados)
        </span>
      </summary>
      <div style={{ padding: "0 16px 16px 16px" }}>
        {orderedRuns.map((run) => (
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
  progressPercent?: number | null;
  // Imagen y prompt exactos usados cuando la publicación usó el generador
  // de imágenes con IA — pedido explícito de Milton (22/8/2026) para ver
  // esto en el histórico sin tener que revisar los logs de GitHub Actions.
  imageUrl: string | null;
  aiImagePrompt: string | null;
}

function HistorialRedes() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<SocialOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletingHistory, setDeletingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socialEvents, setSocialEvents] = useState<Record<string, TitleEventRow[]>>({});
  const [loadingSocialEvent, setLoadingSocialEvent] = useState<string | null>(null);
  const [retryingOppId, setRetryingOppId] = useState<string | null>(null);
  const [retryErrors, setRetryErrors] = useState<Record<string, string>>({});

  // Mismo estándar que Artículos: agrupado por día usando los mismos
  // helpers (localDayKey, publicationDayLabel) en vez de inventar un
  // formato nuevo. La fecha usada por fila es la misma que ya se mostraba:
  // publishedAt || finishedAt || createdAt.
  function groupOpportunitiesByDay(list: SocialOpportunity[]): [string, SocialOpportunity[]][] {
    const map = new Map<string, SocialOpportunity[]>();
    for (const opp of list) {
      const at = opp.publishedAt || opp.finishedAt || opp.createdAt;
      const dayKey = localDayKey(at);
      if (!map.has(dayKey)) map.set(dayKey, []);
      map.get(dayKey)!.push(opp);
    }
    return Array.from(map.entries())
      .sort(([dayA], [dayB]) => dayB.localeCompare(dayA))
      .map(([dayKey, dayOpps]) => [
        dayKey,
        [...dayOpps].sort((a, b) => {
          const aAt = a.publishedAt || a.finishedAt || a.createdAt;
          const bAt = b.publishedAt || b.finishedAt || b.createdAt;
          return new Date(bAt).getTime() - new Date(aAt).getTime();
        }),
      ] as [string, SocialOpportunity[]]);
  }

  // Mismo estándar que Artículos: "Publicadas" solo cuenta lo que de verdad
  // se publicó; lo demás (error, en cola, procesando) va en su propia
  // sección "Sin publicar" (misma idea que "Ejecuciones sin publicación
  // confirmada" en Artículos), para no mezclar publicaciones reales con
  // intentos fallidos/pendientes en el mismo conteo.
  const publishedOpportunities = useMemo(
    () => opportunities.filter((o) => o.status === "published"),
    [opportunities],
  );
  // "skipped" = el usuario la descartó con el botón "Descartar" — no es un
  // error ni algo pendiente de resolver, es una decisión deliberada. Se
  // separa en su propia sección, igual que "Publicadas" y "Sin confirmar",
  // en vez de mezclarla con errores/en cola/procesando.
  const skippedOpportunities = useMemo(
    () => opportunities.filter((o) => o.status === "skipped"),
    [opportunities],
  );
  const unconfirmedOpportunities = useMemo(
    () => opportunities.filter((o) => o.status !== "published" && o.status !== "skipped"),
    [opportunities],
  );
  const opportunitiesByDay = useMemo(
    () => groupOpportunitiesByDay(publishedOpportunities),
    [publishedOpportunities],
  );
  const skippedByDay = useMemo(
    () => groupOpportunitiesByDay(skippedOpportunities),
    [skippedOpportunities],
  );
  const unconfirmedByDay = useMemo(
    () => groupOpportunitiesByDay(unconfirmedOpportunities),
    [unconfirmedOpportunities],
  );

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

  async function handleRetryOpportunity(id: string) {
    setRetryingOppId(id);
    setRetryErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      const res = await fetch("/api/social-opportunities/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/dashboard/publicaciones-en-curso");
      } else {
        // El mensaje va junto al botón que se clickeó, no arriba de la
        // página — Milton reportó que ahí arriba pasaba desapercibido.
        setRetryErrors((prev) => ({ ...prev, [id]: data.error || "No se pudo reintentar la publicación." }));
      }
    } catch (err: any) {
      setRetryErrors((prev) => ({ ...prev, [id]: err.message }));
    } finally {
      setRetryingOppId(null);
    }
  }

  // Reintento en lote — pedido explícito de Milton (30/8/2026) para no
  // tener que clickear "Reintentar" una por una en Sin confirmar y
  // Descartadas. Mismo patrón que handlePublishAll en Oportunidades: llama
  // al mismo endpoint una por una (no en paralelo, para no saturar el
  // trigger del worker) y navega a Publicaciones en Curso al terminar.
  const [batchRetryingKey, setBatchRetryingKey] = useState<string | null>(null);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);

  async function handleRetryBatch(key: string, ids: string[]) {
    if (ids.length === 0) return;
    setBatchRetryingKey(key);
    setBatchMessage(`Publicando ${ids.length} publicación${ids.length !== 1 ? "es" : ""}...`);
    let successCount = 0;
    let failCount = 0;
    for (const id of ids) {
      try {
        const res = await fetch("/api/social-opportunities/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (res.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }
    setBatchMessage(`Listo: ${successCount} encoladas para publicar, ${failCount} no se pudieron encolar.`);
    setBatchRetryingKey(null);
    if (successCount > 0) {
      router.push("/dashboard/publicaciones-en-curso");
    } else {
      loadOpportunities();
    }
  }

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
    <>
    <details open={false} className="panel" style={sectionStyle}>
      <summary
        style={{
          cursor: "pointer",
          listStyle: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
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
            {publishedOpportunities.length} publicación{publishedOpportunities.length !== 1 ? "es" : ""}
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
            {publishedOpportunities.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>
                Aún no hay publicaciones en el historial.
              </p>
            ) : (
              opportunitiesByDay.map(([dayKey, dayOpps]) => (
                <details
                  key={dayKey}
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
                    <span>{publicationDayLabel(dayKey)}</span>
                    <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                      — {dayOpps.length} publicación{dayOpps.length !== 1 ? "es" : ""}
                    </span>
                  </summary>
                  <div style={{ padding: "0 16px 16px 16px", display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                {dayOpps.map((opp) => (
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
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {opp.status === "published" ? (
                          <span style={{ color: "#16803c", fontWeight: 600, fontSize: 12 }}>✓ Publicado</span>
                        ) : opp.status === "processing" ? (
                          <span style={{ color: "#1d1d1f", fontWeight: 600, fontSize: 12 }}>
                            Procesando...{opp.progressPercent ? ` (${opp.progressPercent}%)` : ""}
                          </span>
                        ) : opp.status === "queued" ? (
                          <span style={{ color: "#8a4b08", fontWeight: 600, fontSize: 12 }}>En cola</span>
                        ) : (
                          <>
                            <span style={{ color: opp.status === "skipped" ? "#6e6e73" : "#ff3b30", fontWeight: 600, fontSize: 12 }}>
                              {opp.status === "skipped" ? "Descartada" : "✕ Error"}
                            </span>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRetryOpportunity(opp.id);
                              }}
                              disabled={retryingOppId === opp.id}
                              className="secondary"
                              style={{
                                ...secondaryButtonStyle,
                                padding: "3px 10px",
                                fontSize: 11,
                              }}
                            >
                              {retryingOppId === opp.id ? "Reintentando..." : "Reintentar"}
                            </button>
                          </>
                        )}
                        {retryErrors[opp.id] && (
                          <span style={{ color: "#ff3b30", fontSize: 11, flexBasis: "100%" }}>
                            {retryErrors[opp.id]}
                          </span>
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
                </details>
              ))
            )}
          </>
        )}
      </div>
    </details>
    {skippedOpportunities.length > 0 && (
      <details className="panel" style={{ ...sectionStyle, borderColor: "#d5d5db" }}>
        <summary
          style={{
            cursor: "pointer",
            listStyle: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            userSelect: "none",
          }}
        >
          <div>
            <p className="eyebrow" style={{ margin: "0 0 2px", color: "#6e6e73" }}>
              Descartadas
            </p>
            <h2 style={{ ...h2Style, margin: 0 }}>
              Publicaciones en redes descartadas
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="muted" style={{ fontSize: 13 }}>
              {skippedOpportunities.length} publicación{skippedOpportunities.length !== 1 ? "es" : ""}
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRetryBatch("skipped-all", skippedOpportunities.map((o) => o.id));
              }}
              disabled={batchRetryingKey === "skipped-all"}
              style={{ ...buttonStyle, marginTop: 0, minHeight: 40, padding: "9px 18px", borderRadius: 20, fontSize: 13, whiteSpace: "nowrap" }}
            >
              {batchRetryingKey === "skipped-all" ? "Publicando..." : "Publicar todo el lote"}
            </button>
          </div>
        </summary>
        <div style={{ marginTop: 14 }}>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            Descartadas a propósito con el botón "Descartar" en Oportunidades.
            Si cambias de opinión, puedes reintentarlas desde aquí.
          </p>
          {batchMessage && (
            <p style={{ fontSize: 12, color: "#8a4b08", marginBottom: 12 }}>{batchMessage}</p>
          )}
          {skippedByDay.map(([dayKey, dayOpps]) => (
            <details
              key={dayKey}
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
                <span>{publicationDayLabel(dayKey)}</span>
                <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                  — {dayOpps.length} publicación{dayOpps.length !== 1 ? "es" : ""}
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRetryBatch(`skipped-${dayKey}`, dayOpps.map((o) => o.id));
                  }}
                  disabled={batchRetryingKey === `skipped-${dayKey}`}
                  style={{ ...buttonStyle, marginLeft: "auto", marginTop: 0, padding: "7px 14px", fontSize: 12, whiteSpace: "nowrap" }}
                >
                  {batchRetryingKey === `skipped-${dayKey}` ? "Publicando..." : "Publicar este día"}
                </button>
              </summary>
              <div style={{ padding: "0 16px 16px 16px", display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            {dayOpps.map((opp) => (
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#6e6e73", fontWeight: 600, fontSize: 12 }}>Descartada</span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRetryOpportunity(opp.id);
                      }}
                      disabled={retryingOppId === opp.id}
                      className="secondary"
                      style={{
                        ...secondaryButtonStyle,
                        padding: "3px 10px",
                        fontSize: 11,
                      }}
                    >
                      {retryingOppId === opp.id ? "Reintentando..." : "Reintentar"}
                    </button>
                    {retryErrors[opp.id] && (
                      <span style={{ color: "#ff3b30", fontSize: 11, flexBasis: "100%" }}>
                        {retryErrors[opp.id]}
                      </span>
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
                  <a
                    href={opp.articleUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="link-button"
                    style={{ fontSize: 12 }}
                  >
                    Ver artículo original &rarr;
                  </a>
                </div>
              </details>
            ))}
              </div>
            </details>
          ))}
        </div>
      </details>
    )}
    {unconfirmedOpportunities.length > 0 && (
      <details className="panel" style={{ ...sectionStyle, borderColor: "#ffd8a8" }}>
        <summary
          style={{
            cursor: "pointer",
            listStyle: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            userSelect: "none",
          }}
        >
          <div>
            <p className="eyebrow" style={{ margin: "0 0 2px", color: "#8a4b08" }}>
              Sin publicar
            </p>
            <h2 style={{ ...h2Style, margin: 0 }}>
              Publicaciones en redes sin confirmar
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="muted" style={{ fontSize: 13 }}>
              {unconfirmedOpportunities.length} publicación{unconfirmedOpportunities.length !== 1 ? "es" : ""}
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRetryBatch("unconfirmed-all", unconfirmedOpportunities.map((o) => o.id));
              }}
              disabled={batchRetryingKey === "unconfirmed-all"}
              style={{ ...buttonStyle, marginTop: 0, minHeight: 40, padding: "9px 18px", borderRadius: 20, fontSize: 13, whiteSpace: "nowrap" }}
            >
              {batchRetryingKey === "unconfirmed-all" ? "Publicando..." : "Publicar todo el lote"}
            </button>
          </div>
        </summary>
        <div style={{ marginTop: 14 }}>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            Con error, en cola, o procesándose todavía. Desde aquí puedes
            reintentarlas cuando corresponda.
          </p>
          {batchMessage && (
            <p style={{ fontSize: 12, color: "#8a4b08", marginBottom: 12 }}>{batchMessage}</p>
          )}
          {unconfirmedByDay.map(([dayKey, dayOpps]) => (
            <details
              key={dayKey}
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
                <span>{publicationDayLabel(dayKey)}</span>
                <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                  — {dayOpps.length} publicación{dayOpps.length !== 1 ? "es" : ""}
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRetryBatch(`unconfirmed-${dayKey}`, dayOpps.map((o) => o.id));
                  }}
                  disabled={batchRetryingKey === `unconfirmed-${dayKey}`}
                  style={{ ...buttonStyle, marginLeft: "auto", marginTop: 0, padding: "7px 14px", fontSize: 12, whiteSpace: "nowrap" }}
                >
                  {batchRetryingKey === `unconfirmed-${dayKey}` ? "Publicando..." : "Publicar este día"}
                </button>
              </summary>
              <div style={{ padding: "0 16px 16px 16px", display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            {dayOpps.map((opp) => (
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {opp.status === "processing" ? (
                      <span style={{ color: "#1d1d1f", fontWeight: 600, fontSize: 12 }}>
                        Procesando...{opp.progressPercent ? ` (${opp.progressPercent}%)` : ""}
                      </span>
                    ) : opp.status === "queued" ? (
                      <span style={{ color: "#8a4b08", fontWeight: 600, fontSize: 12 }}>En cola</span>
                    ) : (
                      <>
                        <span style={{ color: "#ff3b30", fontWeight: 600, fontSize: 12 }}>✕ Error</span>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRetryOpportunity(opp.id);
                          }}
                          disabled={retryingOppId === opp.id}
                          className="secondary"
                          style={{
                            ...secondaryButtonStyle,
                            padding: "3px 10px",
                            fontSize: 11,
                          }}
                        >
                          {retryingOppId === opp.id ? "Reintentando..." : "Reintentar"}
                        </button>
                      </>
                    )}
                    {retryErrors[opp.id] && (
                      <span style={{ color: "#ff3b30", fontSize: 11, flexBasis: "100%" }}>
                        {retryErrors[opp.id]}
                      </span>
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
                  </div>
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
            </details>
          ))}
        </div>
      </details>
    )}
    </>
  );
}

function HistoryEntry({
  run,
  onRetried,
}: {
  run: RunRow;
  onRetried: () => void;
}) {
  const router = useRouter();
  const successCount = run.titles.filter((t) => t.status === "success").length;
  // Pedido directo de Milton (30/8/2026): un run cancelado por el propio
  // usuario no mostraba el botón de reintentar en ningún lado, aunque los
  // títulos cancelados siguen ahí y ahora sí se pueden retomar.
  const hasErrors = run.status === "halted" || run.status === "cancelled";
  const publicationAt = latestPublicationAt(run.titles);
  const [retrying, setRetrying] = useState(false);

  async function handleRetryRun(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setRetrying(true);
    try {
      const response = await fetch(`/api/runs/${run.id}/retry`, { method: "POST" });
      if (!response.ok) {
        throw new Error("No se pudo iniciar el reintento.");
      }
      onRetried();
      router.push("/dashboard/publicaciones-en-curso");
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
          Creación: {formatDateTime(run.createdAt, false)}
        </span>
        <span className="muted">|</span>
        <span style={{ color: "#1d1d1f", fontWeight: 600 }}>
          Publicación: {publicationAt
            ? `${formatDateTime(publicationAt, false)}${successCount < run.titles.length ? " (parcial)" : ""}`
            : "Pendiente"}
        </span>
        <span className="muted">
          — {successCount}/{run.titles.length} publicados
        </span>
        <span className="muted">
          — Categoría: {run.category?.name ?? "Sin categoría"}
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

function formatDateTime(value: string, includeSeconds = true) {
  return new Date(value).toLocaleString("es-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" } : {}),
  });
}

function localDayKey(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function publicationDayLabel(dayKey: string) {
  if (dayKey === "no-confirmada") return "Sin publicación confirmada";

  const today = localDayKey(new Date().toISOString());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDayKey(yesterdayDate.toISOString());
  if (dayKey === today) return "Hoy";
  if (dayKey === yesterday) return "Ayer";

  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function latestPublicationAt(titles: TitleRow[]) {
  return titles.reduce<string | null>((latest, title) => {
    const value = title.publishedAt ?? (
      title.status === "success" ? title.processedAt : null
    );
    if (!value) return latest;
    if (!latest || new Date(value).getTime() > new Date(latest).getTime()) {
      return value;
    }
    return latest;
  }, null);
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
