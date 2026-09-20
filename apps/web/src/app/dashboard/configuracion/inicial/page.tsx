"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ModuleIntro, { IntroP } from "@/components/ModuleIntro";
import ConfiguracionSubNav from "@/components/ConfiguracionSubNav";
import OnboardingWizard from "@/components/OnboardingWizard";

/**
 * Página dedicada de "Configuración Inicial", parte del rediseño "RENEW
 * CONFIGURACION" (7/9/2026). Antes esto era solo una pestaña más dentro del
 * componente gigante `ConfiguracionView`, sin URL propia. `OnboardingWizard`
 * no cambió: es el mismo componente que ya se usaba, solo que ahora vive en
 * su propia pantalla en vez de compartir una con otras 5 secciones.
 *
 * Una vez que los 4 pasos ya están completos, esta pantalla deja de mostrar
 * el asistente entero (con su CTA final de "Paso 5") y muestra en su lugar
 * una confirmación corta: no tiene sentido que un usuario que ya terminó su
 * configuración siga viendo el wizard cada vez que entra aquí (pedido de
 * Milton, 16/9/2026).
 */
export default function ConfiguracionInicialPage() {
  const [wizardComplete, setWizardComplete] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const [credRes, catRes, meRes, googleRes] = await Promise.all([
          fetch("/api/credentials", { cache: "no-store" }),
          fetch("/api/categories", { cache: "no-store" }),
          fetch("/api/me", { cache: "no-store" }),
          fetch("/api/search-integrations/google", { cache: "no-store" }),
        ]);
        const credData = credRes.ok ? await credRes.json() : {};
        const catData = catRes.ok ? await catRes.json() : {};
        const meData = meRes.ok ? await meRes.json() : {};
        const googleData = googleRes.ok ? await googleRes.json() : {};
        const step1 = Boolean(credData.configured);
        const step2 = Array.isArray(catData.categories) && catData.categories.length > 0;
        const step3 = typeof meData.contentLanguage === "string" && meData.contentLanguage.trim().length > 0;
        const step4 = Boolean(googleData.connected && googleData.siteUrl);
        if (!cancelled) setWizardComplete(step1 && step2 && step3 && step4);
      } catch {
        if (!cancelled) setWizardComplete(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <ModuleIntro titulo="Configuración Inicial">
        {wizardComplete === true ? (
          <IntroP>
            Ya completaste los 4 pasos: tu plataforma está lista para publicar. Elige una de las dos
            formas de empezar.
          </IntroP>
        ) : (
          <>
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
          </>
        )}
      </ModuleIntro>
      <ConfiguracionSubNav />
      {wizardComplete === true ? (
        <div
          style={{
            marginTop: 20,
            padding: "18px 20px",
            borderRadius: 14,
            border: "1px solid #e5e5ea",
            background: "#ffffff",
          }}
        >
          <p style={{ margin: "0 0 8px 0", fontSize: 18, letterSpacing: "-0.02em", color: "#1d1d1f", fontWeight: 700 }}>
            ✓ Todo está listo para publicar.
          </p>
          <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#6e6e73", lineHeight: 1.5 }}>
            Puedes publicar colocando tus propios títulos o usando la IA avanzada para descubrir temas y preparar contenido.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <Link href="/dashboard/oportunidades" style={{ background: "#1d1d1f", color: "#fff", textDecoration: "none", padding: "14px 16px", borderRadius: 14, fontSize: 13, fontWeight: 700, boxShadow: "0 5px 12px rgba(0, 0, 0, 0.14)" }}>
              01 · Publicar con IA avanzada →
            </Link>
            <Link href="/dashboard/publicar" style={{ background: "#f5f5f7", color: "#1d1d1f", border: "1px solid rgba(60, 60, 67, 0.16)", textDecoration: "none", padding: "13px 16px", borderRadius: 14, fontSize: 13, fontWeight: 600 }}>
              02 · Publicar mis títulos
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <OnboardingWizard variant="standalone" />
        </div>
      )}
    </div>
  );
}
