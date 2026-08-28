"use client";

import { useEffect, useState } from "react";
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
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/business-profile");
    const value = await res.json();
    setData(value);
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
            disabled
            title="Todavía no disponible"
            className="secondary"
            style={{
              ...secondaryButtonStyle,
              opacity: 0.45,
              cursor: "not-allowed",
            }}
          >
            Conectar Google Business Profile
          </button>
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Esta función está en espera de aprobación por parte de Google. Te avisaremos en cuanto esté disponible.
          </p>
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
            <p style={{ fontSize: 13, color: "#8a4b08", margin: 0 }}>
              No encontramos ninguna ubicación administrada por esta cuenta de Google.
            </p>
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
