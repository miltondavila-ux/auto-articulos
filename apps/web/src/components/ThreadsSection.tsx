"use client";

import { useEffect, useState } from "react";
import {
  disabledStyle,
  h2Style,
  inputStyle,
  secondaryButtonStyle,
  sectionStyle,
} from "./dashboard-ui";

interface MetaSettings {
  configured: boolean;
  appId: string | null;
  rawAppId?: string;
  source?: string;
  isAdmin?: boolean;
}

export default function ThreadsSection() {
  const [settings, setSettings] = useState<MetaSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setLoading(true);
      const response = await fetch("/api/search-integrations/threads/settings");
      const result = await response.json();
      setSettings(result);
      if (result.rawAppId) setAppId(result.rawAppId);
    } catch {
      setSettings({ configured: false, appId: null });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSettings() {
    if (!appId.trim() || !appSecret.trim()) {
      setMessage("Debes ingresar el App ID y el App Secret de Meta.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/search-integrations/threads/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: appId.trim(),
          appSecret: appSecret.trim(),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "No se pudieron guardar las credenciales.");
        return;
      }

      setMessage("Credenciales de Meta API guardadas correctamente.");
      setAppSecret("");
      setEditing(false);
      await load();
    } catch {
      setMessage("Error de conexión al guardar las credenciales.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ ...h2Style, margin: 0 }}>Meta API</h2>
          <p style={{ color: "#64748b", fontSize: 12, margin: "4px 0 0" }}>
            Credenciales compartidas para las integraciones de redes sociales de Meta.
          </p>
        </div>
        {settings?.configured && (
          <span style={{ color: "#16a34a", fontSize: 12, fontWeight: 700 }}>
            Configurada
          </span>
        )}
      </div>

      {loading ? (
        <p style={{ color: "#64748b", fontSize: 13 }}>Cargando configuración...</p>
      ) : !settings?.isAdmin ? (
        <p style={{ color: settings?.configured ? "#16a34a" : "#92400e", fontSize: 13 }}>
          {settings?.configured
            ? "Meta API está configurada por el administrador."
            : "Meta API todavía no ha sido configurada por el administrador."}
        </p>
      ) : !editing ? (
        <div style={{ marginTop: 14 }}>
          <p style={{ color: "#475569", fontSize: 13 }}>
            {settings?.configured
              ? `App ID guardado: ${settings.appId}`
              : "Ingresa las credenciales de tu aplicación en Meta for Developers."}
          </p>
          <button onClick={() => setEditing(true)} style={secondaryButtonStyle}>
            {settings?.configured ? "Editar credenciales Meta" : "Configurar Meta API"}
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <label style={{ color: "#475569", fontSize: 12, fontWeight: 600 }}>
            App ID de Meta
            <input
              value={appId}
              onChange={(event) => setAppId(event.target.value)}
              placeholder="App ID"
              style={inputStyle}
            />
          </label>
          <label style={{ color: "#475569", fontSize: 12, fontWeight: 600 }}>
            App Secret de Meta
            <input
              type="password"
              value={appSecret}
              onChange={(event) => setAppSecret(event.target.value)}
              placeholder="App Secret"
              style={inputStyle}
            />
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
            <button onClick={() => setEditing(false)} style={secondaryButtonStyle}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {message && <p style={{ color: "#16a34a", fontSize: 13 }}>{message}</p>}
    </section>
  );
}
