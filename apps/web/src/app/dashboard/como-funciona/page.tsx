import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cómo funciona — Auto Artículos",
  description:
    "Qué hace Auto Artículos, en qué orden ocurre y qué debes hacer tú en cada paso.",
};

// Estilo pedido por Milton (18/8/2026): explicación en texto, con títulos
// bien hechos. Sin gráficas y sin emoticones — Apple no los usa. Toda la
// jerarquía se sostiene con tipografía y espacio en blanco, no con adornos.

const PASOS = [
  {
    numero: "01",
    titulo: "Configura tu cuenta",
    cuerpo: [
      "Es lo primero y lo único que no puede saltarse. Sin la configuración completa, el sistema no tiene con qué trabajar.",
      "Si no estás seguro de haberlo dejado todo listo, entra en Configuración y revísalo. Es muy sencillo y se hace una sola vez.",
    ],
    ayuda: {
      texto: "Ir a Configuración",
      href: "/dashboard/configuracion",
    },
    nota: "Si algo no te queda claro, abre la burbuja de ayuda que aparece en la esquina de la pantalla y pregunta. Está en todas las pantallas.",
  },
  {
    numero: "02",
    titulo: "Publica tus artículos",
    cuerpo: [
      "Aquí tienes dos caminos, y puedes usar los dos.",
      "El primero es publicar tus propios artículos: escribes hasta diez títulos a la vez y el sistema los redacta y los publica por ti.",
      "El segundo es dejarle el trabajo al sistema. En Oportunidades, se comunica con Google Search Console y con Bing, mira qué está buscando de verdad la gente que llega a tu sitio, y decide qué te conviene publicar. Cuando la inteligencia artificial haya decidido, tú publicas: de uno en uno o por lotes.",
    ],
    ayuda: {
      texto: "Ver Oportunidades SEO/AEO",
      href: "/dashboard/oportunidades",
    },
    nota: "Ambos caminos están dentro del menú Publicaciones.",
  },
  {
    numero: "03",
    titulo: "Lleva lo publicado a las redes",
    cuerpo: [
      "Una vez tienes artículos publicados, el módulo de Oportunidades para Redes Sociales te permite llevar los más relevantes a tus redes.",
      "No se publica todo ni todo el tiempo. El sistema reparte y equilibra, para que tu presencia crezca sin parecer spam.",
    ],
    ayuda: {
      texto: "Ver Oportunidades para Redes Sociales",
      href: "/dashboard/oportunidades-redes",
    },
    nota: null,
  },
];

export default function ComoFuncionaPage() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", paddingBottom: 64 }}>
      {/* Objetivo */}
      <header style={{ padding: "48px 0 40px" }}>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#86868b",
          }}
        >
          El objetivo
        </p>
        <h1
          style={{
            margin: "14px 0 0",
            fontSize: 44,
            lineHeight: 1.1,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "#1d1d1f",
          }}
        >
          Indexarte y posicionarte en tiempo récord.
        </h1>
        <p
          style={{
            margin: "22px 0 0",
            fontSize: 19,
            lineHeight: 1.6,
            color: "#6e6e73",
          }}
        >
          En Google Search Console, en Bing y en las inteligencias artificiales.
          Y con acceso a un motor de publicación en redes sociales inteligente y
          equilibrado.
        </p>
      </header>

      <hr style={{ border: "none", borderTop: "1px solid #e5e5ea", margin: 0 }} />

      {/* Cómo sucede */}
      <section style={{ paddingTop: 48 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "#1d1d1f",
          }}
        >
          Cómo sucede
        </h2>
        <p
          style={{
            margin: "14px 0 0",
            fontSize: 17,
            lineHeight: 1.6,
            color: "#6e6e73",
          }}
        >
          Son tres pasos, en este orden. El primero se hace una vez; los otros
          dos se repiten tantas veces como quieras.
        </p>

        {PASOS.map((paso) => (
          <article key={paso.numero} style={{ paddingTop: 52 }}>
            <p
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 600,
                color: "#86868b",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {paso.numero}
            </p>
            <h3
              style={{
                margin: "10px 0 0",
                fontSize: 25,
                fontWeight: 600,
                letterSpacing: "-0.02em",
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
            {paso.nota && (
              <p
                style={{
                  margin: "16px 0 0",
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: "#86868b",
                }}
              >
                {paso.nota}
              </p>
            )}
            <p style={{ margin: "22px 0 0" }}>
              <Link
                href={paso.ayuda.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 16,
                  color: "#0071e3",
                  textDecoration: "none",
                }}
              >
                {paso.ayuda.texto}
                <span aria-hidden="true">›</span>
              </Link>
            </p>
          </article>
        ))}
      </section>

      <hr
        style={{
          border: "none",
          borderTop: "1px solid #e5e5ea",
          margin: "56px 0 0",
        }}
      />

      {/* Cierre */}
      <section style={{ paddingTop: 48 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "#1d1d1f",
          }}
        >
          Para qué sirve todo esto
        </h2>
        <p
          style={{
            margin: "18px 0 0",
            fontSize: 19,
            lineHeight: 1.65,
            color: "#1d1d1f",
          }}
        >
          Para posicionarte con autoridad en internet.
        </p>
        <p
          style={{
            margin: "16px 0 0",
            fontSize: 17,
            lineHeight: 1.65,
            color: "#6e6e73",
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
