import Link from "next/link";
import { MENU_NAMES } from "@/lib/menu-names";
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
  showEyebrow = true,
  compact = false,
  instruccionesColapsadas = false,
}: {
  titulo: string;
  children: ReactNode;
  showEyebrow?: boolean;
  compact?: boolean;
  instruccionesColapsadas?: boolean;
}) {
  if (compact) return null;
  return (
    <section style={{ ...sectionStyle, marginTop: 0, padding: "20px 0 24px" }}>
      <style>{`
        .module-intro-mobile { display: none; }
        @media (max-width: 700px) {
          .module-intro-desktop { display: none; }
          .module-intro-mobile { display: block; margin-top: 12px; }
          .module-intro-mobile summary {
            cursor: pointer;
            color: #1d1d1f;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: .02em;
            list-style: none;
          }
          .module-intro-mobile summary::-webkit-details-marker { display: none; }
          .module-intro-mobile summary::after { content: "＋"; float: right; font-size: 16px; }
          .module-intro-mobile[open] summary::after { content: "−"; }
        }
      `}</style>
      {showEyebrow && (
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
      )}
      <h1
        style={{
          margin: showEyebrow ? "8px 0 0" : 0,
          fontSize: "clamp(22px, 3vw, 28px)",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "#1d1d1f",
        }}
      >
        {titulo}
      </h1>
      {instruccionesColapsadas ? (
        <details style={{ marginTop: 10 }}>
          <summary
            style={{
              cursor: "pointer",
              color: "#6e6e73",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Ver instrucciones de esta pantalla
          </summary>
          <div style={{ marginTop: 10 }}>{children}</div>
        </details>
      ) : (
        <>
          <div className="module-intro-desktop" style={{ marginTop: 10 }}>{children}</div>
          <details className="module-intro-mobile">
            <summary>Ver instrucciones</summary>
            <div style={{ marginTop: 10 }}>{children}</div>
          </details>
        </>
      )}
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
  "como-funciona": { etiqueta: "Cómo funciona esta aplicación", href: "/dashboard/como-funciona" },
  publicar: { etiqueta: MENU_NAMES.propios, href: "/dashboard/publicar" },
  oportunidades: { etiqueta: MENU_NAMES.ia, href: "/dashboard/oportunidades" },
  "oportunidades-redes": {
    etiqueta: MENU_NAMES.redes,
    href: "/dashboard/oportunidades-redes",
  },
  "publicaciones-en-curso": {
    etiqueta: "Progreso de las publicaciones",
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

/**
 * Distintivo "En prueba" para funciones que todavía no están disponibles para
 * todas las cuentas. Pedido de Milton (19/8/2026) para Oportunidades para
 * Redes Sociales, que hoy solo tienen los administradores y una cuenta de
 * prueba. Va en gris: no es un aviso de error, es información.
 */
export function EnPrueba() {
  return (
    <span
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        marginLeft: 8,
        padding: "3px 9px",
        borderRadius: 980,
        background: "#f5f5f7",
        border: "1px solid #d2d2d7",
        color: "#6e6e73",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      En prueba
    </span>
  );
}
