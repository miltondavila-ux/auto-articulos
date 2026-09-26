"use client";

import { useState } from "react";
import { disabledStyle, secondaryButtonStyle } from "./dashboard-ui";
import { ConnectionMessage } from "./connection-ui";
import OAuthNetworkSection, { type OAuthNetworkConfig } from "./OAuthNetworkSection";

const LINKEDIN: OAuthNetworkConfig = {
  id: "linkedin",
  title: "LinkedIn",
  lead: "Conexión administrada desde esta tarjeta. Autoriza aquí la cuenta de LinkedIn que usará SEO TOTAL.",
  note: "Publica tus artículos en tu perfil de LinkedIn.",
  accountKey: "linkedinUsername",
  admin: {
    title: "Credenciales de la aplicación",
    help: "Client ID y Client Secret de LinkedIn Developers.",
    idLabel: "Client ID",
    secretLabel: "Client Secret",
    keys: { shown: "clientId", raw: "rawClientId", bodyId: "clientId", bodySecret: "clientSecret" },
  },
};

/** Herramienta técnica solo para administradores: crea las tablas que falten. */
function SyncSchemaTool() {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  async function syncSchema() {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/sync-schema", { method: "POST" });
      const data = await res.json();
      if (data.ok) setMessage({ ok: true, text: `Base de datos sincronizada correctamente (${data.total} pasos).` });
      else setMessage({ ok: false, text: `La sincronización terminó con ${data.results.filter((r: { ok: boolean }) => !r.ok).length} paso(s) con error. Revisa los registros del servidor.` });
    } catch {
      setMessage({ ok: false, text: "No se pudo sincronizar la base de datos." });
    } finally {
      setSyncing(false);
    }
  }
  return (
    <div style={{ marginTop: 10 }}>
      <button type="button" onClick={syncSchema} disabled={syncing} style={disabledStyle(secondaryButtonStyle, syncing)} title="Crea las tablas en la base de datos si no existen todavía.">
        {syncing ? "Sincronizando…" : "Sincronizar base de datos"}
      </button>
      {message && <ConnectionMessage ok={message.ok}>{message.text}</ConnectionMessage>}
    </div>
  );
}

export default function LinkedInSection({ allowed = true }: { allowed?: boolean }) {
  return <OAuthNetworkSection config={LINKEDIN} allowed={allowed} adminExtra={<SyncSchemaTool />} />;
}
