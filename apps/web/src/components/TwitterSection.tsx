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
      <p className="lead-copy" style={{ fontSize: 13, margin: "4px 0 0" }}>
        Publica tweets automáticamente cuando se publiquen artículos.
      </p>

      {loading ? (
        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Cargando configuración...</p>
      ) : (
        <>
          <div style={{ borderTop: "1px solid #e5e5ea", marginTop: 16, paddingTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <strong style={{ color: "#1d1d1f", fontSize: 14 }}>Credenciales de la App</strong>
                <p className="lead-copy" style={{ fontSize: 12, margin: "2px 0 0" }}>
                  Client ID y Client Secret del Developer Portal de X.
                </p>
              </div>
              <span style={{ color: settings?.configured ? "#16803c" : "#8a4b08", fontSize: 12, fontWeight: 600 }}>
                {settings?.configured ? "✓ Configurada" : "Sin configurar"}
              </span>
            </div>

            {settings?.isAdmin && !editing && (
              <div style={{ marginTop: 12 }}>
                {settings.configured && (
                  <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>Client ID: {settings.clientId}</p>
                )}
                <button onClick={startEditing} className="secondary" style={secondaryButtonStyle}>
                  {settings.configured ? "Editar credenciales" : "Configurar credenciales"}
                </button>
              </div>
            )}

            {settings?.isAdmin && editing && (
              <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                <label style={{ color: "#1d1d1f", fontSize: 12, fontWeight: 500 }}>
                  Client ID
                  <input value={clientId} onChange={(event) => setClientId(event.target.value)} style={inputStyle} />
                </label>
                <label style={{ color: "#1d1d1f", fontSize: 12, fontWeight: 500 }}>
                  Client Secret
                  <input type="password" value={clientSecret} onChange={(event) => setClientSecret(event.target.value)} style={inputStyle} />
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={saveSettings}
                    disabled={saving}
                    style={{
                      ...secondaryButtonStyle,
                      background: "#0071e3",
                      color: "#ffffff",
                      border: "none",
                    }}
                  >
                    {saving ? "Guardando..." : "Guardar credenciales"}
                  </button>
                  <button onClick={() => setEditing(false)} className="secondary" style={secondaryButtonStyle}>Cancelar</button>
                </div>
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid #e5e5ea", marginTop: 18, paddingTop: 16 }}>
            <strong style={{ color: "#1d1d1f", fontSize: 14 }}>Conectar cuenta</strong>
            <p className="lead-copy" style={{ fontSize: 13, margin: "3px 0 12px" }}>
              La autorización se realiza directamente en X.
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {connection?.connected ? (
                <button
                  onClick={disconnect}
                  disabled={disconnecting}
                  className="secondary"
                  style={disabledStyle(secondaryButtonStyle, disconnecting)}
                >
                  {disconnecting ? "Desconectando..." : `Desconectar X${connection.twitterUsername ? ` (@${connection.twitterUsername})` : ""}`}
                </button>
              ) : (
                <a
                  href="/api/search-integrations/twitter/connect"
                  className="secondary"
                  style={{ ...secondaryButtonStyle, textDecoration: "none", display: "inline-flex" }}
                >
                  Conectar X (Twitter)
                </a>
              )}
            </div>
          </div>
        </>
      )}

      {message && <p style={{ color: "#16803c", fontSize: 13, marginTop: 10 }}>{message}</p>}
    </section>
  );
}
