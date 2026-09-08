"use client";

import { useCallback, useEffect, useState } from "react";
import { buttonStyle, h2Style, secondaryButtonStyle } from "@/components/dashboard-ui";

/**
 * Herramienta temporal de reparación de artículos ("Patricia Coy"), visible
 * únicamente para la cuenta exacta de Milton. Extraída tal cual de
 * `ConfiguracionView.tsx` durante el rediseño "RENEW CONFIGURACION"
 * (7/9/2026) — antes aparecía pegada debajo de la pestaña Móvil sin importar
 * qué pestaña se estuviera viendo; ahora es un componente autosuficiente que
 * decide por sí mismo si debe mostrarse, consultando `/api/me`.
 */
export default function AdminFixPatriciaPanel() {
  const [visible, setVisible] = useState(false);
  const [triggeringFix, setTriggeringFix] = useState(false);
  const [clearingFixHistory, setClearingFixHistory] = useState(false);
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});
  const [banner, setBanner] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const [fixStatus, setFixStatus] = useState<{
    active: boolean;
    status?: string;
    total?: number;
    processed?: number;
    repaired?: { title: string; url: string }[];
    logs?: string[];
    history?: {
      id: string;
      status: string;
      createdAt: string;
      finishedAt: string | null;
      repairedCount: number;
      alreadyCorrectCount: number;
      totalReviewed: number;
      articles: { title: string; url: string; status: "repaired" | "already_correct" }[];
      logs: string[];
      stopPoint: string | null;
    }[];
    repairedHistory?: { title: string; url: string }[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.role === "admin" && data.email === "miltondavila@gmail.com") {
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  const loadFixStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/fix-patricia/status", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setFixStatus(data);
      }
    } catch (e) {
      console.error("Error al cargar estado de reparacion:", e);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    loadFixStatus();
    const interval = setInterval(loadFixStatus, 3000);
    return () => clearInterval(interval);
  }, [visible, loadFixStatus]);

  async function handleTriggerFix() {
    if (!confirm("¿Deseas procesar el siguiente lote de hasta 20 artículos de Patricia Coy?")) {
      return;
    }
    setTriggeringFix(true);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/fix-patricia", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({
          type: "error",
          text: data.error ?? "Error al iniciar la reparación",
        });
        return;
      }
      setBanner({
        type: "info",
        text: "Reparación programada con éxito. El progreso aparecerá debajo de este botón.",
      });
    } finally {
      setTriggeringFix(false);
    }
  }

  async function handleClearFixHistory() {
    if (!confirm("¿Borrar definitivamente todo el historial y los logs de la herramienta Patricia Coy? Esto no borra artículos.")) return;
    setClearingFixHistory(true);
    try {
      const res = await fetch("/api/admin/fix-patricia", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({ type: "error", text: data.error ?? "No se pudo borrar el historial" });
        return;
      }
      setFixStatus({ active: false, history: [], logs: [], repaired: [] });
      setBanner({ type: "info", text: `Historial reiniciado: ${data.deletedRuns ?? 0} corridas eliminadas.` });
    } finally {
      setClearingFixHistory(false);
    }
  }

  if (!visible) return null;

  return (
    <section
      style={{
        marginTop: 30,
        padding: 24,
        borderRadius: 18,
        border: "1px solid #d2d2d7",
        background: "#f5f5f7",
      }}
    >
      <h2 style={h2Style}>Herramientas de Administrador (Temporal)</h2>
      <p style={{ fontSize: 13, color: "#6e6e73", marginBottom: 12 }}>
        Repara hasta 20 artículos por lote, completando cada artículo antes de abrir el siguiente.
      </p>
      <button
        onClick={handleTriggerFix}
        disabled={triggeringFix}
        style={{
          ...buttonStyle,
          marginTop: 0,
        }}
      >
        {triggeringFix ? "Iniciando lote..." : "Procesar siguiente lote de 20"}
      </button>
      <button
        onClick={handleClearFixHistory}
        disabled={clearingFixHistory || triggeringFix}
        style={{
          ...secondaryButtonStyle,
          marginLeft: 10,
          color: "#ff3b30",
          border: "1px solid #ff3b30",
        }}
      >
        {clearingFixHistory ? "Borrando..." : "Borrar historial y logs"}
      </button>

      {banner && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            marginTop: 16,
            background: banner.type === "error" ? "rgba(255, 59, 48, 0.08)" : "rgba(52, 199, 89, 0.1)",
            color: banner.type === "error" ? "#ff3b30" : "#16803c",
            border:
              banner.type === "error"
                ? "1px solid rgba(255, 59, 48, 0.3)"
                : "1px solid rgba(52, 199, 89, 0.25)",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {banner.text}
        </div>
      )}

      {fixStatus && (fixStatus.active || (fixStatus.history && fixStatus.history.length > 0)) && (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 8,
            background: "#ffffff",
            border: "1px solid #d2d2d7",
            boxShadow: "none",
          }}
        >
          {/* Área de trabajo activa (Visible solo cuando está en proceso o en cola) */}
          {fixStatus.active && (fixStatus.status === "running" || fixStatus.status === "pending") && (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontWeight: 600, color: "#1d1d1f", fontSize: 13 }}>
                  Estado: {fixStatus.status === "running" ? "⏳ Procesando..." : "⏳ En cola (Iniciando robot...)"}
                </span>
                {fixStatus.total ? (
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#1d1d1f" }}>
                    Progreso: {fixStatus.processed} / {fixStatus.total} ({Math.round(((fixStatus.processed || 0) / (fixStatus.total || 1)) * 100)}%)
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: "#6e6e73" }}>Cargando información del lote...</span>
                )}
              </div>

              {/* Progress Bar */}
              {fixStatus.total ? (
                <div
                  style={{
                    width: "100%",
                    height: 10,
                    background: "#f5f5f7",
                    borderRadius: 999,
                    overflow: "hidden",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round(((fixStatus.processed || 0) / (fixStatus.total || 1)) * 100)}%`,
                      height: "100%",
                      background: "#1d1d1f",
                      borderRadius: 999,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              ) : null}

              {/* Live console logs */}
              {fixStatus.logs && fixStatus.logs.length > 0 ? (
                <div>
                  <h3 style={{ fontSize: 12, fontWeight: 600, color: "#1d1d1f", margin: "0 0 6px 0" }}>
                    Consola de avance en tiempo real:
                  </h3>
                  <div
                    style={{
                      background: "#1d1d1f",
                      color: "#f5f5f7",
                      fontFamily: "monospace",
                      fontSize: 11,
                      padding: 10,
                      borderRadius: 6,
                      maxHeight: 180,
                      overflowY: "auto",
                      lineHeight: 1.4,
                    }}
                  >
                    {fixStatus.logs.map((log, idx) => (
                      <div key={idx} style={{ marginBottom: 2, whiteSpace: "pre-wrap" }}>
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {fixStatus.history && fixStatus.history.length > 0 ? (
            <div style={{ marginTop: 16, borderTop: "1px solid #e5e5ea", paddingTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f", margin: 0 }}>
                  Historial de Lotes Procesados
                </h3>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#6e6e73", background: "#f5f5f7", padding: "2px 8px", borderRadius: 999 }}>
                  Total revisados: {fixStatus.history.reduce((acc, curr) => acc + (curr.totalReviewed || 0), 0)}
                </span>
              </div>

              {fixStatus.history.map((batch, index) => {
                const isExpanded = !!expandedBatches[batch.id];
                return (
                  <div
                    key={batch.id}
                    style={{
                      fontSize: 12,
                      padding: "10px 0",
                      borderBottom: "1px solid #e5e5ea",
                    }}
                  >
                    <div
                      onClick={() => setExpandedBatches((prev) => ({ ...prev, [batch.id]: !prev[batch.id] }))}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        fontWeight: 600,
                        color: "#1d1d1f",
                      }}
                    >
                      <span style={{ userSelect: "none" }}>
                        {isExpanded ? "▼" : "▶"}{" "}
                        <strong>Lote #{fixStatus.history!.length - index}</strong>{" "}
                        <span style={{ fontWeight: 400, color: "#6e6e73", marginLeft: 4 }}>
                          (Iniciado: {new Date(batch.createdAt).toLocaleTimeString("es-ES")}
                          {batch.finishedAt ? ` | Finalizado: ${new Date(batch.finishedAt).toLocaleTimeString("es-ES")} | Duración: ${(() => {
                            const sec = Math.round((new Date(batch.finishedAt).getTime() - new Date(batch.createdAt).getTime()) / 1000);
                            return sec > 60 ? `${Math.floor(sec / 60)} min ${sec % 60}s` : `${sec}s`;
                          })()}` : " | En curso"})
                        </span>
                      </span>
                      <span style={{ fontSize: 11, color: "#6e6e73", display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: batch.status === "success" ? "rgba(52, 199, 89, 0.1)" : "#f5f5f7",
                            color: batch.status === "success" ? "#16803c" : "#6e6e73",
                          }}
                        >
                          {batch.status === "success" ? "Completado" : batch.status === "running" ? "Procesando" : batch.status}
                        </span>
                        <span>
                          Revisados: {batch.totalReviewed} (Reparados: {batch.repairedCount}, Correctos: {batch.alreadyCorrectCount})
                        </span>
                      </span>
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: 8, paddingLeft: 14, background: "#f5f5f7", borderRadius: 6, padding: 8 }}>
                        {batch.articles && batch.articles.length > 0 ? (
                          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11 }}>
                            {batch.articles.map((art, idx) => (
                              <li key={idx} style={{ marginBottom: 4 }}>
                                <span style={{ color: art.status === "repaired" ? "#16803c" : "#6e6e73", fontWeight: 700, marginRight: 6 }}>
                                  [{art.status === "repaired" ? "REPARADO" : "CORRECTO"}]
                                </span>
                                <a
                                  href={art.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: "#0066cc", textDecoration: "underline" }}
                                >
                                  {art.title}
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div style={{ fontSize: 11, color: "#6e6e73", fontStyle: "italic" }}>No se procesó ningún artículo en este lote o el worker se detuvo antes de iniciar.</div>
                        )}
                        {batch.stopPoint ? (
                          <div style={{ color: "#1d1d1f", marginTop: 6, fontSize: 11, fontWeight: 500 }}>
                            Detenido: {batch.stopPoint}
                          </div>
                        ) : null}

                        {/* Logs de este lote específico */}
                        {batch.logs && batch.logs.length > 0 ? (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #e5e5ea" }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: "#1d1d1f", marginBottom: 4 }}>
                              Registro de avances (Log de la tanda):
                            </div>
                            <div
                              style={{
                                background: "#1d1d1f",
                                color: "#f5f5f7",
                                fontFamily: "monospace",
                                fontSize: 10,
                                padding: 8,
                                borderRadius: 4,
                                maxHeight: 120,
                                overflowY: "auto",
                                lineHeight: 1.4,
                              }}
                            >
                              {batch.logs.map((log, idx) => (
                                <div key={idx} style={{ marginBottom: 2, whiteSpace: "pre-wrap" }}>
                                  {log}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
