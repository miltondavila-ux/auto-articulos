"use client";

import { useState } from "react";
import type { TitleRow } from "@/types/dashboard";

// Pedido explícito del usuario (13/8/2026): los estados intermedios/pendientes
// ("Sitemap: todavía no se confirmó...", "Google: pendiente de indexación",
// el mensaje de "Google no reconoce esta URL", "Bing no estaba conectado...")
// y el botón "Actualizar estado" generaban confusión y alarma constante en el
// historial, sin ser accionables — indexar en Google/Bing lleva tiempo y es
// normal que un artículo recién publicado todavía no aparezca. Ahora solo se
// muestran los estados POSITIVOS confirmados (✓ enviado / ✓ indexado / ✓
// enviado a Bing) y errores reales; el silencio es el estado normal de
// "todavía no, pero va a pasar".
export default function GoogleIndexingStatus({ title }: { title: TitleRow }) {
  const [status] = useState(title.googleIndexingStatus);
  const [message] = useState(title.googleIndexingMessage);

  const indexed = status === "indexed";

  if (status === "not_configured") {
    return (
      <div style={{ marginTop: 7, fontSize: 12 }}>
        <div style={{ color: "#6b7280" }}>
          Google Search Console no estaba conectado cuando se publicó este
          artículo.
        </div>
        <div style={{ marginTop: 5 }}>
          <a
            href="/dashboard/configuracion"
            style={{ color: "#1358a3", fontWeight: 600 }}
          >
            Conectar Google Search Console
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 7, fontSize: 12 }}>
      {title.lastSitemapSentAt && (
        <div style={{ color: "#1e8a4b" }}>
          {`✓ Sitemap enviado: ${new Date(title.lastSitemapSentAt).toLocaleString("es-US")}`}
        </div>
      )}
      {title.businessProfilePost && (
        <div
          style={{
            color:
              title.businessProfilePost.status === "sent"
                ? "#1e8a4b"
                : title.businessProfilePost.status === "rejected" ||
                    title.businessProfilePost.status === "error"
                  ? "#d64545"
                  : "#8a6d1a",
          }}
        >
          {title.businessProfilePost.status === "sent"
            ? `✓ Publicado en Google Business Profile${title.businessProfilePost.sentAt ? `: ${new Date(title.businessProfilePost.sentAt).toLocaleString("es-US")}` : ""}`
            : title.businessProfilePost.status === "rejected"
              ? "Google Business Profile rechazó esta publicación."
              : title.businessProfilePost.status === "error"
                ? "Error al publicar en Google Business Profile."
                : "Publicando en Google Business Profile..."}
        </div>
      )}
      {(status === "error" || indexed) && (
        <div style={{ color: status === "error" ? "#d64545" : "#1e8a4b" }}>
          {status === "error"
            ? "Google: error al consultar la indexación"
            : "✓ Indexada en Google"}
        </div>
      )}
      {message && status === "error" && (
        <div style={{ color: "#6b7280", marginTop: 2 }}>{message}</div>
      )}
      {/* Bing Indexing Status.
          Pedido explícito del usuario (11/8/2026): el error "InvalidToken" de
          Bing es intermitente del lado de Bing (reintenta 2 veces con token
          fresco en notifyBing() y aun así falla para algunos títulos del
          mismo lote, con el mismo token válido) — no es algo que más
          reintentos de nuestro código vayan a resolver, y el artículo ya se
          publicó bien de todas formas (esto es solo la indexación instantánea
          opcional). Se deja de mostrar el estado "error" para no alarmar por
          algo fuera de nuestro control; "submitted" sigue mostrándose. */}
      {title.bingIndexingStatus &&
        title.bingIndexingStatus !== "not_configured" &&
        title.bingIndexingStatus !== "error" && (
        <div
          style={{
            marginTop: 6,
            padding: "6px 10px",
            borderRadius: 6,
            fontSize: 12,
            background:
              title.bingIndexingStatus === "error"
                ? "#fef2f2"
                : title.bingIndexingStatus === "submitted"
                  ? "#f0fdf4"
                  : "#f8fafc",
            border: `1px solid ${
              title.bingIndexingStatus === "error"
                ? "#fecaca"
                : title.bingIndexingStatus === "submitted"
                  ? "#bbf7d0"
                  : "#e2e8f0"
            }`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color:
                title.bingIndexingStatus === "error" ? "#d64545" : "#16a34a",
              fontWeight: 600,
            }}
          >
            <span style={{ fontSize: 14 }}>
              {title.bingIndexingStatus === "error" ? "✗" : "✓"}
            </span>
            <span>
              {title.bingIndexingStatus === "error"
                ? "Bing: error al solicitar indexación"
                : title.bingIndexingStatus === "submitted"
                  ? "Indexación instantánea solicitada a Bing"
                  : `Bing: ${title.bingIndexingStatus}`}
            </span>
          </div>
          {title.bingIndexingMessage && (
            <div style={{ color: "#6b7280", marginTop: 3, paddingLeft: 20 }}>
              {title.bingIndexingMessage}
            </div>
          )}
          {title.bingIndexingAt && (
            <div style={{ color: "#9ca3af", marginTop: 2, paddingLeft: 20, fontSize: 11 }}>
              {new Date(title.bingIndexingAt).toLocaleString("es-US")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
