import Link from "next/link";
import { Card, Grid, Text } from "@tremor/react";
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
    href: "/dashboard/configuracion/indexacion",
    titulo: "Indexación y SEO",
    descripcion:
      "Conecta Google Search Console, Google Analytics y Bing para que tus artículos aparezcan en las búsquedas.",
  },
  {
    href: "/dashboard/configuracion/redes-sociales",
    titulo: "Redes Sociales",
    descripcion:
      "Conecta tus redes sociales para que el sistema pueda publicar ahí también, automáticamente.",
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
      <Grid
        numItemsSm={2}
        numItemsLg={3}
        className="gap-4"
        style={{ marginTop: 20 }}
      >
        {SECCIONES.map((s, i) => (
          <Link key={s.href} href={s.href} style={{ textDecoration: "none" }}>
            <Card>
              <Text>{String(i + 1).padStart(2, "0")}</Text>
              <p
                style={{
                  marginTop: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#1d1d1f",
                  lineHeight: 1.4,
                }}
              >
                {s.titulo}
              </p>
              <p
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: "#6e6e73",
                  lineHeight: 1.5,
                }}
              >
                {s.descripcion}
              </p>
            </Card>
          </Link>
        ))}
      </Grid>
    </div>
  );
}
