"use client";

import { useEffect, useState } from "react";
import {
  buttonStyle,
  disabledStyle,
  h2Style,
  secondaryButtonStyle,
  sectionStyle,
  inputStyle,
} from "@/components/dashboard-ui";

interface SocialOpportunity {
  id: string;
  articleTitle: string;
  articleUrl: string;
  platform: string;
  suggestedText: string;
  status: string; // "pending" | "published" | "skipped" | "error" | "queued" | "processing"
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
  const [opportunities, setOpportunities] = useState<SocialOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingNetwork, setGeneratingNetwork] = useState<"threads" | "x" | "linkedin" | "instagram" | null>(null);
  const [connectedNetworks, setConnectedNetworks] = useState({ threads: false, x: false, linkedin: false, instagram: false });
  const [generateSeconds, setGenerateSeconds] = useState(0);
  const [usedGsc, setUsedGsc] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishingAll, setPublishingAll] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);
  const [skipModal, setSkipModal] = useState<{ opp: SocialOpportunity; reason: string; customReason: string } | null>(null);
  const [previewModal, setPreviewModal] = useState<{ loading: boolean; imageUrl: string | null; imageBase64: string | null; platform: string; title: string } | null>(null);

  useEffect(() => {
    loadOpportunities();
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

  async function loadOpportunities() {
    setLoading(true);
    try {
      const res = await fetch("/api/social-opportunities");
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
    try {
      const response = await fetch("/api/social-opportunities/generate");
      if (response.ok) {
        const data = await response.json();
        setConnectedNetworks({
          threads: Boolean(data.threads),
          x: Boolean(data.x),
          linkedin: Boolean(data.linkedin),
          instagram: Boolean(data.instagram),
        });
      }
    } catch {
      setConnectedNetworks({ threads: false, x: false, linkedin: false, instagram: false });
    }
  }

  const stages = usedGsc ? gscStages : fallbackStages;
  const currentStage = Math.min(
    stages.length - 1,
    Math.floor(generateSeconds / 6),
  );
  const progress = Math.min(92, 8 + generateSeconds * 4);
  const elapsed = `${Math.floor(generateSeconds / 60)}:${String(generateSeconds % 60).padStart(2, "0")}`;

  async function handleGenerate(network: "threads" | "x" | "linkedin" | "instagram") {
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

  async function handleTextChange(id: string, text: string) {
    // Actualizar localmente el estado
    setOpportunities((prev) =>
      prev.map((opp) => (opp.id === id ? { ...opp, suggestedText: text } : opp))
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
        setMessage({ kind: "success", text: "Propuesta de copy guardada." });
      } else {
        const data = await res.json();
        setMessage({ kind: "error", text: data.error || "No se pudo guardar la propuesta." });
      }
    } catch (err: any) {
      setMessage({ kind: "error", text: err.message });
    }
  }

  async function handlePublishOne(opp: SocialOpportunity) {
    setPublishingId(opp.id);
    setMessage(null);
    try {
      // Guardar el texto actual primero
      await handleSaveText(opp);

      const res = await fetch("/api/social-opportunities/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: opp.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ kind: "success", text: `Publicado con éxito en ${opp.platform.toUpperCase()}!` });
        loadOpportunities();
      } else {
        setMessage({ kind: "error", text: data.error || "Fallo en la publicación." });
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
        setMessage({ kind: "info", text: "Propuesta descartada. Gracias por tu retroalimentación." });
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
  const queuedList = opportunities.filter((o) => o.status === "queued" || o.status === "processing");

  return (
    <div style={{ padding: "0 10px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
        <h2 style={{ ...h2Style, fontSize: 22, color: "#e8ecf5", margin: 0 }}>
          Oportunidades en Redes Sociales
        </h2>
        <div style={{ display: "flex", gap: 12 }}>
          {connectedNetworks.threads && (
            <button
              onClick={() => handleGenerate("threads")}
              disabled={generating || loading}
              style={disabledStyle({ ...buttonStyle, background: "#111827" }, generating || loading)}
            >
              {generatingNetwork === "threads" ? "Analizando Threads..." : "Solicitar para Threads"}
            </button>
          )}
          {connectedNetworks.x && (
            <button
              onClick={() => handleGenerate("x")}
              disabled={generating || loading}
              style={disabledStyle({ ...buttonStyle, background: "#000" }, generating || loading)}
            >
              {generatingNetwork === "x" ? "Analizando X..." : "Solicitar para X"}
            </button>
          )}
          {connectedNetworks.linkedin && (
            <button
              onClick={() => handleGenerate("linkedin")}
              disabled={generating || loading}
              style={disabledStyle({ ...buttonStyle, background: "#0077b5" }, generating || loading)}
            >
              {generatingNetwork === "linkedin" ? "Analizando LinkedIn..." : "Solicitar para LinkedIn"}
            </button>
          )}
          {connectedNetworks.instagram && (
            <button
              onClick={() => handleGenerate("instagram")}
              disabled={generating || loading}
              style={disabledStyle({ ...buttonStyle, background: "linear-gradient(135deg, #f58529, #dd2a7b, #8134af)" }, generating || loading)}
            >
              {generatingNetwork === "instagram" ? "Analizando Instagram..." : "Solicitar para Instagram"}
            </button>
          )}
          {!connectedNetworks.threads && !connectedNetworks.x && !connectedNetworks.linkedin && !connectedNetworks.instagram && !loading && (
            <span style={{ color: "#f59e0b", fontSize: 13 }}>
              Conecta una red social en Configuración para solicitar oportunidades.
            </span>
          )}
          {generating && (
            <div
              role="status"
              aria-live="polite"
              style={{
                marginTop: 16,
                padding: 16,
                border: "1px solid #b8caf7",
                borderRadius: 10,
                background: "#f3f6ff",
                width: "100%",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 10 }}>
                <strong style={{ fontSize: 14, color: "#24458f" }}>
                  {stages[currentStage]}
                </strong>
                <span style={{ minWidth: 52, textAlign: "center", padding: "4px 8px", borderRadius: 999, background: "#dfe8ff", color: "#24458f", fontSize: 12, fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
                  {elapsed}
                </span>
              </div>
              <div aria-hidden="true" style={{ height: 8, borderRadius: 999, background: "#dfe5f2", overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #2f5fdb, #4dd8e8)", transition: "width 1s linear" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8, marginTop: 12 }}>
                {stages.map((stage, index) => (
                  <div key={stage} style={{ display: "flex", gap: 7, alignItems: "flex-start", color: index <= currentStage ? "#24458f" : "#8a94a6", fontSize: 11, fontWeight: index === currentStage ? 700 : 500 }}>
                    <span aria-hidden="true">
                      {index < currentStage ? "✓" : index === currentStage ? "●" : "○"}
                    </span>
                    <span>{stage}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {pendingList.length > 0 && queuedList.length === 0 && (
            <button
              onClick={handlePublishAll}
              disabled={publishingAll}
              style={disabledStyle({ ...buttonStyle, background: "#10b981" }, publishingAll)}
            >
              {publishingAll ? "Publicando todo..." : "🚀 Publicar Todo el Lote"}
            </button>
          )}
          {queuedList.length > 0 && (
            <span style={{ color: "#f59e0b", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-block", animation: "spin-v2 1s linear infinite" }}>🔄</span>
              {queuedList.length} en proceso de publicación — se actualiza automáticamente...
            </span>
          )}
        </div>
      </div>

      <p style={{ color: "#a8b3c7", fontSize: 14, marginTop: 8, marginBottom: 20 }}>
        Elige la red para la que quieres solicitar oportunidades. El sistema usa Google Search Console y también artículos recientes como alternativa.
      </p>

      {message && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 14,
            fontWeight: 500,
            background: message.kind === "success" ? "#d1fae5" : message.kind === "error" ? "#fee2e2" : "#e0f2fe",
            color: message.kind === "success" ? "#065f46" : message.kind === "error" ? "#991b1b" : "#075985",
            border: `1px solid ${message.kind === "success" ? "#a7f3d0" : message.kind === "error" ? "#fecaca" : "#bae6fd"}`,
          }}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div style={{ color: "#e8ecf5", textAlign: "center", padding: 40 }}>
          Cargando propuestas...
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 40 }}>
            <h3 style={{ color: "#e8ecf5", fontSize: 18, borderBottom: "1px solid rgba(232, 236, 245, 0.15)", paddingBottom: 8 }}>
              Propuestas Pendientes ({pendingList.length}){queuedList.length > 0 && <span style={{ color: "#f59e0b", fontSize: 13, marginLeft: 10 }}>· {queuedList.length} en cola/proceso</span>}
            </h3>
            {pendingList.length === 0 && queuedList.length === 0 ? (
              <div style={{ color: "#a8b3c7", textAlign: "center", padding: 20, background: "rgba(255,255,255,0.02)", borderRadius: 12 }}>
                No tienes propuestas pendientes. Usa arriba el botón de la red que quieras analizar.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20, marginTop: 15 }}>
                {[...pendingList, ...queuedList].map((opp) => {
                  const isQueuedOrProcessing = opp.status === "queued" || opp.status === "processing";
                  const statusConfig = {
                    queued: { label: "En cola...", icon: "⏳", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" },
                    processing: { label: "Publicando...", icon: "🔄", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)" },
                    published: { label: "Publicado", icon: "✅", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" },
                    error: { label: "Error", icon: "❌", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" },
                    pending: { label: "Pendiente", icon: "📝", color: "#9ca3af", bg: "rgba(156, 163, 175, 0.15)" },
                  };
                  const statusInfo = statusConfig[opp.status as keyof typeof statusConfig] || statusConfig.pending;
                  const showSpinner = opp.status === "processing";
                  return (
                  <div key={opp.id} style={{ ...sectionStyle, background: "#111827", border: `1px solid ${isQueuedOrProcessing ? "#f59e0b" : "#374151"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: opp.platform === "threads" ? "rgba(77, 216, 232, 0.15)" : opp.platform === "x" ? "rgba(29, 161, 242, 0.15)" : opp.platform === "linkedin" ? "rgba(0, 119, 181, 0.15)" : opp.platform.startsWith("instagram") ? "rgba(221, 42, 123, 0.15)" : "#374151",
                            color: opp.platform === "threads" ? "#4dd8e8" : opp.platform === "x" ? "#1da1f2" : opp.platform === "linkedin" ? "#0077b5" : opp.platform.startsWith("instagram") ? "#dd2a7b" : "#9ca3af",
                            marginBottom: 8,
                          }}
                        >
                          {opp.platform === "threads" ? "🌀 THREADS" : opp.platform === "x" ? "🐦 X (TWITTER)" : opp.platform === "linkedin" ? "💼 LINKEDIN" : opp.platform === "instagram-carousel" ? "📸 IG CARRUSEL" : opp.platform === "instagram-reel-image" ? "📸 IG REEL-IMG" : opp.platform === "instagram-infografia" ? "📸 IG INFOGRAFÍA" : opp.platform.toUpperCase()}
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: statusInfo.bg, color: statusInfo.color, marginLeft: 6 }}>
                          {showSpinner && <span style={{ display: "inline-block", animation: "spin-v2 1s linear infinite" }}>🔄</span>}
                          {!showSpinner && <span>{statusInfo.icon}</span>}
                          {statusInfo.label}
                        </span>
                        <h4 style={{ color: "#f3f4f6", margin: 0, fontSize: 16 }}>
                          Artículo: {opp.articleTitle}
                        </h4>
                        <a
                          href={opp.articleUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#3b82f6", fontSize: 13, textDecoration: "none" }}
                        >
                          Ver artículo original ↗
                        </a>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {!isQueuedOrProcessing && (
                          <>
                        {(opp.platform.startsWith("instagram") || opp.platform === "threads" || opp.platform === "linkedin") && (
                          <button
                            onClick={() => handlePreview(opp)}
                            style={{ ...secondaryButtonStyle, padding: "8px 12px", fontSize: 13 }}
                          >
                            👁 Ver preview
                          </button>
                        )}
                        <button
                          onClick={() => handleSaveText(opp)}
                          style={{ ...secondaryButtonStyle, padding: "8px 12px", fontSize: 13 }}
                        >
                          Guardar Borrador
                        </button>
                        <button
                          onClick={() => handlePublishOne(opp)}
                          disabled={publishingId === opp.id}
                          style={{ ...buttonStyle, marginTop: 0, padding: "8px 16px", fontSize: 13, background: "#3b82f6" }}
                        >
                          {publishingId === opp.id ? "Publicando..." : "🚀 Publicar Ahora"}
                        </button>
                        <button
                          onClick={() => handleSkipOne(opp)}
                          style={{ ...secondaryButtonStyle, padding: "8px 12px", fontSize: 13, color: "#ef4444", border: "1px solid #ef4444" }}
                        >
                          ✕ Descartar
                        </button>
                        </>
                        )}
                      </div>
                    </div>


                    <div style={{ marginTop: 15 }}>
                      <label style={{ display: "block", color: "#9ca3af", fontSize: 12, marginBottom: 4 }}>
                        Propuesta de Copy{isQueuedOrProcessing ? " (publicación en curso)" : " (Puedes editar el texto antes de publicar)"}:
                      </label>
                      <textarea
                        value={opp.suggestedText}
                        onChange={(e) => handleTextChange(opp.id, e.target.value)}
                        disabled={isQueuedOrProcessing}
                        style={{
                          width: "100%",
                          minHeight: 100,
                          padding: 10,
                          borderRadius: 8,
                          background: isQueuedOrProcessing ? "#374151" : "#1f2937",
                          color: "#f9fafb",
                          border: "1px solid #4b5563",
                          fontSize: 14,
                          fontFamily: "inherit",
                          resize: "vertical",
                        }}
                      />
                      <span style={{ fontSize: 11, color: opp.suggestedText.length > 500 ? "#ef4444" : "#9ca3af", display: "block", marginTop: 4 }}>
                        Caracteres: {opp.suggestedText.length}
                      </span>
                    </div>
                    {isQueuedOrProcessing && (
                      <div style={{ marginTop: 12, height: 4, borderRadius: 2, background: "#374151", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: "30%", borderRadius: 2, background: "linear-gradient(90deg, transparent, #3b82f6, transparent)", animation: "slide-v2 1.5s linear infinite" }} />
                      </div>
                    )}
                    {opp.status === "error" && opp.errorLog && (
                      <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 6, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                        <details style={{ fontSize: 12, color: "#ef4444" }}>
                          <summary style={{ cursor: "pointer", fontWeight: 600 }}>❌ Ver detalle del error</summary>
                          <p style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{opp.errorLog}</p>
                        </details>
                      </div>
                    )}
                    {opp.status === "published" && opp.postId && (
                      <div style={{ marginTop: 12, fontSize: 12, color: "#10b981" }}>
                        ✅ Publicado — ID: {opp.postId}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
      {/* Modal de descarte */}
      {skipModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setSkipModal(null)}
        >
          <div
            style={{
              background: "#1f2937",
              border: "1px solid #374151",
              borderRadius: 16,
              padding: 28,
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: "#f3f4f6", margin: 0, fontSize: 18 }}>
              ¿Por qué descartas esta propuesta?
            </h3>
            <p style={{ color: "#9ca3af", fontSize: 13, margin: "8px 0 16px 0" }}>
              Tu respuesta nos ayuda a mejorar las recomendaciones futuras.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SKIP_REASONS.map((reason) => (
                <label
                  key={reason}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: skipModal.reason === reason ? "rgba(59, 130, 246, 0.15)" : "#111827",
                    border: `1px solid ${skipModal.reason === reason ? "#3b82f6" : "#374151"}`,
                    cursor: "pointer",
                    color: "#e5e7eb",
                    fontSize: 14,
                    fontWeight: skipModal.reason === reason ? 600 : 400,
                    transition: "all 0.15s",
                  }}
                >
                  <input
                    type="radio"
                    name="skipReason"
                    value={reason}
                    checked={skipModal.reason === reason}
                    onChange={() => setSkipModal({ ...skipModal, reason })}
                    style={{ accentColor: "#3b82f6" }}
                  />
                  {reason}
                </label>
              ))}

              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: skipModal.reason === "__custom__" ? "rgba(59, 130, 246, 0.15)" : "#111827",
                  border: `1px solid ${skipModal.reason === "__custom__" ? "#3b82f6" : "#374151"}`,
                  cursor: "pointer",
                  flexDirection: "column",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                  <input
                    type="radio"
                    name="skipReason"
                    value="__custom__"
                    checked={skipModal.reason === "__custom__"}
                    onChange={() => setSkipModal({ ...skipModal, reason: "__custom__" })}
                    style={{ accentColor: "#3b82f6", marginTop: 2 }}
                  />
                  <span style={{ color: "#e5e7eb", fontSize: 14 }}>Otro</span>
                </div>
                {skipModal.reason === "__custom__" && (
                  <input
                    type="text"
                    placeholder="Escribe tu razón..."
                    value={skipModal.customReason}
                    onChange={(e) => setSkipModal({ ...skipModal, customReason: e.target.value })}
                    style={{
                      ...inputStyle,
                      marginLeft: 26,
                      width: "calc(100% - 26px)",
                    }}
                    autoFocus
                  />
                )}
              </label>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button
                onClick={() => setSkipModal(null)}
                style={secondaryButtonStyle}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSkip}
                disabled={
                  !skipModal.reason ||
                  (skipModal.reason === "__custom__" && !skipModal.customReason.trim())
                }
                style={disabledStyle(
                  {
                    ...buttonStyle,
                    background: "#ef4444",
                  },
                  !skipModal.reason ||
                    (skipModal.reason === "__custom__" && !skipModal.customReason.trim())
                )}
              >
                Descartar propuesta
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de preview */}
      {previewModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setPreviewModal(null)}
        >
          <div
            style={{
              background: "#1f2937",
              border: "1px solid #374151",
              borderRadius: 16,
              padding: 28,
              maxWidth: 520,
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: "#f3f4f6", margin: 0, fontSize: 18 }}>
              Preview: {previewModal.title}
            </h3>
            <p style={{ color: "#9ca3af", fontSize: 12, margin: "6px 0 16px 0" }}>
              Formato: {previewModal.platform}
            </p>

            <div style={{ background: "#111827", borderRadius: 12, overflow: "hidden", minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {previewModal.loading ? (
                <div style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
                  Generando preview...
                </div>
              ) : previewModal.imageUrl || previewModal.imageBase64 ? (
                <img
                  src={previewModal.imageBase64 ? `data:image/png;base64,${previewModal.imageBase64}` : previewModal.imageUrl!}
                  alt="Preview"
                  style={{ width: "100%", maxHeight: 400, objectFit: "contain" }}
                />
              ) : (
                <div style={{ color: "#ef4444", textAlign: "center", padding: 40 }}>
                  No se pudo generar el preview
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
              <button
                 onClick={() => setPreviewModal(null)}
                 style={secondaryButtonStyle}
               >
                 Cerrar
               </button>
             </div>
           </div>
         </div>
       )}
        <style>{`
          @keyframes spin-v2 {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes slide-v2 {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(400%); }
          }
        `}</style>
     </div>
   );
}
