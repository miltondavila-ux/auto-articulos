"use client";

import { useCallback, useEffect, useState } from "react";
import { buttonStyle, disabledStyle, inputStyle, secondaryButtonStyle } from "@/components/dashboard-ui";
import {
  INPUT_LABELS,
  INPUT_LIMITS,
  MAX_TITLES,
  type TitleGenerationInputs,
} from "@/lib/title-generation-core";

// CREACION DE PUBLICACIONES PROPIAS — formulario y caja de selección para crear
// títulos con la IA del sistema dentro de Publicaciones propias. Lo que el
// usuario escribe aquí es efímero: solo sirve para estos títulos y no se
// relaciona con Configuración → Contenido. Los títulos que se marquen se
// entregan a la pantalla (onUseTitles), que los pasa al flujo normal de
// publicación; el resto se descarta.

interface Status {
  enabled: boolean;
  used: number;
  remaining: number;
  max: number;
}

interface GenerationResult {
  titles: string[];
  partial: boolean;
}

interface Props {
  categoryId: string;
  categoryName: string;
  contentLanguage: string;
  languageLabel: string;
  /** Cupo de publicación disponible hoy (null = sin límite). */
  publishQuota: number | null;
  disabled: boolean;
  onUseTitles: (titles: string[]) => void;
}

const FIELDS: { key: keyof TitleGenerationInputs; hint: string; placeholder: string }[] = [
  { key: "clienteTipo", hint: "¿A quién le quieres escribir?", placeholder: "Ej: colombianos que viven en Colombia" },
  { key: "tema", hint: "¿Sobre qué quieres escribir en este lote?", placeholder: "Ej: propiedades en Homestead" },
  { key: "deseoCliente", hint: "La necesidad o el deseo concreto de ese cliente.", placeholder: "Ej: invertir en Estados Unidos con poco capital" },
  { key: "ubicacionClientes", hint: "Ciudades o países, separados por comas.", placeholder: "Ej: Colombia, Bogotá, Ecuador" },
  { key: "ubicacionNegocio", hint: "Ciudades o países, separados por comas.", placeholder: "Ej: Miami, Orlando, Homestead" },
];

const EMPTY_VALUES: TitleGenerationInputs = {
  clienteTipo: "",
  tema: "",
  deseoCliente: "",
  ubicacionClientes: "",
  ubicacionNegocio: "",
};

