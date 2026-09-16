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
            Ya completaste los 4 pasos: tu plataforma está activa. Esta pantalla ya no se necesita —
            usa la barra de abajo o el menú principal para ir a cualquier sección.
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
          <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "#1d1d1f", fontWeight: 600 }}>
            ✓ Configuración inicial completa.
          </p>
          <Link
            href="/dashboard/oportunidades"
            style={{
              background: "#1d1d1f",
              color: "#fff",
              textDecoration: "none",
              padding: "10px 18px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Ir a Crear Oportunidades SEO →
          </Link>
        </div>
      ) : (
        <div>
          <OnboardingWizard variant="standalone" />
        </div>
      )}
    </div>
  );
}
