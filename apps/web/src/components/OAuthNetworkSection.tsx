"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ConnectionSuccess, buttonStyle, disabledStyle, inputStyle, secondaryButtonStyle, sectionStyle } from "./dashboard-ui";
import { CONNECTION_LABELS, ConnectionActiveBox, ConnectionCard, ConnectionGuide, ConnectionMessage, ConnectionTestButton, type ConnectionState } from "./connection-ui";
import { CONNECTION_GUIDES } from "@/lib/connection-guides";
import { friendlyConnectionError } from "@/lib/composio-error-message";

/**
 * Pantalla estándar de las redes que se conectan autorizando en la propia red
 * (Threads, LinkedIn, Pinterest, Tumblr, Blogger). Mismo patrón que Search Console y
 * Analytics: tarjeta, pasos, Nueva conexión, elegir destino con «Aprobar y guardar»,
 * éxito estático, Probar conexión, Cambiar y Desconectar. Cada red solo aporta su
 * configuración; los bloques de credenciales de la aplicación son solo para administradores.
 */
export interface OAuthNetworkConfig {
  id: string;
  title: string;
  lead: string;
  note: string;
  /** Campo de la conexión que trae la cuenta (p. ej. threadsUsername) y su prefijo (p. ej. «@»). */
  accountKey?: string;
  accountPrefix?: string;
  admin: {
    title: string;
    help: string;
    idLabel: string;
    secretLabel: string;
    keys: { shown: string; raw: string; bodyId: string; bodySecret: string };
  };
  /** Redes en las que hay que elegir un destino (tablero, blog). */
  destination?: {
    noun: string; // «el tablero»
    label: string; // «Tablero»
    listKey: string;
    idField: string;
    nameField: string;
    savedIdKey: string;
    savedNameKey: string;
    patchKey: string;
  };
}

type Json = Record<string, any>;

