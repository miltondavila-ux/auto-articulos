"use client";

import { useState } from "react";
import type { TitleRow } from "@/types/dashboard";

export default function GoogleIndexingStatus({ title }: { title: TitleRow }) {
  const [status, setStatus] = useState(title.googleIndexingStatus);
  const [message, setMessage] = useState(title.googleIndexingMessage);
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    const response = await fetch(`/api/titles/${title.id}/google-inspection`, {
      method: "POST",
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setStatus(data.googleIndexingStatus);
      setMessage(data.googleIndexingMessage);
    } else {
      setMessage(data.error ?? "No se pudo consultar Google.");
    }
    setChecking(false);
  }

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
      <div style={{ color: title.lastSitemapSentAt ? "#1e8a4b" : "#6b7280" }}>
        {title.lastSitemapSentAt
          ? `✓ Sitemap enviado: ${new Date(title.lastSitemapSentAt).toLocaleString("es-US")}`
          : "Sitemap: todavía no se confirmó un envío para este artículo."}
      </div>
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
      <div
        style={{
          color:
            status === "error" ? "#d64545" : indexed ? "#1e8a4b" : "#8a6d1a",
        }}
      >
        {status === "error"
          ? "Google: error al consultar la indexación"
          : indexed
            ? "✓ Indexada en Google"
            : "Google: pendiente de indexación"}
      </div>
      {message && (
        <div style={{ color: "#6b7280", marginTop: 2 }}>{message}</div>
      )}
      {/* Bing Indexing Status */}
      {title.bingIndexingStatus && title.bingIndexingStatus !== "not_configured" && (
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
      {title.bingIndexingStatus === "not_configured" && (
        <div
          style={{
            marginTop: 6,
            padding: "6px 10px",
            borderRadius: 6,
            fontSize: 12,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            color: "#6b7280",
          }}
        >
          Bing Webmaster Tools no estaba conectado cuando se publicó este artículo.{" "}
          <a
            href="/dashboard/configuracion"
            style={{ color: "#1358a3", fontWeight: 600 }}
          >
            Conectar Bing
          </a>
        </div>
      )}
      <div style={{ marginTop: 5 }}>
        <button
          type="button"
          onClick={check}
          disabled={checking}
          style={{
            border: 0,
            padding: 0,
            background: "transparent",
            color: "#1358a3",
            cursor: checking ? "default" : "pointer",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {checking ? "Consultando Google..." : "Actualizar estado"}
        </button>
      </div>
    </div>
  );
}
