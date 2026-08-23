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

export default function BusinessProfileSection() {
  const [data, setData] = useState<{
    connected: boolean;
    needsLocation?: boolean;
    locationName?: string;
    locationTitle?: string;
    locations?: LocationOption[];
    error?: string;
  } | null>(null);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    if (loadingLocations) return;
    setLoadingLocations(true);
    try {
      const res = await fetch("/api/business-profile");
      const value = await res.json();
      setData(value);
    } finally {
      setLoadingLocations(false);
    }
  }

  useEffect(() => {
    load();
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
    setMessage(
      res.ok
        ? "Ubicación de Google Business Profile guardada."
        : (value.error ?? "No se pudo guardar."),
    );
    setSaving(false);
    if (res.ok) load();
  }

  async function disconnect() {
    await fetch("/api/business-profile", { method: "DELETE" });
    setMessage("Google Business Profile desconectado.");
    load();
  }

  return (
    <section style={sectionStyle}>
      <h2 style={h2Style}>Google Business Profile</h2>
      <p className="lead-copy" style={{ margin: "0 0 14px 0" }}>
        Cada vez que publiques un artículo, el sistema creará automáticamente una publicación en tu Perfil de Negocio de Google con un resumen, imagen y enlace al artículo completo.
      </p>
      {!data?.connected ? (
        <div>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/api/business-profile/connect";
            }}
            className="secondary"
            style={secondaryButtonStyle}
          >
            Conectar Google Business Profile
          </button>
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Conecta la cuenta de Google que administra tu Perfil de Negocio.
          </p>
        <PasosAntesDeConectar
          red="Google Business Profile"
          extra={
            <li style={{ marginBottom: 8 }}>
              <strong>Comprueba que tu ficha está verificada por Google.</strong>{" "}
              Una ficha sin verificar no puede recibir publicaciones. La
              verificación la hace Google y puede tardar unos días.
            </li>
          }
        />
        </div>
      ) : data.needsLocation ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.locations && data.locations.length > 0 ? (
            <>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                style={inputStyle}
              >
                <option value="">Elige tu ubicación</option>
                {data.locations.map((l) => (
                  <option key={l.locationName} value={l.locationName}>
                    {l.locationTitle}
                  </option>
                ))}
              </select>
              <button
                onClick={save}
                disabled={saving || !selected}
                className="secondary"
                style={secondaryButtonStyle}
              >
                {saving ? "Guardando..." : "Guardar ubicación"}
              </button>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: 13, color: "#8a4b08", margin: 0 }}>
                No pudimos cargar fichas todavía. Reintenta la búsqueda o conecta otra cuenta de Google.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={load}
                  disabled={loadingLocations}
                  className="secondary"
                  style={{ ...secondaryButtonStyle, opacity: loadingLocations ? 0.55 : 1 }}
                >
                  {loadingLocations ? "Buscando fichas..." : "Reintentar búsqueda"}
                </button>
                <button type="button" onClick={() => { window.location.href = "/api/business-profile/connect"; }} className="secondary" style={secondaryButtonStyle}>
                  Conectar otra cuenta
                </button>
              </div>
            </div>
          )}
          {data.error && (
            <p style={{ color: "#ff3b30", fontSize: 12 }}>{data.error}</p>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 13, color: "#16803c", margin: 0 }}>
            ✓ Conectado a {data.locationTitle ?? data.locationName}
          </p>
          <div>
            <button onClick={disconnect} className="secondary" style={secondaryButtonStyle}>
              Desconectar
            </button>
          </div>
        </div>
      )}
      {message && <p style={{ fontSize: 13, color: "#16803c", marginTop: 10 }}>{message}</p>}
    </section>
  );
}
