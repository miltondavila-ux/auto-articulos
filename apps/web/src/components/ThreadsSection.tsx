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

interface ThreadsSectionProps {
  allowThreads?: boolean;
  allowInstagram?: boolean;
}

export default function ThreadsSection({ allowThreads = true, allowInstagram = true }: ThreadsSectionProps) {
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
      <div style={{ borderTop: "1px solid #e5e5ea", marginTop: 16, paddingTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <strong style={{ color: "#1d1d1f", fontSize: 14 }}>{title}</strong>
            <p className="lead-copy" style={{ fontSize: 12, margin: "2px 0 0" }}>{description}</p>
          </div>
          <span
            style={{
              color: settings?.configured ? "#16803c" : "#8a4b08",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {settings?.configured ? "✓ Configurada" : "Sin configurar"}
          </span>
        </div>

        {settings?.isAdmin && !isEditing && (
          <div style={{ marginTop: 12 }}>
            {settings.configured && (
              <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>App ID: {settings.appId}</p>
            )}
            <button onClick={() => startEditing(type)} className="secondary" style={secondaryButtonStyle}>
              {settings.configured ? "Editar credenciales" : "Configurar credenciales"}
            </button>
          </div>
        )}

        {settings?.isAdmin && isEditing && (
          <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
            <label style={{ color: "#1d1d1f", fontSize: 12, fontWeight: 500 }}>
              App ID
              <input value={appId} onChange={(event) => setAppId(event.target.value)} style={inputStyle} />
            </label>
            <label style={{ color: "#1d1d1f", fontSize: 12, fontWeight: 500 }}>
              App Secret
              <input type="password" value={appSecret} onChange={(event) => setAppSecret(event.target.value)} style={inputStyle} />
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
              <button onClick={() => setEditing(null)} className="secondary" style={secondaryButtonStyle}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <section style={sectionStyle}>
      <h2 style={{ ...h2Style, margin: 0 }}>Meta API</h2>
      <p className="lead-copy" style={{ fontSize: 13, margin: "4px 0 0" }}>
        Credenciales e integraciones sociales de Meta (Instagram y Threads).
      </p>

      {loading ? (
        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Cargando configuración...</p>
      ) : (
        <>
          {credentialBlock(
            "meta",
            "Meta Principal",
            "Credenciales principales para Instagram y Facebook.",
            metaSettings,
          )}
          {credentialBlock(
            "threads",
            "Threads API",
            "Credenciales específicas del producto Threads.",
            threadsSettings,
          )}

          {(allowThreads || allowInstagram) && (
          <div style={{ borderTop: "1px solid #e5e5ea", marginTop: 18, paddingTop: 16 }}>
            <strong style={{ color: "#1d1d1f", fontSize: 14 }}>Conectar cuentas</strong>
            <p className="lead-copy" style={{ fontSize: 13, margin: "3px 0 12px" }}>
              La autorización se realiza directamente en Meta de forma segura.
            </p>

            {allowInstagram && !instagramConnection?.connected && (
              <div className="row" style={{ padding: 14, marginBottom: 14, fontSize: 13 }}>
                <strong style={{ color: "#1d1d1f" }}>Requisitos para conectar Instagram:</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: "#6e6e73" }}>
                  <li>Tener una cuenta de Instagram Profesional (Business o Creator).</li>
                  <li>Tener una Página de Facebook vinculada a esa cuenta.</li>
                  <li>Tener acceso a Meta Business Suite.</li>
                </ul>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {allowThreads && (threadsConnection?.connected ? (
                <button
                  onClick={() => disconnect("threads")}
                  disabled={disconnecting === "threads"}
                  className="secondary"
                  style={disabledStyle(secondaryButtonStyle, disconnecting === "threads")}
                >
                  {disconnecting === "threads" ? "Desconectando..." : `Desconectar Threads${threadsConnection.threadsUsername ? ` (@${threadsConnection.threadsUsername})` : ""}`}
                </button>
              ) : (
                <a
                  href="/api/search-integrations/threads/connect"
                  className="secondary"
                  style={{ ...secondaryButtonStyle, textDecoration: "none", display: "inline-flex" }}
                >
                  Conectar Threads
                </a>
              ))}

              {allowInstagram && (instagramConnection?.connected ? (
                <button
                  onClick={() => disconnect("meta")}
                  disabled={disconnecting === "meta"}
                  className="secondary"
                  style={disabledStyle(secondaryButtonStyle, disconnecting === "meta")}
                >
                  {disconnecting === "meta" ? "Desconectando..." : `Desconectar Instagram${instagramConnection.instagramUsername ? ` (@${instagramConnection.instagramUsername})` : ""}`}
                </button>
              ) : (
                <a
                  href="/api/search-integrations/instagram/connect"
                  className="secondary"
                  style={{ ...secondaryButtonStyle, textDecoration: "none", display: "inline-flex" }}
                >
                  Conectar Instagram
                </a>
              ))}
            </div>
          </div>
          )}
        </>
      )}

      {!allowThreads && !allowInstagram && (
        <p className="notice" style={{ marginTop: 16 }}>
          Las integraciones de Meta no están disponibles para tu cuenta. Contacta al administrador para activarlas.
        </p>
      )}

      {message && <p style={{ color: "#16803c", fontSize: 13, marginTop: 10 }}>{message}</p>}
    </section>
  );
}
