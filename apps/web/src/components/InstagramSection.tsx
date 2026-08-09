"use client";

import { useEffect, useState } from "react";
import {
  sectionStyle,
  h2Style,
  inputStyle,
  secondaryButtonStyle,
  disabledStyle,
} from "./dashboard-ui";

interface InstagramData {
  connected: boolean;
  instagramBusinessAccountId?: string;
  instagramUsername?: string;
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

export default function InstagramSection() {
  const [data, setData] = useState<InstagramData | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState("");

  const [showConfigForm, setShowConfigForm] = useState(false);
  const [appIdInput, setAppIdInput] = useState("");
  const [appSecretInput, setAppSecretInput] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  const redirectUri = "https://auto-articulos-web.vercel.app/api/search-integrations/instagram/callback";

  async function load() {
    try {
      setLoading(true);
      const [resData, resSettings] = await Promise.all([
        fetch("/api/search-integrations/instagram"),
        fetch("/api/search-integrations/instagram/settings"),
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
      const res = await fetch("/api/search-integrations/instagram/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: appIdInput.trim(),
          appSecret: appSecretInput.trim(),
        }),
      });

      const result = await res.json();
      if (res.ok) {
        setMessage("✓ Llaves de Instagram API guardadas correctamente con cifrado AES-256-GCM.");
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
    if (!confirm("¿Estás seguro de que deseas desconectar tu cuenta de Instagram?")) {
      return;
    }
    setDisconnecting(true);
    setMessage("");
    try {
      await fetch("/api/search-integrations/instagram", { method: "DELETE" });
      setMessage("Cuenta de Instagram desconectada.");
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
              background: "linear-gradient(135deg, #f58529 0%, #dd2a7b 50%, #8134af 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: 20,
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
          >
            IG
          </div>
          <div>
            <h2 style={{ ...h2Style, margin: 0 }}>Instagram API</h2>
            <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0 0" }}>
               3 tipos de contenido: Carousels (hasta 5 imágenes), imágenes estilo Reel, e Infografías.
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
              🟢 Conectado {data.instagramUsername ? `@${data.instagramUsername}` : ""}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#64748b", margin: "12px 0 0 0" }}>
          Cargando estado de la integración de Instagram...
        </p>
      ) : (
        <>
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
                ⚠️ Integración con Instagram no lista
              </div>
              <p style={{ fontSize: 12, color: "#7f1d1d", margin: "4px 0 0 0" }}>
                La conexión de Instagram no ha sido configurada a nivel global de plataforma por el administrador del sistema. Por favor, solicita al administrador de 10MinutesWebsite que configure las llaves de la API de Meta.
              </p>
            </div>
          )}

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
                ⚠️ Se requieren las llaves globales de la API de Instagram (Meta Developers)
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
                ⚙️ Configuración de Credenciales de Instagram (Rol: Administrador)
              </div>

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
                      "Actúa como un experto en Meta Developers. Necesito configurar la API de Instagram (Graph API) para mi aplicación. Por favor, guíame paso a paso para: 1. Crear una cuenta y una aplicación de tipo Empresarial/Consumidor en developers.facebook.com 2. Configurar la URL de redirección (Redirect URI) de OAuth con el valor: https://auto-articulos-web.vercel.app/api/search-integrations/instagram/callback 3. Agregar los productos Instagram Graph API y Pages. 4. Solicitar los permisos instagram_basic, instagram_content_publish, pages_show_list 5. Obtener el App ID y el App Secret. Explícame de manera extremadamente sencilla, paso a paso, dónde hacer clic."
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
                  <li>Crea una aplicación de tipo <strong>Empresarial</strong> o agrega los productos <strong>Instagram Graph API</strong> y <strong>Pages</strong> a una app existente.</li>
                  <li>
                    En Configuración de la app ➔ Configuración básica, añade esta dirección como <strong>URI de redireccionamiento de OAuth</strong> válida:
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
                  <li>Solicita los permisos <strong>instagram_basic</strong>, <strong>instagram_content_publish</strong> y <strong>pages_show_list</strong> (Revisión de la app requerida por Meta para publicar).</li>
                  <li>Copia el <strong>App ID</strong> y el <strong>App Secret</strong> y pégalos abajo.</li>
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
                  Conecta tu cuenta profesional de <strong>Instagram</strong> (Business o Creator) para que los temas más populares de tu sitio se publiquen automáticamente como <strong>Carousels</strong> con varias imágenes generadas por IA y descripciones profesionales.
                </p>
                <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 12px 0" }}>
                  ⚠️ Requisitos: Cuenta de Instagram Business o Creator vinculada a una Página de Facebook. La app de Meta debe tener los permisos <strong>instagram_basic</strong>, <strong>instagram_content_publish</strong> y <strong>pages_show_list</strong> aprobados por Meta.
                </p>
                <a
                  href="/api/search-integrations/instagram/connect"
                  style={{
                    ...secondaryButtonStyle,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "linear-gradient(135deg, #f58529 0%, #dd2a7b 50%, #8134af 100%)",
                    color: "#ffffff",
                    border: "none",
                    padding: "10px 18px",
                    fontWeight: 700,
                    textDecoration: "none",
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                >
                  📸 Conectar Instagram
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
                  Perfil vinculado: {data.instagramUsername ? `@${data.instagramUsername}` : data.instagramBusinessAccountId}
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
                  {disconnecting ? "Desconectando..." : "Desconectar Instagram"}
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