export default function OAuthNetworkSection({ config, allowed = true, adminExtra }: { config: OAuthNetworkConfig; allowed?: boolean; adminExtra?: ReactNode }) {
  const base = `/api/search-integrations/${config.id}`;
  const [settings, setSettings] = useState<Json | null>(null);
  const [connection, setConnection] = useState<Json | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [selected, setSelected] = useState("");
  const [choosing, setChoosing] = useState(false);
  const [savedName, setSavedName] = useState<string | null>(null);
  const [editingAdmin, setEditingAdmin] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [adminSecret, setAdminSecret] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [settingsRes, connectionRes] = await Promise.all([
        fetch(`${base}/settings?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`${base}?_t=${Date.now()}`, { cache: "no-store" }),
      ]);
      setSettings(settingsRes.ok ? await settingsRes.json() : { configured: false });
      const next = connectionRes.ok ? await connectionRes.json() : { connected: false };
      setConnection(next);
      if (config.destination) setSelected(next[config.destination.savedIdKey] || "");
    } catch {
      setSettings({ configured: false });
      setConnection({ connected: false });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveAdmin() {
    if (!adminId.trim() || !adminSecret.trim()) {
      setMessage({ ok: false, text: `Escribe ${config.admin.idLabel} y ${config.admin.secretLabel}.` });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`${base}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [config.admin.keys.bodyId]: adminId.trim(), [config.admin.keys.bodySecret]: adminSecret.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ ok: false, text: friendlyConnectionError(result.error, "No se pudieron guardar las credenciales. Inténtalo de nuevo.") });
        return;
      }
      setMessage({ ok: true, text: "Credenciales guardadas." });
      setEditingAdmin(false);
      setAdminSecret("");
      await load();
    } catch {
      setMessage({ ok: false, text: "No pudimos comunicarnos con el servicio. Inténtalo de nuevo en unos minutos." });
    } finally {
      setSaving(false);
    }
  }

  async function approveDestination() {
    const dest = config.destination;
    if (!dest || !selected) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(base, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [dest.patchKey]: selected }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ ok: false, text: friendlyConnectionError(result.error, `No se pudo guardar ${dest.noun}. Inténtalo de nuevo.`) });
        return;
      }
      const options: Json[] = connection?.[dest.listKey] ?? [];
      const chosen = options.find((item) => item[dest.idField] === selected);
      setSavedName(result[dest.savedNameKey] || chosen?.[dest.nameField] || null);
      setChoosing(false);
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
      const response = await fetch(base, { method: "DELETE" });
      setSavedName(null);
      setChoosing(false);
      setMessage(response.ok ? { ok: true, text: `${config.title} desconectado.` } : { ok: false, text: "No se pudo desconectar. Inténtalo de nuevo." });
      await load();
    } catch {
      setMessage({ ok: false, text: "No se pudo desconectar. Inténtalo de nuevo." });
    } finally {
      setSaving(false);
    }
  }

  if (!allowed) return null;

  const dest = config.destination;
  const configured = Boolean(settings?.configured);
  const connected = Boolean(connection?.connected);
  const expired = connected && Boolean(connection?.isExpired);
  const savedDestId: string | null = dest ? connection?.[dest.savedIdKey] || null : null;
  const savedDestName: string | null = dest ? connection?.[dest.savedNameKey] || savedDestId : null;
  const options: Array<{ id: string; label: string }> = dest
    ? ((connection?.[dest.listKey] as Json[] | undefined) ?? []).map((item) => ({
        id: String(item[dest.idField]),
        label: `${item[dest.nameField]}${item.privacy && String(item.privacy).toUpperCase() !== "PUBLIC" ? ` (${String(item.privacy).toLowerCase()})` : ""}`,
      }))
    : [];
  const account: string | null = config.accountKey && connection?.[config.accountKey] ? `${config.accountPrefix ?? ""}${String(connection[config.accountKey])}` : null;
  const pendingDestination = Boolean(dest) && connected && !expired && !savedDestId;
  const state: ConnectionState = !connected ? "disconnected" : expired ? "expired" : pendingDestination ? "pending" : "connected";
  const guide = CONNECTION_GUIDES[config.id];
  const connectLink = (
    <a href={`${base}/connect`} style={{ ...buttonStyle, marginTop: 0, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
      {CONNECTION_LABELS.connect}
    </a>
  );

  return (
    <>
      <ConnectionCard title={config.title} state={state} lead={config.lead} note={config.note}>
        {loading && !connection ? (
          <p style={{ color: "#6e6e73", fontSize: 14 }}>Cargando…</p>
        ) : savedName ? (
          <>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1a7f37" }}>Conexión exitosa</span>
            <ConnectionSuccess
              title={`${config.title} quedó conectado correctamente`}
              label={dest ? `${dest.label} conectado` : "Cuenta conectada"}
              value={savedName}
              description="La configuración terminó correctamente. SEO TOTAL usará esta conexión desde ahora."
            />
          </>
        ) : !configured ? (
          <p style={{ color: "#6e6e73", fontSize: 14, fontStyle: "italic" }}>Esta conexión todavía no está disponible. Avisa al administrador.</p>
        ) : connection?.forbidden ? (
          <p style={{ color: "#6e6e73", fontSize: 14, fontStyle: "italic" }}>Tu cuenta no tiene esta red habilitada. Pídele acceso al administrador.</p>
        ) : !connected ? (
          <>
            {guide && <ConnectionGuide steps={guide.steps} ifFails={guide.ifFails} />}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>{connectLink}</div>
          </>
        ) : expired ? (
          <>
            <ConnectionMessage ok={false}>La autorización venció. Pulsa «{CONNECTION_LABELS.connect}» para renovar el acceso.</ConnectionMessage>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              {connectLink}
              <button type="button" onClick={disconnect} disabled={saving} style={{ ...secondaryButtonStyle, color: "#c62828" }}>{CONNECTION_LABELS.disconnect}</button>
            </div>
          </>
        ) : (
          <>
            {!pendingDestination && (
              <ConnectionActiveBox
                label="Cuenta conectada"
                value={account}
                rows={dest && savedDestName ? [{ label: dest.label, value: savedDestName }] : undefined}
              />
            )}
            {dest && (pendingDestination || choosing) && (
              <div style={{ marginTop: 12, padding: "10px 0", borderTop: "1px solid #e5e5ea" }}>
                <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>Elige {dest.noun} donde se publicará</p>
                {connection?.boardsError && <ConnectionMessage ok={false}>{connection.boardsError}</ConnectionMessage>}
                {options.length === 0 ? (
                  <p style={{ color: "#6e6e73", fontSize: 14 }}>No se encontró nada para elegir en esta cuenta. Comprueba que sea la cuenta correcta.</p>
                ) : (
                  <select
                    aria-label={`Elige ${dest.noun}`}
                    value={selected}
                    disabled={saving}
                    onChange={(event) => setSelected(event.target.value)}
                    style={{ ...inputStyle, width: "100%", maxWidth: 520 }}
                  >
                    <option value="">Elige una opción…</option>
                    {[...options].sort((x, y) => x.label.localeCompare(y.label, "es")).map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                )}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                  <button type="button" onClick={approveDestination} disabled={saving || !selected} style={disabledStyle({ ...buttonStyle, marginTop: 0 }, saving || !selected)}>
                    {saving ? "Guardando…" : "Aprobar y guardar"}
                  </button>
                  {savedDestId && (
                    <button type="button" onClick={() => setChoosing(false)} style={secondaryButtonStyle}>Cancelar</button>
                  )}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              {dest && savedDestId && !choosing && (
                <button type="button" onClick={() => setChoosing(true)} disabled={saving} style={secondaryButtonStyle}>{CONNECTION_LABELS.change}</button>
              )}
              <ConnectionTestButton network={config.id} disabled={saving} />
              {connectLink}
              <button type="button" onClick={disconnect} disabled={saving} style={{ ...secondaryButtonStyle, color: "#c62828" }}>{CONNECTION_LABELS.disconnect}</button>
            </div>
          </>
        )}
        {message && <ConnectionMessage ok={message.ok}>{message.text}</ConnectionMessage>}
      </ConnectionCard>

      {settings?.isAdmin && (
        <section style={{ ...sectionStyle, borderStyle: "dashed" }}>
          <strong style={{ color: "#1d1d1f", fontSize: 13 }}>Solo administradores · {config.admin.title}</strong>
          <p className="lead-copy" style={{ fontSize: 12, margin: "2px 0 0" }}>{config.admin.help}</p>
          {!editingAdmin ? (
            <div style={{ marginTop: 10 }}>
              <p style={{ color: "#6e6e73", fontSize: 12 }}>
                {configured ? `${config.admin.idLabel}: ${settings[config.admin.keys.shown] ?? "guardado"}` : "Sin configurar"}
              </p>
              <button type="button" onClick={() => { setEditingAdmin(true); setAdminId(settings[config.admin.keys.raw] || ""); }} style={secondaryButtonStyle}>
                {configured ? "Editar credenciales" : "Configurar credenciales"}
              </button>
              {adminExtra}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <label style={{ color: "#1d1d1f", fontSize: 12 }}>
                {config.admin.idLabel}
                <input value={adminId} onChange={(e) => setAdminId(e.target.value)} style={inputStyle} />
              </label>
              <label style={{ color: "#1d1d1f", fontSize: 12 }}>
                {config.admin.secretLabel}
                <input type="password" value={adminSecret} onChange={(e) => setAdminSecret(e.target.value)} style={inputStyle} />
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={saveAdmin} disabled={saving} style={disabledStyle({ ...secondaryButtonStyle, background: "#1d1d1f", color: "#fff", border: "none" }, saving)}>
                  {saving ? "Guardando…" : "Guardar credenciales"}
                </button>
                <button type="button" onClick={() => setEditingAdmin(false)} style={secondaryButtonStyle}>Cancelar</button>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
}
