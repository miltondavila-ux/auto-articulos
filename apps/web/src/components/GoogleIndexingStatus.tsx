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

  // "not_configured": el usuario todavía no conectó/seleccionó una
  // propiedad de Google Search Console para esta cuenta — no es un error
  // del sistema, es un paso pendiente del usuario. Se muestra aparte, sin
  // la cruz roja de error, y con un enlace a Configuración en vez del
  // enlace roto a Search Console (que sin `siteUrl` no tiene a dónde
  // apuntar). Pedido explícito del usuario (1/8/2026): que solo diga
  // "enviado" cuando REALMENTE se envió, y que el enlace lleve a algo útil.
  if (status === "not_configured") {
    return (
      <div style={{ marginTop: 7, fontSize: 12 }}>
        <div style={{ color: "#6b7280" }}>
          Google Search Console no está conectado para esta cuenta — el sitemap
          no se incluirá en el envío diario.
        </div>
        <a
          href="/dashboard/configuracion"
          style={{ color: "#1358a3", fontWeight: 600 }}
        >
          Conectar Google Search Console en Configuración
        </a>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 7, fontSize: 12 }}>
      <div style={{ color: "#1358a3" }}>
        Sitemap: envío diario programado a las 12:00 a. m.
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
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 5 }}>
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
        {!indexed && (
          <a
            href={`/api/titles/${title.id}/google-inspection`}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#1358a3", fontWeight: 600 }}
          >
            Abrir Search Console para solicitar indexación
          </a>
        )}
      </div>
    </div>
  );
}
