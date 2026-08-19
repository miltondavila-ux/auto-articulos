import Link from "next/link";
import { prisma } from "@auto-articulos/db";
import { sectionStyle, h2Style } from "@/components/dashboard-ui";

type Categoria = "nuevas-herramientas" | "arreglos";

const CATEGORY_LABELS: Record<Categoria, string> = {
  "nuevas-herramientas": "Nuevas herramientas",
  arreglos: "Mejoras y arreglos",
};

function filterButtonStyle(active: boolean) {
  return {
    padding: "6px 14px",
    borderRadius: 20,
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
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1120, margin: "0 auto" }}>
      <div className="panel" style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p className="eyebrow" style={{ margin: "0 0 4px" }}>Novedades del Sistema</p>
            <h1 style={{ ...h2Style, fontSize: 26, marginBottom: 6 }}>Registro de Actualizaciones</h1>
            <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.55, color: "#1d1d1f" }}>
              Aquí se anota cada mejora y cada arreglo que se hace en la plataforma, con su fecha y una explicación de qué cambió y para qué sirve.
            </p>
            <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.55, color: "#1d1d1f" }}>
              Míralo cuando notes algo distinto en una pantalla, o cuando aparezca una función que antes no estaba. En vez de tener que preguntar, aquí está escrito qué pasó.
            </p>
            <p className="lead-copy" style={{ margin: 0, maxWidth: 680 }}>
              Entérate de las nuevas herramientas incorporadas y los arreglos realizados en la plataforma, explicados de forma clara y sencilla.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <Link href="/dashboard/actualizaciones" style={filterButtonStyle(filtroCategoria === "todas")}>Todas ({total})</Link>
          <Link href="/dashboard/actualizaciones?categoria=nuevas-herramientas" style={filterButtonStyle(filtroCategoria === "nuevas-herramientas")}>Nuevas herramientas ({totalNuevas})</Link>
          <Link href="/dashboard/actualizaciones?categoria=arreglos" style={filterButtonStyle(filtroCategoria === "arreglos")}>Mejoras ({totalArreglos})</Link>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {actualizaciones.length === 0 ? (
          <div className="panel" style={sectionStyle}><p className="muted" style={{ margin: 0 }}>No hay actualizaciones en esta categoría.</p></div>
        ) : actualizaciones.map((item) => <TarjetaActualizacion key={item.id} item={item} />)}
      </div>
    </div>
  );
}

function TarjetaActualizacion({ item }: { item: { date: Date; title: string; category: string; summary: string; example: string; modulePath?: string | null } }) {
  const esNueva = item.category === "nuevas-herramientas";
  const badgeTexto = esNueva ? CATEGORY_LABELS["nuevas-herramientas"] : CATEGORY_LABELS.arreglos;

  return (
    <div className="panel" style={{ ...sectionStyle, marginTop: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 500,
              color: esNueva ? "#16803c" : "#1d1d1f",
              background: esNueva ? "rgba(52, 199, 89, 0.1)" : "#f5f5f7",
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
          <Link href={item.modulePath} className="link-button" style={{ fontSize: 13, fontWeight: 500 }}>
            Ir al módulo &rarr;
          </Link>
        </div>
      )}
      <div className="row" style={{ padding: "10px 14px", marginTop: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#1d1d1f", marginBottom: 3 }}>
          Ejemplo de uso:
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#6e6e73", lineHeight: 1.45 }}>
          {item.example}
        </p>
      </div>
    </div>
  );
}
