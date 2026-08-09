"use client";

import { useEffect, useState } from "react";
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
  status: string; // "pending" | "published" | "skipped" | "error"
  postId: string | null;
  errorLog: string | null;
  createdAt: string;
  publishedAt: string | null;
}

export default function OportunidadesRedesPage() {
  const [opportunities, setOpportunities] = useState<SocialOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishingAll, setPublishingAll] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletingHistory, setDeletingHistory] = useState(false);

  useEffect(() => {
    loadOpportunities();
  }, []);

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

  async function handleDeleteHistory() {
    setDeletingHistory(true);
    setMessage(null);
    try {
      const res = await fetch("/api/social-opportunities", { method: "DELETE" });
      if (res.ok) {
        setMessage({ kind: "success", text: "Historial de publicaciones de redes sociales borrado." });
        setConfirmingDelete(false);
        loadOpportunities();
      } else {
        const data = await res.json();
        setMessage({ kind: "error", text: data.error || "No se pudo borrar el historial." });
      }
    } catch (err: any) {
      setMessage({ kind: "error", text: err.message });
    } finally {
      setDeletingHistory(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/social-opportunities/generate", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMessage({ kind: "success", text: data.message || "Propuestas generadas con éxito." });
        loadOpportunities();
      } else {
        setMessage({ kind: "error", text: data.error || "Error al generar propuestas." });
      }
    } catch (err: any) {
      setMessage({ kind: "error", text: err.message });
    } finally {
      setGenerating(false);
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

  const pendingList = opportunities.filter((o) => o.status === "pending");
  const historyList = opportunities.filter((o) => o.status !== "pending");

  return (
    <div style={{ padding: "0 10px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
        <h2 style={{ ...h2Style, fontSize: 22, color: "#e8ecf5", margin: 0 }}>
          Oportunidades en Redes Sociales
        </h2>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleGenerate}
            disabled={generating || loading}
            style={disabledStyle(buttonStyle, generating || loading)}
          >
            {generating ? "Generando Propuestas..." : "🔄 Generar Propuestas de la Semana"}
          </button>
          {pendingList.length > 0 && (
            <button
              onClick={handlePublishAll}
              disabled={publishingAll}
              style={disabledStyle({ ...buttonStyle, background: "#10b981" }, publishingAll)}
            >
              {publishingAll ? "Publicando todo..." : "🚀 Publicar Todo el Lote"}
            </button>
          )}
        </div>
      </div>

      <p style={{ color: "#a8b3c7", fontSize: 14, marginTop: 8, marginBottom: 20 }}>
        Genera propuestas de copy personalizadas para tus redes en base a los últimos artículos de tu blog. Revisa, edita los textos y publica cuando quieras.
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
              Propuestas Pendientes ({pendingList.length})
            </h3>
            {pendingList.length === 0 ? (
              <div style={{ color: "#a8b3c7", textAlign: "center", padding: 20, background: "rgba(255,255,255,0.02)", borderRadius: 12 }}>
                No tienes propuestas pendientes. Haz clic en "Generar Propuestas de la Semana" arriba.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20, marginTop: 15 }}>
                {pendingList.map((opp) => (
                  <div key={opp.id} style={{ ...sectionStyle, background: "#111827", border: "1px solid #374151" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: opp.platform === "threads" ? "rgba(77, 216, 232, 0.15)" : "#374151",
                            color: opp.platform === "threads" ? "#4dd8e8" : "#9ca3af",
                            marginBottom: 8,
                          }}
                        >
                          {opp.platform === "threads" ? "🌀 THREADS" : opp.platform.toUpperCase()}
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
                      </div>
                    </div>

                    <div style={{ marginTop: 15 }}>
                      <label style={{ display: "block", color: "#9ca3af", fontSize: 12, marginBottom: 4 }}>
                        Propuesta de Copy (Puedes editar el texto antes de publicar):
                      </label>
                      <textarea
                        value={opp.suggestedText}
                        onChange={(e) => handleTextChange(opp.id, e.target.value)}
                        style={{
                          width: "100%",
                          minHeight: 100,
                          padding: 10,
                          borderRadius: 8,
                          background: "#1f2937",
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
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ ...sectionStyle, background: "#111827", border: "1px solid #374151", color: "#e8ecf5" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
                borderBottom: "1px solid rgba(232, 236, 245, 0.15)",
                paddingBottom: 10,
                marginBottom: 15,
              }}
            >
              <h3 style={{ ...h2Style, color: "#e8ecf5", margin: 0, fontSize: 18 }}>
                Historial de Publicaciones ({historyList.length})
              </h3>
              {historyList.length > 0 &&
                (confirmingDelete ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "#f87171" }}>
                      ¿Borrar todo el historial? No se puede deshacer.
                    </span>
                    <button
                      onClick={handleDeleteHistory}
                      disabled={deletingHistory}
                      style={{
                        background: "#fee2e2",
                        color: "#991b1b",
                        border: "1px solid #fecaca",
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: deletingHistory ? "default" : "pointer",
                      }}
                    >
                      {deletingHistory ? "Borrando..." : "Sí, borrar"}
                    </button>
                    <button
                      onClick={() => setConfirmingDelete(false)}
                      disabled={deletingHistory}
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        color: "#e8ecf5",
                        border: "1px solid #4b5563",
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: 12,
                        cursor: deletingHistory ? "default" : "pointer",
                      }}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    style={{
                      background: "none",
                      color: "#f87171",
                      border: "1px solid rgba(248, 113, 113, 0.2)",
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    🗑 Borrar historial
                  </button>
                ))}
            </div>

            {historyList.length === 0 ? (
              <div style={{ color: "#a8b3c7", textAlign: "center", padding: 20 }}>
                Aún no has publicado propuestas desde este módulo.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 15 }}>
                {historyList.map((opp) => (
                  <div
                    key={opp.id}
                    style={{
                      padding: 15,
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(232, 236, 245, 0.08)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            background: opp.status === "published" ? "#065f46" : "#7f1d1d",
                            color: opp.status === "published" ? "#34d399" : "#f87171",
                            marginRight: 8,
                          }}
                        >
                          {opp.status === "published" ? "PUBLICADO" : "ERROR"}
                        </span>
                        <span style={{ color: "#9ca3af", fontSize: 12 }}>
                          {opp.platform.toUpperCase()} — {opp.articleTitle}
                        </span>
                      </div>
                      {opp.status === "published" && opp.postId && (
                        <a
                          href={opp.platform === "threads" ? `https://www.threads.net/t/${opp.postId}` : "#"}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#3b82f6", fontSize: 13, textDecoration: "none", fontWeight: 600 }}
                        >
                          Ver en la Red Social ↗
                        </a>
                      )}
                    </div>
                    <p style={{ color: "#d1d5db", fontSize: 14, margin: "10px 0 0 0", fontStyle: "italic" }}>
                      "{opp.suggestedText}"
                    </p>
                    {opp.errorLog && (
                      <div style={{ marginTop: 8, padding: 8, background: "#7f1d1d", color: "#fca5a5", borderRadius: 6, fontSize: 12 }}>
                        Error: {opp.errorLog}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
