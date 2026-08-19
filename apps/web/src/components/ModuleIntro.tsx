import Link from "next/link";
import type { ReactNode } from "react";
import { sectionStyle } from "./dashboard-ui";

/**
 * Explicación de qué sucede en un módulo, al principio de su pantalla.
 *
 * Orden de Milton (18/8/2026): cada módulo debe explicar qué pasa allí, en
 * lenguaje que entienda alguien que llega sin conocimiento previo. El texto va
 * primero, antes de cualquier control.
 */
export default function ModuleIntro({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section style={{ ...sectionStyle, marginTop: 0, padding: "clamp(18px, 3vw, 28px)" }}>
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#86868b",
        }}
      >
        Antes de avanzar, lee esto
      </p>
      <h1
        style={{
          margin: "8px 0 0",
          fontSize: "clamp(22px, 3vw, 28px)",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "#1d1d1f",
        }}
      >
        {titulo}
      </h1>
      <div style={{ marginTop: 10 }}>{children}</div>
    </section>
  );
}

/** Párrafo del texto explicativo, para no repetir estilos en cada módulo. */
export function IntroP({ children }: { children: ReactNode }) {
  return (
    <p style={{ margin: "10px 0 0", fontSize: 16, lineHeight: 1.55, color: "#1d1d1f" }}>
      {children}
    </p>
  );
}

/*
 * Registro único de los módulos nombrables dentro de un texto.
 *
 * Existe para que el nombre y la ruta salgan siempre de un solo sitio: si un
 * módulo cambia de nombre o de dirección, se corrige aquí y queda corregido en
 * todas las explicaciones del sistema. Escribir el enlace a mano en cada texto
 * era la forma segura de acabar con enlaces rotos.
 */
const MODULOS = {
  inicio: { etiqueta: "Inicio", href: "/dashboard" },
  "como-funciona": { etiqueta: "Cómo Funciona", href: "/dashboard/como-funciona" },
  publicar: { etiqueta: "Publicaciones propias", href: "/dashboard/publicar" },
  oportunidades: { etiqueta: "Oportunidades SEO/AEO", href: "/dashboard/oportunidades" },
  "oportunidades-redes": {
    etiqueta: "Oportunidades para Redes Sociales",
    href: "/dashboard/oportunidades-redes",
  },
  "publicaciones-en-curso": {
    etiqueta: "Publicaciones en Curso",
    href: "/dashboard/publicaciones-en-curso",
  },
  historial: { etiqueta: "Historial", href: "/dashboard/historial" },
  actualizaciones: { etiqueta: "Actualizaciones", href: "/dashboard/actualizaciones" },
  configuracion: { etiqueta: "Configuración", href: "/dashboard/configuracion" },
  administracion: { etiqueta: "Administración", href: "/dashboard/usuarios" },
} as const;

export type ModuloId = keyof typeof MODULOS;

/**
 * Nombre de un módulo dentro de un texto: en mayúsculas, en negrita y
 * enlazado a su pantalla.
 *
 * Orden de Milton (18/8/2026): que el nombre salte a la vista y que se pueda
 * ir al módulo desde la propia explicación, "de esa manera la gente no se
 * perderá".
 */
export function Modulo({ id }: { id: ModuloId }) {
  const modulo = MODULOS[id];
  return (
    <Link
      href={modulo.href}
      style={{
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.01em",
        color: "#0066cc",
        textDecoration: "none",
      }}
    >
      {modulo.etiqueta}
    </Link>
  );
}
