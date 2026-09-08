import ModuleIntro, { IntroP } from "@/components/ModuleIntro";
import ConfiguracionSubNav from "@/components/ConfiguracionSubNav";
import { sectionStyle, h2Style } from "@/components/dashboard-ui";

/**
 * Página "App Móvil", parte del rediseño "RENEW CONFIGURACION" (7/9/2026).
 * Antes era la pestaña "mobile" de `ConfiguracionView.tsx`; contenido
 * estático, sin estado ni llamadas a la API — extracción directa.
 */
export default function ConfiguracionMovilPage() {
  return (
    <div>
      <ModuleIntro titulo="App Móvil">
        <IntroP>
          Puedes abrir esta aplicación desde tu celular como si fuera una app
          instalada, sin pasar por ninguna tienda de aplicaciones.
        </IntroP>
      </ModuleIntro>
      <ConfiguracionSubNav />
      <section
        style={{
          ...sectionStyle,
          padding: 30,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
            alignItems: "center",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.06em",
                color: "#1d1d1f",
                background: "#f5f5f7",
                padding: "4px 10px",
                borderRadius: 999,
                textTransform: "uppercase",
              }}
            >
              CÓDIGO QR DIRECTO
            </span>
            <h2 style={{ ...h2Style, marginTop: 10, fontSize: 18 }}>
              Abre SEO TOTAL en tu Celular
            </h2>
            <p style={{ fontSize: 13, color: "#6e6e73", margin: "6px 0 16px 0" }}>
              Apunta la cámara de tu teléfono al código QR para acceder al instante.
            </p>

            <div
              style={{
                background: "#ffffff",
                padding: 16,
                borderRadius: 16,
                display: "inline-block",
                boxShadow: "none",
                border: "1px solid #e5e5ea",
              }}
            >
              <img
                src="/qr-app.svg"
                alt="Código QR para abrir SEO TOTAL en el celular"
                width={180}
                height={180}
                style={{ display: "block" }}
              />
            </div>
          </div>

          {/* PWA Instructions */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px 0", color: "#1d1d1f" }}>
              ¿Cómo agregar a la pantalla de inicio?
            </h3>

            <div
              style={{
                background: "#f5f5f7",
                border: "1px solid #e5e5ea",
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px 0", color: "#1d1d1f" }}>
                En iPhone / iPad (Safari):
              </p>
              <ol style={{ fontSize: 12, color: "#6e6e73", margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                <li>Abre el enlace en Safari desde el código QR.</li>
                <li>Toca el botón **Compartir** (icono cuadrado con flecha).</li>
                <li>Selecciona **&quot;Agregar al inicio&quot;** (Add to Home Screen).</li>
              </ol>
            </div>

            <div
              style={{
                background: "#f5f5f7",
                border: "1px solid #e5e5ea",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px 0", color: "#1d1d1f" }}>
                En Android (Chrome):
              </p>
              <ol style={{ fontSize: 12, color: "#6e6e73", margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                <li>Abre la página en Google Chrome.</li>
                <li>Toca los tres puntos de menú (⋮) en la esquina superior.</li>
                <li>Elige **&quot;Instalar aplicación&quot;** o **&quot;Agregar a inicio&quot;**.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
