"use client";

import { useEffect, useState } from "react";
import {
  sectionStyle,
  h2Style,
  inputStyle,
  secondaryButtonStyle,
} from "./dashboard-ui";

type Site = { Url: string; IsVerified: boolean };

type Message = {
  text: string;
  link?: { label: string; href: string };
  type: "success" | "error" | "info";
};

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
  const [message, setMessage] = useState<Message | null>(null);
  const [sendingSitemap, setSendingSitemap] = useState(false);
  const [editingSitemap, setEditingSitemap] = useState(false);
  const [masterIndexing, setMasterIndexing] = useState(false);
  const [masterResult, setMasterResult] = useState<{
    enviados: number;
    errores: number;
    total: number;
    yaIndexados: number;
    ultimoEnvio?: string | null;
    erroresDetalle?: string[];
  } | null>(null);

  async function load() {
    const res = await fetch("/api/search-integrations/bing");
    const value = await res.json();
    setData(value);
    setSiteUrl(value.siteUrl ?? "");
    setSitemapUrl(value.sitemapUrl ?? "");
    setEditingSitemap(false);
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
    if (res.ok) {
      setMessage({
        text: "Configuración de Bing guardada.",
        type: "success",
        link: { label: "Ver historial de artículos", href: "/dashboard/historial" },
      });
      load();
    } else {
      setMessage({
        text: value.error ?? "No se pudo guardar.",
        type: "error",
      });
    }
  }

  async function disconnect() {
    await fetch("/api/search-integrations/bing", { method: "DELETE" });
    setMessage({
      text: "Bing Webmaster Tools desconectado.",
      type: "info",
      link: { label: "Volver a conectar", href: "/dashboard/configuracion" },
    });
    load();
  }

  async function masterIndexAll() {
    setMasterIndexing(true);
    setMasterResult(null);
    setMessage(null);
    try {
      const res = await fetch("/api/bing/master-index", { method: "POST" });
      const value = await res.json().catch(() => ({}));
      if (res.ok) {
        setMasterResult({
          enviados: value.enviados ?? 0,
          errores: value.errores ?? 0,
          total: value.total ?? 0,
          yaIndexados: value.yaIndexados ?? 0,
          ultimoEnvio: value.ultimoEnvio,
          erroresDetalle: value.erroresDetalle,
        });
        if (value.total === 0) {
          setMessage({
            text: value.message ?? "No hay artículos pendientes.",
            type: "info",
            link: { label: "Ver historial", href: "/dashboard/historial" },
          });
        } else {
          setMessage({
            text: `MASTER INDEXACION: ${value.enviados} enviados, ${value.errores} errores de ${value.total} totales.`,
            type: value.errores > 0 ? "error" : "success",
            link: { label: "Ver artículos en historial", href: "/dashboard/historial" },
          });
        }
      } else {
        setMessage({
          text: value.error ?? "No se pudo ejecutar la indexación masiva.",
          type: "error",
          link: { label: "Revisar configuración de Bing", href: "/dashboard/configuracion" },
        });
      }
      await load();
    } finally {
      setMasterIndexing(false);
    }
  }

  async function sendSitemapNow() {
    setSendingSitemap(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sitemap/send-bing", { method: "POST" });
      const value = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({
          text: "Sitemap enviado a Bing correctamente.",
          type: "success",
          link: { label: "Ver historial de envíos", href: "/dashboard/historial" },
        });
      } else {
        setMessage({
          text: value.error ?? "No se pudo enviar el sitemap.",
          type: "error",
          link: { label: "Revisar configuración", href: "/dashboard/configuracion" },
        });
      }
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
          {data.sitemapUrl && !editingSitemap ? (
            <div style={{ fontSize: 13, color: "#1e8a4b" }}>
              ✓ Sitemap detectado: {data.sitemapUrl}{" "}
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
          <div style={{ borderTop: "1px solid #e5e8ec", marginTop: 12, paddingTop: 12 }}>
            <button
              onClick={masterIndexAll}
              disabled={masterIndexing}
              style={{
                padding: "12px 20px",
                borderRadius: 8,
                border: "2px solid #d97706",
                background: masterIndexing
                  ? "#fef3c7"
                  : "linear-gradient(135deg, #f59e0b, #d97706)",
                color: masterIndexing ? "#92400e" : "#ffffff",
                fontWeight: 700,
                fontSize: 14,
                cursor: masterIndexing ? "wait" : "pointer",
                letterSpacing: 0.5,
                boxShadow: masterIndexing
                  ? "none"
                  : "0 2px 8px rgba(217, 119, 6, 0.3)",
              }}
            >
              {masterIndexing
                ? "Enviando artículos a Bing..."
                : "⚡ MASTER INDEXACION BING"}
            </button>
            <p style={{ fontSize: 11, color: "#6b7280", margin: "6px 0 0" }}>
              Envía TODOS tus artículos publicados a Bing para indexación
              instantánea de una sola vez.
            </p>
          </div>
          {masterResult && (
            <div
              style={{
                background: masterResult.errores > 0 ? "#fef2f2" : "#f0fdf4",
                border: `1px solid ${masterResult.errores > 0 ? "#fecaca" : "#bbf7d0"}`,
                borderRadius: 8,
                padding: 12,
                fontSize: 13,
              }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>
                {masterResult.errores > 0 ? "Resultados parciales:" : "Completado:"}
              </p>
              <p style={{ margin: "4px 0 0" }}>
                ✓ {masterResult.enviados} enviados de {masterResult.total} artículos nuevos
                {masterResult.errores > 0 &&
                  ` · ✗ ${masterResult.errores} errores`}
              </p>
              {masterResult.yaIndexados > 0 && (
                <p style={{ margin: "4px 0 0", color: "#16a34a" }}>
                  ✓ {masterResult.yaIndexados} artículos ya estaban indexados en Bing
                  {masterResult.ultimoEnvio &&
                    ` — último envío: ${new Date(masterResult.ultimoEnvio).toLocaleString("es-US")}`}
                </p>
              )}
              {masterResult.erroresDetalle &&
                masterResult.erroresDetalle.length > 0 && (
                  <ul
                    style={{
                      margin: "6px 0 0",
                      paddingLeft: 16,
                      fontSize: 12,
                      color: "#991b1b",
                    }}
                  >
                    {masterResult.erroresDetalle.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
            </div>
          )}
          {data.error && (
            <p style={{ color: "#d64545", fontSize: 12 }}>{data.error}</p>
          )}
        </div>
      )}
      {message && (
        <p
          style={{
            fontSize: 13,
            color: message.type === "error" ? "#d64545" : message.type === "success" ? "#16a34a" : "#6b7280",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {message.text}
          {message.link && (
            <a
              href={message.link.href}
              style={{
                color: "#1358a3",
                fontWeight: 600,
                textDecoration: "underline",
              }}
            >
              {message.link.label}
            </a>
          )}
        </p>
      )}
      <p style={{ fontSize: 12, color: "#6b7280" }}>
        El sistema enviará tu sitemap a Bing todas las noches. Bing permite indexación instantánea para cada artículo nuevo — cuando publiques, el sistema lo enviará a Bing automáticamente para que aparezca en los resultados de búsqueda más rápido.
      </p>
    </section>
  );
}
