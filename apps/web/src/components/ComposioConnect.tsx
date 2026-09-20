"use client";

import { useCallback, useEffect, useState } from "react";
import {
  sectionStyle,
  h2Style,
  buttonStyle,
  secondaryButtonStyle,
} from "@/components/dashboard-ui";

interface Connection {
  app: string;
  label: string;
  status: "NOT_CONNECTED" | "INITIATED" | "ACTIVE" | "FAILED" | "REVOKED";
  activatedAt: string | null;
  selection: string | null;
  available: boolean;
  unavailableReason: string | null;
  /** La persona no tiene activada esta red: en modo incrustado no se muestra nada. */
  hidden: boolean;
}

interface ComposioConnectProps {
  /** Apps a mostrar (por defecto, las 4). */
  apps?: string[];
  /** Dentro de otra pantalla: sin introducción propia y ocultando redes no activadas. */
  embedded?: boolean;
  /** Inserta los controles dentro de la tarjeta nativa del servicio, sin crear otra tarjeta. */
  inline?: boolean;
}

/**
 * Parámetros de la URL leídos UNA vez al cargar el módulo: la pantalla puede tener
 * varias instancias de este componente y cada una debe ver el resultado del retorno
 * de Composio aunque otra ya haya limpiado la dirección.
 */
const INITIAL_PARAMS: URLSearchParams | null =
  typeof window === "undefined" ? null : new URLSearchParams(window.location.search);

interface Option {
  id: string;
  label: string;
  detail: string | null;
  selectable: boolean;
  reason: string | null;
  recommended: boolean;
}

interface Choices {
  loading: boolean;
  error: string | null;
  options: Option[];
  picked: string | null;
}

const mutedStyle = { color: "#6e6e73", fontSize: 14, lineHeight: 1.5 } as const;

const APP_NOTES: Record<string, string> = {
  google_search_console: "Permite enviar tu sitemap, revisar la indexación y consultar tus métricas de búsqueda.",
  google_analytics: "Permite leer las métricas de tu propiedad de Analytics (solo lectura).",
  facebook:
    "Permite publicar en tu Página. Composio no publica Stories de Facebook: esas se siguen publicando por tu conexión actual.",
  instagram:
    "Permite publicar imágenes, carruseles y Reels en tu cuenta Business o Creator. Las Stories de Instagram están en prueba.",
};

const CHOOSE_TITLE: Record<string, string> = {
  google_search_console: "Elige el sitio que usarás",
  google_analytics: "Elige la propiedad que usarás",
  facebook: "Elige la Página que usarás",
  instagram: "Elige la cuenta de Instagram que usarás",
};

const CHOOSE_NOTE: Record<string, string> = {
  google_search_console:
    "Tu cuenta de SEO TOTAL trabaja con un solo dominio. Si tu cuenta de Google tiene varios sitios, elige el de esta cuenta; los demás no se usarán.",
};

const STATUS_LABEL: Record<Connection["status"], { text: string; color: string }> = {
  NOT_CONNECTED: { text: "No conectada", color: "#6e6e73" },
  INITIATED: { text: "Autorización sin terminar", color: "#9a6700" },
  ACTIVE: { text: "Conectada", color: "#1a7f37" },
  FAILED: { text: "No se pudo conectar", color: "#c62828" },
  REVOKED: { text: "Desconectada", color: "#6e6e73" },
};

const RESULT_MESSAGE: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: "Conexión completada y verificada. Ahora elige y aprueba lo que usarás." },
  failed: { ok: false, text: "No se pudo completar la conexión. Inténtalo de nuevo." },
  invalid: { ok: false, text: "No se encontró esa conexión. Inicia la conexión desde aquí." },
};

