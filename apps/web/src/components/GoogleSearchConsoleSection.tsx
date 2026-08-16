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
    lastSitemapSyncAt?: string | null;
    lastSitemapSyncStatus?: string | null;
    lastSitemapSyncError?: string | null;
  } | null>(null);
  const [siteUrl, setSiteUrl] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [message, setMessage] = useState("");
  const [sendingSitemap, setSendingSitemap] = useState(false);
  const [editingSitemap, setEditingSitemap] = useState(false);

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

  async function sendSitemapNow() {
    setSendingSitemap(true);
    setMessage("");
    try {
      const res = await fetch("/api/sitemap/send", { method: "POST" });
      const value = await res.json().catch(() => ({}));
      setMessage(
        res.ok
          ? "Sitemap enviado a Google correctamente."
          : (value.error ?? "No se pudo enviar el sitemap."),
      );
      await load();
    } finally {
      setSendingSitemap(false);
    }
  }

  return (
    <section style={sectionStyle}>
      <h2 style={h2Style}>Google Search Console</h2>
      <p className="lead-copy" style={{ margin: "0 0 16px 0" }}>
        Conecta tu cuenta de Google para que tus artículos aparezcan en los resultados de búsqueda de Google. Auto Artículos enviará tu sitemap automáticamente y te mostrará el estado de indexación de cada artículo.
      </p>

      <div
        className="row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "14px 16px",
          marginBottom: 16,
          borderRadius: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#1d1d1f" }}>
            ¿No tienes Google Search Console?
          </div>
          <div style={{ fontSize: 12, color: "#6e6e73", marginTop: 2 }}>
            Aprende cómo activarlo paso a paso con este video tutorial oficial.
          </div>
        </div>
        <a
          href="https://youtu.be/c9aOFmvaHHo?si=0K0XfnbJPE2j8OMt&t=5"
          target="_blank"
          rel="noreferrer"
          className="secondary"
          style={{
            ...secondaryButtonStyle,
            fontSize: 12,
            padding: "6px 14px",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          Ver video tutorial &rarr;
        </a>
      </div>

      {!data?.connected ? (
        <a
          href="/api/search-integrations/google/connect"
          className="link-button"
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
          {data.sitemapUrl && !editingSitemap ? (
            <div style={{ fontSize: 13, color: "#16803c" }}>
              ✓ Sitemap detectado automáticamente: {data.sitemapUrl}{" "}
              <button
                type="button"
                onClick={() => setEditingSitemap(true)}
                className="link-button"
                style={{
                  border: 0,
                  padding: 0,
                  background: "transparent",
                  fontSize: 12,
                  fontWeight: 500,
                  marginLeft: 6,
                }}
              >
                Cambiar
              </button>
            </div>
          ) : (
            <>
              {!data.sitemapUrl && (
                <p style={{ fontSize: 12, color: "#8a4b08", margin: 0 }}>
                  No pudimos detectar tu sitemap automáticamente — puedes escribirlo a mano.
                </p>
              )}
              <input
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                placeholder="URL del sitemap, ej: https://tusitio.com/sitemap.xml"
                style={inputStyle}
              />
            </>
          )}
          {data.sitemapUrl && (
            <div style={{ fontSize: 12 }}>
              {data.lastSitemapSyncStatus === "success" && (
                <p style={{ color: "#16803c", margin: 0 }}>
                  ✓ Último envío exitoso
                  {data.lastSitemapSyncAt
                    ? `: ${new Date(data.lastSitemapSyncAt).toLocaleString("es-US")}`
                    : "."}
                </p>
              )}
              {!data.lastSitemapSyncStatus && (
                <p className="muted" style={{ margin: 0 }}>
                  Todavía no se ha enviado el sitemap.
                </p>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={save} className="secondary" style={secondaryButtonStyle}>
              Guardar propiedad
            </button>
            {data.sitemapUrl && (
              <button
                onClick={sendSitemapNow}
                disabled={sendingSitemap}
                className="secondary"
                style={secondaryButtonStyle}
              >
                {sendingSitemap ? "Enviando..." : "Enviar sitemap ahora"}
              </button>
            )}
            <button onClick={disconnect} className="secondary" style={secondaryButtonStyle}>
              Desconectar Google
            </button>
          </div>
          {data.error && (
            <p style={{ color: "#ff3b30", fontSize: 12 }}>{data.error}</p>
          )}
        </div>
      )}
      {message && <p style={{ fontSize: 13, color: "#16803c", marginTop: 10 }}>{message}</p>}
      <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
        El sistema enviará tu sitemap a Google todas las noches y consultará el estado de cada URL automáticamente. Si un artículo no se indexa, verás un acceso directo para solicitar la indexación manual desde Search Console.
      </p>
    </section>
  );
}
