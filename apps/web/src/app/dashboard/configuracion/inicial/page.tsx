"use client";

import Link from "next/link";
import ModuleIntro, { IntroP } from "@/components/ModuleIntro";
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
          puedes ir directo a{" "}
          <Link href="/dashboard/configuracion/cuenta" style={{ color: "#0066cc", fontWeight: 600 }}>
            Cuenta
          </Link>{" "}
          o a cualquier otra sección desde{" "}
          <Link href="/dashboard/configuracion" style={{ color: "#0066cc", fontWeight: 600 }}>
            Configuración
          </Link>
          .
        </IntroP>
      </ModuleIntro>
      <div style={{ marginTop: 16 }}>
        <OnboardingWizard variant="standalone" />
      </div>
    </div>
  );
}
