import ModuleIntro, { IntroP } from "@/components/ModuleIntro";
import ConfiguracionSubNav from "@/components/ConfiguracionSubNav";
import GoogleSearchConsoleSection from "@/components/GoogleSearchConsoleSection";
import GoogleAnalyticsSection from "@/components/GoogleAnalyticsSection";
import BingWebmasterSection from "@/components/BingWebmasterSection";

/**
 * Página "Indexación y SEO", parte del rediseño "RENEW CONFIGURACION"
 * (7/9/2026). Antes era una pestaña más de `ConfiguracionView.tsx`; su
 * contenido ya era autocontenido (los tres componentes no reciben props ni
 * comparten estado con nada más), así que la extracción es directa: sin
 * cambios de lógica.
 */
export default function ConfiguracionIndexacionPage() {
  return (
    <div>
      <ModuleIntro titulo="Indexación y SEO">
        <IntroP>
          Aquí conectas las herramientas de Google y Bing que hacen que tus
          artículos aparezcan en las búsquedas: Google Search Console, Google
          Analytics y Bing Webmaster Tools.
        </IntroP>
        <ol style={{ margin: "12px 0 0", paddingLeft: 22, color: "#1d1d1f", fontSize: 14, lineHeight: 1.65 }}>
          <li><strong>Conecta Google Search Console:</strong> inicia sesión con la cuenta de Google que tiene tu web y elige tu sitio.</li>
          <li><strong>Conecta Google Analytics (opcional):</strong> para que el sistema use tus datos reales de visitas.</li>
          <li><strong>Conecta Bing Webmaster Tools (opcional):</strong> mismo proceso, para aparecer también en Bing.</li>
        </ol>
        <IntroP>
          No necesitas entender de SEO para usar esto: solo conecta tu cuenta
          de Google (y de Bing si la tienes) y el sistema se encarga del
          resto, avisándote aquí mismo si algo necesita tu atención.
        </IntroP>
      </ModuleIntro>
      <ConfiguracionSubNav />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div id="google">
          <GoogleSearchConsoleSection />
          <GoogleAnalyticsSection />
        </div>
        <div id="bing">
          <BingWebmasterSection />
        </div>
      </div>
    </div>
  );
}
