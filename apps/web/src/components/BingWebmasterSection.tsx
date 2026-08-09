"use client";

import { useEffect, useState } from "react";
import {
  sectionStyle,
  h2Style,
  inputStyle,
  secondaryButtonStyle,
} from "./dashboard-ui";

type Site = { Url: string; IsVerified: boolean };

export default function BingWebmasterSection() {
  const [data, setData] = useState<{
    connected: boolean;
    siteUrl?: string | null;
    sitemapUrl?: string | null;
    sites: Site[];
    error?: string;
    lastSitemapSyncAt?: string | null;
    lastSitemapSyncStatus?: string | null;
    lastSitemapSyncError?: string | null;
  } | null>(null);
  const [siteUrl, setSiteUrl] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [message, setMessage] = useState("");
  const [sendingSitemap, setSendingSitemap] = useState(false);

  async function load() {
    const res = await fetch("/api/search-integrations/bing");
    const value = await res.json();
    setData(value);
    setSiteUrl(value.siteUrl ?? "");
    setSitemapUrl(value.sitemapUrl ?? "");
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    const res = await fetch("/api/search-integrations/bing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteUrl, sitemapUrl }),
    });
    const value = await res.json().catch(() => ({}));
    setMessage(
      res.ok
        ? "Configuración de Bing guardada."
        : (value.error ?? "No se pudo guardar."),
    );
    if (res.ok) load();
  }

  async function disconnect() {
    await fetch("/api/search-integrations/bing", { method: "DELETE" });
    setMessage("Bing Webmaster Tools desconectado.");
    load();
  }

  async function sendSitemapNow() {
    setSendingSitemap(true);
    setMessage("");
    try {
      const res = await fetch("/api/sitemap/send-bing", { method: "POST" });
      const value = await res.json().catch(() => ({}));
      setMessage(
        res.ok
          ? "Sitemap enviado a Bing correctamente."
          : (value.error ?? "No se pudo enviar el sitemap."),
      );
      await load();
    } finally {
      setSendingSitemap(false);
    }
  }

  return (
    <section style={sectionStyle}>
      <h2 style={h2Style}>Bing Webmaster Tools</h2>
      <p style={{ fontSize: 13, color: "#6b7280" }}>
        Conecta tu cuenta de Bing para que tus artículos aparezcan en los resultados de búsqueda de Bing. A diferencia de Google, Bing permite solicitar indexación instantánea de cada artículo ni bien se publica — el sistema lo hace solo.
      </p>
      {!data?.connected ? (
        <a
          href="/api/search-integrations/bing/connect"
          style={{
            ...secondaryButtonStyle,
            display: "inline-block",
            textDecoration: "none",
          }}
        >
          Conectar Bing Webmaster Tools
        </a>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <select
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            style={inputStyle}
          >
            <option value="">Selecciona tu sitio verificado</option>
            {data.sites.map((site) => (
              <option key={site.Url} value={site.Url}>
                {site.Url}
              </option>
            ))}
          </select>
          <input
            value={sitemapUrl}
            onChange={(e) => setSitemapUrl(e.target.value)}
            placeholder="URL del sitemap, por ejemplo https://tusitio.com/sitemap.xml"
            style={inputStyle}
          />
          {data.sitemapUrl && (
            <div style={{ fontSize: 12 }}>
              {data.lastSitemapSyncStatus === "success" && (
                <p style={{ color: "#1e8a4b", margin: 0 }}>
                  ✓ Último envío exitoso
                  {data.lastSitemapSyncAt
                    ? `: ${new Date(data.lastSitemapSyncAt).toLocaleString("es-US")}`
                    : "."}
                </p>
              )}
              {data.lastSitemapSyncStatus === "error" && (
                <p style={{ color: "#d64545", margin: 0 }}>
                  ✗ El último envío falló
                  {data.lastSitemapSyncAt
                    ? ` (${new Date(data.lastSitemapSyncAt).toLocaleString("es-US")})`
                    : ""}
                  {data.lastSitemapSyncError
                    ? `: ${data.lastSitemapSyncError}`
                    : "."}
                </p>
              )}
              {!data.lastSitemapSyncStatus && (
                <p style={{ color: "#6b7280", margin: 0 }}>
                  Todavía no se ha enviado el sitemap.
                </p>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={save} style={secondaryButtonStyle}>
              Guardar sitio
            </button>
            {data.sitemapUrl && (
              <button
                onClick={sendSitemapNow}
                disabled={sendingSitemap}
                style={secondaryButtonStyle}
              >
                {sendingSitemap ? "Enviando..." : "Enviar sitemap ahora"}
              </button>
            )}
            <button onClick={disconnect} style={secondaryButtonStyle}>
              Desconectar Bing
            </button>
          </div>
          {data.error && (
            <p style={{ color: "#d64545", fontSize: 12 }}>{data.error}</p>
          )}
        </div>
      )}
      {message && <p style={{ fontSize: 13, color: "#1e8a4b" }}>{message}</p>}
    </section>
  );
}
