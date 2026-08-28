"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function OAuthConsentPage() {
  return (
    <Suspense fallback={null}>
      <OAuthConsentContent />
    </Suspense>
  );
}

function OAuthConsentContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const params = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);
  const isChatGPT = params.client_id === "chatgpt-auto-articulos-v1";
  const canPublish = params.scope?.split(" ").includes("oportunidades:publicar") ?? false;
  const requester = isChatGPT ? "ChatGPT" : "Alexa";
  const consentDescription = isChatGPT
    ? "ChatGPT solicita acceso de solo lectura a tus oportunidades SEO y al estado de publicaciones. No podrá crear oportunidades ni publicar artículos."
    : canPublish
      ? "Alexa solicita acceso a tus oportunidades SEO y, si lo autorizas explícitamente, podrá iniciar publicaciones usando las mismas reglas y límites de tu cuenta."
      : "Alexa solicita acceso de solo lectura a tus oportunidades SEO y al estado de publicaciones.";

  async function decide(approve: boolean) {
    setSending(true);
    setError(null);
    const response = await fetch("/api/oauth2/consent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ params, approve }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error_description ?? "No se pudo completar el enlace.");
      setSending(false);
      return;
    }
    window.location.assign(data.redirect);
  }

  return (
    <main style={{ maxWidth: 560, margin: "72px auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1>Conectar {requester} con Auto Artículos</h1>
      <p>{consentDescription}</p>
      <p><strong>Permisos:</strong> {params.scope || "no especificados"}</p>
      {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
      <div style={{ display: "flex", gap: 12 }}>
        <button type="button" onClick={() => decide(true)} disabled={sending}>Autorizar</button>
        <button type="button" onClick={() => decide(false)} disabled={sending}>Cancelar</button>
      </div>
    </main>
  );
}
