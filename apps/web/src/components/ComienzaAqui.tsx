"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const MODULES = [
  { id: "publicar", href: "/dashboard/publicar", icon: "✍️", label: "Publicaciones Propias", description: "Genera y publica artículos nuevos, individuales o en lote." },
  { id: "oportunidades", href: "/dashboard/oportunidades", icon: "🎯", label: "Oportunidades SEO/AEO", description: "Descubre búsquedas y temas con potencial para posicionarte." },
  { id: "oportunidades-redes", href: "/dashboard/oportunidades-redes", icon: "📣", label: "Oportunidades para Redes", description: "Ideas listas para distribuir tu contenido en redes sociales." },
  { id: "publicaciones-en-curso", href: "/dashboard/publicaciones-en-curso", icon: "⏳", label: "Publicaciones en curso", description: "Consulta el progreso de tus artículos y publicaciones activas." },
];

export default function ComienzaAqui() {
  const [modules, setModules] = useState(MODULES.filter((m) => m.id !== "oportunidades-redes"));
  useEffect(() => {
    fetch(`/api/me?_t=${Date.now()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const admin = data?.role === "admin" || Boolean(data?.isActingAdmin);
        const email = typeof data?.email === "string" ? data.email.toLowerCase() : "";
        const disabled = Array.isArray(data?.disabledModules) ? data.disabledModules : [];
        setModules(MODULES.filter((m) => m.id === "oportunidades-redes" ? admin || email === "lorenalvarez30@gmail.com" : !disabled.includes(m.id)));
      })
      .catch(() => {});
  }, []);
  return (
    <div style={{ marginTop: 4, marginBottom: 20, padding: "22px 24px", borderRadius: 18, background: "#fff", border: "1px solid rgba(0,0,0,.07)", boxShadow: "0 8px 28px rgba(0,0,0,.05)" }}>
      <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, letterSpacing: ".06em", color: "#0071e3", textTransform: "uppercase" }}>Comienza Aquí</p>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6e6e73" }}>Elige por dónde quieres empezar:</p>
      <style>{`@media (max-width:719px){.comienza-aqui-grid{grid-template-columns:1fr!important}}`}</style>
      <div className="comienza-aqui-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${modules.length},minmax(0,1fr))`, gap: 12 }}>
        {modules.map((m) => <Link key={m.id} href={m.href} style={{ display:"flex", flexDirection:"column", gap:6, padding:16, borderRadius:14, background:"rgba(0,113,227,.05)", border:"1px solid rgba(0,113,227,.15)", textDecoration:"none" }}>
          <span style={{ fontSize:22 }}>{m.icon}</span><span style={{ fontSize:15, fontWeight:600, color:"#1d1d1f" }}>{m.label}</span><span style={{ fontSize:12.5, color:"#6e6e73", lineHeight:1.4 }}>{m.description}</span><span style={{ marginTop:4, fontSize:12, fontWeight:600, color:"#0071e3" }}>Empezar →</span>
        </Link>)}
      </div>
    </div>
  );
}
