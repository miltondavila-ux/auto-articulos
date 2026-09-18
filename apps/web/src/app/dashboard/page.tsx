"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import ModuleIntro, { IntroP, Modulo } from "@/components/ModuleIntro";
import Link from "next/link";
import { Card, Grid, Text } from "@tremor/react";
import type { RunRow } from "@/types/dashboard";
import PerformanceDashboard from "@/components/PerformanceDashboard";
import OnboardingWizard from "@/components/OnboardingWizard";
import { trialDaysRemaining } from "@/lib/trial";

interface PublishedNotification {
  id: string;
  text: string;
  url: string | null;
}

interface ConfigurationAlert {
  id: string;
  label: string;
  actionUrl: string;
  actionLabel: string;
}

const QUICK_LINKS = [
  {
    href: "/dashboard/como-funciona",
    label: "Cómo funciona esta aplicación",
    description: "Conoce cómo SEO TOTAL te ayuda a crear, publicar y distribuir contenido.",
  },
  {
    href: "/dashboard/publicar",
    label: "Publica tus propios títulos",
    description: "Escribe tus títulos y publícalos directamente en tu página web.",
  },
  {
    href: "/dashboard/oportunidades",
    label: "Publica contenido con ayuda de la IA avanzada",
    description: "SEO TOTAL analiza Google, Bing, Analytics y otros datos para encontrar temas con posibilidades reales y ayudarte a crear artículos para tu página web.",
  },
  {
    href: "/dashboard/oportunidades-redes",
    label: "Difunde tus artículos en blogs externos y redes sociales",
    description: "Lleva tus artículos ya publicados a microblogs, blogs externos y redes sociales en lote, y crea tu avatar de autoridad en internet.",
  },
];

