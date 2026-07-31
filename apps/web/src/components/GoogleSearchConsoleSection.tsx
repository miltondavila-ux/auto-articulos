"use client";

import { useEffect, useState } from "react";
import {
  sectionStyle,
  h2Style,
  inputStyle,
  secondaryButtonStyle,
} from "./dashboard-ui";

type Site = { siteUrl: string; permissionLevel: string };

export default function GoogleSearchConsoleSection() {
  const [data, setData] = useState<{
    connected: boolean;
    siteUrl?: string | null;
    sitemapUrl?: string | null;
    sites: Site[];
    error?: string;
  } | null>(null);
  const [siteUrl, setSiteUrl] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/search-integrations/google");
    const value = await res.json();
    setData(value);
    setSiteUrl(value.siteUrl ?? "");
    setSitemapUrl(value.sitemapUrl ?? "");
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    const res = await fetch("/api/search-integrations/google", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteUrl, sitemapUrl }),
    });
    const value = await res.json().catch(() => ({}));
    setMessage(
      res.ok
        ? "Configuración de Google guardada."
        : (value.error ?? "No se pudo guardar."),
    );
    if (res.ok) load();
  }

  async function disconnect() {
    await fetch("/api/search-integrations/google", { method: "DELETE" });
    setMessage("Google Search Console desconectado.");
    load();
  }

  return (
    <section style={sectionStyle}>
      <h2 style={h2Style}>Google Search Console</h2>
      <p style={{ fontSize: 13, color: "#6b7280" }}>
        Conecta tu propia cuenta de Google. Auto Artículos nunca recibe tu
        contraseña y ningún usuario puede ver las propiedades de otro.
      </p>
      {!data?.connected ? (
        <a
          href="/api/search-integrations/google/connect"
          style={{
            ...secondaryButtonStyle,
            display: "inline-block",
            textDecoration: "none",
          }}
        >
          Conectar Google Search Console
        </a>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <select
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            style={inputStyle}
          >
            <option value="">Selecciona tu propiedad verificada</option>
            {data.sites.map((site) => (
              <option key={site.siteUrl} value={site.siteUrl}>
                {site.siteUrl}
              </option>
            ))}
          </select>
          <input
            value={sitemapUrl}
            onChange={(e) => setSitemapUrl(e.target.value)}
            placeholder="URL del sitemap, por ejemplo https://tusitio.com/sitemap.xml"
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={save} style={secondaryButtonStyle}>
              Guardar propiedad
            </button>
            <button onClick={disconnect} style={secondaryButtonStyle}>
              Desconectar Google
            </button>
          </div>
          {data.error && (
            <p style={{ color: "#d64545", fontSize: 12 }}>{data.error}</p>
          )}
        </div>
      )}
      {message && <p style={{ fontSize: 13, color: "#1e8a4b" }}>{message}</p>}
      <p style={{ fontSize: 12, color: "#6b7280" }}>
        Google no permite solicitar indexación individual de artículos normales.
        La app enviará tu sitemap después de publicar; Google decide si rastrea
        e indexa cada URL.
      </p>
    </section>
  );
}
