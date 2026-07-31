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
  return (
    <div style={{ marginTop: 7, fontSize: 12 }}>
      <div style={{ color: indexed ? "#1e8a4b" : "#8a6d1a" }}>
        {indexed ? "✓ Indexada en Google" : "Google: pendiente de indexación"}
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
