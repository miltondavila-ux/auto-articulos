import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "Cómo funciona — Auto Artículos",
  description:
    "Qué hace Auto Artículos, en qué orden ocurre y qué debes hacer tú en cada paso.",
};

/*
 * Estilo tomado de las páginas de soporte de Apple (communities.apple.com),
 * que Milton dio como referencia el 18/8/2026. Valores medidos sobre esa
 * página, no inventados:
 *
 *   fondo         #ffffff, inmaculado, sin tarjetas flotantes ni sombras
 *   título        48px / 52px, peso 600, interletraje -0.003em, #1d1d1f
 *   texto         17px / 25px, #1d1d1f
 *   separadores   línea de 1px en #d2d2d7
 *   enlaces       #0066cc
 *
 * La estructura se sostiene con líneas finas y espacio en blanco. Sin
 * gráficas y sin emoticones, como pidió.
 */

const SEPARADOR: CSSProperties = {
  border: "none",
  borderTop: "1px solid #d2d2d7",
  margin: 0,
};

const PARRAFO: CSSProperties = {
  margin: "12px 0 0",
  fontSize: 17,
  lineHeight: "25px",
  color: "#1d1d1f",
};

const TITULO_SECCION: CSSProperties = {
  margin: 0,
  fontSize: 28,
  lineHeight: "32px",
  fontWeight: 600,
  letterSpacing: "-0.003em",
  color: "#1d1d1f",
};

const ENLACE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 17,
  lineHeight: "25px",
  color: "#0066cc",
  textDecoration: "none",
};

const PASOS = [
  {
    numero: 1,
    titulo: "Configura tu cuenta",
    cuerpo: [
      "Es lo primero, y lo único que no puede saltarse. Sin la configuración completa, el sistema no tiene con qué trabajar.",
      "Si no estás seguro de haberlo dejado todo listo, entra en Configuración y revísalo. Es muy sencillo y se hace una sola vez. Si algo no te queda claro, abre la burbuja de ayuda que aparece en la esquina de la pantalla y pregunta: está en todas las pantallas.",
    ],
    accion: { texto: "Ir a Configuración", href: "/dashboard/configuracion" },
  },
  {
    numero: 2,
    titulo: "Publica tus artículos",
    cuerpo: [
      "Aquí tienes dos caminos, y puedes usar los dos.",
      "El primero es publicar tus propios artículos: colocas hasta diez títulos a la vez y el sistema los redacta y los publica por ti.",
      "El segundo es dejarle el trabajo al sistema. En Oportunidades se comunica con Google Search Console y con Bing, mira qué está buscando de verdad la gente que llega a tu sitio, y decide qué te conviene publicar. Cuando la inteligencia artificial haya decidido, publicas tú: de uno en uno o por lotes.",
    ],
    accion: { texto: "Ver Oportunidades SEO/AEO", href: "/dashboard/oportunidades" },
  },
  {
    numero: 3,
    titulo: "Lleva lo publicado a las redes",
    cuerpo: [
      "Con artículos ya publicados, Oportunidades para Redes Sociales te permite llevar los más relevantes a tus redes.",
      "No se publica todo ni todo el tiempo. El sistema reparte y equilibra, para que tu presencia crezca sin parecer spam.",
    ],
    accion: {
      texto: "Ver Oportunidades para Redes Sociales",
      href: "/dashboard/oportunidades-redes",
    },
  },
];

export default function ComoFuncionaPage() {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 18,
        padding: "0 clamp(20px, 4vw, 40px) clamp(36px, 5vw, 56px)",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      <header style={{ padding: "clamp(36px, 6vw, 56px) 0 clamp(28px, 4vw, 40px)", textAlign: "center" }}>
        <h1
          style={{
            margin: "0 auto",
            fontSize: "clamp(30px, 5vw, 46px)",
            lineHeight: 1.08,
            fontWeight: 600,
            letterSpacing: "-0.003em",
            color: "#1d1d1f",
          }}
        >
          Indexarte y posicionarte en tiempo récord
        </h1>
        <p
          style={{
            margin: "18px auto 0",
            maxWidth: 760,
            fontSize: 19,
            lineHeight: "27px",
            color: "#6e6e73",
          }}
        >
          En Google Search Console, en Bing y en las inteligencias artificiales.
          Con acceso, además, a un motor de publicación en redes sociales
          inteligente y equilibrado.
        </p>
      </header>

      <hr style={SEPARADOR} />

      <section style={{ padding: "clamp(28px, 4vw, 40px) 0 4px" }}>
        <h2 style={TITULO_SECCION}>Cómo sucede</h2>
        <p style={{ ...PARRAFO, color: "#6e6e73" }}>
          Son tres pasos, en este orden. El primero se hace una sola vez; los
          otros dos se repiten tantas veces como quieras.
        </p>
      </section>

      {PASOS.map((paso) => (
        <section key={paso.numero} style={{ padding: "clamp(24px, 3vw, 32px) 0" }}>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: "20px",
              fontWeight: 600,
              color: "#6e6e73",
            }}
          >
            Paso {paso.numero}
          </p>
          <h3
            style={{
              margin: "6px 0 0",
              fontSize: 24,
              lineHeight: "28px",
              fontWeight: 600,
              letterSpacing: "-0.003em",
              color: "#1d1d1f",
            }}
          >
            {paso.titulo}
          </h3>
          {paso.cuerpo.map((parrafo) => (
            <p key={parrafo.slice(0, 40)} style={PARRAFO}>
              {parrafo}
            </p>
          ))}
          <p style={{ margin: "14px 0 0" }}>
            <Link href={paso.accion.href} style={ENLACE}>
              {paso.accion.texto}
              <span aria-hidden="true">›</span>
            </Link>
          </p>
        </section>
      ))}

      <hr style={SEPARADOR} />

      <section style={{ padding: "clamp(28px, 4vw, 40px) 0 0" }}>
        <h2 style={TITULO_SECCION}>Para qué sirve todo esto</h2>
        <p style={PARRAFO}>Para posicionarte con autoridad en internet.</p>
        <p style={PARRAFO}>
          Aparecer en los resultados de la inteligencia artificial, de Google y
          de Bing es lo más importante que le puede pasar a tu negocio en
          internet. Es la diferencia entre que te encuentren y que no sepan que
          existes. Todo lo que hace esta plataforma va dirigido a eso.
        </p>
      </section>
    </div>
  );
}
