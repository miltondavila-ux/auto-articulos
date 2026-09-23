import Link from "next/link";
import { prisma } from "@auto-articulos/db";
import { h2Style } from "@/components/dashboard-ui";

type Categoria = "nuevas-herramientas" | "arreglos";

const CATEGORY_LABELS: Record<Categoria, string> = {
  "nuevas-herramientas": "Nuevas herramientas",
  arreglos: "Mejoras y arreglos",
};

function filterButtonStyle(active: boolean) {
  return {
    padding: "6px 14px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    border: active ? "1px solid #1d1d1f" : "1px solid #d2d2d7",
    background: active ? "#1d1d1f" : "#ffffff",
    color: active ? "#ffffff" : "#1d1d1f",
    textDecoration: "none",
    transition: "all 0.15s ease",
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
    <div style={{ display: "flex", flexDirection: "column", maxWidth: 1120, margin: "0 auto" }}>
      <header style={{ borderBottom: "1px solid #d2d2d7", padding: "0 0 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p className="eyebrow" style={{ margin: "0 0 4px" }}>Novedades del Sistema</p>
            <h1 style={{ ...h2Style, fontSize: 26, marginBottom: 6 }}>Registro de Actualizaciones</h1>
            <p className="lead-copy" style={{ margin: 0, maxWidth: 680 }}>Aquí se registran las mejoras y nuevas herramientas de la plataforma.</p>
          </div>
        </div>
        <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: "pointer", color: "#1d1d1f", fontSize: 13, fontWeight: 600 }}>Cómo leer este registro</summary>
          <div style={{ marginTop: 10, maxWidth: 760 }}>
            <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>Cada entrada indica qué cambió, para qué sirve y, cuando corresponde, a qué módulo te lleva.</p>
            <p className="muted" style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5 }}>Usa los filtros para ver nuevas herramientas o mejoras y arreglos.</p>
          </div>
        </details>
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <Link href="/dashboard/actualizaciones" style={filterButtonStyle(filtroCategoria === "todas")}>Todas ({total})</Link>
          <Link href="/dashboard/actualizaciones?categoria=nuevas-herramientas" style={filterButtonStyle(filtroCategoria === "nuevas-herramientas")}>Nuevas herramientas ({totalNuevas})</Link>
          <Link href="/dashboard/actualizaciones?categoria=arreglos" style={filterButtonStyle(filtroCategoria === "arreglos")}>Mejoras ({totalArreglos})</Link>
        </div>
      </header>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {actualizaciones.length === 0 ? (
          <p className="muted" style={{ margin: "24px 0 0", fontSize: 14 }}>No hay actualizaciones en esta categoría.</p>
        ) : actualizaciones.map((item) => <TarjetaActualizacion key={item.id} item={item} />)}
      </div>
    </div>
  );
}

function TarjetaActualizacion({ item }: { item: { date: Date; title: string; category: string; summary: string; example: string; modulePath?: string | null } }) {
  const esNueva = item.category === "nuevas-herramientas";
  const badgeTexto = esNueva ? CATEGORY_LABELS["nuevas-herramientas"] : CATEGORY_LABELS.arreglos;

  return (
    <article style={{ borderBottom: "1px solid #d2d2d7", padding: "22px 0 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              padding: "3px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 500,
              color: "#1d1d1f",
              background: "#f5f5f7",
              border: "1px solid #d2d2d7",
            }}
          >
            {badgeTexto}
          </span>
          <span className="muted" style={{ fontSize: 12 }}>
            {item.date.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 600, color: "#1d1d1f", margin: "10px 0 6px 0", letterSpacing: "-0.02em" }}>
        {item.title}
      </h3>
      <p className="lead-copy" style={{ margin: "0 0 12px 0", lineHeight: 1.5 }}>
        {item.summary}
      </p>
      {item.modulePath && (
        <div style={{ marginBottom: 10 }}>
          <Link href={item.modulePath} className="link-button" style={{ fontSize: 13, fontWeight: 500, color: "#1d1d1f" }}>
            Ir al módulo &rarr;
          </Link>
        </div>
      )}
      <details style={{ marginTop: 10 }}>
        <summary style={{ cursor: "pointer", color: "#1d1d1f", fontSize: 12, fontWeight: 600 }}>Ver ejemplo de uso</summary>
        <p className="muted" style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.45 }}>{item.example}</p>
      </details>
    </article>
  );
}
