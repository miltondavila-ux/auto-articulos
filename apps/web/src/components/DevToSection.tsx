"use client";

import { useEffect, useState } from "react";
import { ConnectionSuccess, disabledStyle, inputStyle, secondaryButtonStyle } from "./dashboard-ui";
import { CONNECTION_LABELS, ConnectionActiveBox, ConnectionCard, ConnectionGuide, ConnectionMessage, ConnectionTestButton } from "./connection-ui";
import { CONNECTION_GUIDES } from "@/lib/connection-guides";
import { friendlyConnectionError } from "@/lib/composio-error-message";

type Connection = { connected: boolean; username?: string };

export default function DevToSection({ allowed = true }: { allowed?: boolean }) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [username, setUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [justConnected, setJustConnected] = useState<string | null>(null);

  async function load() {
    try {
      const response = await fetch(`/api/search-integrations/devto?_t=${Date.now()}`, { cache: "no-store" });
      setConnection(response.ok ? await response.json() : { connected: false });
    } catch {
      setConnection({ connected: false });
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!apiKey.trim()) {
      setMessage({ ok: false, text: "Pega la clave de DEV.to." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/search-integrations/devto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), apiKey: apiKey.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ ok: false, text: friendlyConnectionError(result.error, "No se pudo conectar DEV.to. Revisa los pasos e inténtalo de nuevo.") });
        return;
      }
      setJustConnected(result.username ? `@${result.username}` : "DEV.to");
      setApiKey("");
      setEditing(false);
      await load();
    } catch {
      setMessage({ ok: false, text: "No pudimos comunicarnos con el servicio. Inténtalo de nuevo en unos minutos." });
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    if (!window.confirm(CONNECTION_LABELS.disconnectConfirm)) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/search-integrations/devto", { method: "DELETE" });
      setMessage(response.ok ? { ok: true, text: "DEV.to desconectado." } : { ok: false, text: "No se pudo desconectar. Inténtalo de nuevo." });
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (!allowed) return null;
  const connected = Boolean(connection?.connected);
  const guide = CONNECTION_GUIDES.devto;

  return (
    <ConnectionCard
      title="DEV.to"
      state={connected ? "connected" : "disconnected"}
      lead="Conexión administrada desde esta tarjeta. Conecta la cuenta de DEV.to donde se publicarán tus artículos adaptados."
    >
      {connection === null ? (
        <p style={{ color: "#6e6e73", fontSize: 14 }}>Cargando…</p>
      ) : justConnected ? (
        <>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1a7f37" }}>Conexión exitosa</span>
          <ConnectionSuccess
            title="DEV.to quedó conectado correctamente"
            label="Cuenta conectada"
            value={justConnected}
            description="La configuración terminó correctamente. SEO TOTAL usará esta conexión desde ahora."
          />
        </>
      ) : !connected || editing ? (
        <>
          <ConnectionGuide steps={guide.steps} ifFails={guide.ifFails} />
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <label style={{ color: "#1d1d1f", fontSize: 12 }}>
              Usuario de DEV.to
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="tu-usuario" style={inputStyle} />
            </label>
            <label style={{ color: "#1d1d1f", fontSize: 12 }}>
              Clave de DEV.to
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Pega aquí la clave, no tu contraseña" style={inputStyle} />
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={save} disabled={saving} style={disabledStyle({ ...secondaryButtonStyle, background: "#1d1d1f", color: "#fff", border: "none" }, saving)}>
                {saving ? "Verificando…" : "Conectar"}
              </button>
              {connected && (
                <button type="button" onClick={() => setEditing(false)} style={secondaryButtonStyle}>Cancelar</button>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <ConnectionActiveBox label="Cuenta conectada" value={connection?.username ? `@${connection.username}` : null} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button type="button" onClick={() => setEditing(true)} disabled={saving} style={secondaryButtonStyle}>{CONNECTION_LABELS.change}</button>
            <ConnectionTestButton network="devto" disabled={saving} />
            <button type="button" onClick={disconnect} disabled={saving} style={{ ...secondaryButtonStyle, color: "#c62828" }}>{CONNECTION_LABELS.disconnect}</button>
          </div>
        </>
      )}
      {message && <ConnectionMessage ok={message.ok}>{message.text}</ConnectionMessage>}
    </ConnectionCard>
  );
}
