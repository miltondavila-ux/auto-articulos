"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  buttonStyle,
  disabledStyle,
  h2Style,
  secondaryButtonStyle,
  sectionStyle,
} from "@/components/dashboard-ui";

interface OpportunityTitle {
  id: string;
  text: string;
  rationale: string | null;
}

interface OpportunityGroup {
  id: string;
  rationale: string | null;
  impressions: number;
  clicks: number;
  category: { id: string; name: string };
  titles: OpportunityTitle[];
}

const DEFAULT_MAX_TITLES_PER_BATCH = 20;

export default function OportunidadesPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<OpportunityGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisSeconds, setAnalysisSeconds] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [maxTitlesPerBatch, setMaxTitlesPerBatch] = useState(
    DEFAULT_MAX_TITLES_PER_BATCH,
  );
  const [message, setMessage] = useState<{
    error: boolean;
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    const [opportunitiesResponse, meResponse] = await Promise.all([
      fetch("/api/opportunities", { cache: "no-store" }),
      fetch("/api/me", { cache: "no-store" }),
    ]);
    const data = await opportunitiesResponse.json().catch(() => ({}));
    if (opportunitiesResponse.ok) setGroups(data.groups ?? []);
    if (meResponse.ok) {
      const me = await meResponse.json();
      if (
        typeof me.maxTitlesPerBatch === "number" &&
        me.maxTitlesPerBatch >= 1
      ) {
        setMaxTitlesPerBatch(me.maxTitlesPerBatch);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!analyzing) return;
    setAnalysisSeconds(0);
    const timer = window.setInterval(
      () => setAnalysisSeconds((seconds) => seconds + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [analyzing]);

  const analysisStages = [
    "Consultando datos de Search Console",
    "Comparando impresiones y tendencias",
    "Creando oportunidades long tail",
    "Validando duplicados y canibalización",
  ];
  const currentStage = Math.min(
    analysisStages.length - 1,
    Math.floor(analysisSeconds / 7),
  );
  const analysisProgress = Math.min(92, 8 + analysisSeconds * 3);
  const elapsedTime = `${Math.floor(analysisSeconds / 60)}:${String(
    analysisSeconds % 60,
  ).padStart(2, "0")}`;

  async function analyze() {
    setAnalyzing(true);
    setMessage(null);
    try {
      const response = await fetch("/api/opportunities", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error ?? "No se pudo completar el análisis.");
      setGroups(data.groups ?? []);
      setMessage({
        error: false,
        text: "Análisis completado con datos de Search Console.",
      });
    } catch (error) {
      setMessage({
        error: true,
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setAnalyzing(false);
    }
  }

  async function remove(kind: "groups" | "titles", id: string) {
    setBusyId(id);
    setMessage(null);
    const response = await fetch(`/api/opportunities/${kind}/${id}`, {
      method: "DELETE",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      setMessage({ error: true, text: data.error ?? "No se pudo eliminar." });
    await load();
    setBusyId(null);
  }

  async function execute(type: "group" | "title", id: string) {
    setBusyId(id);
    setMessage(null);
    const response = await fetch("/api/opportunities/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage({ error: true, text: data.error ?? "No se pudo ejecutar." });
      setBusyId(null);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <section style={sectionStyle}>
        <h2 style={h2Style}>Oportunidades SEO</h2>
        <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.55 }}>
          Analiza impresiones, tendencias, posiciones, consultas y páginas de tu
          propiedad de Google Search Console. El sistema selecciona hasta 10
          categorías y crea 9 oportunidades long tail únicas para cada una,
          evitando duplicados y canibalización.
        </p>
        <button
          onClick={analyze}
          disabled={analyzing}
          style={disabledStyle(buttonStyle, analyzing)}
        >
          {analyzing
            ? "Analizando Search Console..."
            : groups.length
              ? "Actualizar análisis"
              : "Analizar oportunidades"}
        </button>
        {analyzing && (
          <div
            role="status"
            aria-live="polite"
            style={{
              marginTop: 16,
              padding: 16,
              border: "1px solid #b8caf7",
              borderRadius: 10,
              background: "#f3f6ff",
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
              <strong style={{ fontSize: 14, color: "#24458f" }}>
                {analysisStages[currentStage]}
              </strong>
              <span
                style={{
                  minWidth: 52,
                  textAlign: "center",
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: "#dfe8ff",
                  color: "#24458f",
                  fontSize: 12,
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 700,
                }}
              >
                {elapsedTime}
              </span>
            </div>
            <div
              aria-hidden="true"
              style={{
                height: 8,
                borderRadius: 999,
                background: "#dfe5f2",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${analysisProgress}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: "linear-gradient(90deg, #2f5fdb, #4dd8e8)",
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
              {analysisStages.map((stage, index) => (
                <div
                  key={stage}
                  style={{
                    display: "flex",
                    gap: 7,
                    alignItems: "flex-start",
                    color: index <= currentStage ? "#24458f" : "#8a94a6",
                    fontSize: 11,
                    fontWeight: index === currentStage ? 700 : 500,
                  }}
                >
                  <span aria-hidden="true">
                    {index < currentStage
                      ? "✓"
                      : index === currentStage
                        ? "●"
                        : "○"}
                  </span>
                  <span>{stage}</span>
                </div>
              ))}
            </div>
            <p style={{ margin: "12px 0 0", color: "#5e6b83", fontSize: 12 }}>
              El tiempo depende de la cantidad de datos. No cierres esta página
              mientras termina el análisis.
            </p>
          </div>
        )}
        <p style={{ color: "#6b7280", fontSize: 12 }}>
          Necesitas tener Google conectado, una propiedad elegida y categorías
          sincronizadas en{" "}
          <Link href="/dashboard/configuracion" style={{ color: "#2f5fdb" }}>
            Configuración
          </Link>
          .
        </p>
        <p style={{ color: "#6b7280", fontSize: 12 }}>
          Tu máximo permitido es de {maxTitlesPerBatch} títulos por lote.
        </p>
      </section>

      {message && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            background: message.error ? "#fdecec" : "#eafaf0",
            color: message.error ? "#d64545" : "#1e8a4b",
          }}
        >
          {message.text}
        </div>
      )}

      {loading && <p style={{ color: "#a8b3c7" }}>Cargando oportunidades...</p>}
      {!loading && groups.length === 0 && (
        <section style={sectionStyle}>
          <p style={{ margin: 0, color: "#6b7280" }}>
            Todavía no hay oportunidades guardadas. Presiona el botón para crear
            el primer análisis.
          </p>
        </section>
      )}

      {groups.map((group) => (
        <section key={group.id} style={sectionStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={{ ...h2Style, marginBottom: 6 }}>
                {group.category.name}
              </h2>
              <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>
                {group.rationale}
              </p>
              <p style={{ color: "#526077", fontSize: 12 }}>
                {Math.round(group.impressions).toLocaleString("es-US")}{" "}
                impresiones · {Math.round(group.clicks).toLocaleString("es-US")}{" "}
                clics
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => execute("group", group.id)}
                disabled={
                  busyId !== null || group.titles.length > maxTitlesPerBatch
                }
                title={
                  group.titles.length > maxTitlesPerBatch
                    ? `Esta categoría supera tu máximo de ${maxTitlesPerBatch} títulos por lote.`
                    : undefined
                }
                style={disabledStyle(
                  { ...buttonStyle, marginTop: 0 },
                  busyId !== null || group.titles.length > maxTitlesPerBatch,
                )}
              >
                {group.titles.length > maxTitlesPerBatch
                  ? `Supera el máximo (${group.titles.length}/${maxTitlesPerBatch})`
                  : `Ejecutar categoría (${group.titles.length})`}
              </button>
              <button
                onClick={() => remove("groups", group.id)}
                disabled={busyId !== null}
                style={disabledStyle(secondaryButtonStyle, busyId !== null)}
              >
                Eliminar categoría
              </button>
            </div>
          </div>
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {group.titles.map((title, index) => (
              <div
                key={title.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                  padding: 12,
                  border: "1px solid #e5e8ec",
                  borderRadius: 9,
                  background: "#f8fafc",
                }}
              >
                <div>
                  <strong style={{ fontSize: 14 }}>
                    {index + 1}. {title.text}
                  </strong>
                  {title.rationale && (
                    <div
                      style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}
                    >
                      {title.rationale}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => execute("title", title.id)}
                    disabled={busyId !== null}
                    style={disabledStyle(
                      { ...secondaryButtonStyle, color: "#2f5fdb" },
                      busyId !== null,
                    )}
                  >
                    Ejecutar
                  </button>
                  <button
                    onClick={() => remove("titles", title.id)}
                    disabled={busyId !== null}
                    style={disabledStyle(
                      { ...secondaryButtonStyle, color: "#d64545" },
                      busyId !== null,
                    )}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
