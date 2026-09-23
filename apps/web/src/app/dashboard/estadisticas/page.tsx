import PerformanceDashboard from "@/components/PerformanceDashboard";

export default function EstadisticasPage() {
  return (
    <section style={{ borderTop: "1px solid #d2d2d7", paddingTop: 16 }}>
      <p className="eyebrow" style={{ margin: "0 0 2px" }}>Rendimiento</p>
      <h1 style={{ margin: 0, fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 600, letterSpacing: "-0.02em" }}>
        Estadísticas
      </h1>
      <p className="muted" style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5 }}>
        Consulta el rendimiento de tus publicaciones y tu ritmo de trabajo.
      </p>
      <PerformanceDashboard />
    </section>
  );
}
