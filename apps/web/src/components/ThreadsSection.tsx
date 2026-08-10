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

type CredentialType = "meta" | "threads";

export default function ThreadsSection() {
  const [metaSettings, setMetaSettings] = useState<ApiSettings | null>(null);
  const [threadsSettings, setThreadsSettings] = useState<ApiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CredentialType | null>(null);
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setLoading(true);
      const [metaResponse, threadsResponse] = await Promise.all([
        fetch("/api/search-integrations/instagram/settings"),
        fetch("/api/search-integrations/threads/settings"),
      ]);
      setMetaSettings(await metaResponse.json());
      setThreadsSettings(await threadsResponse.json());
    } catch {
      setMetaSettings({ configured: false, appId: null });
      setThreadsSettings({ configured: false, appId: null });
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
        </>
      )}

      {message && <p style={{ color: "#16a34a", fontSize: 13 }}>{message}</p>}
    </section>
  );
}
