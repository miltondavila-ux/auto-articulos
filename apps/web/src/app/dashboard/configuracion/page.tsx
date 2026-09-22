import Link from "next/link";
import ModuleIntro, { IntroP } from "@/components/ModuleIntro";

/**
 * Índice de Configuración.
 *
 * Rediseño "RENEW CONFIGURACION" (7/9/2026, pedido de Milton): esta pantalla
 * dejó de mostrar directamente los formularios (antes renderizaba
 * `ConfiguracionView` con sus 6 pestañas mezcladas) y pasó a ser solo un
 * mapa: cada tarjeta explica en una frase qué hace esa sección, y el
 * formulario real vive en su propia página dedicada. Sin esto, entrar a
 * Configuración obligaba a adivinar qué pestaña era la correcta.
 */
const SECCIONES = [
  {
    href: "/dashboard/configuracion/inicial",
    titulo: "Configuración Inicial",
    descripcion:
      "El paso a paso para conectar tu cuenta por primera vez. Empieza aquí si acabas de registrarte.",
  },
  {
    href: "/dashboard/configuracion/cuenta",
    titulo: "Cuenta",
    descripcion:
      "Tu usuario y contraseña para publicar, tus categorías sincronizadas, y el idioma en que se escriben tus artículos.",
  },
  {
    href: "/dashboard/configuracion/contenido",
    titulo: "Contenido",
    descripcion:
      "Cómo se escriben tus artículos, el texto que firma cada uno, tu teléfono de contacto y las fotos que se usan en redes sociales.",
  },
  {
    href: "/dashboard/configuracion/conexiones",
    titulo: "Conexiones",
    descripcion:
      "Configura Search Console, Analytics y tus redes desde un solo lugar.",
  },
  {
    href: "/dashboard/configuracion/movil",
    titulo: "App Móvil",
    descripcion:
      "Cómo abrir esta aplicación desde la pantalla de inicio de tu celular, como si fuera una app instalada.",
  },
] as const;

export default function ConfiguracionPage() {
  return (
    <div>
      <ModuleIntro titulo="Configuración">
        <IntroP>
          Aquí ajustas todo lo que el sistema necesita para trabajar por ti:
          con qué cuenta publica, en qué idioma escribe, a qué redes sociales
          se conecta y cómo firman tus artículos.
        </IntroP>
        <IntroP>
          No hace falta que entres a todo de una vez. Elige abajo la sección
          que corresponde a lo que quieres cambiar ahora mismo — cada una
          explica primero para qué sirve antes de pedirte nada.
        </IntroP>
      </ModuleIntro>
      <div style={{ marginTop: 24, borderTop: "1px solid #d2d2d7" }}>
        {SECCIONES.map((s, i) => (
          <Link
            key={s.href}
            href={s.href}
            style={{
              display: "grid",
              gridTemplateColumns: "42px minmax(0, 1fr) auto",
              alignItems: "center",
              gap: 16,
              padding: "20px 4px",
              textDecoration: "none",
              borderBottom: "1px solid #e5e5ea",
              color: "#1d1d1f",
            }}
          >
            <span style={{ color: "#8e8e93", fontSize: 12, letterSpacing: "0.06em" }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>
              <strong style={{ display: "block", fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>
                {s.titulo}
              </strong>
              <span style={{ display: "block", marginTop: 5, color: "#6e6e73", fontSize: 13, lineHeight: 1.45 }}>
                {s.descripcion}
              </span>
            </span>
            <span aria-hidden="true" style={{ color: "#6e6e73", fontSize: 22, lineHeight: 1 }}>
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
