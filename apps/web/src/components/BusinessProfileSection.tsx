"use client";

import { useEffect, useState } from "react";
import { MENU_NAMES } from "@/lib/menu-names";
import { buttonStyle, disabledStyle, inputStyle, secondaryButtonStyle } from "./dashboard-ui";
import { CONNECTION_LABELS, ConnectionActiveBox, ConnectionCard, ConnectionGuide, ConnectionMessage, ConnectionTestButton } from "./connection-ui";
import { CONNECTION_GUIDES } from "@/lib/connection-guides";
import { friendlyConnectionError } from "@/lib/composio-error-message";

type LocationOption = {
  accountName: string;
  locationName: string;
  locationTitle: string;
};

type BusinessProfileData = {
  connected: boolean;
  needsLocation?: boolean;
  locationName?: string;
  locationTitle?: string;
  locations?: LocationOption[];
  locationsLoaded?: boolean;
  retryAfterSeconds?: number;
  error?: string;
};

type PostPeerStatus = {
  status: "PENDING" | "ACTIVE" | "DISCONNECTED" | "ERROR";
  accountId?: string | null;
  accountName?: string | null;
  lastError?: string | null;
};

const linkButton = { ...buttonStyle, marginTop: 0, textDecoration: "none", display: "inline-flex", alignItems: "center" } as const;

