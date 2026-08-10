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
  appId: string | null;
  rawAppId?: string;
  isAdmin?: boolean;
}

interface ThreadsConnection {
  connected: boolean;
  threadsUsername?: string;
  threadsUserId?: string;
  isExpired?: boolean;
}

interface InstagramConnection {
  connected: boolean;
  instagramUsername?: string;
  instagramBusinessAccountId?: string;
  isExpired?: boolean;
}

type CredentialType = "meta" | "threads";

export default function ThreadsSection() {
  const [metaSettings, setMetaSettings] = useState<ApiSettings | null>(null);
  const [threadsSettings, setThreadsSettings] = useState<ApiSettings | null>(null);
  const [threadsConnection, setThreadsConnection] = useState<ThreadsConnection | null>(null);
  const [instagramConnection, setInstagramConnection] = useState<InstagramConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CredentialType | null>(null);
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState<CredentialType | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setLoading(true);
      const [metaResponse, threadsResponse, threadsConnectionResponse, instagramConnectionResponse] = await Promise.all([
        fetch("/api/search-integrations/instagram/settings"),
        fetch("/api/search-integrations/threads/settings"),
        fetch("/api/search-integrations/threads"),
        fetch("/api/search-integrations/instagram"),
      ]);
      setMetaSettings(await metaResponse.json());
      setThreadsSettings(await threadsResponse.json());
      setThreadsConnection(
        threadsConnectionResponse.ok
          ? await threadsConnectionResponse.json()
          : { connected: false },
      );
      setInstagramConnection(
        instagramConnectionResponse.ok
          ? await instagramConnectionResponse.json()
          : { connected: false },
      );
    } catch {
      setMetaSettings({ configured: false, appId: null });
      setThreadsSettings({ configured: false, appId: null });
      setThreadsConnection({ connected: false });
      setInstagramConnection({ connected: false });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEditing(type: CredentialType) {
    const current = type === "meta" ? metaSettings : threadsSettings;
    setEditing(type);
    setAppId(current?.rawAppId || "");
    setAppSecret("");
    setMessage("");
  }

  async function saveSettings() {
    if (!editing || !appId.trim() || !appSecret.trim()) {
      setMessage("Debes ingresar el App ID y el App Secret.");
      return;
    }

    setSaving(true);
    setMessage("");
    const endpoint = editing === "meta"
      ? "/api/search-integrations/instagram/settings"
      : "/api/search-integrations/threads/settings";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: appId.trim(), appSecret: appSecret.trim() }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || "No se pudieron guardar las credenciales.");
        return;
      }

      setMessage("Credenciales guardadas correctamente.");
      setEditing(null);
      setAppSecret("");
      await load();
    } catch {
      setMessage("Error de conexión al guardar las credenciales.");
    } finally {
      setSaving(false);
    }
  }

  async function disconnect(type: CredentialType) {
    const network = type === "meta" ? "Instagram" : "Threads";
    if (!confirm(`¿Deseas desconectar ${network}?`)) return;

    setDisconnecting(type);
    setMessage("");
    try {
      const endpoint = type === "meta"
        ? "/api/search-integrations/instagram"
        : "/api/search-integrations/threads";
      const response = await fetch(endpoint, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setMessage(`${network} fue desconectado.`);
      await load();
    } catch {
      setMessage(`No se pudo desconectar ${network}.`);
    } finally {
      setDisconnecting(null);
    }
  }

  function credentialBlock(
    type: CredentialType,
    title: string,
    description: string,
    settings: ApiSettings | null,
  ) {
    const isEditing = editing === type;

    return (
      <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 16, paddingTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <strong style={{ color: "#1e293b", fontSize: 14 }}>{title}</strong>
            <p style={{ color: "#64748b", fontSize: 12, margin: "3px 0 0" }}>{description}</p>
          </div>
          <span style={{ color: settings?.configured ? "#16a34a" : "#92400e", fontSize: 12, fontWeight: 700 }}>
            {settings?.configured ? "Configurada" : "Sin configurar"}
          </span>
        </div>

        {settings?.isAdmin && !isEditing && (
          <div style={{ marginTop: 12 }}>
            {settings.configured && (
              <p style={{ color: "#475569", fontSize: 13 }}>App ID guardado: {settings.appId}</p>
            )}
            <button onClick={() => startEditing(type)} style={secondaryButtonStyle}>
              {settings.configured ? "Editar credenciales" : "Configurar credenciales"}
            </button>
          </div>
        )}

        {settings?.isAdmin && isEditing && (
          <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
            <label style={{ color: "#475569", fontSize: 12, fontWeight: 600 }}>
              App ID
              <input value={appId} onChange={(event) => setAppId(event.target.value)} style={inputStyle} />
            </label>
            <label style={{ color: "#475569", fontSize: 12, fontWeight: 600 }}>
              App Secret
              <input type="password" value={appSecret} onChange={(event) => setAppSecret(event.target.value)} style={inputStyle} />
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
              <button onClick={() => setEditing(null)} style={secondaryButtonStyle}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <section style={sectionStyle}>
      <h2 style={{ ...h2Style, margin: 0 }}>Meta API</h2>
      <p style={{ color: "#64748b", fontSize: 12, margin: "4px 0 0" }}>
        Credenciales de las integraciones sociales de Meta.
      </p>

      {loading ? (
        <p style={{ color: "#64748b", fontSize: 13 }}>Cargando configuración...</p>
      ) : (
        <>
          {credentialBlock(
            "meta",
            "Meta principal",
            "Credenciales principales para Instagram y Facebook.",
            metaSettings,
          )}
          {credentialBlock(
            "threads",
            "Threads API",
            "Credenciales específicas del producto Threads.",
            threadsSettings,
          )}

          <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 18, paddingTop: 16 }}>
            <strong style={{ color: "#1e293b", fontSize: 14 }}>Conectar cuentas</strong>
            <p style={{ color: "#64748b", fontSize: 12, margin: "3px 0 12px" }}>
              Auto Artículos no guarda contraseñas de redes sociales. La autorización se realiza directamente en Meta.
            </p>

            {!instagramConnection?.connected && (
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
                <strong style={{ color: "#1e293b" }}>Requisitos para conectar Instagram:</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  <li>Tener una <strong>cuenta de Instagram Profesional</strong> (Business o Creator)</li>
                  <li>Tener una <strong>Página de Facebook</strong> vinculada a esa cuenta de Instagram</li>
                  <li>Tener acceso a <strong>Meta Business Suite</strong> (<a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" style={{ color: "#6366f1" }}>business.facebook.com</a>)</li>
                  <li>Ser <strong>Administrador o Editor</strong> de la Página de Facebook</li>
                </ul>
                <p style={{ margin: "8px 0 0", color: "#94a3b8" }}>
                  ¿No tienes cuenta profesional? <a href="https://help.instagram.com/502981923235522" target="_blank" rel="noopener noreferrer" style={{ color: "#6366f1" }}>Conviértela aquí</a>
                </p>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {threadsConnection?.connected ? (
                <button
                  onClick={() => disconnect("threads")}
                  disabled={disconnecting === "threads"}
                  style={disabledStyle(secondaryButtonStyle, disconnecting === "threads")}
                >
                  {disconnecting === "threads" ? "Desconectando..." : `Desconectar Threads${threadsConnection.threadsUsername ? ` (@${threadsConnection.threadsUsername})` : ""}`}
                </button>
              ) : (
                <a
                  href="/api/search-integrations/threads/connect"
                  style={{ ...secondaryButtonStyle, display: "inline-flex", background: "#000", color: "#fff", border: "none", textDecoration: "none", fontWeight: 700 }}
                >
                  Conectar Threads
                </a>
              )}

              {instagramConnection?.connected ? (
                <button
                  onClick={() => disconnect("meta")}
                  disabled={disconnecting === "meta"}
                  style={disabledStyle(secondaryButtonStyle, disconnecting === "meta")}
                >
                  {disconnecting === "meta" ? "Desconectando..." : `Desconectar Instagram${instagramConnection.instagramUsername ? ` (@${instagramConnection.instagramUsername})` : ""}`}
                </button>
              ) : (
                <a
                  href="/api/search-integrations/instagram/connect"
                  style={{ ...secondaryButtonStyle, display: "inline-flex", background: "linear-gradient(135deg, #f58529, #dd2a7b, #8134af)", color: "#fff", border: "none", textDecoration: "none", fontWeight: 700 }}
                >
                  Conectar Instagram
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
