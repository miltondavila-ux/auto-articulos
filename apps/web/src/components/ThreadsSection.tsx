"use client";

import { useEffect, useState } from "react";
import {
  sectionStyle,
  h2Style,
  inputStyle,
  secondaryButtonStyle,
  disabledStyle,
} from "./dashboard-ui";

interface ThreadsData {
  connected: boolean;
  threadsUserId?: string;
  threadsUsername?: string;
  expiresAt?: string;
  isExpired?: boolean;
}

interface AppSettings {
  configured: boolean;
  appId: string | null;
  rawAppId?: string;
  source?: string;
  isAdmin?: boolean;
}

export default function ThreadsSection() {
  const [data, setData] = useState<ThreadsData | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState("");

  // Formulario de credenciales generales de la API (App ID / App Secret)
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [appIdInput, setAppIdInput] = useState("");
  const [appSecretInput, setAppSecretInput] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  const redirectUri = "https://auto-articulos-web.vercel.app/api/search-integrations/threads/callback";

  async function load() {
    try {
      setLoading(true);
      const [resData, resSettings] = await Promise.all([
        fetch("/api/search-integrations/threads"),
        fetch("/api/search-integrations/threads/settings"),
      ]);

      const json = await resData.json();
      const settingsJson = await resSettings.json();

      setData(json);
      setSettings(settingsJson);
      if (settingsJson.rawAppId) {
        setAppIdInput(settingsJson.rawAppId);
      }
    } catch {
      setData({ connected: false });
      setSettings({ configured: false, appId: null });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSaveSettings() {
    if (!appIdInput.trim() || !appSecretInput.trim()) {
      setMessage("Debes ingresar tanto el App ID como el App Secret de Meta Developers.");
      return;
    }

    setSavingSettings(true);
    setMessage("");

    try {
      const res = await fetch("/api/search-integrations/threads/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: appIdInput.trim(),
          appSecret: appSecretInput.trim(),
        }),
      });

      const result = await res.json();
      if (res.ok) {
        setMessage("✓ Llaves de Meta API guardadas para Threads, Instagram y Facebook.");
        setShowConfigForm(false);
        setAppSecretInput("");
        await load();
      } else {
        setMessage(`Error: ${result.error || "No se pudieron guardar las llaves."}`);
      }
    } catch {
      setMessage("Error de conexión al guardar las llaves de la API.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("¿Estás seguro de que deseas desconectar tu cuenta de Threads?")) {
      return;
    }
    setDisconnecting(true);
    setMessage("");
    try {
      await fetch("/api/search-integrations/threads", { method: "DELETE" });
      setMessage("Cuenta de Threads desconectada.");
      await load();
    } catch {
      setMessage("Ocurrió un error al desconectar.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <section style={sectionStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "linear-gradient(135deg, #000000 0%, #1c1c1e 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: 20,
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
          >
            @
          </div>
          <div>
            <h2 style={{ ...h2Style, margin: 0 }}>Meta API</h2>
            <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0 0" }}>
              Credenciales compartidas para Threads, Instagram y Facebook.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {settings?.configured && settings?.isAdmin && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#1e293b",
                background: "#f1f5f9",
                padding: "3px 10px",
                borderRadius: 999,
                border: "1px solid #cbd5e1",
              }}
            >
              🔑 App ID: {settings.appId}
            </span>
          )}

          {data?.connected && !data?.isExpired && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#16a34a",
                background: "rgba(22,163,74,0.1)",
                padding: "4px 12px",
                borderRadius: 999,
                border: "1px solid rgba(22,163,74,0.2)",
              }}
            >
              🟢 Conectado {data.threadsUsername ? `@${data.threadsUsername}` : ""}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#64748b", margin: "12px 0 0 0" }}>
          Cargando estado de la integración de Meta...
        </p>
      ) : (
        <>
          {/* Si no está configurada globalmente y el usuario NO es admin, mostrar advertencia amigable */}
          {!settings?.configured && !settings?.isAdmin && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                padding: 14,
                borderRadius: 10,
                marginTop: 12,
              }}
            >
              <div style={{ fontWeight: 700, color: "#991b1b", fontSize: 13 }}>
                ⚠️ Integración con Threads no lista
              </div>
              <p style={{ fontSize: 12, color: "#7f1d1d", margin: "4px 0 0 0" }}>
                La conexión de Threads no ha sido configurada a nivel global de plataforma por el administrador del sistema. Por favor, solicita al administrador de 10MinutesWebsite que configure las llaves de la API de Meta.
              </p>
            </div>
          )}

          {/* Bloque de aviso si falta configurar las llaves globales (solo para admin) */}
          {!settings?.configured && settings?.isAdmin && !showConfigForm && (
            <div
              style={{
                background: "rgba(254, 243, 199, 0.6)",
                border: "1px solid #fef3c7",
                padding: 14,
                borderRadius: 10,
                marginTop: 12,
              }}
            >
              <div style={{ fontWeight: 700, color: "#92400e", fontSize: 13 }}>
                ⚠️ Se requieren las llaves globales de Meta API
              </div>
              <p style={{ fontSize: 12, color: "#78350f", margin: "4px 0 10px 0" }}>
                Para permitir la conexión OAuth de todos los usuarios, ingresa tu <strong>App ID</strong> y <strong>App Secret</strong> obtenidos en Meta for Developers. Tus llaves se guardarán cifradas con <strong>AES-256-GCM</strong>.
              </p>
              <button
                onClick={() => setShowConfigForm(true)}
                style={{
                  ...secondaryButtonStyle,
                  background: "#78350f",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                ⚙️ Configurar Llaves de la API (App ID / Secret)
              </button>
            </div>
          )}

          {/* Formulario expandible para configurar o actualizar App ID / App Secret (solo para admin) */}
          {settings?.isAdmin && (showConfigForm || (!settings?.configured && showConfigForm)) && (
            <div
              style={{
                background: "#ffffff",
                padding: 16,
                borderRadius: 12,
                border: "1px solid #cbd5e1",
                marginTop: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
                ⚙️ Credenciales compartidas de Meta (Threads, Instagram y Facebook)
              </div>

              {/* Guía paso a paso para el usuario */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  padding: "14px",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#334155",
                  lineHeight: "1.5",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontWeight: 700,
                    color: "#0f172a",
                    marginBottom: 8,
                  }}
                >
                  <span>📖 ¿Cómo obtener estas llaves de API?</span>
                  <a
                    href={`https://chatgpt.com/?q=${encodeURIComponent(
                      "Actúa como un experto en Meta Developers. Necesito configurar una sola aplicación de Meta para conectar Threads, Instagram y Facebook. Guíame paso a paso para habilitar los productos requeridos, configurar sus URL de redirección OAuth y obtener el App ID y App Secret compartidos."
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 11,
                      color: "#ffffff",
                      background: "#10a37f",
                      padding: "4px 10px",
                      borderRadius: 6,
                      textDecoration: "none",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                    }}
                  >
                    🤖 Preguntar a ChatGPT
                  </a>
                </div>
                <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
                  <li>
                    Ve a{" "}
                    <a
                      href="https://developers.facebook.com/apps/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#2563eb", fontWeight: 600, textDecoration: "underline" }}
                    >
                      Meta for Developers (Mis Aplicaciones)
                    </a>{" "}
                    e inicia sesión.
                  </li>
                  <li>Crea una aplicación o selecciona una existente. Asegúrate de agregar el producto <strong>Threads API</strong>.</li>
                  <li>
                    En la sección de Threads ➔ Configuración, añade esta dirección como <strong>URI de redireccionamiento de OAuth</strong> válida:
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 4,
                        background: "#cbd5e1",
                        padding: "6px 10px",
                        borderRadius: 4,
                      }}
                    >
                      <code style={{ fontFamily: "monospace", fontSize: 11, color: "#1e293b", flex: 1, wordBreak: "break-all" }}>
                        {redirectUri}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(redirectUri);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        style={{
                          border: 0,
                          background: "#0f172a",
                          color: "#ffffff",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "4px 8px",
                          borderRadius: 4,
                          cursor: "pointer",
                        }}
                      >
                        {copied ? "✓ Copiado" : "📋 Copiar"}
                      </button>
                    </div>
                  </li>
                  <li>Copia el <strong>App ID de Meta</strong> y el <strong>App Secret de Meta</strong> compartidos y pégalos abajo.</li>
                </ol>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                  App ID de Meta:
                </label>
                <input
                  type="text"
                  value={appIdInput}
                  onChange={(e) => setAppIdInput(e.target.value)}
                  placeholder="Ej: 123456789012345"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                  App Secret de Meta:
                </label>
                <input
                  type="password"
                  value={appSecretInput}
                  onChange={(e) => setAppSecretInput(e.target.value)}
                  placeholder="Ej: a1b2c3d4e5f6g7h8i9j0..."
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  style={disabledStyle(
                    {
                      ...secondaryButtonStyle,
                      background: "#0f172a",
                      color: "#ffffff",
                      border: "none",
                      fontWeight: 700,
                    },
                    savingSettings
                  )}
                >
                  {savingSettings ? "Guardando..." : "Guardar Llaves de la API"}
                </button>
                <button
                  onClick={() => setShowConfigForm(false)}
                  style={secondaryButtonStyle}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Botón para editar llaves si ya existen (solo para admin) */}
          {settings?.configured && settings?.isAdmin && !showConfigForm && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <button
                onClick={() => setShowConfigForm(true)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#2563eb",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ⚙️ Editar Llaves de API (App ID / Secret)
              </button>
            </div>
          )}

          {/* Estado de conexión del usuario y botón OAuth */}
          {!data?.connected ? (
            settings?.configured && (
              <div
                style={{
                  background: "rgba(248, 250, 252, 0.8)",
                  padding: 16,
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  marginTop: 12,
                }}
              >
                <p style={{ fontSize: 13, color: "#334155", margin: "0 0 12px 0" }}>
                  Conecta tu cuenta de <strong>Threads</strong> para publicar hilos desde las oportunidades sociales.
                </p>
                <a
                  href="/api/search-integrations/threads/connect"
                  style={{
                    ...secondaryButtonStyle,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#000000",
                    color: "#ffffff",
                    border: "none",
                    padding: "10px 18px",
                    fontWeight: 700,
                    textDecoration: "none",
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                >
                  🌀 Conectar Threads
                </a>
              </div>
            )
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
              <div
                style={{
                  background: "#f8fafc",
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600, color: "#1e293b" }}>
                  Perfil vinculado: {data.threadsUsername ? `@${data.threadsUsername}` : data.threadsUserId}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  Estado del token: {data.isExpired ? "⚠️ Token expirado (requiere reconectar)" : "✓ Activo (Válido hasta " + (data.expiresAt ? new Date(data.expiresAt).toLocaleDateString("es-US") : "60 días") + ")"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  style={disabledStyle(secondaryButtonStyle, disconnecting)}
                >
                  {disconnecting ? "Desconectando..." : "Desconectar Threads"}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {message && (
        <p style={{ fontSize: 13, color: "#16a34a", marginTop: 10, fontWeight: 600 }}>
          {message}
        </p>
      )}
    </section>
  );
}
