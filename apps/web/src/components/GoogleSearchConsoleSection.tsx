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
  // El sitemap se detecta solo preguntándole a Google (ver la API) — no
  // tiene sentido mostrarle a todo el mundo un campo de texto para
  // escribirlo a mano si ya se detectó. Pedido explícito del usuario
  // (1/8/2026): "eso debería estar en automático en la plataforma". El
  // campo manual solo se muestra si la detección automática no encontró
  // nada, o si el usuario pide explícitamente cambiarlo.
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
      <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px 0" }}>
        Conecta tu cuenta de Google para que tus artículos aparezcan en los resultados de búsqueda de Google. Auto Artículos enviará tu sitemap automáticamente y te mostrará el estado de indexación de cada artículo.
      </p>

      <div
        style={{
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 8,
          padding: "12px 14px",
          marginBottom: 14,
          fontSize: 13,
          color: "#1e40af",
          lineHeight: 1.5,
        }}
      >
        <p style={{ margin: "0 0 4px 0", fontWeight: 700, color: "#0f172a" }}>
          📺 ¿No tienes el Google Search Console?
        </p>
        <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "#475569" }}>
          Aprende cómo activarte paso a paso con este video tutorial:
        </p>
        <a
          href="https://youtu.be/c9aOFmvaHHo?si=0K0XfnbJPE2j8OMt&t=5"
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#dc2626",
            color: "#ffffff",
            textDecoration: "none",
            padding: "6px 12px",
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 12,
            boxShadow: "0 2px 6px rgba(220, 38, 38, 0.2)",
          }}
        >
          ▶️ Ver video: Cómo activar Google Search Console ↗
        </a>
      </div>

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
          {data.sitemapUrl && !editingSitemap ? (
            <div style={{ fontSize: 13, color: "#1e8a4b" }}>
              ✓ Sitemap detectado automáticamente: {data.sitemapUrl}{" "}
              <button
                type="button"
                onClick={() => setEditingSitemap(true)}
                style={{
                  border: 0,
                  padding: 0,
                  background: "transparent",
                  color: "#1358a3",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Cambiar
              </button>
            </div>
          ) : (
            <>
              {!data.sitemapUrl && (
                <p style={{ fontSize: 12, color: "#8a6d1a", margin: 0 }}>
                  No pudimos detectar tu sitemap automáticamente — podés
                  escribirlo a mano si lo conocés.
                </p>
              )}
              <input
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                placeholder="URL del sitemap, por ejemplo https://tusitio.com/sitemap.xml"
                style={inputStyle}
              />
            </>
          )}
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
              {/*
                Mismo criterio que en BingWebmasterSection (pedido de Milton,
                13/8/2026): solo se muestran los envíos exitosos. El aviso de
                falla no es accionable para el usuario y solo genera llamados a
                soporte. El error sigue guardado en la base de datos y en logs.
              */}
              {!data.lastSitemapSyncStatus && (
                <p style={{ color: "#6b7280", margin: 0 }}>
                  Todavía no se ha enviado el sitemap.
                </p>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={save} style={secondaryButtonStyle}>
              Guardar propiedad
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
        El sistema enviará tu sitemap a Google todas las noches y consultará el estado de cada URL automáticamente. Si un artículo no se indexa, verás un acceso directo para solicitar la indexación manual desde Search Console.
      </p>
    </section>
  );
}
