"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EnPrueba, Modulo } from "@/components/ModuleIntro";
import { useRouter } from "next/navigation";
import {
  buttonStyle,
  disabledStyle,
  h2Style,
  secondaryButtonStyle,
  sectionStyle,
} from "@/components/dashboard-ui";

interface SocialOpportunity {
  id: string;
  articleTitle: string;
  articleUrl: string;
  platform: string;
  suggestedText: string;
  status: string;
  postId: string | null;
  errorLog: string | null;
  skipReason: string | null;
  createdAt: string;
  publishedAt: string | null;
}

const SKIP_REASONS = [
  "El tema no es relevante para mi audiencia",
  "El copy no me gusta / no representa mi voz",
  "El formato no es adecuado para este tema",
  "Ya publiqué algo similar recientemente",
  "Prefiero programarlo para después",
];

const gscStages = [
  "Consultando Google Search Console",
  "Analizando mejores temas por rendimiento",
  "Generando copy con IA",
  "Guardando propuestas",
];

const fallbackStages = [
  "Buscando artículos recientes sin usar",
  "Generando copy con IA",
  "Guardando propuestas",
];

export default function OportunidadesRedesPage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<SocialOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingNetwork, setGeneratingNetwork] = useState<"threads" | "x" | "linkedin" | "instagram" | "facebook-page" | "pinterest" | "tumblr" | "bluesky" | "mastodon" | "devto" | null>(null);
  const [connectedNetworks, setConnectedNetworks] = useState({ threads: false, x: false, linkedin: false, instagram: false, facebookPage: false, pinterest: false, tumblr: false, bluesky: false, mastodon: false, devto: false });
  const [activeNetworks, setActiveNetworks] = useState({ threads: false, x: false, linkedin: false, instagram: false, facebookPage: false, pinterest: false, tumblr: false, bluesky: false, mastodon: false, devto: false });
  const [generateSeconds, setGenerateSeconds] = useState(0);
  const [usedGsc, setUsedGsc] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishingAll, setPublishingAll] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);
  const [skipModal, setSkipModal] = useState<{ opp: SocialOpportunity; reason: string; customReason: string } | null>(null);
  const [previewModal, setPreviewModal] = useState<{ loading: boolean; imageUrl: string | null; imageBase64: string | null; platform: string; title: string } | null>(null);

  useEffect(() => {
    loadOpportunities(true);
    loadConnectedNetworks();
  }, []);

  useEffect(() => {
    const hasActiveItems = opportunities.some(
      (o) => o.status === "queued" || o.status === "processing",
    );
    if (!hasActiveItems) return;
    const interval = setInterval(() => {
      loadOpportunities();
    }, 3000);
    return () => clearInterval(interval);
  }, [opportunities]);

  useEffect(() => {
    if (!generating) return;
    setGenerateSeconds(0);
    const timer = window.setInterval(
      () => setGenerateSeconds((s) => s + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [generating]);

  async function loadOpportunities(showLoading = false) {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/social-opportunities", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setOpportunities(data.opportunities || []);
      }
    } catch (err: any) {
      setMessage({ kind: "error", text: "Error al cargar propuestas: " + err.message });
    } finally {
      setLoading(false);
    }
  }

  async function loadConnectedNetworks() {
    setConnectionsLoading(true);
    try {
      const response = await fetch("/api/social-opportunities/generate", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        const effectiveConnections = { threads: Boolean(data.threads), x: Boolean(data.x), linkedin: Boolean(data.linkedin), instagram: Boolean(data.instagram), facebookPage: Boolean(data.facebookPage), pinterest: Boolean(data.pinterest), tumblr: Boolean(data.tumblr), bluesky: Boolean(data.bluesky), mastodon: Boolean(data.mastodon), devto: Boolean(data.devto) };
        setConnectedNetworks(effectiveConnections);
        setActiveNetworks(data.activeNetworks ?? effectiveConnections);
      }
    } catch {
      const none = { threads: false, x: false, linkedin: false, instagram: false, facebookPage: false, pinterest: false, tumblr: false, bluesky: false, mastodon: false, devto: false };
      setConnectedNetworks(none);
      setActiveNetworks(none);
    } finally {
      setConnectionsLoading(false);
    }
  }

  const stages = usedGsc ? gscStages : fallbackStages;
  const currentStage = Math.min(
    stages.length - 1,
    Math.floor(generateSeconds / 6),
  );
  const progress = Math.min(92, 8 + generateSeconds * 4);
  const elapsed = `${Math.floor(generateSeconds / 60)}:${String(generateSeconds % 60).padStart(2, "0")}`;

  async function handleGenerate(network: "threads" | "x" | "linkedin" | "instagram" | "facebook-page" | "pinterest" | "tumblr" | "bluesky" | "mastodon" | "devto") {
    setGenerating(true);
    setGeneratingNetwork(network);
    setMessage(null);
    setUsedGsc(false);
    try {
      const res = await fetch("/api/social-opportunities/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ networks: [network] }),
      });
      const data = await res.json();
      if (res.ok) {
        const gscUsed = data.message?.includes("Google Search Console") ?? false;
        setUsedGsc(gscUsed);
        setMessage({ kind: "success", text: data.message || "Propuestas generadas con éxito." });
        loadOpportunities();
      } else {
        setMessage({ kind: "error", text: data.error || "Error al generar propuestas." });
      }
    } catch (err: any) {
      setMessage({ kind: "error", text: err.message });
    } finally {
      setGenerating(false);
      setGeneratingNetwork(null);
    }
  }

  function handleTextChange(id: string, newText: string) {
    setOpportunities((prev) =>
      prev.map((o) => (o.id === id ? { ...o, suggestedText: newText } : o)),
    );
  }

  async function handleSaveText(opp: SocialOpportunity) {
    try {
      const res = await fetch("/api/social-opportunities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: opp.id, suggestedText: opp.suggestedText }),
      });
      if (res.ok) {
        setMessage({ kind: "success", text: "Borrador guardado correctamente." });
      } else {
        setMessage({ kind: "error", text: "No se pudo guardar el borrador." });
      }
    } catch {
      setMessage({ kind: "error", text: "Error de conexión." });
    }
  }

  async function handlePublishOne(opp: SocialOpportunity) {
    setPublishingId(opp.id);
    setMessage(null);
    try {
      const res = await fetch("/api/social-opportunities/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: opp.id }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/dashboard/publicaciones-en-curso");
      } else {
        setMessage({ kind: "error", text: data.error || "Error al publicar." });
      }
    } catch (err: any) {
      setMessage({ kind: "error", text: err.message });
    } finally {
      setPublishingId(null);
    }
  }

  async function handlePublishAll() {
    const pendingOpps = opportunities.filter((o) => o.status === "pending");
    if (pendingOpps.length === 0) {
      setMessage({ kind: "info", text: "No hay publicaciones pendientes para procesar." });
      return;
    }

    setPublishingAll(true);
    setMessage({ kind: "info", text: `Publicando ${pendingOpps.length} propuestas en lote...` });

    let successCount = 0;
    let failCount = 0;

    for (const opp of pendingOpps) {
      try {
        const res = await fetch("/api/social-opportunities/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: opp.id }),
        });
        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setMessage({
      kind: failCount === 0 ? "success" : "info",
      text: `Publicación en lote completada: ${successCount} exitosas, ${failCount} fallidas.`,
    });
    router.push("/dashboard/publicaciones-en-curso");
    loadOpportunities();
    setPublishingAll(false);
  }

  async function handleSkipOne(opp: SocialOpportunity) {
    setSkipModal({ opp, reason: "", customReason: "" });
  }

  async function handleConfirmSkip() {
    if (!skipModal) return;
    const finalReason = skipModal.reason === "__custom__"
      ? skipModal.customReason.trim() || "Otro"
      : skipModal.reason;

    if (!finalReason) return;

    try {
      const res = await fetch("/api/social-opportunities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: skipModal.opp.id,
          skip: true,
          skipReason: finalReason,
        }),
      });

      if (res.ok) {
        setMessage({ kind: "info", text: "Propuesta descartada." });
        setSkipModal(null);
        loadOpportunities();
      } else {
        const data = await res.json();
        setMessage({ kind: "error", text: data.error || "Error al descartar." });
      }
    } catch {
      setMessage({ kind: "error", text: "Error de conexión al descartar." });
    }
  }

  async function handlePreview(opp: SocialOpportunity) {
    setPreviewModal({ loading: true, imageUrl: null, imageBase64: null, platform: opp.platform, title: opp.articleTitle });
    try {
      const res = await fetch("/api/social-opportunities/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: opp.articleTitle, platform: opp.platform }),
      });
      const data = await res.json();
      setPreviewModal({
        loading: false,
        imageUrl: data.imageUrl || null,
        imageBase64: data.imageBase64 || null,
        platform: opp.platform,
        title: opp.articleTitle,
      });
    } catch {
      setPreviewModal({ loading: false, imageUrl: null, imageBase64: null, platform: opp.platform, title: opp.articleTitle });
    }
  }

  const pendingList = opportunities.filter((o) => o.status === "pending");

  if (loading || connectionsLoading) return null;

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto" }}>
      {/* Panel Superior */}
      <div
        className="panel"
        style={{
          ...sectionStyle,
          padding: "24px 28px",
          marginBottom: 20,
          marginTop: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <p className="eyebrow" style={{ margin: "0 0 6px" }}>Difusión Social</p>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 600,
                color: "#1d1d1f",
                margin: "0 0 6px 0",
                letterSpacing: "-0.03em",
              }}
            >
              Oportunidades en Redes Sociales
            </h1>
            <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.55, color: "#1d1d1f" }}>
              <strong style={{ fontWeight: 600 }}>Este módulo está en prueba</strong>
          <EnPrueba />. Todavía no está disponible para todas las cuentas y se
          está activando poco a poco. Puede que algo cambie de sitio o de
          comportamiento mientras se termina de ajustar.
            </p>
            <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.55, color: "#1d1d1f" }}>
              Un artículo publicado en tu web solo lo encuentra quien lo busca. En redes sociales lo ve gente que todavía no te estaba buscando, y cada visita que llega desde ahí es una señal más para Google de que tu contenido interesa.
            </p>
            <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.55, color: "#1d1d1f" }}>
              Aquí el sistema toma artículos que ya publicaste desde <Modulo id="publicar" /> u <Modulo id="oportunidades" />, y prepara la publicación adaptada a cada red: el texto, la imagen y el formato que esa red necesita.
            </p>
            <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.55, color: "#1d1d1f" }}>
              Tú revisas cada propuesta y decides cuál sale y a qué red. No se publica todo ni todo el tiempo: el sistema reparte las publicaciones a lo largo de los días para que tu presencia crezca sin parecer spam y sin que las redes te penalicen.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              flexWrap: "wrap",
              marginTop: 18,
              paddingTop: 16,
              borderTop: "1px solid #e5e5ea",
            }}
          >
            {connectionsLoading ? (
              <span className="muted" style={{ fontSize: 13, padding: "9px 0" }}>
                Preparando las redes conectadas...
              </span>
            ) : (
              ([
              ["threads", "threads", "Threads"], ["x", "x", "X (Twitter)"], ["linkedin", "linkedin", "LinkedIn"], ["instagram", "instagram", "Instagram"], ["facebookPage", "facebook-page", "Facebook"], ["pinterest", "pinterest", "Pinterest"], ["tumblr", "tumblr", "Tumblr"], ["bluesky", "bluesky", "Bluesky"], ["mastodon", "mastodon", "Mastodon"], ["devto", "devto", "DEV.to"],
              ] as const).map(([key, platform, label]) => {
              if (!activeNetworks[key]) return null;
              const connected = connectedNetworks[key];
              const busy = connected && Boolean(generatingNetwork);
              return <button key={key} type="button" onClick={() => connected ? handleGenerate(platform) : router.push("/dashboard/configuracion?tab=social")} disabled={busy} className="secondary" style={disabledStyle({ ...secondaryButtonStyle, flex: "1 1 180px", minHeight: 40, padding: "9px 13px", borderRadius: 20, border: connected ? "1px solid #d2d2d7" : "1px solid #e5e5ea", background: connected ? "#ffffff" : "#f5f5f7", color: connected ? "#1d1d1f" : "#6e6e73", justifyContent: "center", fontSize: 13 }, busy)}>
                {connected ? generatingNetwork === platform ? "Analizando..." : "✓ " + label + " · Crear oportunidad" : label + " · Configurar"}
              </button>;
              })
            )}
            {pendingList.length > 0 && (
              <button
                onClick={handlePublishAll}
                disabled={publishingAll}
                style={{ ...buttonStyle, marginLeft: "auto", marginTop: 0, minHeight: 40, padding: "9px 18px", borderRadius: 20, fontSize: 13, whiteSpace: "nowrap" }}
              >
                {publishingAll ? "Publicando..." : "Publicar todo el lote"}
              </button>
            )}
          </div>
        </div>

        {!connectedNetworks.threads && !connectedNetworks.x && !connectedNetworks.linkedin && !connectedNetworks.instagram && !connectedNetworks.facebookPage && !connectedNetworks.pinterest && !connectedNetworks.tumblr && !connectedNetworks.bluesky && !connectedNetworks.mastodon && !connectedNetworks.devto && !loading && !connectionsLoading && (
          <div className="notice" style={{ marginTop: 14 }}>
            <p style={{ margin: 0 }}>
              Todavía no tienes ninguna red social conectada, así que no hay
              dónde publicar. Conecta al menos una y vuelve aquí: las propuestas
              se generan a partir de tus artículos ya publicados.
            </p>
            <p style={{ margin: "10px 0 0" }}>
              <Link
                href="/dashboard/configuracion?tab=social"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontWeight: 600,
                  color: "#0066cc",
                  textDecoration: "none",
                }}
              >
                Conectar una red social en Configuración
                <span aria-hidden="true">›</span>
              </Link>
            </p>
          </div>
        )}

        {generating && (
          <div
            role="status"
            aria-live="polite"
            style={{
              marginTop: 16,
              padding: 16,
              border: "1px solid #e5e5ea",
              borderRadius: 14,
              background: "#f5f5f7",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 10 }}>
              <strong style={{ fontSize: 13, color: "#1d1d1f" }}>
                {stages[currentStage]}
              </strong>
              <span style={{ fontSize: 12, color: "#6e6e73", fontVariantNumeric: "tabular-nums" }}>
                {elapsed}
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "#1d1d1f", transition: "width 1s linear" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8, marginTop: 12 }}>
              {stages.map((stage, index) => (
                <div key={stage} style={{ display: "flex", gap: 6, alignItems: "center", color: index <= currentStage ? "#1d1d1f" : "#86868b", fontSize: 12, fontWeight: index === currentStage ? 600 : 400 }}>
                  <span aria-hidden="true">{index < currentStage ? "✓" : index === currentStage ? "●" : "○"}</span>
                  <span>{stage}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {message && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            marginBottom: 20,
            fontSize: 13,
            fontWeight: 500,
            background: message.kind === "success" ? "#f2faf4" : message.kind === "error" ? "#fff2f1" : "#f5f5f7",
            color: message.kind === "success" ? "#16803c" : message.kind === "error" ? "#ff3b30" : "#6e6e73",
            border: `1px solid ${message.kind === "success" ? "rgba(52, 199, 89, 0.25)" : message.kind === "error" ? "rgba(255, 59, 48, 0.25)" : "#e5e5ea"}`,
          }}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="muted" style={{ textAlign: "center", padding: 40 }}>
          Cargando propuestas...
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ ...h2Style, margin: 0, fontSize: 18 }}>
              Propuestas Pendientes ({pendingList.length})
            </h2>
          </div>

          {pendingList.length === 0 ? (
            <section style={{ ...sectionStyle, textAlign: "center", padding: 32 }}>
              <p className="muted" style={{ margin: 0 }}>
                No tienes propuestas pendientes. Usa los botones de arriba para generarlas.
              </p>
              <button
                onClick={() => router.push("/dashboard/publicaciones-en-curso")}
                className="secondary"
                style={{ ...secondaryButtonStyle, marginTop: 14, padding: "8px 14px", fontSize: 13 }}
              >
                Ver publicaciones en curso
              </button>
            </section>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
              {pendingList.map((opp) => {
                const isQueuedOrProcessing = false;
                return (
                  <div key={opp.id} className="panel" style={sectionStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                          <span
                            style={{
                              display: "inline-flex",
                              padding: "2px 8px",
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 600,
                              textTransform: "uppercase",
                              background: "#f5f5f7",
                              color: "#1d1d1f",
                            }}
                          >
                            {opp.platform}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 500,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: opp.status === "published" ? "rgba(52, 199, 89, 0.1)" : "#f5f5f7",
                              color: opp.status === "published" ? "#16803c" : "#6e6e73",
                            }}
                          >
                            {opp.status === "published" ? "✓ Publicado" : opp.status === "processing" ? "Publicando..." : "Pendiente"}
                          </span>
                        </div>
                        <h4 style={{ color: "#1d1d1f", margin: "0 0 4px 0", fontSize: 16, fontWeight: 600 }}>
                          {opp.articleTitle}
                        </h4>
                        <a
                          href={opp.articleUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="link-button"
                          style={{ fontSize: 12 }}
                        >
                          Ver artículo original &rarr;
                        </a>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {!isQueuedOrProcessing && (
                          <>
                            {(opp.platform.startsWith("instagram") || opp.platform === "threads" || opp.platform === "linkedin") && (
                              <button
                                onClick={() => handlePreview(opp)}
                                className="secondary"
                                style={{ ...secondaryButtonStyle, padding: "7px 12px", fontSize: 12 }}
                              >
                                Preview
                              </button>
                            )}
                            <button
                              onClick={() => handleSaveText(opp)}
                              className="secondary"
                              style={{ ...secondaryButtonStyle, padding: "7px 12px", fontSize: 12 }}
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => handlePublishOne(opp)}
                              disabled={publishingId === opp.id}
                              style={{ ...buttonStyle, marginTop: 0, padding: "7px 14px", fontSize: 12 }}
                            >
                              {publishingId === opp.id ? "Publicando..." : "Publicar"}
                            </button>
                            <button
                              onClick={() => handleSkipOne(opp)}
                              className="secondary"
                              style={{ ...secondaryButtonStyle, padding: "7px 12px", fontSize: 12, color: "#ff3b30" }}
                            >
                              Descartar
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <label style={{ display: "block", color: "#6e6e73", fontSize: 12, marginBottom: 4 }}>
                        Texto de la publicación:
                      </label>
                      <textarea
                        value={opp.suggestedText}
                        onChange={(e) => handleTextChange(opp.id, e.target.value)}
                        disabled={isQueuedOrProcessing}
                        style={{
                          width: "100%",
                          minHeight: 90,
                          padding: 10,
                          borderRadius: 10,
                          background: "#ffffff",
                          color: "#1d1d1f",
                          border: "1px solid #d2d2d7",
                          fontSize: 14,
                          fontFamily: "inherit",
                          resize: "vertical",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de Descarte */}
      {skipModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setSkipModal(null)}
        >
          <div
            style={{
              background: "rgba(255, 255, 255, 0.96)",
              borderRadius: 22,
              padding: 24,
              maxWidth: 440,
              width: "100%",
              boxShadow: "0 24px 80px rgba(0, 0, 0, 0.15)",
              border: "1px solid rgba(0, 0, 0, 0.08)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="eyebrow" style={{ margin: "0 0 4px" }}>Descartar</p>
            <h3 style={{ color: "#1d1d1f", margin: "0 0 6px 0", fontSize: 18, fontWeight: 600 }}>
              ¿Por qué descartas esta propuesta?
            </h3>
            <p className="lead-copy" style={{ fontSize: 13, margin: "0 0 16px 0" }}>
              Tu respuesta nos ayuda a optimizar futuras recomendaciones.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SKIP_REASONS.map((reason) => (
                <label
                  key={reason}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: skipModal.reason === reason ? "#f5f5f7" : "#ffffff",
                    border: `1px solid ${skipModal.reason === reason ? "#1d1d1f" : "#e5e5ea"}`,
                    cursor: "pointer",
                    color: "#1d1d1f",
                    fontSize: 13,
                  }}
                >
                  <input
                    type="radio"
                    name="skipReason"
                    value={reason}
                    checked={skipModal.reason === reason}
                    onChange={() => setSkipModal({ ...skipModal, reason })}
                  />
                  {reason}
                </label>
              ))}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
              <button
                onClick={() => setSkipModal(null)}
                className="secondary"
                style={{ ...secondaryButtonStyle, padding: "8px 14px", fontSize: 13 }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSkip}
                disabled={!skipModal.reason}
                style={{
                  ...buttonStyle,
                  background: "#ff3b30",
                  marginTop: 0,
                  padding: "8px 16px",
                  fontSize: 13,
                }}
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Preview */}
      {previewModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setPreviewModal(null)}
        >
          <div
            style={{
              background: "rgba(255, 255, 255, 0.96)",
              borderRadius: 22,
              padding: 24,
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 24px 80px rgba(0, 0, 0, 0.15)",
              border: "1px solid rgba(0, 0, 0, 0.08)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="eyebrow" style={{ margin: "0 0 4px" }}>Vista Previa</p>
            <h3 style={{ color: "#1d1d1f", margin: "0 0 12px 0", fontSize: 18, fontWeight: 600 }}>
              {previewModal.title}
            </h3>

            <div style={{ background: "#f5f5f7", borderRadius: 12, overflow: "hidden", minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {previewModal.loading ? (
                <div className="muted" style={{ textAlign: "center", padding: 30, fontSize: 13 }}>
                  Generando preview...
                </div>
              ) : previewModal.imageUrl || previewModal.imageBase64 ? (
                <img
                  src={previewModal.imageBase64 ? `data:image/png;base64,${previewModal.imageBase64}` : previewModal.imageUrl!}
                  alt="Preview"
                  style={{ width: "100%", maxHeight: 380, objectFit: "contain" }}
                />
              ) : (
                <div style={{ color: "#ff3b30", textAlign: "center", padding: 30, fontSize: 13 }}>
                  No se pudo generar el preview
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <button
                onClick={() => setPreviewModal(null)}
                className="secondary"
                style={{ ...secondaryButtonStyle, padding: "8px 16px", fontSize: 13 }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
