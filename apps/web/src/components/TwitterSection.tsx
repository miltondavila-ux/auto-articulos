"use client";

import { useEffect, useState } from "react";
import {
  disabledStyle,
  h2Style,
  inputStyle,
  secondaryButtonStyle,
  sectionStyle,
} from "./dashboard-ui";

interface ApiSettings {
  configured: boolean;
  clientId: string | null;
  rawClientId?: string;
  isAdmin?: boolean;
}

interface TwitterConnection {
  connected: boolean;
  twitterUsername?: string;
  twitterUserId?: string;
  isExpired?: boolean;
}

export default function TwitterSection() {
  const [settings, setSettings] = useState<ApiSettings | null>(null);
  const [connection, setConnection] = useState<TwitterConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setLoading(true);
      const [settingsRes, connectionRes] = await Promise.all([
        fetch("/api/search-integrations/twitter/settings"),
        fetch("/api/search-integrations/twitter"),
      ]);
      setSettings(await settingsRes.json());
      setConnection(
        connectionRes.ok
          ? await connectionRes.json()
          : { connected: false },
      );
    } catch {
      setSettings({ configured: false, clientId: null });
      setConnection({ connected: false });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEditing() {
    setEditing(true);
    setClientId(settings?.rawClientId || "");
    setClientSecret("");
    setMessage("");
  }

  async function saveSettings() {
    if (!clientId.trim() || !clientSecret.trim()) {
      setMessage("Debes ingresar el Client ID y el Client Secret.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/search-integrations/twitter/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: clientId.trim(), clientSecret: clientSecret.trim() }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || "No se pudieron guardar las credenciales.");
        return;
      }

      setMessage("Credenciales guardadas correctamente.");
      setEditing(false);
      setClientSecret("");
      await load();
    } catch {
      setMessage("Error de conexión al guardar las credenciales.");
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    if (!confirm("¿Deseas desconectar X (Twitter)?")) return;

    setDisconnecting(true);
    setMessage("");
    try {
      const response = await fetch("/api/search-integrations/twitter", { method: "DELETE" });
      if (!response.ok) throw new Error();
      setMessage("X (Twitter) fue desconectado.");
      await load();
    } catch {
      setMessage("No se pudo desconectar X (Twitter).");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <section style={sectionStyle}>
      <h2 style={{ ...h2Style, margin: 0 }}>X (Twitter) API</h2>
      <p style={{ color: "#64748b", fontSize: 12, margin: "4px 0 0" }}>
        Publica tweets automáticamente cuando se publiquen artículos.
      </p>

      {loading ? (
        <p style={{ color: "#64748b", fontSize: 13 }}>Cargando configuración...</p>
      ) : (
        <>
          {/* Bloque de credenciales */}
          <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 16, paddingTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <strong style={{ color: "#1e293b", fontSize: 14 }}>Credenciales de la App</strong>
                <p style={{ color: "#64748b", fontSize: 12, margin: "3px 0 0" }}>
                  Client ID y Client Secret de tu app en el Developer Portal de X.
                </p>
              </div>
              <span style={{ color: settings?.configured ? "#16a34a" : "#92400e", fontSize: 12, fontWeight: 700 }}>
                {settings?.configured ? "Configurada" : "Sin configurar"}
              </span>
            </div>

            {settings?.isAdmin && !editing && (
              <div style={{ marginTop: 12 }}>
                {settings.configured && (
                  <p style={{ color: "#475569", fontSize: 13 }}>Client ID guardado: {settings.clientId}</p>
                )}
                <button onClick={startEditing} style={secondaryButtonStyle}>
                  {settings.configured ? "Editar credenciales" : "Configurar credenciales"}
                </button>
              </div>
            )}

            {settings?.isAdmin && editing && (
              <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                <label style={{ color: "#475569", fontSize: 12, fontWeight: 600 }}>
                  Client ID
                  <input value={clientId} onChange={(event) => setClientId(event.target.value)} style={inputStyle} />
                </label>
                <label style={{ color: "#475569", fontSize: 12, fontWeight: 600 }}>
                  Client Secret
                  <input type="password" value={clientSecret} onChange={(event) => setClientSecret(event.target.value)} style={inputStyle} />
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={saveSettings}
                    disabled={saving}
                    style={disabledStyle(
                      { ...secondaryButtonStyle, background: "#0f172a", color: "#fff" },
                      saving,
                    )}
                  >
                    {saving ? "Guardando..." : "Guardar credenciales"}
                  </button>
                  <button onClick={() => setEditing(false)} style={secondaryButtonStyle}>Cancelar</button>
                </div>
              </div>
            )}
          </div>

          {/* Bloque de conexión */}
          <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 18, paddingTop: 16 }}>
            <strong style={{ color: "#1e293b", fontSize: 14 }}>Conectar cuenta</strong>
            <p style={{ color: "#64748b", fontSize: 12, margin: "3px 0 12px" }}>
              Auto Artículos no guarda contraseñas. La autorización se realiza directamente en X.
            </p>

            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
              <strong style={{ color: "#1e293b" }}>Requisitos para conectar X (Twitter):</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                <li>Tener una cuenta de <strong>Developer en X</strong> (<a href="https://developer.x.com" target="_blank" rel="noopener noreferrer" style={{ color: "#6366f1" }}>developer.x.com</a>)</li>
                <li>Crear un <strong>Proyecto y App</strong> en el Developer Portal</li>
                <li>Configurar <strong>User authentication settings</strong> con permisos de lectura y escritura</li>
                <li>Generar el <strong>Client ID</strong> y <strong>Client Secret</strong> en la sección Keys and Tokens</li>
                <li>Establecer el <strong>Callback URL</strong>: <code>http://localhost:3000/api/search-integrations/twitter/callback</code></li>
                <li>Establecer el <strong>Website URL</strong>: la URL de tu sitio en producción</li>
              </ul>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {connection?.connected ? (
                <button
                  onClick={disconnect}
                  disabled={disconnecting}
                  style={disabledStyle(secondaryButtonStyle, disconnecting)}
                >
                  {disconnecting ? "Desconectando..." : `Desconectar X${connection.twitterUsername ? ` (@${connection.twitterUsername})` : ""}`}
                </button>
              ) : (
                <a
                  href="/api/search-integrations/twitter/connect"
                  style={{ ...secondaryButtonStyle, display: "inline-flex", background: "#000", color: "#fff", border: "none", textDecoration: "none", fontWeight: 700 }}
                >
                  Conectar X (Twitter)
                </a>
              )}
            </div>
          </div>
        </>
      )}

      {message && <p style={{ color: "#16a34a", fontSize: 13 }}>{message}</p>}
    </section>
  );
}