export default function AiTitleGenerator({
  categoryId,
  categoryName,
  contentLanguage,
  languageLabel,
  publishQuota,
  disabled,
  onUseTitles,
}: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [statusFailed, setStatusFailed] = useState(false);
  const [values, setValues] = useState<TitleGenerationInputs>(EMPTY_VALUES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/title-generation", { cache: "no-store" });
      if (!res.ok) throw new Error("status");
      setStatus((await res.json()) as Status);
      setStatusFailed(false);
    } catch {
      setStatusFailed(true);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const complete = FIELDS.every(({ key }) => values[key].trim().length > 0);
  const noRequestsLeft = status !== null && status.remaining <= 0;
  const blocker = !categoryId
    ? "Elige primero una categoría más arriba."
    : noRequestsLeft
      ? `Ya hiciste tus ${status?.max ?? 3} solicitudes de hoy. Vuelve mañana.`
      : !complete
        ? "Completa los cinco campos para crear los títulos."
        : null;
  const canSubmit = !disabled && !loading && status?.enabled === true && blocker === null;

  const maxSelectable = result ? Math.min(result.titles.length, publishQuota ?? Infinity) : 0;

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setResult(null);
    setSelected([]);
    try {
      const res = await fetch("/api/title-generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, contentLanguage, inputs: values }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        titles?: string[];
        partial?: boolean;
      };
      if (!res.ok || !Array.isArray(data.titles)) {
        setError(data.error ?? "No se pudieron crear los títulos. Inténtalo de nuevo.");
        return;
      }
      setResult({ titles: data.titles, partial: Boolean(data.partial) });
    } catch {
      setError("No se pudo conectar con el servidor. No se descontó ninguna solicitud; inténtalo de nuevo.");
    } finally {
      setLoading(false);
      void loadStatus();
    }
  }

  function toggle(title: string) {
    setSelected((current) => {
      if (current.includes(title)) return current.filter((t) => t !== title);
      if (current.length >= maxSelectable) return current;
      return [...current, title];
    });
  }

  function handleUse() {
    if (!result || selected.length === 0) return;
    // Respeta el orden en que la IA los propuso.
    onUseTitles(result.titles.filter((t) => selected.includes(t)));
    setResult(null);
    setSelected([]);
  }

  if (statusFailed && !status) {
    return (
      <p role="alert" style={{ fontSize: 13, color: "#ff3b30", margin: 0 }}>
        No se pudo verificar si esta función está disponible. Recarga la página e inténtalo de nuevo.
      </p>
    );
  }

  if (status && !status.enabled) {
    return (
      <p role="status" style={{ fontSize: 13, color: "#6e6e73", margin: 0 }}>
        Esta función aún no está disponible. Por ahora puedes pegar tus títulos a mano.
      </p>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "#6e6e73", margin: "0 0 12px" }}>
        Cuéntanos a quién le escribes y la IA propone hasta {MAX_TITLES} títulos para elegir. Lo que escribas aquí
        solo sirve para estos títulos; no cambia tu configuración.
      </p>

      <div
        role="status"
        style={{
          display: "inline-block",
          fontSize: 12,
          fontWeight: 600,
          padding: "5px 12px",
          borderRadius: 14,
          background: noRequestsLeft ? "#fff2f1" : "#f5f5f7",
          color: noRequestsLeft ? "#ff3b30" : "#1d1d1f",
          marginBottom: 14,
        }}
      >
        {status ? `Te quedan ${status.remaining} de ${status.max} solicitudes hoy` : "Cargando solicitudes…"}
      </div>

      <div style={{ fontSize: 13, color: "#1d1d1f", marginBottom: 14, lineHeight: 1.6 }}>
        <div>
          <strong>Categoría:</strong> {categoryName || "— (elígela más arriba)"}
        </div>
        <div>
          <strong>Idioma:</strong> {languageLabel || "el de tu configuración"}
        </div>
      </div>

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))" }}>
        {FIELDS.map(({ key, hint, placeholder }) => (
          <label key={key} style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>
            {INPUT_LABELS[key]}
            <span style={{ fontSize: 12, fontWeight: 400, color: "#6e6e73" }}>{hint}</span>
            <input
              type="text"
              value={values[key]}
              onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}
              maxLength={INPUT_LIMITS[key]}
              placeholder={placeholder}
              disabled={disabled || loading}
              style={{ ...inputStyle, width: "100%", fontWeight: 400 }}
            />
          </label>
        ))}
      </div>

      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={disabledStyle({ ...buttonStyle, marginTop: 0 }, !canSubmit)}
        >
          {loading ? "Creando títulos…" : "Crear títulos con la IA"}
        </button>
        {loading && (
          <span role="status" style={{ fontSize: 13, color: "#6e6e73" }}>
            Esto puede tardar unos segundos.
          </span>
        )}
        {!loading && blocker && (
          <span style={{ fontSize: 13, color: noRequestsLeft ? "#ff3b30" : "#6e6e73" }}>{blocker}</span>
        )}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            marginTop: 14,
            padding: "10px 14px",
            borderRadius: 10,
            background: "#fff2f1",
            border: "1px solid rgba(255, 59, 48, 0.25)",
            color: "#ff3b30",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <fieldset
          style={{
            marginTop: 18,
            padding: 16,
            border: "1px solid #d2d2d7",
            borderRadius: 14,
            background: "#fafafa",
            minWidth: 0,
          }}
        >
          <legend style={{ padding: "0 8px", fontSize: 14, fontWeight: 600, color: "#1d1d1f" }}>
            Elige los títulos que quieres publicar
          </legend>
          <p style={{ fontSize: 13, color: "#6e6e73", margin: "0 0 10px" }}>
            {maxSelectable === 0
              ? "Tu cupo de publicación de hoy es 0, así que no puedes marcar títulos ahora."
              : `Puedes marcar hasta ${maxSelectable}${
                  publishQuota !== null && publishQuota < result.titles.length ? " (es tu cupo disponible)" : ""
                }. Los que no marques se descartan y no se volverán a proponer.`}
            {result.partial && ` La IA devolvió ${result.titles.length} títulos válidos esta vez.`}
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {result.titles.map((title) => {
              const checked = selected.includes(title);
              const blockedByLimit = !checked && selected.length >= maxSelectable;
              return (
                <label
                  key={title}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: checked ? "1px solid #1d1d1f" : "1px solid #e5e5ea",
                    background: "#ffffff",
                    fontSize: 14,
                    lineHeight: 1.4,
                    color: blockedByLimit ? "#a1a1a6" : "#1d1d1f",
                    cursor: blockedByLimit ? "not-allowed" : "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={blockedByLimit || disabled}
                    onChange={() => toggle(title)}
                    style={{ marginTop: 3, flexShrink: 0 }}
                  />
                  <span>{title}</span>
                </label>
              );
            })}
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              onClick={handleUse}
              disabled={selected.length === 0 || disabled}
              style={disabledStyle({ ...buttonStyle, marginTop: 0 }, selected.length === 0 || disabled)}
            >
              {selected.length === 0
                ? "Usar los seleccionados"
                : `Usar ${selected.length} seleccionado${selected.length === 1 ? "" : "s"}`}
            </button>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setSelected([]);
              }}
              style={secondaryButtonStyle}
            >
              Descartar todos
            </button>
            <span style={{ fontSize: 12, color: "#6e6e73" }}>
              {selected.length} de {maxSelectable} marcados
            </span>
          </div>
        </fieldset>
      )}
    </div>
  );
}