export default function BusinessProfileSection() {
  const [data, setData] = useState<BusinessProfileData | null>(null);
  const [postPeer, setPostPeer] = useState<PostPeerStatus | null>(null);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [retrySeconds, setRetrySeconds] = useState<number | null>(null);

  async function load(searchLocations = false) {
    if (loadingLocations) return;
    setLoadingLocations(true);
    try {
      const [res, postPeerRes] = await Promise.all([
        fetch(searchLocations ? "/api/business-profile?locations=1" : "/api/business-profile"),
        fetch("/api/postpeer/status"),
      ]);
      const value = await res.json();
      const postPeerValue = await postPeerRes.json().catch(() => null);
      setData(value);
      setPostPeer(postPeerRes.ok && postPeerValue?.status ? postPeerValue : null);
      setRetrySeconds(typeof value.retryAfterSeconds === "number" ? value.retryAfterSeconds : null);
    } finally {
      setLoadingLocations(false);
    }
  }

  // Google puede pedir una breve espera después de conectar o consultar una
  // cuenta. La interfaz cuenta el tiempo y reintenta una sola consulta cuando
  // el cooldown termina, evitando dejar al usuario atrapado en "55 segundos".
  useEffect(() => {
    if (retrySeconds === null || retrySeconds <= 0) return;
    const timer = window.setInterval(() => {
      setRetrySeconds((seconds) => {
        if (seconds === null || seconds <= 1) {
          window.clearInterval(timer);
          void load(true);
          return null;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retrySeconds]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    const option = data?.locations?.find((l) => l.locationName === selected);
    if (!option) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/business-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(option),
    });
    const value = await res.json().catch(() => ({}));
    setMessage(res.ok ? { ok: true, text: "Ficha de Google Business Profile guardada." } : { ok: false, text: friendlyConnectionError(value.error, "No se pudo guardar la ficha. Inténtalo de nuevo.") });
    setSaving(false);
    if (res.ok) void load();
  }

  async function disconnect(postPeerConnection: boolean) {
    if (!window.confirm(CONNECTION_LABELS.disconnectConfirm)) return;
    setMessage(null);
    await fetch(postPeerConnection ? "/api/postpeer/disconnect" : "/api/business-profile", { method: postPeerConnection ? "POST" : "DELETE" });
    setMessage({ ok: true, text: "Google Business Profile desconectado." });
    void load();
  }

  const postPeerConnected = postPeer?.status === "ACTIVE";
  const connected = Boolean(data?.connected || postPeerConnected);
  const needsLocation = Boolean(data?.connected && data.needsLocation && !postPeerConnected);
  const state = !connected ? "disconnected" : needsLocation ? "pending" : "connected";
  const guide = CONNECTION_GUIDES["business-profile"];
  const accountRows: Array<{ label: string; value: string }> = [];
  if (postPeerConnected && postPeer?.accountId) accountRows.push({ label: "Código de la cuenta", value: postPeer.accountId });

  return (
    <ConnectionCard
      title="Google Business Profile"
      state={state}
      lead="Conexión administrada desde esta tarjeta. Conecta la cuenta de Google que administra tu Perfil de Negocio."
      note={`Cuando el sistema detecte una oportunidad para Google Business Profile en ${MENU_NAMES.redes}, preparará una publicación con el formato permitido por Google, imagen y enlace al artículo. No se publicará cada artículo automáticamente.`}
    >
      {data === null ? (
        <p style={{ color: "#6e6e73", fontSize: 14 }}>Cargando…</p>
      ) : !connected ? (
        <>
          {guide && <ConnectionGuide steps={guide.steps} ifFails={guide.ifFails} />}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <a href="/api/postpeer/connect" style={linkButton}>{CONNECTION_LABELS.connect}</a>
          </div>
        </>
      ) : needsLocation ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
          {data?.locationsLoaded && data.locations && data.locations.length > 0 ? (
            <>
              <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Elige la ficha donde se publicará</p>
              <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ ...inputStyle, width: "100%", maxWidth: 520 }}>
                <option value="">Elige una opción…</option>
                {[...data.locations].sort((a, b) => a.locationTitle.localeCompare(b.locationTitle, "es")).map((l) => <option key={l.locationName} value={l.locationName}>{l.locationTitle}</option>)}
              </select>
              <div>
                <button type="button" onClick={save} disabled={saving || !selected} style={disabledStyle({ ...buttonStyle, marginTop: 0 }, saving || !selected)}>
                  {saving ? "Guardando…" : "Aprobar y guardar"}
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: 13, color: "#6e6e73", margin: 0 }}>
                {retrySeconds ? `Google está preparando la consulta. Podrás buscar fichas en ${retrySeconds} segundos.` : data?.locationsLoaded ? "No encontramos fichas administradas por esta cuenta de Google." : "Tu cuenta está conectada. Busca las fichas disponibles para elegir dónde publicar."}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => void load(true)} disabled={loadingLocations} style={{ ...secondaryButtonStyle, opacity: loadingLocations ? 0.55 : 1 }}>
                  {loadingLocations ? "Buscando fichas…" : retrySeconds ? "Espera para buscar fichas" : "Buscar fichas disponibles"}
                </button>
                <a href="/api/business-profile/connect" style={{ ...secondaryButtonStyle, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>{CONNECTION_LABELS.connect}</a>
              </div>
            </div>
          )}
          {data?.error && <ConnectionMessage ok={false}>{friendlyConnectionError(data.error, "No se pudieron consultar las fichas. Inténtalo de nuevo en unos minutos.")}</ConnectionMessage>}
          <div>
            <button type="button" onClick={() => disconnect(false)} style={{ ...secondaryButtonStyle, color: "#c62828" }}>{CONNECTION_LABELS.disconnect}</button>
          </div>
        </div>
      ) : (
        <>
          <ConnectionActiveBox
            label={postPeerConnected ? "Cuenta conectada" : "Ficha"}
            value={postPeerConnected ? (postPeer?.accountName ?? "Google Business Profile") : (data?.locationTitle ?? data?.locationName ?? null)}
            rows={accountRows}
          />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <ConnectionTestButton network="business-profile" endpoint="/api/business-profile/test" />
            <a href={postPeerConnected ? "/api/postpeer/connect" : "/api/business-profile/connect"} style={{ ...secondaryButtonStyle, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>{CONNECTION_LABELS.connect}</a>
            <button type="button" onClick={() => disconnect(postPeerConnected)} style={{ ...secondaryButtonStyle, color: "#c62828" }}>{CONNECTION_LABELS.disconnect}</button>
          </div>
        </>
      )}
      {message && <ConnectionMessage ok={message.ok}>{message.text}</ConnectionMessage>}
    </ConnectionCard>
  );
}
