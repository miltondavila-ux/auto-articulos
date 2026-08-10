"use client";

import { useEffect, useState } from "react";
import {
  disabledStyle,
  h2Style,
  secondaryButtonStyle,
  sectionStyle,
} from "./dashboard-ui";

interface InstagramData {
  connected: boolean;
  instagramBusinessAccountId?: string;
  instagramUsername?: string;
  expiresAt?: string;
  isExpired?: boolean;
}

export default function InstagramSection() {
  const [data, setData] = useState<InstagramData | null>(null);
  const [metaConfigured, setMetaConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setLoading(true);
      const [dataResponse, settingsResponse] = await Promise.all([
        fetch("/api/search-integrations/instagram"),
        fetch("/api/search-integrations/instagram/settings"),
      ]);
      setData(await dataResponse.json());
      const settings = await settingsResponse.json();
      setMetaConfigured(Boolean(settings.configured));
    } catch {
      setData({ connected: false });
      setMetaConfigured(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDisconnect() {
    if (!confirm("¿Deseas desconectar tu cuenta de Instagram?")) return;

    setDisconnecting(true);
    setMessage("");
    try {
      await fetch("/api/search-integrations/instagram", { method: "DELETE" });
      setMessage("Cuenta de Instagram desconectada.");
      await load();
    } catch {
      setMessage("Ocurrió un error al desconectar Instagram.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <section style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ ...h2Style, margin: 0 }}>Instagram</h2>
          <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>
            Carruseles, imágenes estilo Reel e infografías. Usa las credenciales compartidas de Meta API.
          </p>
        </div>
        {data?.connected && !data.isExpired && (
          <span style={{ color: "#16a34a", fontSize: 12, fontWeight: 700 }}>
            Conectado {data.instagramUsername ? `@${data.instagramUsername}` : ""}
          </span>
        )}
      </div>

      {loading ? (
        <p style={{ color: "#64748b", fontSize: 13 }}>Cargando Instagram...</p>
      ) : !metaConfigured ? (
        <p style={{ color: "#92400e", fontSize: 13 }}>
          Configura primero el App ID y App Secret en la sección Meta API de arriba.
        </p>
      ) : !data?.connected ? (
        <div style={{ marginTop: 14 }}>
          <a
            href="/api/search-integrations/instagram/connect"
            style={{
              ...secondaryButtonStyle,
              display: "inline-flex",
              color: "#fff",
              background: "linear-gradient(135deg, #f58529, #dd2a7b, #8134af)",
              border: "none",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Conectar Instagram
          </a>
        </div>
      ) : (
        <div style={{ marginTop: 14 }}>
          <p style={{ color: "#475569", fontSize: 13 }}>
            Perfil vinculado: {data.instagramUsername ? `@${data.instagramUsername}` : data.instagramBusinessAccountId}
            {data.isExpired ? " (token expirado, debes reconectar)" : ""}
          </p>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            style={disabledStyle(secondaryButtonStyle, disconnecting)}
          >
            {disconnecting ? "Desconectando..." : "Desconectar Instagram"}
          </button>
        </div>
      )}

      {message && <p style={{ color: "#16a34a", fontSize: 13 }}>{message}</p>}
    </section>
  );
}
