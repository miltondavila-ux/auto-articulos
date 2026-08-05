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
      <p style={{ fontSize: 13, color: "#6b7280" }}>
        Cada vez que se publique un artículo, se creará automáticamente una
        publicación en tu perfil de negocio de Google, con un resumen corto,
        una imagen y un botón que lleva al artículo. Puedes conectar la misma
        cuenta de Google que usas para Search Console, u otra distinta.
      </p>
      {!data?.connected ? (
        <a
          href="/api/business-profile/connect"
          style={{
            ...secondaryButtonStyle,
            display: "inline-block",
            textDecoration: "none",
          }}
        >
          Conectar Google Business Profile
        </a>
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
                style={secondaryButtonStyle}
              >
                {saving ? "Guardando..." : "Guardar ubicación"}
              </button>
            </>
          ) : (
            <p style={{ fontSize: 13, color: "#8a6d1a", margin: 0 }}>
              No encontramos ninguna ubicación administrada por esta cuenta de
              Google.
            </p>
          )}
          {data.error && (
            <p style={{ color: "#d64545", fontSize: 12 }}>{data.error}</p>
          )}
          <button onClick={disconnect} style={secondaryButtonStyle}>
            Desconectar Google
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 13, color: "#1e8a4b", margin: 0 }}>
            ✓ Conectado: {data.locationTitle}
          </p>
          <div>
            <button onClick={disconnect} style={secondaryButtonStyle}>
              Desconectar Google
            </button>
          </div>
        </div>
      )}
      {message && <p style={{ fontSize: 13, color: "#1e8a4b" }}>{message}</p>}
    </section>
  );
}
