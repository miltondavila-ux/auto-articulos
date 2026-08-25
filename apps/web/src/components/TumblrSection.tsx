"use client";

import { useEffect, useState } from "react";
import PasosAntesDeConectar from "@/components/PasosAntesDeConectar";
import { disabledStyle, h2Style, inputStyle, secondaryButtonStyle, sectionStyle } from "./dashboard-ui";

interface Settings { configured: boolean; clientId?: string | null; rawClientId?: string; isAdmin?: boolean }
interface Blog { identifier: string; title: string }
interface Connection { connected: boolean; blogIdentifier?: string; blogTitle?: string; blogs?: Blog[]; isExpired?: boolean }

export default function TumblrSection({ allowed = true }: { allowed?: boolean }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [blogIdentifier, setBlogIdentifier] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [settingsRes, connectionRes] = await Promise.all([
        fetch(`/api/search-integrations/tumblr/settings?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/search-integrations/tumblr?_t=${Date.now()}`, { cache: "no-store" }),
      ]);
      setSettings(settingsRes.ok ? await settingsRes.json() : { configured: false });
      const next = connectionRes.ok ? await connectionRes.json() : { connected: false };
      setConnection(next); setBlogIdentifier(next.blogIdentifier || "");
    } catch { setSettings({ configured: false }); setConnection({ connected: false }); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function saveSettings() {
    if (!clientId.trim() || !clientSecret.trim()) { setMessage("Debes ingresar el Consumer Key y el Consumer Secret."); return; }
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/search-integrations/tumblr/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, clientSecret }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error || "No se pudieron guardar las credenciales."); return; }
      setMessage("Credenciales de Tumblr guardadas."); setEditing(false); setClientSecret(""); await load();
    } catch { setMessage("Error de conexión al guardar las credenciales."); }
    finally { setSaving(false); }
  }
  async function saveBlog() {
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/search-integrations/tumblr", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blogIdentifier }) });
      const result = await response.json();
      setMessage(response.ok ? `Blog guardado: ${result.blogTitle}.` : result.error || "No se pudo guardar el blog.");
      if (response.ok) await load();
    } catch { setMessage("Error de conexión al guardar el blog."); }
    finally { setSaving(false); }
  }
  async function disconnect() {
    if (!confirm("¿Deseas desconectar Tumblr?")) return;
    setSaving(true); setMessage("");
    try { await fetch("/api/search-integrations/tumblr", { method: "DELETE" }); setMessage("Tumblr desconectado."); await load(); }
    catch { setMessage("No se pudo desconectar Tumblr."); }
    finally { setSaving(false); }
  }

  const configured = settings?.configured ?? false;
  // Una autorización vencida sigue siendo una conexión guardada. No debemos
  // ocultarla como si se hubiera borrado: así el usuario conserva el blog
  // elegido y solo ve que necesita renovar el acceso.
  const connected = Boolean(connection?.connected);
  return <section style={sectionStyle}>
    <h2 style={{ ...h2Style, margin: 0 }}>Tumblr</h2>
    <p className="lead-copy" style={{ fontSize: 13, margin: "4px 0 0" }}>Publica automáticamente tus artículos con imagen, texto y enlace.</p>
    {loading ? <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Cargando...</p> : <>
      {settings?.isAdmin && <div style={{ borderTop: "1px solid #e5e5ea", marginTop: 14, paddingTop: 14 }}>
        <strong style={{ color: "#1d1d1f", fontSize: 13 }}>Credenciales globales de la App</strong>
        <p className="lead-copy" style={{ fontSize: 12, margin: "2px 0 0" }}>OAuth Consumer Key y OAuth Consumer Secret.</p>
        {!editing ? <div style={{ marginTop: 10 }}>{configured && <p className="muted" style={{ fontSize: 12 }}>Consumer Key: {settings.clientId}</p>}<button onClick={() => { setEditing(true); setClientId(settings.rawClientId || ""); }} className="secondary" style={secondaryButtonStyle}>{configured ? "Editar credenciales" : "Configurar credenciales"}</button></div> : <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <label style={{ color: "#1d1d1f", fontSize: 12 }}>Consumer Key<input value={clientId} onChange={(e) => setClientId(e.target.value)} style={inputStyle} /></label>
          <label style={{ color: "#1d1d1f", fontSize: 12 }}>Consumer Secret<input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} style={inputStyle} /></label>
          <div style={{ display: "flex", gap: 8 }}><button onClick={saveSettings} disabled={saving} style={disabledStyle({ ...secondaryButtonStyle, background: "#1d1d1f", color: "#fff", border: "none" }, saving)}>{saving ? "Guardando..." : "Guardar credenciales"}</button><button onClick={() => setEditing(false)} className="secondary" style={secondaryButtonStyle}>Cancelar</button></div>
        </div>}
      </div>}
      {allowed && <div style={{ borderTop: "1px solid #e5e5ea", marginTop: 16, paddingTop: 16 }}><PasosAntesDeConectar red="Tumblr" /><div style={{ background: "#f5f5f7", border: "1px solid #e5e5ea", borderRadius: 14, padding: 16 }}>
        <strong style={{ color: "#1d1d1f", fontSize: 15 }}>Conexión de Tumblr</strong>
        <p className="lead-copy" style={{ fontSize: 12, margin: "4px 0 0" }}>Autoriza tu cuenta, elige el blog y controla la conexión desde aquí.</p>
        {!configured ? <p className="notice" style={{ margin: "14px 0 0" }}>El administrador debe configurar primero las credenciales de Tumblr.</p> : !connected ? <button onClick={() => { window.location.href = "/api/search-integrations/tumblr/connect"; }} style={{ ...secondaryButtonStyle, background: "#36465d", color: "#fff", border: "none", marginTop: 14 }}>Conectar Tumblr →</button> : <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <p style={{ margin: 0, color: connection?.isExpired ? "#b45309" : "#16803c", fontSize: 13, fontWeight: 600 }}>
            {connection?.isExpired ? "⚠ Tumblr conectado, pero la autorización venció" : "✓ Tumblr conectado"}
          </p>
          <label style={{ color: "#1d1d1f", fontSize: 12 }}>Blog<select value={blogIdentifier} onChange={(e) => setBlogIdentifier(e.target.value)} style={inputStyle}>{(connection?.blogs || []).map((blog) => <option key={blog.identifier} value={blog.identifier}>{blog.title}</option>)}</select></label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button onClick={saveBlog} disabled={saving} className="secondary" style={secondaryButtonStyle}>Guardar blog</button><button onClick={() => { window.location.href = "/api/search-integrations/tumblr/connect"; }} className="secondary" style={secondaryButtonStyle}>Reconectar</button><button onClick={disconnect} disabled={saving} className="secondary" style={secondaryButtonStyle}>Desconectar</button></div>
        </div>}
        {message && <p className="notice" style={{ margin: "12px 0 0" }}>{message}</p>}
      </div></div>}
    </>}
  </section>;
}