export default function ComposioConnect({ apps, embedded = false, inline = false }: ComposioConnectProps = {}) {
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [probe, setProbe] = useState<Record<string, string>>({});
  const [found, setFound] = useState<Record<string, Array<{ label: string; detail: string | null }>>>({});
  const [choices, setChoices] = useState<Record<string, Choices>>({});

  const load = useCallback(async () => {
    const response = await fetch("/api/composio/status", { cache: "no-store" });
    if (!response.ok) {
      setMessage({ ok: false, text: "No se pudo leer el estado de tus conexiones." });
      return null;
    }
    const all = ((await response.json()) as { connections: Connection[] }).connections;
    const list = all.filter((connection) => (!apps || apps.includes(connection.app)) && !(embedded && connection.hidden));
    setConnections(list);
    return list;
  }, [apps, embedded]);

  const openChoices = useCallback(async (app: string) => {
    setChoices((current) => ({ ...current, [app]: { loading: true, error: null, options: [], picked: null } }));
    const response = await fetch(`/api/composio/options?app=${encodeURIComponent(app)}`, { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setChoices((current) => ({
        ...current,
        [app]: { loading: false, error: body.error ?? "No se pudieron leer las opciones.", options: [], picked: null },
      }));
      return;
    }
    const options = body.options as Option[];
    const preferred = options.find((option) => option.recommended) ?? options.find((option) => option.selectable);
    setChoices((current) => ({
      ...current,
      [app]: { loading: false, error: null, options, picked: preferred ? preferred.id : null },
    }));
  }, []);

  useEffect(() => {
    void load().then((list) => {
      // Una app conectada sin elección todavía pide elegir de inmediato.
      list?.filter((c) => c.status === "ACTIVE" && !c.selection && c.available).forEach((c) => void openChoices(c.app));
    });
    const resultado = INITIAL_PARAMS?.get("resultado") ?? null;
    const appDeVuelta = INITIAL_PARAMS?.get("app") ?? null;
    if (resultado && RESULT_MESSAGE[resultado] && (!apps || !appDeVuelta || apps.includes(appDeVuelta))) {
      setMessage(RESULT_MESSAGE[resultado]);
      // Se limpia solo lo del retorno; la pestaña elegida (vista) se conserva.
      const params = new URLSearchParams(window.location.search);
      params.delete("resultado");
      params.delete("app");
      const rest = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""));
    }
  }, [load, openChoices, apps]);

  async function post(path: string, payload: Record<string, unknown>) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { ok: response.ok, body: await response.json().catch(() => ({})) };
  }

  async function connect(app: string) {
    setBusy(app);
    setMessage(null);
    try {
      const { ok, body } = await post("/api/composio/connect", { app });
      if (!ok || !body.redirectUrl) {
        setMessage({ ok: false, text: body.error ?? "No se pudo iniciar la conexión." });
        return;
      }
      window.location.href = body.redirectUrl as string;
    } finally {
      setBusy(null);
    }
  }

  async function test(app: string) {
    setBusy(app);
    setProbe((current) => ({ ...current, [app]: "" }));
    setFound((current) => ({ ...current, [app]: [] }));
    try {
      const { ok, body } = await post("/api/composio/test", { app });
      if (ok && Array.isArray(body.found)) setFound((current) => ({ ...current, [app]: body.found }));
      const text = ok
        ? body.items !== null && body.items !== undefined
          ? `La conexión respondió correctamente (${body.items} elemento${body.items === 1 ? "" : "s"}).`
          : "La conexión respondió correctamente."
        : (body.error ?? "La prueba falló.");
      setProbe((current) => ({ ...current, [app]: `${ok ? "✓" : "✗"} ${text}` }));
    } finally {
      setBusy(null);
    }
  }

  async function approve(app: string) {
    const picked = choices[app]?.picked;
    if (!picked) return;
    setBusy(app);
    setMessage(null);
    try {
      const { ok, body } = await post("/api/composio/select", { app, optionId: picked });
      if (!ok) {
        setMessage({ ok: false, text: body.error ?? "No se pudo guardar tu elección." });
        return;
      }
      setChoices((current) => {
        const { [app]: _closed, ...rest } = current;
        return rest;
      });
      setMessage({ ok: true, text: "Elección aprobada y guardada." });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(app: string) {
    if (!window.confirm("¿Desconectar esta app? Se elimina la conexión en Composio.")) return;
    setBusy(app);
    setMessage(null);
    try {
      const { ok, body } = await post("/api/composio/disconnect", { app });
      if (!ok) setMessage({ ok: false, text: body.error ?? "No se pudo desconectar." });
      setProbe((current) => ({ ...current, [app]: "" }));
      setChoices((current) => {
        const { [app]: _closed, ...rest } = current;
        return rest;
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {!embedded && !inline && (
      <section style={sectionStyle}>
        <h2 style={h2Style}>Conexión por Composio</h2>
        <p style={mutedStyle}>
          Conecta tus cuentas de Google y Meta a través de Composio, nuestro proveedor de integraciones.
          Al autorizar verás el nombre <strong>Composio</strong> en la pantalla de Google o de Meta: es
          normal. Después de conectar, eliges y apruebas qué sitio, propiedad, Página o cuenta usarás.
          Tus conexiones actuales siguen funcionando igual mientras pruebas esta.
        </p>
        {message && (
          <p role="status" style={{ fontSize: 14, marginTop: 12, color: message.ok ? "#1a7f37" : "#c62828" }}>
            {message.text}
          </p>
        )}
      </section>
      )}
      {embedded && message && (
        <p role="status" style={{ fontSize: 14, margin: "8px 0 0", color: message.ok ? "#1a7f37" : "#c62828" }}>
          {message.text}
        </p>
      )}

      {connections === null ? (
        <section style={sectionStyle}>
          <p style={mutedStyle}>Cargando…</p>
        </section>
      ) : (
        connections.map((connection) => {
          const status = STATUS_LABEL[connection.status];
          const isBusy = busy === connection.app;
          const choice = choices[connection.app];
          return (
            <section key={connection.app} style={inline ? { marginTop: 16, paddingTop: 14, borderTop: "1px solid #e5e5ea" } : sectionStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                {!inline && <h2 style={{ ...h2Style, marginBottom: 6 }}>{embedded ? `${connection.label} · nueva conexión` : connection.label}</h2>}
                <span style={{ fontSize: 13, fontWeight: 600, color: status.color }}>{status.text}</span>
              </div>
              {!inline && <p style={mutedStyle}>{APP_NOTES[connection.app]}</p>}
              {embedded && !inline && (
                <p role="note" style={{ margin: "8px 0", padding: "8px 12px", borderRadius: 10, background: "#fff4e5", color: "#8a4b08", fontSize: 13, lineHeight: 1.45 }}>
                  <strong>Es una conexión adicional, en prueba.</strong> No reemplaza a la conexión de arriba: el sistema sigue usando esa,
                  así que <strong>no la desconectes</strong>.
                </p>
              )}

              {connection.status === "ACTIVE" && connection.selection && !choice && (
                <p style={{ fontSize: 14, margin: "8px 0" }}>
                  <strong>{inline ? "Propiedad seleccionada:" : "Usando:"}</strong> {connection.selection}
                </p>
              )}

              {choice && (
                <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: "#f5f5f7" }}>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>{CHOOSE_TITLE[connection.app]}</p>
                  {CHOOSE_NOTE[connection.app] && <p style={{ ...mutedStyle, margin: "0 0 10px" }}>{CHOOSE_NOTE[connection.app]}</p>}
                  {choice.loading && <p style={mutedStyle}>Leyendo tu cuenta…</p>}
                  {choice.error && <p style={{ fontSize: 13, color: "#c62828" }}>{choice.error}</p>}
                  {!choice.loading && !choice.error && choice.options.length === 0 && (
                    <p style={mutedStyle}>No se encontró nada para elegir en esta cuenta. Comprueba que sea la cuenta correcta.</p>
                  )}
                  {choice.options.map((option) => (
                    <label
                      key={option.id}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                        padding: "8px 0",
                        opacity: option.selectable ? 1 : 0.55,
                        cursor: option.selectable ? "pointer" : "not-allowed",
                      }}
                    >
                      <input
                        type="radio"
                        name={`choice-${connection.app}`}
                        checked={choice.picked === option.id}
                        disabled={!option.selectable || busy !== null}
                        onChange={() =>
                          setChoices((current) => ({ ...current, [connection.app]: { ...choice, picked: option.id } }))
                        }
                        style={{ marginTop: 3 }}
                      />
                      <span style={{ fontSize: 14 }}>
                        <strong>{option.label}</strong>
                        {option.recommended && <span style={{ color: "#1a7f37", fontSize: 12 }}> · recomendado</span>}
                        {option.detail && (
                          <span style={{ display: "block", fontSize: 12, color: "#6e6e73", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", marginTop: 2 }}>
                            {option.detail}
                          </span>
                        )}
                        {option.reason && <span style={{ display: "block", fontSize: 12, color: "#9a6700" }}>{option.reason}</span>}
                      </span>
                    </label>
                  ))}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => approve(connection.app)}
                      disabled={busy !== null || !choice.picked}
                      style={{ ...buttonStyle, marginTop: 0, opacity: busy !== null || !choice.picked ? 0.5 : 1 }}
                    >
                      {isBusy ? "Guardando…" : "Aprobar y guardar"}
                    </button>
                    {connection.selection && (
                      <button
                        type="button"
                        onClick={() =>
                          setChoices((current) => {
                            const { [connection.app]: _closed, ...rest } = current;
                            return rest;
                          })
                        }
                        style={secondaryButtonStyle}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!connection.available ? (
                <p style={{ ...mutedStyle, fontStyle: "italic" }}>{connection.unavailableReason}</p>
              ) : (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                  {connection.status !== "ACTIVE" && (
                    <button
                      type="button"
                      onClick={() => connect(connection.app)}
                      disabled={busy !== null}
                      style={{ ...buttonStyle, marginTop: 0, opacity: busy !== null ? 0.5 : 1 }}
                    >
                      {isBusy ? "Abriendo…" : connection.status === "NOT_CONNECTED" ? "Nueva conexión" : "Reintentar conexión"}
                    </button>
                  )}
                  {connection.status === "ACTIVE" && !choice && (
                    <button type="button" onClick={() => openChoices(connection.app)} disabled={busy !== null} style={secondaryButtonStyle}>
                      {connection.selection ? "Cambiar" : "Elegir"}
                    </button>
                  )}
                  {connection.status === "ACTIVE" && (
                    <button type="button" onClick={() => test(connection.app)} disabled={busy !== null} style={secondaryButtonStyle}>
                      {isBusy ? "Probando…" : "Probar conexión"}
                    </button>
                  )}
                  {connection.status !== "NOT_CONNECTED" && (
                    <button
                      type="button"
                      onClick={() => disconnect(connection.app)}
                      disabled={busy !== null}
                      style={{ ...secondaryButtonStyle, color: "#c62828" }}
                    >
                      Desconectar
                    </button>
                  )}
                </div>
              )}
              {(found[connection.app] ?? []).length > 0 && (
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, color: "#6e6e73", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                  {found[connection.app].map((item, index) => (
                    <li key={index}>
                      <strong style={{ fontFamily: "inherit", color: "#1d1d1f" }}>{item.label}</strong>
                      {item.detail ? ` — ${item.detail}` : ""}
                    </li>
                  ))}
                </ul>
              )}
              {probe[connection.app] && (
                <p
                  role="status"
                  style={{ fontSize: 13, marginTop: 10, color: probe[connection.app].startsWith("✓") ? "#1a7f37" : "#c62828" }}
                >
                  {probe[connection.app]}
                </p>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
