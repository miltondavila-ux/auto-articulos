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

interface LinkedInConnection {
  connected: boolean;
  linkedinUsername?: string;
  linkedinUserId?: string;
  isExpired?: boolean;
}

export default function LinkedInSection() {
  const [settings, setSettings] = useState<ApiSettings | null>(null);
  const [connection, setConnection] = useState<LinkedInConnection | null>(null);
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
        fetch("/api/search-integrations/linkedin/settings"),
        fetch("/api/search-integrations/linkedin"),
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
      const response = await fetch("/api/search-integrations/linkedin/settings", {
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
    if (!confirm("¿Deseas desconectar LinkedIn?")) return;

    setDisconnecting(true);
    setMessage("");
    try {
      const response = await fetch("/api/search-integrations/linkedin", { method: "DELETE" });
      if (!response.ok) throw new Error();
      setMessage("LinkedIn fue desconectado.");
      await load();
    } catch {
      setMessage("No se pudo desconectar LinkedIn.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <section style={sectionStyle}>
      <h2 style={{ ...h2Style, margin: 0 }}>LinkedIn API</h2>
      <p style={{ color: "#64748b", fontSize: 12, margin: "4px 0 0" }}>
        Publica artículos automáticamente en LinkedIn. Gratuito.
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
                  Client ID y Client Secret de tu app en el Developer Portal de LinkedIn.
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
              Auto Artículos no guarda contraseñas. La autorización se realiza directamente en LinkedIn.
            </p>

            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12, color: "#166534", lineHeight: 1.5 }}>
              <strong style={{ color: "#15803d" }}>Requisitos para conectar LinkedIn:</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                <li>Tener una cuenta de <strong>LinkedIn</strong></li>
                <li>Crear una app en <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noopener noreferrer" style={{ color: "#15803d" }}>linkedin.com/developers/apps</a></li>
                <li>En <strong>Products</strong>, solicitar acceso a <strong>Share on LinkedIn</strong> (aprobación inmediata)</li>
                <li>En <strong>Auth</strong>, copiar el <strong>Client ID</strong> y <strong>Client Secret</strong></li>
                <li>Agregar la <strong>Authorized Redirect URL</strong>: <code>http://localhost:3000/api/search-integrations/linkedin/callback</code></li>
              </ul>
              <p style={{ margin: "8px 0 0", color: "#16a34a", fontWeight: 600 }}>
                ✓ Share on LinkedIn es GRATISO — no hay costos por publicar.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {connection?.connected ? (
                <button
                  onClick={disconnect}
                  disabled={disconnecting}
                  style={disabledStyle(secondaryButtonStyle, disconnecting)}
                >
                  {disconnecting ? "Desconectando..." : `Desconectar LinkedIn${connection.linkedinUsername ? ` (${connection.linkedinUsername})` : ""}`}
                </button>
              ) : (
                <a
                  href="/api/search-integrations/linkedin/connect"
                  style={{ ...secondaryButtonStyle, display: "inline-flex", background: "#0077b5", color: "#fff", border: "none", textDecoration: "none", fontWeight: 700 }}
                >
                  Conectar LinkedIn
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
