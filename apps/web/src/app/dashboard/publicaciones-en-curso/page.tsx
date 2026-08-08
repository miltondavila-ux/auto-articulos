"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { sectionStyle, h2Style, buttonStyle } from "@/components/dashboard-ui";
import type { RunRow } from "@/types/dashboard";
import LiveProgress from "@/components/LiveRunProgress";

export default function PublicacionesEnCursoPage() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);

  // "Publicar todas las categorías" en Oportunidades puede crear varios Run a
  // la vez (uno por categoría, ver /api/opportunities/execute-all) — se
  // muestran todos los activos, no solo el primero, para que ninguno quede
  // corriendo en silencio sin progreso visible.
  const activeRuns = runs.filter(
    (r) => r.status === "pending" || r.status === "running",
  );

  const loadRuns = useCallback(async () => {
    const res = await fetch("/api/runs");
    if (res.ok) {
      const data = await res.json();
      setRuns(data.runs);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  useEffect(() => {
    if (activeRuns.length === 0) return;
    const interval = setInterval(loadRuns, 4000);
    return () => clearInterval(interval);
  }, [activeRuns.length, loadRuns]);

  if (loading) return null;

  return (
    <div>
      {activeRuns.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {activeRuns.map((run) => (
            <LiveProgress key={run.id} run={run} onCancelled={loadRuns} />
          ))}
        </div>
      ) : (
        <section style={{ ...sectionStyle, textAlign: "center" }}>
          <h2 style={h2Style}>No hay ninguna ejecución en curso</h2>
          <p style={{ fontSize: 13, color: "#6b7280" }}>
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
