"use client";

import { useEffect, useState } from "react";
import {
  disabledStyle,
  h2Style,
  secondaryButtonStyle,
  sectionStyle,
} from "./dashboard-ui";

interface LinkedInConnection {
  connected: boolean;
  linkedinUsername?: string;
  linkedinUserId?: string;
  isExpired?: boolean;
}

interface ApiSettings {
  configured: boolean;
  isAdmin?: boolean;
}

export default function LinkedInSection() {
  const [connection, setConnection] = useState<LinkedInConnection | null>(null);
  const [settings, setSettings] = useState<ApiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setLoading(true);
      const ts = Date.now();
      const [connRes, setRes] = await Promise.all([
        fetch(`/api/search-integrations/linkedin?_t=${ts}`, { cache: "no-store" }),
        fetch(`/api/search-integrations/linkedin/settings?_t=${ts}`, { cache: "no-store" }),
      ]);
      setConnection(connRes.ok ? await connRes.json() : { connected: false });
      setSettings(setRes.ok ? await setRes.json() : { configured: false });
    } catch {
      setConnection({ connected: false });
      setSettings({ configured: false });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function disconnect() {
    if (!confirm("¿Deseas desconectar tu cuenta de LinkedIn?")) return;
    setDisconnecting(true);
    setMessage("");
    try {
      const res = await fetch("/api/search-integrations/linkedin", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setMessage("LinkedIn desconectado.");
      await load();
    } catch {
      setMessage("No se pudo desconectar LinkedIn.");
    } finally {
      setDisconnecting(false);
    }
  }

  const isConfigured = settings?.configured ?? false;

  return (
    <section style={sectionStyle}>
      <h2 style={{ ...h2Style, margin: 0 }}>LinkedIn</h2>
      <p style={{ color: "#64748b", fontSize: 12, margin: "4px 0 0" }}>
        Publica artículos automáticamente en tu perfil de LinkedIn. Gratuito.
      </p>

      {loading ? (
        <p style={{ color: "#64748b", fontSize: 13 }}>Cargando...</p>
      ) : !isConfigured ? (
        <p style={{ color: "#92400e", fontSize: 13, marginTop: 12 }}>
          LinkedIn no está configurado por el administrador. Contacta al admin para activar esta integración.
        </p>
      ) : (
        <div style={{ marginTop: 14 }}>
          {connection?.connected ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ color: "#16a34a", fontSize: 13, fontWeight: 600 }}>
                ✓ Conectado{connection.linkedinUsername ? ` — ${connection.linkedinUsername}` : ""}
              </span>
              {connection.isExpired && (
                <span style={{ color: "#dc2626", fontSize: 12 }}>Token expirado</span>
              )}
              <button
                onClick={disconnect}
                disabled={disconnecting}
                style={disabledStyle(secondaryButtonStyle, disconnecting)}
              >
                {disconnecting ? "Desconectando..." : "Desconectar"}
              </button>
            </div>
          ) : (
            <a
              href="/api/search-integrations/linkedin/connect"
              style={{
                ...secondaryButtonStyle,
                display: "inline-flex",
                background: "#0077b5",
                color: "#fff",
                border: "none",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 14,
                padding: "10px 20px",
              }}
            >
              Conectar mi cuenta de LinkedIn
            </a>
          )}
        </div>
      )}

      {message && <p style={{ color: "#16a34a", fontSize: 13, marginTop: 10 }}>{message}</p>}
    </section>
  );
}
