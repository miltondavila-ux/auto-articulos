"use client";

import { useEffect, useState } from "react";
import {
  disabledStyle,
  h2Style,
  inputStyle,
  secondaryButtonStyle,
  sectionStyle,
} from "./dashboard-ui";

interface LinkedInConnection {
  connected: boolean;
  linkedinUsername?: string;
  linkedinUserId?: string;
  isExpired?: boolean;
}

interface ApiSettings {
  configured: boolean;
  clientId: string | null;
  rawClientId?: string;
  isAdmin?: boolean;
}

interface LinkedInSectionProps {
  allowed?: boolean;
}

export default function LinkedInSection({ allowed = true }: LinkedInSectionProps) {
  const [connection, setConnection] = useState<LinkedInConnection | null>(null);
  const [settings, setSettings] = useState<ApiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState("");
  const [syncing, setSyncing] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const ts = Date.now();
      const [connRes, setRes] = await Promise.all([
        fetch(`/api/search-integrations/linkedin?_t=${ts}`, { cache: "no-store" }),
        fetch(`/api/search-integrations/linkedin/settings?_t=${ts}`, { cache: "no-store" }),
      ]);
      setConnection(connRes.ok ? await connRes.json() : { connected: false });
      setSettings(setRes.ok ? await setRes.json() : { configured: false });
    } catch {
      setConnection({ connected: false });
      setSettings({ configured: false, clientId: "" });
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
    if (!confirm("¿Deseas desconectar tu cuenta de LinkedIn?")) return;
    setDisconnecting(true);
    setMessage("");
    try {
      const res = await fetch("/api/search-integrations/linkedin", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setMessage("LinkedIn desconectado.");
      await load();
    } catch {
      setMessage("No se pudo desconectar LinkedIn.");
    } finally {
      setDisconnecting(false);
    }
  }

  async function syncSchema() {
    setSyncing(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/sync-schema", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setMessage(`Base de datos sincronizada correctamente (${data.total} pasos).`);
      } else {
        setMessage(`Sincronización con errores: ${JSON.stringify(data.results.filter((r: any) => !r.ok))}`);
      }
    } catch {
      setMessage("Error al sincronizar la base de datos.");
    } finally {
      setSyncing(false);
    }
  }

  const isConfigured = settings?.configured ?? false;

  return (
    <section style={sectionStyle}>
      <h2 style={{ ...h2Style, margin: 0 }}>LinkedIn API</h2>
      <p style={{ color: "#64748b", fontSize: 12, margin: "4px 0 0" }}>
        Publica artículos automáticamente en LinkedIn. Integración 100% gratuita.
      </p>

      {loading ? (
        <p style={{ color: "#64748b", fontSize: 13 }}>Cargando...</p>
      ) : (
        <>
          {/* Bloque de configuración de Administrador */}
          {settings?.isAdmin && (
            <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 14, paddingTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <strong style={{ color: "#1e293b", fontSize: 13 }}>Credenciales globales de la App</strong>
                  <p style={{ color: "#64748b", fontSize: 11, margin: "2px 0 0" }}>
                    Client ID y Secret de developer.linkedin.com (solo visible para admin).
                  </p>
                </div>
                <span style={{ color: isConfigured ? "#16a34a" : "#92400e", fontSize: 12, fontWeight: 700 }}>
                  {isConfigured ? "Configurada" : "Sin configurar"}
                </span>
              </div>

              {!editing ? (
                <div style={{ marginTop: 10 }}>
                  {isConfigured && (
                    <p style={{ color: "#475569", fontSize: 12, margin: "0 0 8px" }}>
                      Client ID guardado: {settings.clientId}
                    </p>
                  )}
                  <button onClick={startEditing} style={secondaryButtonStyle}>
                    {isConfigured ? "Editar credenciales global" : "Configurar credenciales de LinkedIn"}
                  </button>
                  <button
                    onClick={syncSchema}
                    disabled={syncing}
                    style={disabledStyle({ ...secondaryButtonStyle, marginLeft: 8 }, syncing)}
                    title="Crea las tablas de Twitter/LinkedIn en la base de datos si no existen todavía. Seguro ejecutar varias veces."
                  >
                    {syncing ? "Sincronizando..." : "🛠 Sincronizar base de datos"}
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10, marginTop: 12, background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <label style={{ color: "#475569", fontSize: 12, fontWeight: 600 }}>
                    Client ID
                    <input value={clientId} onChange={(e) => setClientId(e.target.value)} style={inputStyle} placeholder="78nh5bw8fbvw2v" />
                  </label>
                  <label style={{ color: "#475569", fontSize: 12, fontWeight: 600 }}>
                    Client Secret
                    <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} style={inputStyle} placeholder="WPL_AP1..." />
                  </label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
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
          )}

          {/* Bloque de conexión del usuario final */}
          {allowed && (
          <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 16, paddingTop: 16 }}>
            <strong style={{ color: "#1e293b", fontSize: 14 }}>Conectar cuenta de usuario</strong>
            <p style={{ color: "#64748b", fontSize: 12, margin: "3px 0 12px" }}>
              Cada usuario conecta su perfil de LinkedIn autorizando mediante OAuth.
            </p>

            {!isConfigured ? (
              <p style={{ color: "#92400e", fontSize: 13, background: "#fffbeb", border: "1px solid #fef3c7", padding: 10, borderRadius: 8 }}>
                LinkedIn no está configurado todavía. {settings?.isAdmin ? "Usa el botón de arriba para ingresar el Client ID y Client Secret." : "Contacta al administrador para activar esta integración."}
              </p>
            ) : connection?.connected ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ color: "#16a34a", fontSize: 13, fontWeight: 600 }}>
                  ✓ Conectado{connection.linkedinUsername ? ` — ${connection.linkedinUsername}` : ""}
                </span>
                {connection.isExpired && (
                  <span style={{ color: "#dc2626", fontSize: 12 }}>Token expirado</span>
                )}
                <button
                  onClick={disconnect}
                  disabled={disconnecting}
                  style={disabledStyle(secondaryButtonStyle, disconnecting)}
                >
                  {disconnecting ? "Desconectando..." : "Desconectar"}
                </button>
              </div>
            ) : (
              <a
                href="/api/search-integrations/linkedin/connect"
                style={{
                  ...secondaryButtonStyle,
                  display: "inline-flex",
                  background: "#0077b5",
                  color: "#fff",
                  border: "none",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: 14,
                  padding: "10px 20px",
                }}
              >
                Conectar mi cuenta de LinkedIn
              </a>
            )}
          </div>
          )}
        </>
      )}

      {!allowed && (
        <p style={{ color: "#92400e", fontSize: 13, background: "#fffbeb", border: "1px solid #fef3c7", padding: 10, borderRadius: 8, marginTop: 16 }}>
          LinkedIn no está disponible para tu cuenta. Contacta al administrador para activar esta integración.
        </p>
      )}

      {message && <p style={{ color: "#16a34a", fontSize: 13, marginTop: 10 }}>{message}</p>}
    </section>
  );
}
