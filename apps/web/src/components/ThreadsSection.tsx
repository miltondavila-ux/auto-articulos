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

          {(allowThreads || allowInstagram || allowFacebook) && (
          <div style={{ marginTop: 18 }}>
            {/*
              Instrucciones en pasos, no en requisitos sueltos. El primero es el
              que más falla y nadie lo dice: si no tienes la sesión abierta, el
              botón te lleva a una pantalla de inicio de sesión y la conexión se
              queda a medias. Pedido de Milton (19/8/2026).
            */}
            <div className="row" style={{ padding: 16, marginBottom: 14, fontSize: 13, display: "block" }}>
              <strong style={{ color: "#1d1d1f", fontSize: 14 }}>
                Antes de pulsar el botón, haz esto
              </strong>
              <ol style={{ margin: "10px 0 0", paddingLeft: 20, color: "#1d1d1f", lineHeight: 1.6 }}>
                <li style={{ marginBottom: 8 }}>
                  <strong>Abre la red social y deja la sesión iniciada</strong>, en
                  otra pestaña de este mismo navegador o en tu teléfono. Es el paso
                  que más falla: si no has iniciado sesión, el botón te llevará a
                  una pantalla de acceso y la conexión se queda a medias.
                </li>
                <li style={{ marginBottom: 8 }}>
                  <strong>Comprueba que entras con la cuenta correcta.</strong> Si
                  manejas varias, cierra las demás o usa una ventana privada: se
                  conectará la que esté abierta en ese momento.
                </li>
                <li>
                  <strong>Vuelve aquí y pulsa el botón.</strong> Se abrirá la
                  pantalla de la red social para que autorices. Acepta y te
                  devuelve solo a esta página.
                </li>
              </ol>
            </div>

            <strong style={{ color: "#1d1d1f", fontSize: 14 }}>Conectar cuentas</strong>
            <p className="lead-copy" style={{ fontSize: 13, margin: "3px 0 12px" }}>
              Tú autorizas directamente en Meta. Nosotros nunca vemos ni
              guardamos tu contraseña.
            </p>

            {allowInstagram && !instagramConnection?.connected && (
              <div className="row" style={{ padding: 16, marginBottom: 14, fontSize: 13, display: "block" }}>
                <strong style={{ color: "#1d1d1f", fontSize: 14 }}>
                  Instagram y Facebook se conectan juntos
                </strong>
                <p style={{ margin: "6px 0 10px", color: "#6e6e73" }}>
                  Son la misma autorización de Meta: con un solo permiso quedan
                  conectados los dos. No busques un botón aparte para Facebook,
                  no hace falta.
                </p>
                <strong style={{ color: "#1d1d1f", fontSize: 14 }}>
                  Instagram necesita además tres cosas
                </strong>
                <p style={{ margin: "6px 0 10px", color: "#6e6e73" }}>
                  Instagram no deja publicar desde fuera a las cuentas
                  personales. Si te falta alguna de estas tres, la conexión
                  fallará aunque hagas todo lo demás bien:
                </p>
                <ol style={{ margin: 0, paddingLeft: 20, color: "#1d1d1f", lineHeight: 1.6 }}>
                  <li style={{ marginBottom: 6 }}>
                    Que tu Instagram sea <strong>Profesional</strong> (Empresa o
                    Creador). Se cambia gratis desde la app: Ajustes → Tipo de
                    cuenta y herramientas.
                  </li>
                  <li style={{ marginBottom: 6 }}>
                    Que esa cuenta esté <strong>vinculada a una Página de
                    Facebook</strong>. No vale un perfil personal de Facebook:
                    tiene que ser una Página.
                  </li>
                  <li>
                    Que tengas acceso a esa Página desde{" "}
                    <strong>Meta Business Suite</strong>, que es donde Meta
                    gestiona los permisos.
                  </li>
                </ol>
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

              {/*
                Un solo botón para Instagram y Facebook: los dos salían del
                MISMO permiso de Meta y apuntaban a la misma dirección, así que
                dos botones hacían pensar que eran dos conexiones distintas. El
                de Facebook además solo lo veían los administradores.
              */}
              {(allowInstagram || allowFacebook) &&
                (instagramConnection?.connected || facebookPageConnection?.connected ? (
                  <button
                    onClick={() => disconnect("facebook")}
                    disabled={disconnecting === "facebook"}
                    className="secondary"
                    style={disabledStyle(secondaryButtonStyle, disconnecting === "facebook")}
                  >
                    {disconnecting === "facebook"
                      ? "Desconectando..."
                      : `Desconectar Instagram y Facebook${
                          instagramConnection?.instagramUsername
                            ? ` (@${instagramConnection.instagramUsername})`
                            : facebookPageConnection?.facebookPageName
                              ? ` (${facebookPageConnection.facebookPageName})`
                              : ""
                        }`}
                  </button>
                ) : (
                  <a
                    href="/api/search-integrations/instagram/connect"
                    className="secondary"
                    style={{ ...secondaryButtonStyle, textDecoration: "none", display: "inline-flex" }}
                  >
                    Conectar Instagram y Facebook
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
