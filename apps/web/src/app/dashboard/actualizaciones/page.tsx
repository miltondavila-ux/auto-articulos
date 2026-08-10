"use client";

import { useState } from "react";
import { sectionStyle, h2Style } from "@/components/dashboard-ui";

type Categoria = "nuevas-herramientas" | "arreglos";

interface Actualizacion {
  id: string;
  fecha: string;
  titulo: string;
  categoria: Categoria;
  resumen: string;
  ejemplo: string;
}

const ACTUALIZACIONES: Actualizacion[] = [
  {
    id: "1",
    fecha: "2026-08-10",
    titulo: "Nuevo módulo de Actualizaciones en el menú",
    categoria: "nuevas-herramientas",
    resumen:
      "Se agregó una nueva sección en el menú principal donde podrás consultar todos los cambios, mejoras y correcciones realizadas en la plataforma de forma clara y explicada.",
    ejemplo:
      "Ejemplo: Si quieres saber qué novedades hay o qué se corrigió recientemente, entras a 'Actualizaciones' y verás cada cambio explicado con un ejemplo sencillo sin tecnicismos.",
  },
  {
    id: "2",
    fecha: "2026-08-08",
    titulo: "Sincronización automática de publicaciones con redes sociales (Threads, X y LinkedIn)",
    categoria: "nuevas-herramientas",
    resumen:
      "Ahora cada vez que publicas un artículo en la plataforma, puedes configurarlo para que se cree automáticamente una publicación optimizada en Threads, X (Twitter) y LinkedIn.",
    ejemplo:
      "Ejemplo: Escribes y publicas un artículo sobre '10 consejos para tu negocio'. Automáticamente se publica un resumen atractivo en tu cuenta de Threads y LinkedIn con el enlace hacia tu sitio.",
  },
  {
    id: "3",
    fecha: "2026-08-05",
    titulo: "Sugerencias de oportunidades de contenido SEO",
    categoria: "nuevas-herramientas",
    resumen:
      "El sistema analiza las búsquedas de tu audiencia en Google e identifica qué temas están buscando los usuarios para sugerirte títulos listos para redactar y publicar.",
    ejemplo:
      "Ejemplo: Si muchas personas buscan 'cómo elegir un seguro de auto', la herramienta te alerta en la pestaña 'Oportunidades' y te propone el título exacto para captar esos clientes.",
  },
  {
    id: "4",
    fecha: "2026-08-03",
    titulo: "Corrección en caracteres especiales al publicar en redes",
    categoria: "arreglos",
    resumen:
      "Se corrigió un error que provocaba fallos o caracteres extraños al publicar títulos o textos que contenían acentos, tildes, signos de interrogación o la letra 'ñ'.",
    ejemplo:
      "Ejemplo: Antes, al publicar '¿Cómo diseñar tu página web?', el texto podía cortarse o mostrar símbolos extraños. Ahora se publica perfectamente tal cual lo escribes.",
  },
  {
    id: "5",
    fecha: "2026-07-28",
    titulo: "Mejora en la reconexión de credenciales de Google Search Console",
    categoria: "arreglos",
    resumen:
      "Se solucionó un problema por el cual la conexión con Google Search Console se desconectaba periódicamente requiriendo volver a iniciar sesión.",
    ejemplo:
      "Ejemplo: Antes tenías que volver a vincular tu cuenta de Google cada pocos días. Ahora la conexión se mantiene estable de forma continua.",
  },
];

export default function ActualizacionesPage() {
  const [filtroCategoria, setFiltroCategoria] = useState<"todas" | Categoria>("todas");

  const filtradas = ACTUALIZACIONES.filter((item) => {
    if (filtroCategoria === "todas") return true;
    return item.categoria === filtroCategoria;
  });

  const totalNuevas = ACTUALIZACIONES.filter((i) => i.categoria === "nuevas-herramientas").length;
  const totalArreglos = ACTUALIZACIONES.filter((i) => i.categoria === "arreglos").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Cabecera explicativa */}
      <div style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ ...h2Style, marginBottom: 4 }}>🚀 Registro de Actualizaciones</h2>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
              Entérate de las nuevas herramientas incorporadas y los arreglos realizados en la plataforma, explicados de forma clara y sencilla.
            </p>
          </div>
        </div>

        {/* Filtros por categoría */}
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <button
            onClick={() => setFiltroCategoria("todas")}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              border: filtroCategoria === "todas" ? "1px solid #2f5fdb" : "1px solid #dfe3e8",
              background: filtroCategoria === "todas" ? "#2f5fdb" : "#f7f8fa",
              color: filtroCategoria === "todas" ? "#ffffff" : "#374151",
            }}
          >
            Todas ({ACTUALIZACIONES.length})
          </button>
          <button
            onClick={() => setFiltroCategoria("nuevas-herramientas")}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              border: filtroCategoria === "nuevas-herramientas" ? "1px solid #16a34a" : "1px solid #a8dfc0",
              background: filtroCategoria === "nuevas-herramientas" ? "#16a34a" : "#f3fbf6",
              color: filtroCategoria === "nuevas-herramientas" ? "#ffffff" : "#166534",
            }}
          >
            ✨ Nuevas herramientas ({totalNuevas})
          </button>
          <button
            onClick={() => setFiltroCategoria("arreglos")}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              border: filtroCategoria === "arreglos" ? "1px solid #d97706" : "1px solid #f0deac",
              background: filtroCategoria === "arreglos" ? "#d97706" : "#fff8e6",
              color: filtroCategoria === "arreglos" ? "#ffffff" : "#92400e",
            }}
          >
            🛠 Arreglos ({totalArreglos})
          </button>
        </div>
      </div>

      {/* Lista de cambios */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtradas.length === 0 ? (
          <div style={sectionStyle}>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
              No hay actualizaciones en esta categoría.
            </p>
          </div>
        ) : (
          filtradas.map((item) => (
            <TarjetaActualizacion key={item.id} item={item} />
          ))
        )}
      </div>
    </div>
  );
}

function TarjetaActualizacion({ item }: { item: Actualizacion }) {
  const esNueva = item.categoria === "nuevas-herramientas";

  const bannerColor = esNueva ? "#166534" : "#92400e";
  const bannerBg = esNueva ? "#dcfce7" : "#fef3c7";
  const bannerBorder = esNueva ? "#bbf7d0" : "#fde68a";
  const badgeTexto = esNueva ? "✨ Nueva herramienta" : "🛠 Arreglo";

  return (
    <div
      style={{
        ...sectionStyle,
        marginTop: 0,
        borderLeft: `5px solid ${esNueva ? "#16a34a" : "#d97706"}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              padding: "2px 10px",
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 700,
              color: bannerColor,
              background: bannerBg,
              border: `1px solid ${bannerBorder}`,
            }}
          >
            {badgeTexto}
          </span>
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            {new Date(item.fecha).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#16181d", margin: "10px 0 6px 0" }}>
        {item.titulo}
      </h3>

      <p style={{ fontSize: 14, color: "#374151", lineHeight: "1.5", margin: "0 0 12px 0" }}>
        {item.resumen}
      </p>

      {/* Ejemplo descriptivo */}
      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          padding: "10px 14px",
          marginTop: 8,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
          <span>💡</span> Ejemplo para entenderlo fácil:
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#334155", fontStyle: "italic", lineHeight: "1.4" }}>
          {item.ejemplo}
        </p>
      </div>
    </div>
  );
}