export default function InicioPage() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [notifications, setNotifications] = useState<PublishedNotification[]>(
    [],
  );
  // Banner de días restantes de prueba gratuita: se calcula del lado del
  // servidor (trialStartedAt) y se muestra durante todo el período, no solo
  // al crear la cuenta. Desaparece solo cuando el trial termina de verdad,
  // no con un botón de cerrar (pedido explícito de Milton, 16/9/2026).
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [configurationAlerts, setConfigurationAlerts] = useState<ConfigurationAlert[]>([]);
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

  const knownTitleStatusRef = useRef<Map<string, string>>(new Map());
  const initializedRef = useRef(false);

  const activeRun = runs.find(
    (r) => r.status === "pending" || r.status === "running",
  );

  const loadRuns = useCallback(async () => {
    const res = await fetch("/api/runs");
    if (res.ok) {
      const data = await res.json();
      const newRuns: RunRow[] = data.runs;

      if (initializedRef.current) {
        const newlyPublished: PublishedNotification[] = [];
        for (const run of newRuns) {
          for (const title of run.titles) {
            const prevStatus = knownTitleStatusRef.current.get(title.id);
            if (title.status === "success" && prevStatus !== "success") {
              newlyPublished.push({
                id: title.id,
                text: title.text,
                url: title.articleUrl,
              });
            }
          }
        }
        if (newlyPublished.length > 0) {
          setNotifications((prev) => [...newlyPublished, ...prev].slice(0, 10));
        }
      } else {
        initializedRef.current = true;
      }

      for (const run of newRuns) {
        for (const title of run.titles) {
          knownTitleStatusRef.current.set(title.id, title.status);
        }
      }

      setRuns(newRuns);
    }
  }, []);

  function dismissNotification(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  useEffect(() => {
    if (!activeRun) return;
    // 4s en vez de 2s: reduce a la mitad el volumen de polling (ver también
    // el recorte de eventos en /api/runs) para no agotar la cuota gratuita
    // de transferencia de datos de Neon.
    const interval = setInterval(loadRuns, 4000);
    return () => clearInterval(interval);
  }, [activeRun, loadRuns]);

  // La cuenta que arrancó incompleta se queda viendo el wizard aunque termine
  // el Paso 4 en esta misma visita, para que le dé tiempo a ver la pantalla
  // de "¡Felicitaciones!" (Paso 5) del propio wizard, en vez de que la
  // sección desaparezca de golpe al instante en que se cumple el último
  // paso (pedido de Milton, 16/9/2026 — así se veía al conectar GSC). En la
  // siguiente visita, ya completada, entra directo al panel de métricas.
  const everIncompleteRef = useRef(false);
  const [showWizard, setShowWizard] = useState<boolean | null>(null);

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
      const complete = step1 && step2 && step3 && step4;

      const alertIds = new Set([
        "google-analytics",
        "bing-webmaster",
        "geolocation",
        "signature",
        "excluded-topics",
      ]);
      const pendingAlerts = Array.isArray(configurationData?.checks)
        ? configurationData.checks.filter(
            (check: ConfigurationAlert & { configured: boolean }) =>
              alertIds.has(check.id) && !check.configured,
          )
        : [];
      setConfigurationAlerts(pendingAlerts);

      if (!complete) everIncompleteRef.current = true;
      setShowWizard(everIncompleteRef.current ? true : !complete);

      if (meData.isTrialSignup && !meData.trialUnlocked && meData.trialStartedAt) {
        setTrialDaysLeft(trialDaysRemaining(new Date(meData.trialStartedAt)));
      } else {
        setTrialDaysLeft(null);
      }
    } catch {
      everIncompleteRef.current = true;
      setShowWizard(true);
    }
  }, []);

  useEffect(() => {
    checkWizardStatus();
  }, [checkWizardStatus]);

  return (
    <div>
      {trialDaysLeft !== null && trialDaysLeft > 0 && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(0, 75, 153, 0.9) 100%)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            color: "#fff",
            borderRadius: 16,
            padding: "clamp(14px, 4vw, 20px) clamp(16px, 5vw, 24px)",
            marginTop: 4,
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            boxShadow: "none",
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>
              {trialDaysLeft === 1
                ? "¡Bienvenido! Te queda 1 día de prueba gratuita."
                : `¡Bienvenido! Te quedan ${trialDaysLeft} días de prueba gratuita.`}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.9 }}>
              Explora todo el sistema sin restricciones durante este período.
            </p>
          </div>
        </div>
      )}
      <ModuleIntro titulo="Inicio">
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
            <IntroP>
              Esta es tu pantalla de control. Aquí ves de un vistazo cómo va tu cuenta: cuántos artículos se han publicado hoy y este mes, cuánto te queda de tu límite y el ritmo que llevas.
            </IntroP>
            <IntroP>
              Si no sabes por dónde empezar, <Modulo id="como-funciona" /> lo explica entero en tres pasos.
            </IntroP>
            <IntroP>
          Justo abajo tienes 4 botones: elige el que corresponda a lo que quieres hacer ahora.
            </IntroP>
          </>
        )}
        {configurationAlerts.length > 0 && (
          <p style={{ margin: "14px 0 0", fontSize: 14, lineHeight: 1.55, color: "#1d1d1f" }}>
            <strong>ALERTAS:</strong>{" "}
            Para aprovechar mejor SEO TOTAL, todavía puedes completar estos ajustes:{" "}
            {configurationAlerts.map((alert, index) => (
              <span key={alert.id}>
                {index > 0 && (index === configurationAlerts.length - 1 ? " y " : ", ")}
                <Link href={alert.actionUrl} style={{ color: "#0066cc", fontWeight: 600 }}>
                  {alert.label}
                </Link>
              </span>
            ))}
            .
          </p>
        )}
      </ModuleIntro>
      {showWizard === false && (
        <Grid numItemsSm={2} numItemsLg={4} className="gap-4" style={{ marginTop: 20, marginBottom: 20 }}>
          {QUICK_LINKS.map((l, i) => (
            <Link key={l.href} href={l.href} style={{ textDecoration: "none" }}>
              <Card style={{ height: 205, boxSizing: "border-box" }}>
                <Text>{String(i + 1).padStart(2, "0")}</Text>
                <p style={{ marginTop: 8, fontSize: 15, fontWeight: 600, color: "#1d1d1f", lineHeight: 1.4 }}>
                  {l.label}
                </p>
                <p style={{ margin: "8px 0 0", fontSize: 12, lineHeight: 1.45, color: "#6e6e73" }}>
                  {l.description}
                </p>
              </Card>
            </Link>
          ))}
        </Grid>
      )}
      {notifications.length > 0 && (
        <div
          style={{
            marginTop: 20,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(6px, 1.5vw, 8px)",
          }}
        >
          {notifications.map((n) => (
            <div
              key={n.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderRadius: 12,
                background: "#f2faf4",
                border: "1px solid rgba(52, 199, 89, 0.3)",
                fontSize: 13,
                boxShadow: "none",
              }}
            >
              <span style={{ color: "#16803c" }}>
                ✓ Artículo publicado: <strong style={{ color: "#1d1d1f" }}>{n.text}</strong>
                {n.url && (
                  <>
                    {" — "}
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#0066cc", textDecoration: "underline" }}
                    >
                      Ver artículo
                    </a>
                  </>
                )}
              </span>
              <button
                onClick={() => dismissNotification(n.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#86868b",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {showWizard === true ? (
        <OnboardingWizard onUpdated={checkWizardStatus} />
      ) : showWizard === false ? (
        <PerformanceDashboard />
      ) : null}

      {activeRun && (
        <div
          style={{
            marginTop: 20,
            padding: "14px 18px",
            borderRadius: 12,
            background: "#f2faf4",
            border: "1px solid rgba(52, 199, 89, 0.3)",
            color: "#16803c",
            fontSize: 13,
            boxShadow: "none",
          }}
        >
          Hay una publicación en curso.{" "}
          <Link
            href="/dashboard/publicaciones-en-curso"
            style={{ color: "#0066cc", fontWeight: 600, textDecoration: "underline" }}
          >
            Ver progreso de las publicaciones
          </Link>
          .
        </div>
      )}
    </div>
  );
}
