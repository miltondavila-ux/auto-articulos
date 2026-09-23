import type { Metadata } from "next";
import Link from "next/link";
import { MENU_NAMES } from "@/lib/menu-names";

export const metadata: Metadata = {
  title: "Cómo funciona esta aplicación — SEO TOTAL",
  description: "Elige cómo crear y publicar tu contenido.",
};

const cardStyle = {
  border: "1px solid #d2d2d7",
  borderRadius: 6,
  padding: 18,
  background: "#ffffff",
  minWidth: 0,
};

const linkStyle = {
  display: "inline-flex",
  marginTop: 16,
  color: "#1d1d1f",
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "underline",
  textUnderlineOffset: 3,
};

export default function ComoFuncionaPage() {
  return (
    <main style={{ width: "100%", maxWidth: 1120, margin: "0 auto" }}>
      <header style={{ borderBottom: "1px solid #d2d2d7", padding: "0 0 24px" }}>
        <p className="eyebrow" style={{ margin: "0 0 6px" }}>CÓMO FUNCIONA</p>
        <h1 style={{ margin: 0, fontSize: "clamp(26px, 4vw, 38px)", lineHeight: 1.1, fontWeight: 600, letterSpacing: "-0.03em" }}>
          Elige qué quieres hacer
        </h1>
        <p style={{ margin: "10px 0 0", maxWidth: 700, fontSize: 17, lineHeight: 1.5 }}>
          Puedes escribir tus propios artículos, pedir ayuda a la IA o publicar tu contenido en otros canales.
        </p>
      </header>

      <section style={{ padding: "24px 0 0" }}>
        <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.2, fontWeight: 600 }}>Tus tres opciones</h2>
        <p className="muted" style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5 }}>
          Elige una opción desde Inicio. Puedes usar las tres cuando las necesites.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))", gap: 12, marginTop: 16 }}>
          <article style={cardStyle}>
            <p className="eyebrow" style={{ margin: "0 0 8px" }}>OPCIÓN 1</p>
            <h3 style={{ margin: 0, fontSize: 20, lineHeight: 1.2 }}>Escribe tus propios artículos</h3>
            <p className="muted" style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.5 }}>
              Tú eliges el título, las variables y la categoría. La plataforma redacta y publica el artículo en tu web.
            </p>
            <Link href="/dashboard/publicar" aria-label={`Abrir ${MENU_NAMES.propios}`} style={linkStyle}>Abrir módulo →</Link>
          </article>

          <article style={cardStyle}>
            <p className="eyebrow" style={{ margin: "0 0 8px" }}>OPCIÓN 2</p>
            <h3 style={{ margin: 0, fontSize: 20, lineHeight: 1.2 }}>Pide títulos y contenido con IA</h3>
            <p className="muted" style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.5 }}>
              Puedes indicar tus propias variables o dejar que la IA encuentre temas que tu público está buscando.
            </p>
            <Link href="/dashboard/oportunidades" aria-label={`Abrir ${MENU_NAMES.ia}`} style={linkStyle}>Abrir módulo →</Link>
          </article>

          <article style={cardStyle}>
            <p className="eyebrow" style={{ margin: "0 0 8px" }}>OPCIÓN 3</p>
            <h3 style={{ margin: 0, fontSize: 20, lineHeight: 1.2 }}>Publica en redes y blogs</h3>
            <p className="muted" style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.5 }}>
              Revisa el contenido creado y decide en qué redes sociales o blogs públicos quieres difundirlo.
            </p>
            <Link href="/dashboard/oportunidades-redes" aria-label={`Abrir ${MENU_NAMES.redes}`} style={linkStyle}>Abrir módulo →</Link>
          </article>
        </div>
      </section>

      <section style={{ borderTop: "1px solid #d2d2d7", marginTop: 28, padding: "22px 0 0" }}>
        <h2 style={{ margin: 0, fontSize: 22, lineHeight: 1.2, fontWeight: 600 }}>Cómo ayuda la IA</h2>
        <p style={{ margin: "10px 0 0", maxWidth: 760, fontSize: 15, lineHeight: 1.5 }}>
          Si conectas tus fuentes de datos, la IA puede usarlas para proponer temas más útiles:
        </p>
        <ul style={{ margin: "10px 0 0", paddingLeft: 20, maxWidth: 760, fontSize: 15, lineHeight: 1.6 }}>
          <li><strong>Google Search Console:</strong> qué búsquedas llevan personas a tu web.</li>
          <li><strong>Google Analytics:</strong> qué contenido recibe visitas.</li>
          <li><strong>Bing:</strong> qué oportunidades aparecen en ese buscador.</li>
        </ul>
        <Link href="/dashboard/configuracion" style={linkStyle}>Revisar configuración →</Link>
      </section>

      <details style={{ borderTop: "1px solid #d2d2d7", marginTop: 24, padding: "18px 0 0" }}>
        <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Qué ocurre después de publicar</summary>
        <p className="muted" style={{ margin: "10px 0 0", maxWidth: 760, fontSize: 14, lineHeight: 1.5 }}>
          Puedes seguir el avance en Progreso de las publicaciones. Cuando termina, el resultado queda guardado en Historial y puedes consultar su rendimiento en Estadísticas.
        </p>
      </details>
    </main>
  );
}
