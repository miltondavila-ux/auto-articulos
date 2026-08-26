"use client";

import { useEffect, useState } from "react";
import PasosAntesDeConectar from "@/components/PasosAntesDeConectar";
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

interface FacebookPageConnection {
  connected: boolean;
  facebookPageName?: string;
  isExpired?: boolean;
}

type CredentialType = "meta" | "threads" | "facebook";

interface ThreadsSectionProps {
  allowThreads?: boolean;
  allowInstagram?: boolean;
  allowFacebook?: boolean;
  isAdmin?: boolean;
}

export default function ThreadsSection({ allowThreads = true, allowInstagram = true, allowFacebook = false, isAdmin = false }: ThreadsSectionProps) {
  const [metaSettings, setMetaSettings] = useState<ApiSettings | null>(null);
  const [threadsSettings, setThreadsSettings] = useState<ApiSettings | null>(null);
  const [threadsConnection, setThreadsConnection] = useState<ThreadsConnection | null>(null);
  const [instagramConnection, setInstagramConnection] = useState<InstagramConnection | null>(null);
  const [facebookPageConnection, setFacebookPageConnection] = useState<FacebookPageConnection | null>(null);
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
      const [metaResponse, threadsResponse, threadsConnectionResponse, instagramConnectionResponse, facebookPageResponse] = await Promise.all([
        fetch("/api/search-integrations/instagram/settings"),
        fetch("/api/search-integrations/threads/settings"),
        fetch("/api/search-integrations/threads"),
        fetch("/api/search-integrations/instagram"),
        fetch("/api/search-integrations/facebook-pages"),
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
      setFacebookPageConnection(facebookPageResponse.ok ? await facebookPageResponse.json() : { connected: false });
    } catch {
      setMetaSettings({ configured: false, appId: null });
      setThreadsSettings({ configured: false, appId: null });
      setThreadsConnection({ connected: false });
      setInstagramConnection({ connected: false });
      setFacebookPageConnection({ connected: false });
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
    const network = type === "meta" ? "Instagram" : type === "facebook" ? "Facebook Page" : "Threads";
    if (!confirm(`¿Deseas desconectar ${network}?`)) return;

    setDisconnecting(type);
    setMessage("");
    try {
    const endpoint = type === "meta"
      ? "/api/search-integrations/instagram"
      : type === "facebook"
      ? "/api/search-integrations/facebook-pages"
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

        {isAdmin && settings?.isAdmin && !isEditing && (
          <div style={{ marginTop: 12 }}>
            {settings.configured && (
              <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>App ID: {settings.appId}</p>
            )}
            <button onClick={() => startEditing(type)} className="secondary" style={secondaryButtonStyle}>
              {settings.configured ? "Editar credenciales" : "Configurar credenciales"}
            </button>
          </div>
        )}

        {isAdmin && settings?.isAdmin && isEditing && (
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
                  background: "#1d1d1f",
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

  function connectionStatus(connected: boolean, label: string, account?: string) {
    return (
      <span style={{ color: connected ? "#16803c" : "#8a4b08", fontSize: 12, fontWeight: 600 }}>
        {connected ? `✓ Conectado — ${label}${account ? ` (${account})` : ""}` : `○ No conectado — ${label}`}
      </span>
    );
  }

  return (
    <section style={sectionStyle}>
      <h2 style={{ ...h2Style, margin: 0 }}>Instagram, Facebook y Threads</h2>
      <p className="lead-copy" style={{ fontSize: 13, margin: "4px 0 0" }}>
        Conecta aquí tus cuentas para que el sistema pueda publicar en ellas.
      </p>

      {loading ? (
        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Cargando configuración...</p>
      ) : (
        <>
          {/*
            Credenciales de la plataforma, no de la persona usuaria: las
            configura el administrador una sola vez para todo el sistema. A un
            usuario normal no le sirven de nada y solo le hacen dudar de si
            tiene que rellenar algo. Se muestran solo a administradores.
          */}
          {isAdmin && (
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
            </>
          )}

          <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
            {allowThreads && connectionStatus(Boolean(threadsConnection?.connected), "Threads", threadsConnection?.threadsUsername ? `@${threadsConnection.threadsUsername}` : undefined)}
            {allowInstagram && connectionStatus(Boolean(instagramConnection?.connected), "Instagram", instagramConnection?.instagramUsername ? `@${instagramConnection.instagramUsername}` : undefined)}
            {allowFacebook && connectionStatus(Boolean(facebookPageConnection?.connected), "Facebook Page", facebookPageConnection?.facebookPageName)}
          </div>

          {(allowThreads || allowInstagram || allowFacebook) && (
          <div style={{ marginTop: 18 }}>
            <PasosAntesDeConectar red="Instagram, Facebook o Threads" />

            <strong style={{ color: "#1d1d1f", fontSize: 14 }}>Conectar cuentas</strong>
            <p className="lead-copy" style={{ fontSize: 13, margin: "3px 0 12px" }}>
              Autorizas directamente en Meta; nunca vemos tu contraseña.
            </p>

            {allowInstagram && !instagramConnection?.connected && (
              <p style={{ fontSize: 13, color: "#6e6e73", margin: "0 0 12px", lineHeight: 1.55 }}>
                Instagram y Facebook se conectan con un mismo permiso de Meta,
                así que no busques un botón aparte. Instagram debe ser una
                cuenta Profesional (Empresa o Creador), vinculada a una Página
                de Facebook y accesible desde Meta Business Suite; con una
                cuenta personal, Meta no permite publicar desde fuera.
              </p>
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
                    {disconnecting === "meta"
                      ? "Desconectando..."
                      : `Desconectar Instagram${instagramConnection.instagramUsername ? ` (@${instagramConnection.instagramUsername})` : ""}`}
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
              {allowFacebook && isAdmin && (facebookPageConnection?.connected ? (
                <button onClick={() => disconnect("facebook")} disabled={disconnecting === "facebook"} className="secondary" style={disabledStyle(secondaryButtonStyle, disconnecting === "facebook")}>
                  {disconnecting === "facebook" ? "Desconectando..." : `Desconectar Facebook Page${facebookPageConnection.facebookPageName ? ` (${facebookPageConnection.facebookPageName})` : ""}`}
                </button>
              ) : (
                <a href="/api/search-integrations/instagram/connect" className="secondary" style={{ ...secondaryButtonStyle, textDecoration: "none", display: "inline-flex" }}>
                  Conectar Facebook Page
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
