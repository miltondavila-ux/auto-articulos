"use client";

import { useCallback, useEffect, useState } from "react";
import { friendlyConnectionError } from "@/lib/composio-error-message";
import {
  sectionStyle,
  h2Style,
  buttonStyle,
  secondaryButtonStyle,
  ConnectionSuccess,
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
  /** En tarjetas que ya gestionan la conexión principal, oculta estados alternativos inactivos. */
  activeOnly?: boolean;
  /** Muestra solo el botón de alta para apps aún no conectadas, dentro de la tarjeta anfitriona. */
  showInactiveActions?: boolean;
}

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
    "Permite publicar en tu Página de Facebook desde SEO TOTAL. Las Stories no se ofrecen cuando esta conexión está activa.",
  instagram:
    "Permite publicar imágenes, carruseles y Reels en tu cuenta Business o Creator. Las Stories no se ofrecen cuando esta conexión está activa.",
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

const CONNECTION_STEPS: Record<string, string[]> = {
  google_search_console: [
    "Abre Google en otra pestaña del mismo navegador.",
    "Confirma que estás dentro de la cuenta de Google que administra tu Search Console.",
    "Pulsa Nueva conexión y autoriza el acceso solicitado.",
    "Elige la propiedad correcta y pulsa Aprobar y guardar.",
    "Pulsa Probar conexión y comprueba el mensaje verde.",
  ],
  google_analytics: [
    "Abre Google Analytics en otra pestaña y confirma la cuenta correcta.",
    "Pulsa Nueva conexión y autoriza el acceso de lectura.",
    "Elige la propiedad GA4 que corresponde a tu sitio.",
    "Pulsa Aprobar y guardar.",
    "Pulsa Probar conexión y comprueba el mensaje verde.",
  ],
  facebook: [
    "Abre Facebook en otra pestaña y confirma que es tu cuenta personal administradora.",
    "Pulsa Nueva conexión y autoriza el acceso.",
    "Elige la Página de Facebook correcta, no tu perfil personal.",
    "Pulsa Aprobar y guardar y después Probar conexión.",
  ],
  instagram: [
    "Abre Instagram en otra pestaña y confirma la cuenta Business o Creator correcta.",
    "Pulsa Nueva conexión y autoriza el acceso desde Facebook si se solicita.",
    "Elige la cuenta de Instagram correcta.",
    "Pulsa Aprobar y guardar y después Probar conexión.",
  ],
};

const STATUS_LABEL: Record<Connection["status"], { text: string; color: string }> = {
  NOT_CONNECTED: { text: "No conectada", color: "#6e6e73" },
  INITIATED: { text: "Autorización sin terminar", color: "#9a6700" },
  ACTIVE: { text: "Conectada", color: "#1a7f37" },
  FAILED: { text: "No se pudo conectar", color: "#c62828" },
  REVOKED: { text: "Desconectada", color: "#6e6e73" },
};

const RESULT_MESSAGE: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: "Autorización completada. Ahora elige y aprueba la propiedad que usará SEO TOTAL." },
  failed: { ok: false, text: "No se pudo completar la conexión. Inténtalo de nuevo." },
  invalid: { ok: false, text: "No se encontró esa conexión. Inicia la conexión desde aquí." },
};

const SUCCESS_TITLE: Record<string, string> = {
  google_search_console: "Google Search Console quedó conectado correctamente",
  google_analytics: "Google Analytics quedó conectado correctamente",
  facebook: "Facebook quedó conectado correctamente",
  instagram: "Instagram quedó conectado correctamente",
};

const SUCCESS_SELECTION_LABEL: Record<string, string> = {
  google_search_console: "Propiedad conectada",
  google_analytics: "Propiedad conectada",
  facebook: "Página conectada",
  instagram: "Cuenta conectada",
};

