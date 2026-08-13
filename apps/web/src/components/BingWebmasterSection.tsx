"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  // Bug real encontrado el 11/8/2026 (cuenta de Julio Paso): el enlace
  // "Reconectar Bing"/"Conectar Bing Webmaster Tools" no daba NINGUNA señal
  // visual al hacer clic — el usuario, al no ver nada, hacía varios clics
  // seguidos (confirmado en logs: 5 solicitudes a /connect en menos de 1
  // segundo). Cada clic pisa la cookie de estado OAuth del clic anterior, y
  // cuando el callback finalmente llega, el estado ya no coincide con el más
  // reciente — la reconexión falla EN SILENCIO (el callback redirige a
  // `?bing=error` pero nada en esta pantalla leía ese parámetro), dejando al
  // usuario de vuelta en el mismo aviso rojo sin ninguna explicación ni forma
  // de saber qué pasó. Se agrega: (1) estado de "conectando" que bloquea
  // clics repetidos, y (2) lectura real de `?bing=error`/`?bing=connected`
  // para mostrar qué pasó de verdad.
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

  // Bug real encontrado el 11/8/2026 (cuenta de Julio Paso): cuando el token
  // de Bing vence, la lista de sitios queda vacía (no se puede volver a
  // traer de Bing) y por eso nunca se pudo guardar un `siteUrl`. Eso hacía
  // que "MASTER INDEXACION BING" fallara con OTRO mensaje distinto ("conecta
  // y elige tu sitio primero"), sin relación aparente con el error real de
  // arriba ("Refresh token is invalid or expired") — dos síntomas de la
  // MISMA causa, mostrados como si fueran dos problemas separados, sin decir
  // qué hacer. Se detecta ese patrón específico para mostrar un solo aviso
  // claro con la acción correcta (reconectar), en vez de dos.
  //
  // Ampliado el 13/8/2026 (cuenta de Lorena Álvarez): Bing también reporta la
  // conexión muerta como `invalid_client` / "Client authentication failed.",
  // que no coincidía con ninguno de los patrones de arriba. Resultado: el
  // selector de sitios quedaba vacío, se mostraba ese texto en inglés en letra
  // chica y NO aparecía el botón "Reconectar Bing" — el usuario no tenía forma
  // de salir del problema desde la pantalla.
  const tokenExpired =
    !!data?.error &&
    /invalid.*token|invalid_client|invalid_grant|client authentication|volver a autorizar|expired|unauthorized|401/i.test(
      data.error,
    );

  useEffect(() => {
    load();
    const bingParam = searchParams.get("bing");
    if (bingParam === "connected") {
      setMessage({ text: "Bing reconectado correctamente.", type: "success" });
      setConnecting(false);
      router.replace("/dashboard/configuracion");
    } else if (bingParam === "error") {
      setMessage({
        text:
          searchParams.get("motivo") === "token"
            ? "Bing aceptó el permiso pero rechazó el último paso de la conexión. Esto no se arregla reintentando: revisá que el Client ID, el Client Secret y la Redirect URI configurados coincidan exactamente con los de tu app en Bing Webmaster Tools."
            : "No se pudo completar la reconexión con Bing (puede pasar si se hizo clic varias veces seguidas). Probá una sola vez y esperá a que la página redirija sola.",
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
            text: `MASTER INDEXACION COMPLETADA: Se enviaron ${value.enviados} de ${value.total} artículos a Bing.`,
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
          aria-disabled={connecting}
          onClick={(e) => {
            if (connecting) {
              e.preventDefault();
              return;
            }
            setConnecting(true);
          }}
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
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: 14,
          }}
        >
          <p style={{ margin: 0, fontWeight: 700, color: "#991b1b", fontSize: 14 }}>
            ⚠️ Tu conexión con Bing venció
          </p>
          <p style={{ margin: "6px 0 10px", color: "#991b1b", fontSize: 13 }}>
            Esto pasa del lado de Bing (no es un error del sistema) — hay que
            volver a autorizar la cuenta. Es rápido: al reconectar, tu sitio y
            tu sitemap guardados no se pierden.
          </p>
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
              display: "inline-block",
              background: "#991b1b",
              color: "#fff",
              padding: "8px 16px",
              borderRadius: 8,
              fontWeight: 700,
              textDecoration: "none",
              fontSize: 13,
              opacity: connecting ? 0.6 : 1,
              pointerEvents: connecting ? "none" : "auto",
              cursor: connecting ? "wait" : "pointer",
            }}
          >
            {connecting ? "Conectando con Bing..." : "Reconectar Bing"}
          </a>
          {connecting && (
            <p style={{ margin: "8px 0 0", color: "#991b1b", fontSize: 12 }}>
              Un solo clic alcanza — te vamos a redirigir a Bing y de vuelta
              automáticamente. Esperá, no hace falta volver a presionar.
            </p>
          )}
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
              Envía a Bing los artículos publicados que todavía no se enviaron.
              Bing limita cuántas URLs acepta por día, así que si tenés muchos
              se envían por tandas: volvé a pulsarlo otro día y sigue desde
              donde quedó.
            </p>
          </div>
          {masterResult && (() => {
            // Quedó trabajo sin hacer si algo falló o si el cupo diario de Bing
            // cortó el envío antes de llegar a todos. Con cupo agotado se
            // enviaban 0 artículos y la tarjeta igual salía verde diciendo
            // "completada exitosamente", que es justo lo contrario de lo que
            // pasó y deja al usuario sin saber que tiene que volver mañana.
            const masterIncompleto =
              masterResult.errores > 0 || (masterResult.sinCupo ?? 0) > 0;
            return (
            <div
              style={{
                background: masterIncompleto ? "#fffbeb" : "#f0fdf4",
                border: `1px solid ${masterIncompleto ? "#fde68a" : "#bbf7d0"}`,
                borderRadius: 8,
                padding: 12,
                fontSize: 13,
              }}
            >
              <p style={{ margin: 0, fontWeight: 600, color: masterIncompleto ? "#92400e" : "#166534" }}>
                {masterResult.errores > 0
                  ? "⚠️ Indexación masiva completada con algunos errores:"
                  : masterIncompleto
                    ? "⏳ Indexación masiva parcial — falta una parte:"
                    : "✓ Indexación masiva completada exitosamente:"}
              </p>
              <p style={{ margin: "4px 0 0", color: "#1f2937" }}>
                • <strong>{masterResult.enviados}</strong> artículos enviados a Bing para indexar de un total de <strong>{masterResult.total}</strong> publicados.
                {masterResult.errores > 0 && (
                  <span style={{ color: "#dc2626", marginLeft: 8 }}>
                    ({masterResult.errores} no se pudieron enviar)
                  </span>
                )}
              </p>
              {masterResult.yaIndexados > 0 && (
                <p style={{ margin: "4px 0 0", color: "#1f2937" }}>
                  • <strong>{masterResult.yaIndexados}</strong> ya se habían
                  enviado antes, así que no se reenviaron (habrían gastado cupo
                  en artículos que Bing ya conoce).
                </p>
              )}
              {!!masterResult.sinCupo && masterResult.sinCupo > 0 && (
                <p style={{ margin: "4px 0 0", color: "#92400e" }}>
                  • Quedaron <strong>{masterResult.sinCupo}</strong> esperando:
                  Bing solo permite{" "}
                  {masterResult.cupoDiario !== null
                    ? `${masterResult.cupoDiario} envío(s)`
                    : "una cantidad limitada de envíos"}{" "}
                  por día para este sitio. Volvé a pulsar el botón mañana y
                  siguen desde donde quedaron — no se pierden.
                </p>
              )}
              {masterResult.erroresDetalle &&
                masterResult.erroresDetalle.length > 0 && (
                  <ul
                    style={{
                      margin: "8px 0 0",
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
            );
          })()}
          {data.error && !tokenExpired && (
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
