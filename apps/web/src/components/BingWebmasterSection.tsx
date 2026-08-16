"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  sectionStyle,
  h2Style,
  inputStyle,
  secondaryButtonStyle,
  buttonStyle,
} from "./dashboard-ui";

type Site = { Url: string; IsVerified: boolean };

type Message = {
  text: string;
  link?: { label: string; href: string };
  type: "success" | "error" | "info";
};

export default function BingWebmasterSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connecting, setConnecting] = useState(false);
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
  const [reconectando, setReconectando] = useState(false);
  const [masterResult, setMasterResult] = useState<{
    enviados: number;
    errores: number;
    total: number;
    yaIndexados: number;
    sinCupo?: number;
    cupoDiario?: number | null;
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

  const tokenExpired =
    !reconectando &&
    !!data?.error &&
    /invalid.*token|invalid_client|invalid_grant|client authentication|volver a autorizar|expired|unauthorized|401/i.test(
      data.error,
    );

  useEffect(() => {
    const bingParam = searchParams.get("bing");
    if (bingParam === "connected") {
      setMessage({ text: "Bing reconectado correctamente.", type: "success" });
      setConnecting(false);
      setReconectando(true);
      const t = setTimeout(() => {
        load().finally(() => setReconectando(false));
      }, 2500);
      router.replace("/dashboard/configuracion");
      return () => clearTimeout(t);
    }
    load();
    if (bingParam === "error") {
      setMessage({
        text:
          searchParams.get("motivo") === "token"
            ? `Bing aceptó el permiso pero rechazó el último paso de la conexión. Revisa que el Client ID, el Client Secret y la Redirect URI coincidan exactamente con tu app en Bing Webmaster Tools.${
                searchParams.get("detalle")
                  ? ` — Detalle: "${searchParams.get("detalle")}"`
                  : ""
              }`
            : "No se pudo completar la reconexión con Bing. Intenta una sola vez y espera la redirección.",
        type: "error",
      });
      setConnecting(false);
      router.replace("/dashboard/configuracion");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          sinCupo: value.sinCupo ?? 0,
          cupoDiario: value.cupoDiario ?? null,
          erroresDetalle: value.erroresDetalle,
        });
        if (value.total === 0) {
          setMessage({
            text: value.message ?? "No hay artículos publicados para enviar.",
            type: "info",
            link: { label: "Ver historial", href: "/dashboard/historial" },
          });
        } else {
          setMessage({
            text: `Indexación completada: Se enviaron ${value.enviados} de ${value.total} artículos a Bing.`,
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
      <div className="row" style={{ padding: "12px 16px", marginBottom: 16 }}>
        <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>
          Paso a paso para conectar:
        </p>
        <p className="lead-copy" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
          1. Abre una pestaña con <strong>Bing Webmaster Tools</strong> (sesión iniciada).<br />
          2. Presiona <strong>"Conectar Bing Webmaster Tools"</strong> abajo.<br />
          3. Acepta los permisos de Microsoft y la sincronización será automática.
        </p>
      </div>

      {!data?.connected ? (
        <a
          href="/api/search-integrations/bing/connect"
          aria-disabled={connecting}
          onClick={(e) => {
            if (connecting) {
              e.preventDefault();
              return;
            }
            setConnecting(true);
          }}
          className="secondary"
          style={{
            ...secondaryButtonStyle,
            display: "inline-block",
            textDecoration: "none",
            opacity: connecting ? 0.6 : 1,
            pointerEvents: connecting ? "none" : "auto",
            cursor: connecting ? "wait" : "pointer",
          }}
        >
          {connecting ? "Conectando..." : "Conectar Bing Webmaster Tools"}
        </a>
      ) : tokenExpired ? (
        <div
          style={{
            background: "#fff2f1",
            border: "1px solid rgba(255, 59, 48, 0.2)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, color: "#ff3b30", fontSize: 14 }}>
            Tu conexión con Bing venció
          </p>
          <p style={{ margin: "6px 0 12px", color: "#6e6e73", fontSize: 13, lineHeight: 1.5 }}>
            Para reconectar:<br />
            1. Abre tu cuenta de <strong>Bing Webmaster Tools</strong> en otra pestaña.<br />
            2. Haz clic en <strong>"Reconectar Bing"</strong>.<br />
            3. Al autorizar, tu sitio y sitemap seguirán guardados.
          </p>
          {data.error && (
            <p
              style={{
                margin: "0 0 10px",
                color: "#8a4b08",
                fontSize: 11,
                fontFamily: "monospace",
              }}
            >
              {data.error}
            </p>
          )}
          <a
            href="/api/search-integrations/bing/connect"
            aria-disabled={connecting}
            onClick={(e) => {
              if (connecting) {
                e.preventDefault();
                return;
              }
              setConnecting(true);
            }}
            style={{
              ...buttonStyle,
              display: "inline-block",
              textDecoration: "none",
              padding: "8px 16px",
              fontSize: 13,
              opacity: connecting ? 0.6 : 1,
              pointerEvents: connecting ? "none" : "auto",
            }}
          >
            {connecting ? "Conectando con Bing..." : "Reconectar Bing"}
          </a>
        </div>
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
            <div style={{ fontSize: 13, color: "#16803c" }}>
              ✓ Sitemap detectado: {data.sitemapUrl}{" "}
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
              Guardar sitio
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
              Desconectar Bing
            </button>
          </div>
          <div style={{ borderTop: "1px solid #e5e5ea", marginTop: 12, paddingTop: 14 }}>
            <button
              onClick={masterIndexAll}
              disabled={masterIndexing}
              style={{
                ...buttonStyle,
                marginTop: 0,
                padding: "10px 18px",
              }}
            >
              {masterIndexing
                ? "Enviando artículos a Bing..."
                : "Indexación masiva en Bing"}
            </button>
            <p className="muted" style={{ fontSize: 12, margin: "6px 0 0" }}>
              Envía a Bing los artículos publicados pendientes. Bing limita los envíos diarios por sitio.
            </p>
          </div>
          {masterResult && (() => {
            const masterIncompleto =
              masterResult.errores > 0 || (masterResult.sinCupo ?? 0) > 0;
            return (
            <div
              style={{
                background: masterIncompleto ? "#fff4e5" : "#f2faf4",
                border: `1px solid ${masterIncompleto ? "rgba(255, 149, 0, 0.25)" : "rgba(52, 199, 89, 0.25)"}`,
                borderRadius: 12,
                padding: "12px 16px",
                fontSize: 13,
              }}
            >
              <p style={{ margin: 0, fontWeight: 600, color: masterIncompleto ? "#8a4b08" : "#16803c" }}>
                {masterResult.errores > 0
                  ? "Indexación masiva con algunos errores:"
                  : masterIncompleto
                    ? "Indexación parcial pendiente:"
                    : "✓ Indexación completada exitosamente:"}
              </p>
              <p style={{ margin: "4px 0 0", color: "#1d1d1f" }}>
                • <strong>{masterResult.enviados}</strong> artículos enviados a Bing de un total de <strong>{masterResult.total}</strong>.
                {masterResult.errores > 0 && (
                  <span style={{ color: "#ff3b30", marginLeft: 8 }}>
                    ({masterResult.errores} no se pudieron enviar)
                  </span>
                )}
              </p>
              {masterResult.yaIndexados > 0 && (
                <p style={{ margin: "4px 0 0", color: "#6e6e73" }}>
                  • <strong>{masterResult.yaIndexados}</strong> ya estaban indexados previamente.
                </p>
              )}
              {!!masterResult.sinCupo && masterResult.sinCupo > 0 && (
                <p style={{ margin: "4px 0 0", color: "#8a4b08" }}>
                  • Quedaron <strong>{masterResult.sinCupo}</strong> esperando cupo diario de Bing.
                </p>
              )}
            </div>
            );
          })()}
          {data.error && !tokenExpired && (
            <p style={{ color: "#ff3b30", fontSize: 12 }}>{data.error}</p>
          )}
        </div>
      )}
      {message && (
        <p
          style={{
            fontSize: 13,
            color: message.type === "error" ? "#ff3b30" : message.type === "success" ? "#16803c" : "#6e6e73",
            margin: "12px 0 0",
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
              className="link-button"
              style={{ fontSize: 13 }}
            >
              {message.link.label}
            </a>
          )}
        </p>
      )}
      <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
        El sistema enviará tu sitemap a Bing todas las noches y procesará cada artículo publicado para acelerar su aparición en búsquedas.
      </p>
    </section>
  );
}
