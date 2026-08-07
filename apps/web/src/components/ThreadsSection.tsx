"use client";

import { useEffect, useState } from "react";
import {
  sectionStyle,
  h2Style,
  secondaryButtonStyle,
  disabledStyle,
} from "./dashboard-ui";

interface ThreadsData {
  connected: boolean;
  threadsUserId?: string;
  threadsUsername?: string;
  expiresAt?: string;
  isExpired?: boolean;
}

export default function ThreadsSection() {
  const [data, setData] = useState<ThreadsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/search-integrations/threads");
      const json = await res.json();
      setData(json);
    } catch {
      setData({ connected: false });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDisconnect() {
    if (!confirm("¿Estás seguro de que deseas desconectar tu cuenta de Meta Threads?")) {
      return;
    }
    setDisconnecting(true);
    setMessage("");
    try {
      await fetch("/api/search-integrations/threads", { method: "DELETE" });
      setMessage("Cuenta de Meta Threads desconectada.");
      await load();
    } catch {
      setMessage("Ocurrió un error al desconectar.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <section style={sectionStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "linear-gradient(135deg, #000000 0%, #1c1c1e 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: 20,
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
          >
            @
          </div>
          <div>
            <h2 style={{ ...h2Style, margin: 0 }}>Meta Threads</h2>
            <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0 0" }}>
              Publicación automática de Hilos (Resumen + Imagen + Enlace) tras divulgar cada artículo.
            </p>
          </div>
        </div>

        {data?.connected && !data?.isExpired && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#16a34a",
              background: "rgba(22,163,74,0.1)",
              padding: "4px 12px",
              borderRadius: 999,
              border: "1px solid rgba(22,163,74,0.2)",
            }}
          >
            🟢 Conectado {data.threadsUsername ? `@${data.threadsUsername}` : ""}
          </span>
        )}
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#64748b", margin: "12px 0 0 0" }}>
          Cargando estado de la integración...
        </p>
      ) : !data?.connected ? (
        <div
          style={{
            background: "rgba(248, 250, 252, 0.8)",
            padding: 16,
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            marginTop: 12,
          }}
        >
          <p style={{ fontSize: 13, color: "#334155", margin: "0 0 12px 0" }}>
            Conecta tu cuenta de <strong>Meta Threads</strong> para que tus artículos se publiquen automáticamente en tu perfil con un resumen generado por IA e imagen destacada.
          </p>
          <a
            href="/api/search-integrations/threads/connect"
            style={{
              ...secondaryButtonStyle,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#000000",
              color: "#ffffff",
              border: "none",
              padding: "10px 18px",
              fontWeight: 700,
              textDecoration: "none",
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            🌀 Conectar Meta Threads
          </a>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
          <div
            style={{
              background: "#f8fafc",
              padding: "12px 16px",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 600, color: "#1e293b" }}>
              Perfil vinculado: {data.threadsUsername ? `@${data.threadsUsername}` : data.threadsUserId}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              Estado del token: {data.isExpired ? "⚠️ Token expirado (requiere reconectar)" : "✓ Activo (Válido hasta " + (data.expiresAt ? new Date(data.expiresAt).toLocaleDateString("es-US") : "60 días") + ")"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              style={disabledStyle(secondaryButtonStyle, disconnecting)}
            >
              {disconnecting ? "Desconectando..." : "Desconectar Threads"}
            </button>
          </div>
        </div>
      )}

      {message && (
        <p style={{ fontSize: 13, color: "#16a34a", marginTop: 10, fontWeight: 600 }}>
          {message}
        </p>
      )}
    </section>
  );
}
