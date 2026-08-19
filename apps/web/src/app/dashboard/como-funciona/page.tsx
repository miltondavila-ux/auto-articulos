import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "Cómo funciona — Auto Artículos",
  description:
    "Qué hace Auto Artículos, en qué orden ocurre y qué debes hacer tú en cada paso.",
};

// Explicación en texto, sin gráficas y sin emoticones (pedido de Milton,
// 18/8/2026). La primera versión era texto suelto sobre el fondo del panel y
// se veía desnuda; ahora usa las mismas tarjetas blancas que el resto de la
// plataforma, con más aire y tipografía más grande.

const tarjeta: CSSProperties = {
  background: "#ffffff",
  border: "1px solid rgba(0, 0, 0, 0.07)",
  borderRadius: 22,
  boxShadow: "0 12px 38px rgba(0, 0, 0, 0.06)",
  boxSizing: "border-box",
  width: "100%",
};

const eyebrow: CSSProperties = {
  margin: 0,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#86868b",
};

const enlace: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "10px 20px",
  borderRadius: 980,
  border: "1px solid #d2d2d7",
  background: "#ffffff",
  color: "#1d1d1f",
  fontSize: 14,
  fontWeight: 500,
  textDecoration: "none",
};

const PASOS = [
  {
    numero: "01",
    titulo: "Configura tu cuenta",
    cuerpo: [
      "Es lo primero, y lo único que no puede saltarse. Sin la configuración completa, el sistema no tiene con qué trabajar.",
      "Si no estás seguro de haberlo dejado todo listo, entra en Configuración y revísalo. Es muy sencillo y se hace una sola vez. Si algo no te queda claro, abre la burbuja de ayuda que aparece en la esquina de la pantalla y pregunta: está en todas las pantallas.",
    ],
    accion: { texto: "Ir a Configuración", href: "/dashboard/configuracion" },
  },
  {
    numero: "02",
    titulo: "Publica tus artículos",
    cuerpo: [
      "Aquí tienes dos caminos, y puedes usar los dos.",
      "El primero es publicar tus propios artículos: colocas hasta diez títulos a la vez y el sistema los redacta y los publica por ti.",
      "El segundo es dejarle el trabajo al sistema. En Oportunidades se comunica con Google Search Console y con Bing, mira qué está buscando de verdad la gente que llega a tu sitio, y decide qué te conviene publicar. Cuando la inteligencia artificial haya decidido, publicas tú: de uno en uno o por lotes.",
    ],
    accion: { texto: "Ver Oportunidades SEO/AEO", href: "/dashboard/oportunidades" },
  },
  {
    numero: "03",
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
        maxWidth: 860,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        paddingBottom: 40,
      }}
    >
      {/* El objetivo */}
      <section style={{ ...tarjeta, padding: "64px 40px", textAlign: "center" }}>
        <p style={eyebrow}>El objetivo</p>
        <h1
          style={{
            margin: "16px auto 0",
            maxWidth: 620,
            fontSize: 42,
            lineHeight: 1.1,
            fontWeight: 600,
            letterSpacing: "-0.035em",
            color: "#1d1d1f",
          }}
        >
          Indexarte y posicionarte en tiempo récord.
        </h1>
        <p
          style={{
            margin: "22px auto 0",
            maxWidth: 560,
            fontSize: 19,
            lineHeight: 1.55,
            color: "#6e6e73",
          }}
        >
          En Google Search Console, en Bing y en las inteligencias artificiales.
          Con acceso, además, a un motor de publicación en redes sociales
          inteligente y equilibrado.
        </p>
      </section>

      {/* Cómo sucede */}
      <section style={{ ...tarjeta, padding: "40px 40px 36px" }}>
        <p style={eyebrow}>Cómo sucede</p>
        <h2
          style={{
            margin: "14px 0 0",
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            color: "#1d1d1f",
          }}
        >
          Tres pasos, en este orden.
        </h2>
        <p
          style={{
            margin: "12px 0 0",
            fontSize: 17,
            lineHeight: 1.6,
            color: "#6e6e73",
          }}
        >
          El primero se hace una sola vez. Los otros dos se repiten tantas veces
          como quieras.
        </p>
      </section>

      {PASOS.map((paso) => (
        <section key={paso.numero} style={{ ...tarjeta, padding: "40px" }}>
          <div style={{ display: "flex", gap: 26, alignItems: "flex-start" }}>
            <span
              aria-hidden="true"
              style={{
                flexShrink: 0,
                fontSize: 40,
                fontWeight: 300,
                letterSpacing: "-0.03em",
                color: "#d2d2d7",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                paddingTop: 2,
              }}
            >
              {paso.numero}
            </span>
            <div style={{ minWidth: 0 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: 24,
                  fontWeight: 600,
                  letterSpacing: "-0.025em",
                  color: "#1d1d1f",
                }}
              >
                {paso.titulo}
              </h3>
              {paso.cuerpo.map((parrafo) => (
                <p
                  key={parrafo.slice(0, 40)}
                  style={{
                    margin: "16px 0 0",
                    fontSize: 17,
                    lineHeight: 1.65,
                    color: "#1d1d1f",
                  }}
                >
                  {parrafo}
                </p>
              ))}
              <p style={{ margin: "26px 0 0" }}>
                <Link href={paso.accion.href} style={enlace}>
                  {paso.accion.texto}
                  <span aria-hidden="true" style={{ opacity: 0.5 }}>
                    ›
                  </span>
                </Link>
              </p>
            </div>
          </div>
        </section>
      ))}

      {/* Para qué sirve */}
      <section
        style={{
          ...tarjeta,
          background: "#1d1d1f",
          border: "1px solid #1d1d1f",
          padding: "64px 40px",
          textAlign: "center",
        }}
      >
        <p style={{ ...eyebrow, color: "#86868b" }}>Para qué sirve todo esto</p>
        <p
          style={{
            margin: "16px auto 0",
            maxWidth: 620,
            fontSize: 32,
            lineHeight: 1.25,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "#f5f5f7",
          }}
        >
          Para posicionarte con autoridad en internet.
        </p>
        <p
          style={{
            margin: "22px auto 0",
            maxWidth: 600,
            fontSize: 17,
            lineHeight: 1.65,
            color: "#a1a1a6",
          }}
        >
          Aparecer en los resultados de la inteligencia artificial, de Google y
          de Bing es lo más importante que le puede pasar a tu negocio en
          internet. Es la diferencia entre que te encuentren y que no sepan que
          existes. Todo lo que hace esta plataforma va dirigido a eso.
        </p>
      </section>
    </div>
  );
}
