import Link from "next/link";
import { prisma } from "@auto-articulos/db";
import { sectionStyle, h2Style } from "@/components/dashboard-ui";
import ConfigurationStatus from "@/components/ConfigurationStatus";

type Categoria = "nuevas-herramientas" | "arreglos";

const CATEGORY_LABELS: Record<Categoria, string> = {
  "nuevas-herramientas": "✨ Nuevas herramientas",
  arreglos: "🛠 Arreglos",
};

function filterButtonStyle(active: boolean, category: "todas" | Categoria) {
  const palette = category === "arreglos"
    ? ["#d97706", "#f0deac", "#fff8e6", "#92400e"]
    : category === "nuevas-herramientas"
      ? ["#16a34a", "#a8dfc0", "#f3fbf6", "#166534"]
      : ["#2f5fdb", "#dfe3e8", "#f7f8fa", "#374151"];

  return {
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    border: active ? `1px solid ${palette[0]}` : `1px solid ${palette[1]}`,
    background: active ? palette[0] : palette[2],
    color: active ? "#ffffff" : palette[3],
    textDecoration: "none",
  };
}

export default async function ActualizacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  const filtroCategoria: "todas" | Categoria = categoria === "arreglos" || categoria === "nuevas-herramientas"
    ? categoria
    : "todas";

  const [actualizaciones, totalNuevas, totalArreglos] = await Promise.all([
    prisma.productUpdate.findMany({
      where: filtroCategoria === "todas" ? undefined : { category: filtroCategoria },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.productUpdate.count({ where: { category: "nuevas-herramientas" } }),
    prisma.productUpdate.count({ where: { category: "arreglos" } }),
  ]);
  const total = totalNuevas + totalArreglos;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <ConfigurationStatus />
      <div style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ ...h2Style, marginBottom: 4 }}>🚀 Registro de Actualizaciones</h2>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
              Entérate de las nuevas herramientas incorporadas y los arreglos realizados en la plataforma, explicados de forma clara y sencilla.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <Link href="/dashboard/actualizaciones" style={filterButtonStyle(filtroCategoria === "todas", "todas")}>Todas ({total})</Link>
          <Link href="/dashboard/actualizaciones?categoria=nuevas-herramientas" style={filterButtonStyle(filtroCategoria === "nuevas-herramientas", "nuevas-herramientas")}>✨ Nuevas herramientas ({totalNuevas})</Link>
          <Link href="/dashboard/actualizaciones?categoria=arreglos" style={filterButtonStyle(filtroCategoria === "arreglos", "arreglos")}>🛠 Arreglos ({totalArreglos})</Link>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {actualizaciones.length === 0 ? (
          <div style={sectionStyle}><p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>No hay actualizaciones en esta categoría.</p></div>
        ) : actualizaciones.map((item) => <TarjetaActualizacion key={item.id} item={item} />)}
      </div>
    </div>
  );
}

function TarjetaActualizacion({ item }: { item: { date: Date; title: string; category: string; summary: string; example: string; modulePath?: string | null } }) {
  const esNueva = item.category === "nuevas-herramientas";
  const bannerColor = esNueva ? "#166534" : "#92400e";
  const bannerBg = esNueva ? "#dcfce7" : "#fef3c7";
  const bannerBorder = esNueva ? "#bbf7d0" : "#fde68a";
  const badgeTexto = esNueva ? CATEGORY_LABELS["nuevas-herramientas"] : CATEGORY_LABELS.arreglos;

  return <div style={{ ...sectionStyle, marginTop: 0, borderLeft: `5px solid ${esNueva ? "#16a34a" : "#d97706"}` }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, color: bannerColor, background: bannerBg, border: `1px solid ${bannerBorder}` }}>{badgeTexto}</span>
        <span style={{ fontSize: 12, color: "#6b7280" }}>{item.date.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</span>
      </div>
    </div>
    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#16181d", margin: "10px 0 6px 0" }}>{item.title}</h3>
    <p style={{ fontSize: 14, color: "#374151", lineHeight: "1.5", margin: "0 0 12px 0" }}>{item.summary}</p>
    {item.modulePath && <Link href={item.modulePath} style={{ color: "#2f5fdb", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Ir al módulo →</Link>}
    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", marginTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}><span>💡</span> Ejemplo para entenderlo fácil:</div>
      <p style={{ margin: 0, fontSize: 13, color: "#334155", fontStyle: "italic", lineHeight: "1.4" }}>{item.example}</p>
    </div>
  </div>;
}
