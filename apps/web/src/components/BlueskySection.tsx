"use client";

import { useEffect, useState } from "react";
import { ConnectionSuccess, disabledStyle, inputStyle, secondaryButtonStyle } from "./dashboard-ui";
import { CONNECTION_LABELS, ConnectionActiveBox, ConnectionCard, ConnectionGuide, ConnectionMessage, ConnectionTestButton } from "./connection-ui";
import { CONNECTION_GUIDES } from "@/lib/connection-guides";
import { friendlyConnectionError } from "@/lib/composio-error-message";

type Connection = { connected: boolean; handle?: string };

export default function BlueskySection({ allowed = true }: { allowed?: boolean }) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [handle, setHandle] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [justConnected, setJustConnected] = useState<string | null>(null);

  async function load() {
    try {
      const response = await fetch(`/api/search-integrations/bluesky?_t=${Date.now()}`, { cache: "no-store" });
      setConnection(response.ok ? await response.json() : { connected: false });
    } catch {
      setConnection({ connected: false });
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!handle.trim() || !appPassword.trim()) {
      setMessage({ ok: false, text: "Escribe tu usuario y la contraseña de aplicación de Bluesky." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/search-integrations/bluesky", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: handle.trim(), appPassword: appPassword.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ ok: false, text: friendlyConnectionError(result.error, "No se pudo conectar Bluesky. Revisa los pasos e inténtalo de nuevo.") });
        return;
      }
      setJustConnected(result.handle ? `@${result.handle}` : "Bluesky");
      setAppPassword("");
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
      const response = await fetch("/api/search-integrations/bluesky", { method: "DELETE" });
      setMessage(response.ok ? { ok: true, text: "Bluesky desconectado." } : { ok: false, text: "No se pudo desconectar. Inténtalo de nuevo." });
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (!allowed) return null;
  const connected = Boolean(connection?.connected);
  const guide = CONNECTION_GUIDES.bluesky;

  return (
    <ConnectionCard
      title="Bluesky"
      state={connected ? "connected" : "disconnected"}
      lead="Conexión administrada desde esta tarjeta. Conecta la cuenta de Bluesky donde se publicarán tus artículos."
      note="Publica un microresumen del artículo con su imagen y enlace."
    >
      {connection === null ? (
        <p style={{ color: "#6e6e73", fontSize: 14 }}>Cargando…</p>
      ) : justConnected ? (
        <>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1a7f37" }}>Conexión exitosa</span>
          <ConnectionSuccess
            title="Bluesky quedó conectado correctamente"
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
              Usuario de Bluesky
              <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="nombre.bsky.social" style={inputStyle} />
            </label>
            <label style={{ color: "#1d1d1f", fontSize: 12 }}>
              Contraseña de aplicación
              <input type="password" value={appPassword} onChange={(e) => setAppPassword(e.target.value)} placeholder="Pega aquí la contraseña de aplicación, no tu contraseña normal" style={inputStyle} />
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
          <ConnectionActiveBox label="Cuenta conectada" value={connection?.handle ? `@${connection.handle}` : null} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button type="button" onClick={() => setEditing(true)} disabled={saving} style={secondaryButtonStyle}>{CONNECTION_LABELS.change}</button>
            <ConnectionTestButton network="bluesky" disabled={saving} />
            <button type="button" onClick={disconnect} disabled={saving} style={{ ...secondaryButtonStyle, color: "#c62828" }}>{CONNECTION_LABELS.disconnect}</button>
          </div>
        </>
      )}
      {message && <ConnectionMessage ok={message.ok}>{message.text}</ConnectionMessage>}
    </ConnectionCard>
  );
}
