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
