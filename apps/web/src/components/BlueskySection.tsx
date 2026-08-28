"use client";

import { useEffect, useState } from "react";
import { disabledStyle, h2Style, inputStyle, secondaryButtonStyle, sectionStyle } from "./dashboard-ui";

type Connection = { connected: boolean; handle?: string };

export default function BlueskySection({ allowed = true }: { allowed?: boolean }) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [handle, setHandle] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(`/api/search-integrations/bluesky?_t=${Date.now()}`, { cache: "no-store" });
      const next = response.ok ? await response.json() : { connected: false };
      setConnection(next); if (next.handle) setHandle(next.handle);
    } catch { setConnection({ connected: false }); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!handle.trim() || !appPassword.trim()) { setMessage("Escribe tu usuario y App Password de Bluesky."); return; }
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/search-integrations/bluesky", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle: handle.trim(), appPassword: appPassword.trim() }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error || "No se pudo conectar Bluesky."); return; }
      setMessage(`Bluesky conectado como @${result.handle}.`); setAppPassword(""); setEditing(false); await load();
    } catch { setMessage("Error de conexión al guardar Bluesky."); }
    finally { setSaving(false); }
  }

  async function disconnect() {
    if (!confirm("¿Deseas desconectar Bluesky?")) return;
    setSaving(true); setMessage("");
    try { await fetch("/api/search-integrations/bluesky", { method: "DELETE" }); setMessage("Bluesky desconectado."); await load(); }
    catch { setMessage("No se pudo desconectar Bluesky."); }
    finally { setSaving(false); }
  }

  if (!allowed) return null;
  return <section style={sectionStyle}>
    <h2 style={{ ...h2Style, margin: 0 }}>Bluesky</h2>
    <p className="lead-copy" style={{ fontSize: 13, margin: "4px 0 0" }}>Publica un microresumen del artículo con su imagen y enlace.</p>
    <div style={{ marginTop: 14, padding: 16, border: "1px solid #d2d2d7", borderRadius: 14, background: "#fff", color: "#1d1d1f", fontSize: 13, lineHeight: 1.55 }}>
      <strong style={{ fontSize: 14 }}>Cómo conectar Bluesky, paso a paso</strong>
      <ol style={{ margin: "10px 0 0", paddingLeft: 20 }}>
        <li>Entra en Bluesky y abre <strong>Configuración → Privacidad y seguridad → Contraseñas de aplicación</strong>.</li>
        <li>Pulsa <strong>Crear nueva App Password</strong> y ponle el nombre <strong>Auto Artículos</strong>.</li>
        <li>Copia la contraseña que Bluesky te muestra. Esa es la <strong>App Password</strong>; no uses tu contraseña normal.</li>
        <li>En <strong>Usuario o handle</strong>, escribe tu usuario completo, por ejemplo <strong>nombre.bsky.social</strong>.</li>
        <li>Pega la App Password y pulsa <strong>Conectar Bluesky</strong>.</li>
      </ol>
      <p style={{ margin: "10px 0 0" }}><strong>Si falla:</strong> revisa que no hayas copiado espacios, que el usuario incluya el dominio y que sea una App Password.</p>
    </div>
    {loading ? <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Cargando...</p> : <div style={{ borderTop: "1px solid #e5e5ea", marginTop: 14, paddingTop: 14 }}>
      {!connection?.connected || editing ? <div style={{ display: "grid", gap: 10 }}>
        <label style={{ color: "#1d1d1f", fontSize: 12 }}>Usuario o handle<input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="usuario.bsky.social" style={inputStyle} /></label>
        <label style={{ color: "#1d1d1f", fontSize: 12 }}>App Password<input type="password" value={appPassword} onChange={(e) => setAppPassword(e.target.value)} placeholder="No uses tu contraseña principal" style={inputStyle} /></label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button onClick={save} disabled={saving} style={disabledStyle({ ...secondaryButtonStyle, background: "#1d1d1f", color: "#fff", border: "none" }, saving)}>{saving ? "Verificando..." : "Conectar Bluesky"}</button>{connection?.connected && <button onClick={() => setEditing(false)} className="secondary" style={secondaryButtonStyle}>Cancelar</button>}</div>
      </div> : <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><strong style={{ color: "#16803c", fontSize: 13 }}>✓ Conectado como @{connection.handle}</strong><button onClick={() => setEditing(true)} className="secondary" style={secondaryButtonStyle}>Cambiar cuenta</button><button onClick={disconnect} disabled={saving} className="secondary" style={secondaryButtonStyle}>Desconectar</button></div>}
      {message && <p className="notice" style={{ margin: "12px 0 0" }}>{message}</p>}
    </div>}
  </section>;
}
