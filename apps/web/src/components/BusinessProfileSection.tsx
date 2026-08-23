"use client";

import { useEffect, useState } from "react";
import PasosAntesDeConectar from "@/components/PasosAntesDeConectar";
import {
  sectionStyle,
  h2Style,
  inputStyle,
  secondaryButtonStyle,
} from "./dashboard-ui";

type LocationOption = {
  accountName: string;
  locationName: string;
  locationTitle: string;
};

type BusinessProfileData = {
  connected: boolean;
  needsLocation?: boolean;
  locationName?: string;
  locationTitle?: string;
  locations?: LocationOption[];
  locationsLoaded?: boolean;
  error?: string;
};

export default function BusinessProfileSection() {
  const [data, setData] = useState<BusinessProfileData | null>(null);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [message, setMessage] = useState("");

  async function load(searchLocations = false) {
    if (loadingLocations) return;
    setLoadingLocations(true);
    try {
      const res = await fetch(
        searchLocations ? "/api/business-profile?locations=1" : "/api/business-profile",
      );
      const value = await res.json();
      setData(value);
    } finally {
      setLoadingLocations(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    const option = data?.locations?.find((l) => l.locationName === selected);
    if (!option) return;
    setSaving(true);
    const res = await fetch("/api/business-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(option),
    });
    const value = await res.json().catch(() => ({}));
    setMessage(res.ok ? "Ubicación de Google Business Profile guardada." : (value.error ?? "No se pudo guardar."));
    setSaving(false);
    if (res.ok) void load();
  }

  async function disconnect() {
    await fetch("/api/business-profile", { method: "DELETE" });
    setMessage("Google Business Profile desconectado.");
    void load();
  }

  return (
    <section style={sectionStyle}>
      <h2 style={h2Style}>Google Business Profile</h2>
      <p className="lead-copy" style={{ margin: "0 0 14px 0" }}>
        Cuando el sistema detecte una oportunidad para Google Business Profile en Oportunidades Redes, preparará una publicación con el formato permitido por Google, imagen y enlace al artículo. No se publicará cada artículo automáticamente.
      </p>
      {!data?.connected ? (
        <div>
          <button type="button" onClick={() => { window.location.href = "/api/business-profile/connect"; }} className="secondary" style={secondaryButtonStyle}>
            Conectar Google Business Profile
          </button>
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Conecta la cuenta de Google que administra tu Perfil de Negocio.
          </p>
          <PasosAntesDeConectar
            red="Google Business Profile"
            extra={<li style={{ marginBottom: 8 }}><strong>Comprueba que tu ficha está verificada por Google.</strong>{" "}Una ficha sin verificar no puede recibir publicaciones.</li>}
          />
        </div>
      ) : data.needsLocation ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.locationsLoaded && data.locations && data.locations.length > 0 ? (
            <>
              <select value={selected} onChange={(e) => setSelected(e.target.value)} style={inputStyle}>
                <option value="">Selecciona la ficha donde deseas publicar</option>
                {data.locations.map((l) => <option key={l.locationName} value={l.locationName}>{l.locationTitle}</option>)}
              </select>
              <button onClick={save} disabled={saving || !selected} className="secondary" style={secondaryButtonStyle}>
                {saving ? "Guardando..." : "Guardar ficha"}
              </button>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: 13, color: "#8a4b08", margin: 0 }}>
                {data.retryAfterSeconds ? `Google está preparando la consulta. Podrás buscar fichas en ${data.retryAfterSeconds} segundos.` : data.locationsLoaded ? "No encontramos fichas administradas por esta cuenta de Google." : "Tu cuenta está conectada. Busca las fichas disponibles para elegir dónde publicar."}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => void load(true)} disabled={loadingLocations} className="secondary" style={{ ...secondaryButtonStyle, opacity: loadingLocations ? 0.55 : 1 }}>
                  {loadingLocations ? "Buscando fichas..." : data.retryAfterSeconds ? "Espera para buscar fichas" : "Buscar fichas disponibles"}
                </button>
                <button type="button" onClick={() => { window.location.href = "/api/business-profile/connect"; }} className="secondary" style={secondaryButtonStyle}>
                  Conectar otra cuenta
                </button>
              </div>
            </div>
          )}
          {data.error && <p style={{ color: "#ff3b30", fontSize: 12 }}>{data.error}</p>}
          <button onClick={disconnect} className="secondary" style={secondaryButtonStyle}>Desconectar</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 13, color: "#16803c", margin: 0 }}>✓ Conectado a {data.locationTitle ?? data.locationName}</p>
          <div><button onClick={disconnect} className="secondary" style={secondaryButtonStyle}>Desconectar</button></div>
        </div>
      )}
      {message && <p style={{ fontSize: 13, color: "#16803c", marginTop: 10 }}>{message}</p>}
    </section>
  );
}
