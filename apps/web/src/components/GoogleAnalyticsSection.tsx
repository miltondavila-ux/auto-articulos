"use client";

import { useEffect, useState } from "react";
import { inputStyle, secondaryButtonStyle, sectionStyle, h2Style } from "./dashboard-ui";

type Property = { propertyId: string; displayName: string; accountName?: string };

export default function GoogleAnalyticsSection() {
  const [data, setData] = useState<{ connected: boolean; propertyId?: string | null; properties: Property[]; error?: string } | null>(null);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/google-analytics");
    const value = await response.json();
    setData(value);
    setSelected(value.propertyId ?? "");
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setBusy(true);
    const response = await fetch("/api/google-analytics", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ propertyId: selected }) });
    const value = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Propiedad de Google Analytics guardada. Se usará automáticamente en tus oportunidades." : (value.error ?? "No se pudo guardar la propiedad."));
    if (response.ok) await load();
    setBusy(false);
  }

  async function disconnect() {
    await fetch("/api/google-analytics", { method: "DELETE" });
    setMessage("Google Analytics desconectado.");
    await load();
  }

  return <section style={sectionStyle}>
    <h2 style={h2Style}>Google Analytics 4</h2>
    <p className="lead-copy" style={{ margin: "0 0 16px" }}>Conecta GA4 para que Auto Artículos use el rendimiento real de tu contenido al crear oportunidades de artículos y redes sociales. Solo leeremos tus datos y nunca modificaremos tu cuenta.</p>
    <div style={{ background: "#f5f5f7", border: "1px solid #e5e5ea", borderRadius: 8, padding: "12px 14px", marginBottom: 14, fontSize: 13, lineHeight: 1.5 }}>
      <strong>Cómo funciona:</strong> conecta tu cuenta, autoriza el acceso de lectura y elige una propiedad GA4. Puedes cambiarla o desconectarla cuando quieras.
    </div>
    {!data?.connected ? <a href="/api/google-analytics/connect?returnTo=/dashboard/configuracion" style={{ ...secondaryButtonStyle, display: "inline-block", textDecoration: "none" }}>Conectar Google Analytics 4</a> : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.error && <div style={{ color: "#8a4b08", fontSize: 13 }}>⚠️ {data.error} Puedes reconectar tu cuenta.</div>}
      <select value={selected} onChange={(event) => setSelected(event.target.value)} style={inputStyle}>
        <option value="">Selecciona tu propiedad GA4</option>
        {data.properties.map((property) => <option key={property.propertyId} value={property.propertyId}>{property.displayName} ({property.propertyId})</option>)}
      </select>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={save} disabled={busy || !selected} style={secondaryButtonStyle}>{busy ? "Guardando..." : "Guardar propiedad"}</button>
        <a href="/api/google-analytics/connect?returnTo=/dashboard/configuracion" style={{ ...secondaryButtonStyle, textDecoration: "none" }}>Reconectar Google Analytics</a>
        <button onClick={disconnect} style={secondaryButtonStyle}>Desconectar Google Analytics</button>
      </div>
    </div>}
    {message && <p style={{ fontSize: 13, margin: "10px 0 0", color: message.includes("no se") || message.includes("No se") ? "#c00" : "#16803c" }}>{message}</p>}
  </section>;
}
