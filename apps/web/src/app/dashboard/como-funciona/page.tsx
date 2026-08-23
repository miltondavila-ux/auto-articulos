import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { EnPrueba, Modulo } from "@/components/ModuleIntro";
import ComoFuncionaCTA from "@/components/ComoFuncionaCTA";

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
      <>
        Es lo primero, y lo único que no puede saltarse. La plataforma publica
        artículos <em>dentro de tu página web</em>, así que necesita cuatro
        cosas antes de poder trabajar: la clave de tu web para poder entrar, la
        lista de secciones donde colocar cada artículo, el idioma en el que
        quieres que se escriba, y el permiso de Google para leer tus datos.
      </>,
      <>
        Todo eso se guarda una sola vez en <Modulo id="configuracion" />. Si es
        tu primera vez, ahí mismo hay un asistente que te lo pide paso a paso,
        sin que tengas que saber dónde está cada cosa. Si algo no te queda
        claro, abre la burbuja de ayuda de la esquina y pregunta: está en todas
        las pantallas y responde con tus propios datos.
      </>,
    ],
    accion: { texto: "Ir a Configuración", href: "/dashboard/configuracion" },
  },
  {
    numero: 2,
    titulo: "Publica tus artículos",
    cuerpo: [
      <>
        Aquí tienes dos caminos, y puedes usar los dos. Cambian en una sola
        cosa: quién elige el tema.
      </>,
      <>
        En <Modulo id="publicar" /> eliges tú. Escribes hasta diez
        títulos de una vez, dices en qué sección va cada uno, y el sistema los
        redacta y los publica en tu web. Es lo que quieres cuando ya sabes de
        qué necesitas hablar.
      </>,
      <>
        En <Modulo id="oportunidades" /> elige el sistema. Google
        guarda un registro de lo que escribió la gente en el buscador antes de
        llegar a tu página; ese registro se llama Search Console y es el que se
        conectó en el paso anterior. El sistema lo lee, junto con Bing, y
        descubre qué está buscando de verdad tu público. Con eso te propone
        títulos que sabemos que la gente busca, en vez de temas inventados.
      </>,
      <>
        Esos títulos son de <em>cola larga</em>. Traducido: en vez de pelear
        por una palabra corta y muy disputada como &ldquo;seguros&rdquo;, donde
        compites contra empresas enormes y no apareces nunca, se apunta a la
        búsqueda larga y concreta de alguien con una duda real, del estilo
        &ldquo;cuánto cuesta un seguro dental para mayores de 60 en
        Miami&rdquo;.
      </>,
      <>
        Esas búsquedas las hace menos gente, pero casi nadie escribe sobre
        ellas, así que es mucho más fácil salir de primero. Y quien busca así
        llega más decidido, porque ya sabe lo que quiere. Muchas búsquedas
        pequeñas juntas suman más que una grande a la que no ibas a llegar.
      </>,
      <>
        Tú revisas la lista, borras lo que no te convenza y publicas lo que
        quieras, de uno en uno o todo junto.
      </>,
      <>
        Mientras se escriben, el avance se ve en{" "}
        <Modulo id="publicaciones-en-curso" />, y cuando terminan quedan
        guardados en <Modulo id="historial" /> con su enlace.
      </>,
    ],
    accion: { texto: "Ver Oportunidades SEO/AEO", href: "/dashboard/oportunidades" },
  },
  {
    numero: 3,
    titulo: "Lleva lo publicado a las redes",
    enPrueba: true,
    cuerpo: [
      <>
        Un artículo en tu web solo lo encuentra quien lo busca. En redes
        sociales lo ve gente que todavía no te estaba buscando, y cada visita
        que llega desde ahí es una señal más de que tu contenido interesa.
      </>,
      <>
        En <Modulo id="oportunidades-redes" /> el sistema toma
        artículos que ya publicaste y prepara la publicación para cada red. Tú
        revisas y decides cuál sale y dónde. No se publica todo ni todo el
        tiempo: se reparte, para que tu presencia crezca sin parecer spam.
      </>,
      <>
        Este paso todavía está en prueba y no está disponible para todas las
        cuentas. Se está activando poco a poco, y si en tu menú no aparece
        todavía, es por eso: no te falta nada por configurar.
      </>,
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
      <header style={{ padding: "clamp(32px, 5vw, 48px) 0 clamp(24px, 3vw, 32px)" }}>
        <div style={{ marginBottom: 20 }}>
          <ComoFuncionaCTA />
        </div>
        <p
          style={{
            margin: "0 0 24px",
            fontSize: 19,
            lineHeight: "28px",
            color: "#1d1d1f",
          }}
        >
          Imagínate esto: un día alguien busca en Google, o le pregunta
          directamente a una inteligencia artificial, algo relacionado con lo
          que tu negocio ofrece. Aparecen páginas, respuestas armadas con
          información que esa inteligencia artificial ya leyó por ahí. ¿Te
          gustaría que tu negocio apareciera en esos resultados, antes que el
          de los demás? Ven, te contamos el secreto.
        </p>
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 14,
            lineHeight: "20px",
            fontWeight: 600,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            color: "#6e6e73",
          }}
        >
          El objetivo
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(30px, 5vw, 46px)",
            lineHeight: 1.08,
            fontWeight: 600,
            letterSpacing: "-0.003em",
            color: "#1d1d1f",
          }}
        >
          Que te encuentren. En Google, en Bing y dentro de la
          inteligencia artificial.
        </h1>
        <p
          style={{
            margin: "18px 0 0",
            fontSize: 19,
            lineHeight: "27px",
            color: "#6e6e73",
          }}
        >
          Dos palabras que vas a ver seguido aquí, explicadas simple: que
          Google &ldquo;te indexe&rdquo; significa que ya leyó tu página y la
          guardó en su lista; que &ldquo;te posiciones&rdquo; significa que
          apareces arriba en esa lista, no enterrado varias páginas más
          abajo. Con este sistema, las dos cosas pasan rápido: no dentro de
          un año, desde la primera semana de trabajo constante.
        </p>
        <p
          style={{
            margin: "16px 0 0",
            fontSize: 17,
            lineHeight: "25px",
            color: "#1d1d1f",
          }}
        >
          Esto ya no va solo de salir en Google. Hoy mucha gente pregunta
          directamente a una inteligencia artificial y se queda con la
          respuesta que le da, sin llegar a mirar una lista de resultados. Esa
          respuesta se construye con lo que la IA encontró indexado. Si tu sitio
          no está ahí, no apareces en la conversación: no es que salgas
          abajo, es que no existes.
        </p>
        <p
          style={{
            margin: "16px 0 0",
            fontSize: 17,
            lineHeight: "25px",
            color: "#1d1d1f",
          }}
        >
          Y hay algo que se suele pasar por alto: la persona que busca en Google
          es exactamente la misma que después abre Instagram, LinkedIn o
          Facebook. No son dos públicos distintos. Por eso esto no termina en tu
          web: el sistema lleva a tus redes los temas que esa gente ya está
          buscando, y cada visita que vuelve desde ahí le confirma a Google que
          tu sitio merece estar arriba. Buscadores, inteligencia artificial y
          redes empujan en la misma dirección.
        </p>
        <p
          style={{
            margin: "16px 0 0",
            fontSize: 17,
            lineHeight: "25px",
            color: "#6e6e73",
          }}
        >
          Dicho en simple: esta plataforma escribe artículos sobre lo que tu
          público busca de verdad y los publica dentro de tu página web, uno
          detrás de otro. Cuantos más artículos útiles tengas, más veces te
          encuentran — en el buscador, en la inteligencia artificial y en las
          redes.
        </p>
      </header>

      <hr style={SEPARADOR} />

      <section style={{ padding: "clamp(28px, 4vw, 40px) 0 0" }}>
        <h2 style={TITULO_SECCION}>Para qué sirve todo esto</h2>
        <p style={PARRAFO}>Para posicionarte con autoridad en internet.</p>
        <p style={PARRAFO}>
          Aparecer en los resultados de la inteligencia artificial, de Google y
          de Bing es lo más importante que le puede pasar a tu negocio en
          internet. Es la diferencia entre que te encuentren y que no sepan que
          existes.
        </p>
        <p style={PARRAFO}>
          No pasa de un día para otro, y conviene decirlo claro: Google tarda en
          leer y valorar cada artículo nuevo. Lo que sí ocurre es que se va
          acumulando. Cada artículo que se posiciona atrae visitas, esas visitas
          le confirman a Google que tu sitio responde bien, y eso hace que el
          siguiente artículo lo tenga un poco más fácil. Es un efecto bola de
          nieve: empieza pequeño y va creciendo solo, siempre que no se detenga.
        </p>
        <p style={PARRAFO}>
          Por eso el trabajo real es sencillo: dejar la cuenta bien configurada
          una vez, y después publicar de forma constante desde{" "}
          <Modulo id="publicar" /> o{" "}
          <Modulo id="oportunidades" />.
        </p>
      </section>

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
            {paso.enPrueba && <EnPrueba />}
          </h3>
          {paso.cuerpo.map((parrafo, i) => (
            <p key={i} style={PARRAFO}>
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
    </div>
  );
}
