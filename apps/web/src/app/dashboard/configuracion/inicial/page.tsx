"use client";

import ModuleIntro, { IntroP } from "@/components/ModuleIntro";
import ConfiguracionSubNav from "@/components/ConfiguracionSubNav";
import OnboardingWizard from "@/components/OnboardingWizard";

/**
 * Página dedicada de "Configuración Inicial", parte del rediseño "RENEW
 * CONFIGURACION" (7/9/2026). Antes esto era solo una pestaña más dentro del
 * componente gigante `ConfiguracionView`, sin URL propia. `OnboardingWizard`
 * no cambió: es el mismo componente que ya se usaba, solo que ahora vive en
 * su propia pantalla en vez de compartir una con otras 5 secciones.
 */
export default function ConfiguracionInicialPage() {
  return (
    <div>
      <ModuleIntro titulo="Configuración Inicial">
        <IntroP>
          Este es el paso a paso para dejar tu cuenta lista: conectar tu
          usuario y contraseña, traer tus categorías, elegir el idioma y
          conectar Google Search Console.
        </IntroP>
        <IntroP>
          Si ya hiciste esto antes, no necesitas volver a pasar por aquí —
          usa la barra de abajo para ir directo a Cuenta o a cualquier otra
          sección.
        </IntroP>
      </ModuleIntro>
      <ConfiguracionSubNav />
      <div>
        <OnboardingWizard variant="standalone" />
      </div>
    </div>
  );
}
