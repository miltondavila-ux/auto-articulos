"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { sectionStyle, h2Style, buttonStyle } from "@/components/dashboard-ui";
import type { RunRow } from "@/types/dashboard";
import LiveProgress from "@/components/LiveRunProgress";

type SocialRun = {
  id: string;
  platform: string;
  articleTitle: string;
  status: string;
  progressPercent: number;
  progressStage: string | null;
  startedAt: string | null;
  errorLog: string | null;
  createdAt: string;
};

export default function PublicacionesEnCursoPage() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [socialRuns, setSocialRuns] = useState<SocialRun[]>([]);
  const [loading, setLoading] = useState(true);
  // Para marca blanca (tagcrush): LiveProgress necesita el servidor de la
  // cuenta para no mostrar "10minutesWebsite" en los mensajes de créditos
  // agotados. Ver platform-servers.ts.
  const [platformDomain, setPlatformDomain] = useState("net");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const cancelSocialRun = async (id: string) => {
    setCancellingId(id);
    try {
      await fetch("/api/social-opportunities/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await loadRuns();
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.platformDomain === "string") {
          setPlatformDomain(data.platformDomain);
        }
      })
      .catch(() => {});
  }, []);

  // "Publicar todas las categorías" en Oportunidades puede crear varios Run a
  // la vez (uno por categoría, ver /api/opportunities/execute-all) — se
  // muestran todos los activos, no solo el primero, para que ninguno quede
  // corriendo en silencio sin progreso visible.
  const activeRuns = runs.filter(
    (r) => r.status === "pending" || r.status === "running",
  );

  const loadRuns = useCallback(async () => {
    const [runsRes, socialRes] = await Promise.all([
      fetch("/api/runs", { cache: "no-store" }),
      fetch("/api/social-opportunities", { cache: "no-store" }),
    ]);
    if (runsRes.ok) setRuns((await runsRes.json()).runs);
    if (socialRes.ok) {
      const data = await socialRes.json();
      setSocialRuns((data.opportunities ?? []).filter((item: SocialRun) => item.status === "queued" || item.status === "processing"));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  useEffect(() => {
    if (activeRuns.length === 0 && socialRuns.length === 0) return;
    const interval = setInterval(loadRuns, 4000);
    return () => clearInterval(interval);
  }, [activeRuns.length, socialRuns.length, loadRuns]);

  if (loading) return null;

  return (
    <div>
      {activeRuns.length > 0 || socialRuns.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {activeRuns.map((run) => (
            <LiveProgress
              key={run.id}
              run={run}
              onCancelled={loadRuns}
              platformDomain={platformDomain}
            />
          ))}
          {socialRuns.length > 0 && (
            <section style={{ ...sectionStyle, display: "flex", flexDirection: "column", gap: 10 }}>
              <h2 style={{ ...h2Style, margin: 0 }}>Publicaciones de redes sociales</h2>
              {socialRuns.map((item) => (
                <div key={item.id} style={{ padding: 14, border: "1px solid #e5e5ea", borderRadius: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div><strong>{item.articleTitle}</strong><div style={{ color: "#6e6e73", fontSize: 12, marginTop: 4 }}>{item.platform} · {item.progressStage ?? (item.status === "processing" ? "Publicando..." : "En cola")}</div></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: item.status === "processing" ? "#1d1d1f" : "#8a4b08", fontSize: 12, fontWeight: 600 }}>{item.progressPercent}%</span>
                      <button
                        type="button"
                        onClick={() => cancelSocialRun(item.id)}
                        disabled={cancellingId === item.id}
                        style={{ border: "1px solid #ff3b30", color: "#ff3b30", background: "#fff", borderRadius: 8, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}
                      >
                        {cancellingId === item.id ? "Cancelando..." : "Cancelar"}
                      </button>
                    </div>
                  </div>
                  <div style={{ height: 5, background: "#f1f1f4", borderRadius: 999, overflow: "hidden", marginTop: 10 }}>
                    <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, item.progressPercent ?? 0))}%`, background: "#1d1d1f", transition: "width .4s ease" }} />
                  </div>
                  <details style={{ marginTop: 10, color: "#6e6e73", fontSize: 12 }}>
                    <summary style={{ cursor: "pointer", color: "#1d1d1f", fontWeight: 600 }}>Ver etapas de la publicación</summary>
                    <div style={{ display: "grid", gap: 5, marginTop: 8, paddingLeft: 4 }}>
                      <div>{item.progressPercent >= 10 ? "✓" : "○"} Publicación encolada</div>
                      <div>{item.progressPercent >= 30 ? "✓" : "○"} Worker iniciado</div>
                      <div>{item.progressPercent >= 55 ? "✓" : "○"} Preparando y ajustando la imagen</div>
                      <div>{item.progressPercent >= 70 ? "✓" : "○"} Enviando contenido a {item.platform}</div>
                      <div>{item.progressPercent >= 100 ? "✓" : "○"} Publicación finalizada</div>
                    </div>
                  </details>
                </div>
              ))}
            </section>
          )}
        </div>
      ) : (
        <section style={{ ...sectionStyle, textAlign: "center" }}>
          <h2 style={h2Style}>No hay ninguna ejecución en curso</h2>
          <p style={{ fontSize: 13, color: "#6e6e73" }}>
            Ve a "Publicar" para elegir una categoría, pegar títulos e iniciar
            una nueva tanda.
          </p>
          <Link href="/dashboard/publicar" style={{ textDecoration: "none" }}>
            <button style={buttonStyle}>Ir a Publicar</button>
          </Link>
        </section>
      )}
    </div>
  );
}
