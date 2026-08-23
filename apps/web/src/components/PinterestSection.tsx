"use client";

import { useEffect, useState } from "react";
import PasosAntesDeConectar from "@/components/PasosAntesDeConectar";
import { disabledStyle, h2Style, inputStyle, secondaryButtonStyle, sectionStyle } from "./dashboard-ui";

interface Settings { configured: boolean; clientId?: string | null; rawClientId?: string; isAdmin?: boolean }
interface Board { id: string; name: string; privacy?: string }
interface Connection {
  connected: boolean;
  boardId?: string | null;
  boardName?: string | null;
  expiresAt?: string | null;
  isExpired?: boolean;
  boards?: Board[];
  boardsError?: string | null;
}

export default function PinterestSection({ allowed = true }: { allowed?: boolean }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [boardId, setBoardId] = useState("");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState("");

  function connect() {
    window.location.href = "/api/search-integrations/pinterest/connect";
  }

  async function load() {
    setLoading(true);
    try {
      const [settingsRes, connectionRes] = await Promise.all([
        fetch(`/api/search-integrations/pinterest/settings?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/search-integrations/pinterest?_t=${Date.now()}`, { cache: "no-store" }),
      ]);
      setSettings(settingsRes.ok ? await settingsRes.json() : { configured: false });
      const nextConnection = connectionRes.ok ? await connectionRes.json() : { connected: false };
      setConnection(nextConnection);
      setBoardId(nextConnection.boardId || "");
    } catch {
      setSettings({ configured: false });
      setConnection({ connected: false });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveSettings() {
    if (!clientId.trim() || !clientSecret.trim()) { setMessage("Debes ingresar el Client ID y el Client Secret."); return; }
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/search-integrations/pinterest/settings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: clientId.trim(), clientSecret: clientSecret.trim() }),
      });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error || "No se pudieron guardar las credenciales."); return; }
      setMessage("Credenciales de Pinterest guardadas."); setEditing(false); setClientSecret(""); await load();
    } catch { setMessage("Error de conexión al guardar las credenciales."); }
    finally { setSaving(false); }
  }

  async function saveBoard() {
    if (!boardId) { setMessage("Selecciona un tablero antes de guardar."); return; }
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/search-integrations/pinterest", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ boardId }),
      });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error || "No se pudo guardar el tablero."); return; }
      setMessage(`Tablero guardado: ${result.boardName}.`); await load();
    } catch { setMessage("Error de conexión al guardar el tablero."); }
    finally { setSaving(false); }
  }

  async function disconnect() {
    if (!confirm("¿Deseas desconectar Pinterest?")) return;
    setDisconnecting(true); setMessage("");
    try {
      const response = await fetch("/api/search-integrations/pinterest", { method: "DELETE" });
      if (!response.ok) throw new Error();
      setMessage("Pinterest desconectado."); await load();
    } catch { setMessage("No se pudo desconectar Pinterest."); }
    finally { setDisconnecting(false); }
  }

  const configured = settings?.configured ?? false;
  const canPublish = Boolean(connection?.connected && !connection?.isExpired && connection?.boardId);

  return (
    <section style={sectionStyle}>
      <h2 style={{ ...h2Style, margin: 0 }}>Pinterest</h2>
      <p className="lead-copy" style={{ fontSize: 13, margin: "4px 0 0" }}>
        Publica automáticamente tus artículos como Pins con imagen y enlace al artículo.
      </p>
      {loading ? <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Cargando...</p> : <>
        {settings?.isAdmin && <div style={{ borderTop: "1px solid #e5e5ea", marginTop: 14, paddingTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div><strong style={{ color: "#1d1d1f", fontSize: 13 }}>Credenciales globales de la App</strong><p className="lead-copy" style={{ fontSize: 12, margin: "2px 0 0" }}>Client ID y Secret de Pinterest Developers.</p></div>
            <span style={{ color: configured ? "#16803c" : "#8a4b08", fontSize: 12, fontWeight: 600 }}>{configured ? "✓ Configurada" : "Sin configurar"}</span>
          </div>
          {!editing ? <div style={{ marginTop: 10 }}>
            {configured && <p className="muted" style={{ fontSize: 12 }}>Client ID: {settings.clientId}</p>}
            <button onClick={() => { setEditing(true); setClientId(settings.rawClientId || ""); setClientSecret(""); }} className="secondary" style={secondaryButtonStyle}>{configured ? "Editar credenciales" : "Configurar credenciales"}</button>
          </div> : <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <label style={{ color: "#1d1d1f", fontSize: 12, fontWeight: 500 }}>Client ID<input value={clientId} onChange={(e) => setClientId(e.target.value)} style={inputStyle} /></label>
            <label style={{ color: "#1d1d1f", fontSize: 12, fontWeight: 500 }}>Client Secret<input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} style={inputStyle} /></label>
            <div style={{ display: "flex", gap: 8 }}><button onClick={saveSettings} disabled={saving} style={disabledStyle({ ...secondaryButtonStyle, background: "#1d1d1f", color: "#fff", border: "none" }, saving)}>{saving ? "Guardando..." : "Guardar credenciales"}</button><button onClick={() => setEditing(false)} className="secondary" style={secondaryButtonStyle}>Cancelar</button></div>
          </div>}
        </div>}

        {allowed && <div style={{ borderTop: "1px solid #e5e5ea", marginTop: 16, paddingTop: 16 }}>
          <PasosAntesDeConectar red="Pinterest" />
          <div style={{ background: "#f5f5f7", border: "1px solid #e5e5ea", borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div>
                <strong style={{ color: "#1d1d1f", fontSize: 15 }}>Conexión de Pinterest</strong>
                <p className="lead-copy" style={{ fontSize: 12, margin: "4px 0 0" }}>
                  Autoriza tu cuenta, elige el tablero y controla la conexión desde aquí.
                </p>
              </div>
              {connection?.connected && !connection.isExpired ? <span style={{ color: "#16803c", fontSize: 12, fontWeight: 700 }}>● Conectada</span> : <span style={{ color: "#8a4b08", fontSize: 12, fontWeight: 700 }}>● Pendiente</span>}
            </div>
            {!configured ? <p className="notice" style={{ margin: "14px 0 0" }}>Pinterest todavía no está configurado. {settings?.isAdmin ? "Guarda primero las credenciales de la aplicación arriba." : "El administrador debe configurar la aplicación."}</p> : !connection?.connected ? <div style={{ marginTop: 14 }}>
              <p className="lead-copy" style={{ fontSize: 13, margin: "0 0 12px" }}>Paso 1 de 2 · Conecta la cuenta que usará este usuario para publicar.</p>
              <button onClick={connect} className="secondary" style={{ ...secondaryButtonStyle, background: "#e60023", color: "#fff", border: "none" }}>Conectar Pinterest →</button>
            </div> : <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                <span style={{ fontSize: 13, color: "#1d1d1f" }}>Cuenta autorizada</span>
                <button onClick={connect} className="secondary" style={{ ...secondaryButtonStyle, fontSize: 12 }}>Reconectar</button>
                <button onClick={disconnect} disabled={disconnecting} className="secondary" style={disabledStyle({ ...secondaryButtonStyle, fontSize: 12 }, disconnecting)}>{disconnecting ? "Desconectando..." : "Desconectar"}</button>
              </div>
            {connection.isExpired ? <p className="notice" style={{ marginTop: 12 }}>La autorización expiró. Pulsa <strong>Reconectar</strong> para renovar el acceso.</p> : <div style={{ display: "grid", gap: 8, marginTop: 14, maxWidth: 520 }}>
              <p className="lead-copy" style={{ fontSize: 13, margin: 0 }}>Paso 2 de 2 · Selecciona el tablero donde se crearán los Pins.</p>
              <label style={{ color: "#1d1d1f", fontSize: 12, fontWeight: 500 }}>Tablero donde se publicarán los Pins<select value={boardId} onChange={(e) => setBoardId(e.target.value)} style={inputStyle}><option value="">Selecciona un tablero</option>{(connection.boards || []).map((board) => <option key={board.id} value={board.id}>{board.name}{board.privacy && board.privacy !== "PUBLIC" ? ` (${board.privacy.toLowerCase()})` : ""}</option>)}</select></label>
              <button onClick={saveBoard} disabled={saving || !boardId} className="secondary" style={disabledStyle(secondaryButtonStyle, saving || !boardId)}>{saving ? "Guardando..." : "Guardar tablero"}</button>
              {connection.boardsError && <p className="notice">No se pudieron cargar los tableros: {connection.boardsError}</p>}
              <p className="muted" style={{ fontSize: 12 }}>{canPublish ? `Listo para publicar en ${connection.boardName || "el tablero seleccionado"}.` : "Selecciona un tablero para habilitar la publicación."}</p>
            </div>}
            </>}
          </div>
          {message && <p className="notice" style={{ marginTop: 12 }}>{message}</p>}
        </div>}
      </>}
    </section>
  );
}