export default function ComposioConnect({ apps, embedded = false, inline = false, activeOnly = false, showInactiveActions = false }: ComposioConnectProps = {}) {
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [probe, setProbe] = useState<Record<string, string>>({});
  const [savedSelection, setSavedSelection] = useState<Record<string, string>>({});
  const [choices, setChoices] = useState<Record<string, Choices>>({});
  const [justSaved, setJustSaved] = useState<Record<string, boolean>>({});
  const [justCompleted, setJustCompleted] = useState<Record<string, boolean>>({});
  const [fromNotice, setFromNotice] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/composio/status", { cache: "no-store" });
    if (!response.ok) {
      setMessage({ ok: false, text: "No se pudo leer el estado de tus conexiones." });
      return null;
    }
    const all = ((await response.json()) as { connections: Connection[] }).connections;
    const list = all.filter((connection) => (!apps || apps.includes(connection.app)) && !(embedded && connection.hidden) && (!activeOnly || connection.status === "ACTIVE"));
    setConnections(list);
    return list;
  }, [apps, embedded, activeOnly]);

  const openChoices = useCallback(async (app: string) => {
    setChoices((current) => ({ ...current, [app]: { loading: true, error: null, options: [], picked: null } }));
    const response = await fetch(`/api/composio/options?app=${encodeURIComponent(app)}`, { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setChoices((current) => ({
        ...current,
        [app]: { loading: false, error: friendlyConnectionError(body.error, "No se pudieron leer las opciones. Inténtalo de nuevo."), options: [], picked: null },
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
    const paramsFromCurrentUrl = new URLSearchParams(window.location.search);
    if (paramsFromCurrentUrl.get("reconectar") === "1") setFromNotice(true);
    const resultado = paramsFromCurrentUrl.get("resultado") ?? null;
    const appDeVuelta = paramsFromCurrentUrl.get("app") ?? null;
    if (resultado && RESULT_MESSAGE[resultado] && (!apps || !appDeVuelta || apps.includes(appDeVuelta))) {
      setMessage(RESULT_MESSAGE[resultado]);
      if (resultado === "connected" && appDeVuelta) {
        setJustCompleted((current) => ({ ...current, [appDeVuelta]: true }));
      }
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
        setMessage({ ok: false, text: friendlyConnectionError(body.error, "No se pudo iniciar la conexión. Inténtalo de nuevo.") });
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
    try {
      const { ok, body } = await post("/api/composio/test", { app });
      const text = ok
        ? `Conexión correcta${connections?.find((c) => c.app === app)?.selection ? ` con ${connections.find((c) => c.app === app)?.selection}` : ""}.`
        : friendlyConnectionError(body.error, "La prueba no funcionó. Inténtalo de nuevo.");
      setProbe((current) => ({ ...current, [app]: `${ok ? "✓" : "✗"} ${text}` }));
    } finally {
      setBusy(null);
    }
  }

  async function approve(app: string) {
    const picked = choices[app]?.picked;
    if (!picked) return;
    const pickedOption = choices[app]?.options.find((option) => option.id === picked);
    setBusy(app);
    setMessage(null);
    try {
      const { ok, body } = await post("/api/composio/select", { app, optionId: picked });
      if (!ok) {
        setMessage({ ok: false, text: friendlyConnectionError(body.error, "No se pudo guardar tu elección. Inténtalo de nuevo.") });
        return;
      }
      setChoices((current) => {
        const { [app]: _closed, ...rest } = current;
        return rest;
      });
      setJustSaved((current) => ({ ...current, [app]: true }));
      if (pickedOption) {
        const code = pickedOption.detail ? ` (${pickedOption.detail})` : "";
        setSavedSelection((current) => ({ ...current, [app]: `${pickedOption.label}${code}` }));
      }
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
      if (!ok) setMessage({ ok: false, text: friendlyConnectionError(body.error, "No se pudo desconectar. Inténtalo de nuevo.") });
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
      <style>{`@keyframes composio-pulse{0%,100%{box-shadow:0 0 0 0 rgba(215,0,21,.45)}50%{box-shadow:0 0 0 10px rgba(215,0,21,0)}}.composio-pulse{animation:composio-pulse 1.8s ease-in-out infinite}@media (prefers-reduced-motion:reduce){.composio-pulse{animation:none}}`}</style>
      {!embedded && !inline && (
      <section style={sectionStyle}>
        <h2 style={h2Style}>Conexión por Composio</h2>
        <p style={mutedStyle}>
          Conecta tus cuentas de Google y Meta a través de Composio, nuestro proveedor de integraciones.
          Al autorizar verás el nombre <strong>Composio</strong> en la pantalla de Google o de Meta: es
          normal. Después de conectar, eliges y apruebas qué sitio, propiedad, Página o cuenta usarás.
          Tus conexiones actuales siguen funcionando igual mientras pruebas esta.
        </p>
        {message && !(message.ok && connections?.some((connection) => connection.status === "ACTIVE" && connection.selection)) && (
          <p role="status" style={{ fontSize: 14, marginTop: 12, color: message.ok ? "#1a7f37" : "#c62828" }}>
            {message.text}
          </p>
        )}
      </section>
      )}
      {(embedded || inline) && message && !(message.ok && connections?.some((connection) => connection.status === "ACTIVE" && connection.selection)) && (
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
          if (inline && showInactiveActions && connection.status !== "ACTIVE") {
            return (
              <button key={connection.app} type="button" onClick={() => connect(connection.app)} disabled={busy !== null} style={{ ...secondaryButtonStyle, marginTop: 12 }}>
                {isBusy ? "Abriendo…" : `Nueva conexión de ${connection.app === "facebook" ? "Facebook" : "Instagram"}`}
              </button>
            );
          }
          const isSuccessful = connection.status === "ACTIVE" && Boolean(connection.selection) && !choice;
          const successJustCompleted =
            justSaved[connection.app] === true ||
            justCompleted[connection.app] === true;
          if (isSuccessful && successJustCompleted) {
            return (
              <section key={connection.app} style={inline ? { marginTop: 16, paddingTop: 14, borderTop: "1px solid #e5e5ea" } : sectionStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  {!inline && <h2 style={{ ...h2Style, marginBottom: 6 }}>{embedded ? `${connection.label} · nueva conexión` : connection.label}</h2>}
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1a7f37" }}>Conexión exitosa</span>
                </div>
                <ConnectionSuccess
                  title={SUCCESS_TITLE[connection.app] ?? "La conexión quedó lista"}
                  label={SUCCESS_SELECTION_LABEL[connection.app] ?? "Conectado con"}
                  value={savedSelection[connection.app] ?? connection.selection}
                  description="La configuración terminó correctamente. SEO TOTAL usará esta conexión desde ahora."
                />
              </section>
            );
          }
          return (
            <section key={connection.app} style={inline ? { marginTop: 16, paddingTop: 14, borderTop: "1px solid #e5e5ea" } : sectionStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                {!inline && <h2 style={{ ...h2Style, marginBottom: 6 }}>{embedded ? `${connection.label} · nueva conexión` : connection.label}</h2>}
                <span style={{ fontSize: 13, fontWeight: 600, color: status.color }}>{status.text}</span>
              </div>
              <p style={{ ...mutedStyle, margin: "4px 0 0" }}>{APP_NOTES[connection.app]}</p>
              {fromNotice && connection.status !== "ACTIVE" && connection.available && (
                <p
                  role="alert"
                  style={{ margin: "12px 0 0", padding: "12px 14px", borderRadius: 8, background: "#fff1f1", border: "2px solid #d70015", color: "#b00020", fontSize: 15, fontWeight: 800 }}
                >
                  Debes reconectar ahora. Pulsa «Nueva conexión» y autoriza el acceso.
                </p>
              )}
              {CONNECTION_STEPS[connection.app] && !(connection.status === "ACTIVE" && connection.selection && !choice) && (
                <div
                  role="note"
                  style={{ marginTop: 10, padding: "10px 0", borderTop: "1px solid #e5e5ea", color: "#1d1d1f", fontSize: 13, lineHeight: 1.5 }}
                >
                  <strong>Cómo hacerlo paso a paso</strong>
                  <ol style={{ margin: "6px 0 0", paddingLeft: 20 }}>
                    {CONNECTION_STEPS[connection.app].map((step) => <li key={step}>{step}</li>)}
                  </ol>
                </div>
              )}
              {embedded && !inline && (
                <p role="note" style={{ margin: "8px 0", padding: "8px 0", color: "#6e6e73", fontSize: 13, lineHeight: 1.45 }}>
                  <strong>Es una conexión adicional, en prueba.</strong> No reemplaza a la conexión de arriba: el sistema sigue usando esa,
                  así que <strong>no la desconectes</strong>.
                </p>
              )}

              {connection.status === "ACTIVE" && connection.selection && !choice && (
                <div style={{ marginTop: 10, padding: 14, borderRadius: 12, border: "1px solid rgba(26, 127, 55, 0.25)", background: "#f7fff9" }}>
                  <strong style={{ display: "block", color: "#1a7f37", fontSize: 15 }}>✓ Conexión activa</strong>
                  <p style={{ fontSize: 14, margin: "6px 0 0" }}>
                    <strong>
                      {inline
                        ? connection.app === "facebook"
                          ? "Página de Facebook conectada:"
                          : connection.app === "instagram"
                            ? "Cuenta de Instagram conectada:"
                            : "Propiedad conectada:"
                        : "Conectado con:"}
                    </strong>{" "}{connection.selection}
                  </p>
                </div>
              )}

              {choice && (
                <div style={{ marginTop: 12, padding: "10px 0", borderTop: "1px solid #e5e5ea" }}>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>{CHOOSE_TITLE[connection.app]}</p>
                  {CHOOSE_NOTE[connection.app] && <p style={{ ...mutedStyle, margin: "0 0 10px" }}>{CHOOSE_NOTE[connection.app]}</p>}
                  {choice.loading && <p style={mutedStyle}>Leyendo tu cuenta…</p>}
                  {choice.error && <p style={{ fontSize: 13, color: "#c62828" }}>{choice.error}</p>}
                  {!choice.loading && !choice.error && choice.options.length === 0 && (
                    <p style={mutedStyle}>No se encontró nada para elegir en esta cuenta. Comprueba que sea la cuenta correcta.</p>
                  )}
                  {choice.options.length > 0 && (() => {
                    const sorted = [...choice.options].sort(
                      (x, y) =>
                        Number(y.selectable) - Number(x.selectable) ||
                        Number(Boolean(y.recommended)) - Number(Boolean(x.recommended)) ||
                        x.label.localeCompare(y.label, "es"),
                    );
                    const pickedOption = choice.options.find((option) => option.id === choice.picked);
                    return (
                      <div>
                        <select
                          aria-label={CHOOSE_TITLE[connection.app]}
                          value={choice.picked ?? ""}
                          disabled={busy !== null}
                          onChange={(event) =>
                            setChoices((current) => ({ ...current, [connection.app]: { ...choice, picked: event.target.value || null } }))
                          }
                          style={{ width: "100%", maxWidth: 520, padding: "10px 12px", borderRadius: 10, border: "1px solid #d2d2d7", fontSize: 14, background: "#fff", color: "#1d1d1f" }}
                        >
                          <option value="">Elige una opción…</option>
                          {sorted.map((option) => (
                            <option key={option.id} value={option.id} disabled={!option.selectable}>
                              {option.label}
                              {option.recommended ? " · recomendado" : ""}
                              {!option.selectable && option.reason ? ` — ${option.reason}` : ""}
                            </option>
                          ))}
                        </select>
                        {pickedOption?.detail && (
                          <span style={{ display: "block", fontSize: 12, color: "#6e6e73", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", marginTop: 6 }}>
                            {pickedOption.detail}
                          </span>
                        )}
                      </div>
                    );
                  })()}
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
                      className={fromNotice ? "composio-pulse" : undefined}
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
