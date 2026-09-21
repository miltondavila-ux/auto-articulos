"use client";

import { useEffect, useState, type FormEvent } from "react";
import { sectionStyle, h2Style, inputStyle, secondaryButtonStyle } from "@/components/dashboard-ui";

export default function PostPeerPanel() {
  const [status, setStatus] = useState<{ configured: boolean; maskedKey?: string } | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/postpeer", { cache: "no-store" });
    if (response.ok) setStatus(await response.json());
  }
  useEffect(() => { void load(); }, []);

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/admin/postpeer", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey }) });
      const body = await response.json();
      setMessage(response.ok ? "Clave verificada y guardada de forma cifrada." : (body.error ?? "No se pudo guardar la clave."));
      if (response.ok) { setApiKey(""); await load(); }
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm("¿Eliminar la clave de PostPeer? Las conexiones existentes quedarán sin poder publicar.")) return;
    setBusy(true); await fetch("/api/admin/postpeer", { method: "DELETE" }); await load(); setBusy(false);
  }

  return <section style={sectionStyle}>
    <h2 style={h2Style}>PostPeer · Google Business Profile</h2>
    <p>PostPeer gestiona la conexión OAuth y publica en Google Business Profile. La clave se guarda cifrada y nunca se muestra completa.</p>
    <form onSubmit={save} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Clave de API de PostPeer" style={{ ...inputStyle, minWidth: 300 }} />
      <button type="submit" disabled={busy || !apiKey.trim()} className="secondary" style={secondaryButtonStyle}>Guardar y verificar</button>
      {status?.configured && <button type="button" disabled={busy} onClick={() => void remove()} className="secondary" style={secondaryButtonStyle}>Eliminar clave</button>}
    </form>
    <p style={{ color: "#6e6e73", fontSize: 13 }}>{status?.configured ? `Configurada: ${status.maskedKey}` : "No configurada"}</p>
    {message && <p>{message}</p>}
    <p style={{ color: "#8a5a00", fontSize: 13 }}>La publicación mediante PostPeer permanece apagada hasta completar el piloto y autorizar la activación.</p>
  </section>;
}
