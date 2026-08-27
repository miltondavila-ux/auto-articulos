import Link from "next/link";

const MODULES = [
  ["✍️", "Publicaciones Propias", "/dashboard/publicar", "Genera y publica tus artículos."],
  ["🎯", "Oportunidades SEO/AEO", "/dashboard/oportunidades", "Descubre temas para posicionarte."],
  ["📣", "Oportunidades para Redes", "/dashboard/oportunidades-redes", "Encuentra ideas para tus redes sociales."],
  ["⏳", "Publicaciones en curso", "/dashboard/publicaciones-en-curso", "Consulta el progreso de tus publicaciones."],
] as const;

export default function ComienzaAqui() {
  return (
    <section style={{ marginTop: 4, marginBottom: 20, padding: "22px 24px", borderRadius: 18, background: "#fff", border: "1px solid rgba(0,0,0,.07)" }}>
      <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#1d1d1f" }}>COMIENZA AQUÍ</h2>
      <div className="comienza-aqui-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        {MODULES.map(([icon, label, href, description]) => (
          <Link key={href} href={href} style={{ display: "flex", flexDirection: "column", gap: 7, minHeight: 132, padding: 16, borderRadius: 14, background: "rgba(0,113,227,.05)", border: "1px solid rgba(0,113,227,.15)", textDecoration: "none" }}>
            <span style={{ fontSize: 22 }}>{icon}</span><span style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f" }}>{label}</span><span style={{ fontSize: 12.5, lineHeight: 1.4, color: "#6e6e73" }}>{description}</span><span style={{ marginTop: "auto", fontSize: 12, fontWeight: 600, color: "#0071e3" }}>Empezar →</span>
          </Link>
        ))}
      </div>
      <style>{`@media (max-width: 719px) { .comienza-aqui-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}
