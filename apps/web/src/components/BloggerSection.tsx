"use client";

import { useEffect, useState } from "react";
import { h2Style, secondaryButtonStyle, sectionStyle } from "./dashboard-ui";

type Blog = { id: string; name: string };
type Connection = { connected: boolean; blogId?: string; blogName?: string; blogs?: Blog[]; isExpired?: boolean };

export default function BloggerSection({ allowed = true }: { allowed?: boolean }) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function load() { try { const r = await fetch(`/api/search-integrations/blogger?_t=${Date.now()}`, { cache: "no-store" }); const data = r.ok ? await r.json() : { connected: false }; setConnection(data); setSelected(data.blogId || ""); } catch { setConnection({ connected: false }); } }
  useEffect(() => { load(); }, []);
  async function selectBlog() { setSaving(true); setMessage(""); try { const r = await fetch("/api/search-integrations/blogger", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blogId: selected }) }); const data = await r.json(); setMessage(r.ok ? `Blog seleccionado: ${data.blogName}.` : data.error || "No se pudo seleccionar el blog."); if (r.ok) await load(); } finally { setSaving(false); } }
  async function disconnect() { if (!confirm("¿Deseas desconectar Blogger?")) return; setSaving(true); try { await fetch("/api/search-integrations/blogger", { method: "DELETE" }); setMessage("Blogger desconectado."); await load(); } finally { setSaving(false); } }
  return <section style={sectionStyle}><h2 style={{ ...h2Style, margin: 0 }}>Blogger API</h2><p className="lead-copy" style={{ fontSize: 13, margin: "4px 0 0" }}>Publica artículos en el blog de Blogger que autorice cada usuario.</p>{!allowed ? <p className="muted">No tienes permiso para publicar en Blogger.</p> : !connection ? <p className="muted">Cargando...</p> : connection.connected ? <><p style={{ fontSize: 13 }}>Conectado: <strong>{connection.blogName || connection.blogId}</strong>{connection.isExpired ? " (autorización expirada)" : ""}</p>{(connection.blogs?.length || 0) > 1 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><select value={selected} onChange={(e) => setSelected(e.target.value)}>{connection.blogs?.map((blog) => <option key={blog.id} value={blog.id}>{blog.name}</option>)}</select><button className="secondary" style={secondaryButtonStyle} disabled={saving || !selected} onClick={selectBlog}>Guardar blog</button></div>}<button className="secondary" style={secondaryButtonStyle} disabled={saving} onClick={disconnect}>Desconectar Blogger</button></> : <a className="button" href="/api/search-integrations/blogger/connect">Conectar Blogger</a>}{message && <p className="muted" style={{ fontSize: 12 }}>{message}</p>}</section>;
}
