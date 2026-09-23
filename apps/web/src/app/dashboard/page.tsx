"use client";

import { MENU_NAMES } from "@/lib/menu-names";
import { useEffect, useState, useCallback, useRef } from "react";
import ModuleIntro, { IntroP } from "@/components/ModuleIntro";
import Link from "next/link";
import OnboardingWizard from "@/components/OnboardingWizard";

const QUICK_LINKS = [
  {
    href: "/dashboard/publicar",
    label: MENU_NAMES.propios,
    description: "Crea artículos y publícalos en tu página web. Copia y pega títulos o utiliza nuestro motor de creación de títulos propios.",
  },
  {
    href: "/dashboard/oportunidades",
    label: MENU_NAMES.ia,
    description: "Deja que la IA cree contenido para tu blog y aumenta tus oportunidades de aparecer en las búsquedas.",
  },
  {
    href: "/dashboard/oportunidades-redes",
    label: MENU_NAMES.redes,
    description: "Crea con ayuda de la IA publicaciones automáticas para internet y difunde tu mensaje.",
  },
];

interface ConfigurationAlert {
  id: string;
  label: string;
  actionUrl: string;
}

export default function InicioPage() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("trial") === "1") {
      params.delete("trial");
      const next = params.toString();
      window.history.replaceState(
        {},
        "",
        window.location.pathname + (next ? `?${next}` : ""),
      );
    }
  }, []);

  // La cuenta que arrancó incompleta se queda viendo el wizard aunque termine
  // el Paso 4 en esta misma visita, para que le dé tiempo a ver la pantalla
  // de "¡Felicitaciones!" (Paso 5) del propio wizard, en vez de que la
  // sección desaparezca de golpe al instante en que se cumple el último
  // paso (pedido de Milton, 16/9/2026 — así se veía al conectar GSC). En la
  // siguiente visita, ya completada, entra directo al panel de métricas.
  const everIncompleteRef = useRef(false);
  const [showWizard, setShowWizard] = useState<boolean | null>(null);
  const [socialPublishingApproved, setSocialPublishingApproved] = useState(false);
  const [configurationAlerts, setConfigurationAlerts] = useState<ConfigurationAlert[]>([]);

  const checkWizardStatus = useCallback(async () => {
    try {
      const [credRes, catRes, meRes, googleRes, configurationRes] = await Promise.all([
        fetch("/api/credentials", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
        fetch("/api/me", { cache: "no-store" }),
        fetch("/api/search-integrations/google", { cache: "no-store" }),
        fetch("/api/configuration-status", { cache: "no-store" }),
      ]);

      const credData = credRes.ok ? await credRes.json() : {};
      const catData = catRes.ok ? await catRes.json() : {};
      const meData = meRes.ok ? await meRes.json() : {};
      const googleData = googleRes.ok ? await googleRes.json() : {};
      const configurationData = configurationRes.ok ? await configurationRes.json() : null;

      const step1 = Boolean(credData.configured);
      const step2 = Array.isArray(catData.categories) && catData.categories.length > 0;
      const step3 = typeof meData.contentLanguage === "string" && meData.contentLanguage.trim().length > 0;
      const step4 = Boolean(googleData.connected && googleData.siteUrl);
      setSocialPublishingApproved(Boolean(meData?.socialPublishingApproved));
      // Solo para el localhost de desarrollo: permite revisar la interfaz
      // posterior al wizard sin fingir una conexión OAuth real de Google.
      const complete = process.env.NEXT_PUBLIC_LOCAL_DEMO === "true"
        ? true
        : step1 && step2 && step3 && step4;

      if (!complete) everIncompleteRef.current = true;
      setShowWizard(everIncompleteRef.current ? true : !complete);
      const pendingAlerts = Array.isArray(configurationData?.checks)
        ? configurationData.checks.filter(
            (check: ConfigurationAlert & { configured: boolean }) =>
              check.id === "google-search-console-reconnect" && !check.configured,
          )
        : [];
      setConfigurationAlerts(pendingAlerts);
    } catch {
      everIncompleteRef.current = true;
      setShowWizard(true);
      setConfigurationAlerts([]);
    }
  }, []);

  useEffect(() => {
    checkWizardStatus();
  }, [checkWizardStatus]);

  return (
    <div>
      <style>{`@media (max-width: 700px) { .inicio-actions-grid { grid-template-columns: 1fr !important; } .dashboard-main:has(.inicio-actions-grid) .floating-assistant { display: none !important; } }`}</style>
      <ModuleIntro titulo="Inicio" showEyebrow={showWizard !== false} compact={showWizard === false}>
        {showWizard === true ? (
          <>
            <IntroP>
              Antes de que la plataforma pueda redactar y publicar por ti, necesitamos configurar 4 cosas, en este orden:
            </IntroP>
            <ol
              style={{
                margin: "10px 0 0",
                paddingLeft: 20,
                fontSize: 16,
                lineHeight: 1.55,
                color: "#1d1d1f",
              }}
            >
              <li>Conectar tu cuenta de 10minutesWebsite.</li>
              <li>Sincronizar las categorías de tu web.</li>
              <li>Elegir el idioma en el que se redactan los artículos.</li>
              <li>Conectar Google Search Console.</li>
            </ol>
            <IntroP>
              Complétalos en orden, uno por uno, más abajo. Cuando termines los 4, el resto de la plataforma se desbloquea.
            </IntroP>
          </>
        ) : (
          <>
            <IntroP>Elige una acción para comenzar.</IntroP>
          </>
        )}
      </ModuleIntro>
      {configurationAlerts.map((alert) => (
        <Link
          key={alert.id}
          href={alert.actionUrl}
          role="alert"
          style={{
            display: "block",
            margin: "18px 0 20px",
            padding: "16px 18px",
            border: "2px solid #d70015",
            borderRadius: 8,
            background: "#fff1f1",
            color: "#b00020",
            fontSize: 15,
            fontWeight: 800,
            lineHeight: 1.45,
            textDecoration: "none",
            overflowWrap: "anywhere",
          }}
        >
          SOLICITUD DE ACTUALIZACIÓN: Debes reconectar Google Search Console mediante Conexiones.
        </Link>
      ))}
      {showWizard === false && (
        <div style={{ marginTop: 20, marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 14px", fontSize: 22 }}>Acciones posibles</h2>
          <div className="inicio-actions-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
          {QUICK_LINKS.filter((link) => socialPublishingApproved || link.href !== "/dashboard/oportunidades-redes").map((l, i) => (
            (() => {
              return (
                <Link key={l.href} className="inicio-action-card" href={l.href} style={{ display: "flex", minHeight: 176, padding: 22, flexDirection: "column", justifyContent: "space-between", textDecoration: "none", color: "#1d1d1f", background: "#ffffff", border: "1px solid #d2d2d7", borderRadius: 6 }}>
              <div
                style={{
                  display: "flex", flexDirection: "column", height: "100%",
                }}
              >
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, lineHeight: 1.2, color: "#6e6e73", letterSpacing: "0.02em" }}>
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p style={{ marginTop: 20, fontSize: 18, fontWeight: 700, color: "#1d1d1f", lineHeight: 1.3, textTransform: "uppercase" }}>
                  {l.label}
                </p>
                <p style={{ margin: "10px 0 0", fontSize: 13, lineHeight: 1.5, color: "#6e6e73" }}>
                  {l.description}
                </p>
              </div>
                </Link>
              );
            })()
          ))}
          </div>
        </div>
      )}
      {showWizard === true ? (
        <OnboardingWizard onUpdated={checkWizardStatus} />
      ) : null}
    </div>
  );
}
