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
        setMessage("✓ Llaves de Meta Threads API guardadas correctamente con cifrado AES-256-GCM.");
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
    if (!confirm("¿Estás seguro de que deseas desconectar tu cuenta de Meta Threads?")) {
      return;
    }
    setDisconnecting(true);
    setMessage("");
    try {
      await fetch("/api/search-integrations/threads", { method: "DELETE" });
      setMessage("Cuenta de Meta Threads desconectada.");
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
            <h2 style={{ ...h2Style, margin: 0 }}>Meta Threads API</h2>
            <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0 0" }}>
              Publicación automática de Hilos (Resumen + Imagen + Enlace) tras divulgar cada artículo.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {settings?.configured && (
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
          {/* Bloque de aviso si falta configurar las llaves globales (App ID / App Secret) */}
          {!settings?.configured && !showConfigForm && (
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
                ⚠️ Se requieren las llaves globales de la API de Threads (Meta Developers)
              </div>
              <p style={{ fontSize: 12, color: "#78350f", margin: "4px 0 10px 0" }}>
                Para permitir la conexión OAuth, ingresa tu <strong>App ID</strong> y <strong>App Secret</strong> obtenidos en Meta for Developers. Tus llaves se guardarán cifradas con <strong>AES-256-GCM</strong>.
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

          {/* Formulario expandible para configurar o actualizar App ID / App Secret */}
          {(showConfigForm || (!settings?.configured && showConfigForm)) && (
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
                ⚙️ Configuración General de Credenciales de Meta Threads
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

          {/* Botón para editar llaves si ya existen */}
          {settings?.configured && !showConfigForm && (
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
                Conecta tu cuenta de <strong>Meta Threads</strong> para que tus artículos se publiquen automáticamente en tu perfil con un resumen generado por IA e imagen destacada.
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
                🌀 Conectar Meta Threads
              </a>
            </div>
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
