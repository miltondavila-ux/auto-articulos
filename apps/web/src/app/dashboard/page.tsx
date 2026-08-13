"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { sectionStyle, h2Style } from "@/components/dashboard-ui";
import type { RunRow } from "@/types/dashboard";
import PerformanceDashboard from "@/components/PerformanceDashboard";
import { TRIAL_DAYS } from "@/lib/trial";

interface PublishedNotification {
  id: string;
  text: string;
  url: string | null;
}

export default function InicioPage() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [notifications, setNotifications] = useState<PublishedNotification[]>(
    [],
  );
  const [credentialsConfigured, setCredentialsConfigured] = useState(false);
  const [categoriesCount, setCategoriesCount] = useState(0);
  // Banner grande de bienvenida a la prueba gratuita (pedido explícito del
  // usuario, 13/8/2026): /api/auth/trial-signup redirige acá con `?trial=1`
  // apenas se crea la cuenta. Se lee con window.location en vez de
  // useSearchParams() para no forzar un límite de Suspense en esta página.
  // Se borra el parámetro de la URL después de mostrarlo para que no
  // reaparezca con cada refresh.
  const [showTrialWelcome, setShowTrialWelcome] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("trial") === "1") {
      setShowTrialWelcome(true);
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
  const hasPublishedAny = runs.some((r) =>
    r.titles.some((t) => t.status === "success"),
  );

  useEffect(() => {
    (async () => {
      const [credRes, catRes] = await Promise.all([
        fetch("/api/credentials"),
        fetch("/api/categories"),
      ]);
      if (credRes.ok) {
        const data = await credRes.json();
        setCredentialsConfigured(Boolean(data.configured));
      }
      if (catRes.ok) {
        const data = await catRes.json();
        setCategoriesCount(data.categories?.length ?? 0);
      }
    })();
  }, []);

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

  return (
    <div>
      {showTrialWelcome && (
        <div
          style={{
            background: "linear-gradient(135deg, #2f5fdb 0%, #1b3f9e 100%)",
            color: "#fff",
            borderRadius: 12,
            padding: "20px 24px",
            marginTop: 4,
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            boxShadow: "0 8px 24px rgba(47, 95, 219, 0.35)",
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              🎉 ¡Bienvenido! Tienes {TRIAL_DAYS} días de prueba gratuita.
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.9 }}>
              Explora todo el sistema sin restricciones durante este período.
            </p>
          </div>
          <button
            onClick={() => setShowTrialWelcome(false)}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: 8,
              color: "#fff",
              padding: "8px 16px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Entendido
          </button>
        </div>
      )}
      {notifications.length > 0 && (
        <div
          style={{
            marginTop: 20,
            display: "flex",
            flexDirection: "column",
            gap: 8,
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
                padding: "10px 14px",
                borderRadius: 8,
                background: "#eafaf0",
                border: "1px solid #a8dfc0",
                fontSize: 13,
              }}
            >
              <span style={{ color: "#1e8a4b" }}>
                ✓ Artículo publicado: <strong>{n.text}</strong>
                {n.url && (
                  <>
                    {" — "}
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#2f5fdb" }}
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
                  color: "#6b7280",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <PerformanceDashboard />

      <OnboardingWizard
        credentialsConfigured={credentialsConfigured}
        categoriesConfigured={categoriesCount > 0}
        hasPublishedAny={hasPublishedAny}
      />

      {activeRun && (
        <div
          style={{
            marginTop: 20,
            padding: "12px 16px",
            borderRadius: 8,
            background: "#eafaf0",
            color: "#1e8a4b",
            fontSize: 13,
          }}
        >
          Hay una publicación en curso.{" "}
          <Link
            href="/dashboard/publicaciones-en-curso"
            style={{ color: "#2f5fdb" }}
          >
            Ver progreso en Publicaciones en Curso
          </Link>
          .
        </div>
      )}
    </div>
  );
}

function OnboardingWizard({
  credentialsConfigured,
  categoriesConfigured,
  hasPublishedAny,
}: {
  credentialsConfigured: boolean;
  categoriesConfigured: boolean;
  hasPublishedAny: boolean;
}) {
  const steps = [
    {
      done: credentialsConfigured,
      title: "Configura tu usuario y contraseña de 10minutesWebsite",
      description:
        "Son las credenciales con las que entras a 10minutesWebsite, no las de Auto Artículos.",
      href: "/dashboard/configuracion",
      cta: "Ir a Configuración",
    },
    {
      done: categoriesConfigured,
      title: "Conecta tus categorías",
      description:
        "Sincroniza las categorías reales de tu cuenta para poder elegir dónde publicar.",
      href: "/dashboard/configuracion",
      cta: "Ir a Configuración",
    },
    {
      done: hasPublishedAny,
      title: "Publica tu primer artículo",
      description:
        "Pega al menos un título y deja que Auto Artículos lo publique por ti.",
      href: "/dashboard/publicar",
      cta: "Ir a Publicar",
    },
  ];

  const allDone = steps.every((s) => s.done);

  if (allDone) {
    return (
      <details style={{ ...sectionStyle, padding: "12px 20px" }}>
        <summary
          style={{
            cursor: "pointer",
            fontSize: 13,
            color: "#031537",
            fontWeight: 600,
          }}
        >
          ✓ Ya completaste los primeros pasos — haz clic para revisarlos
        </summary>
        <div style={{ marginTop: 12 }}>
          <OnboardingSteps steps={steps} />
        </div>
      </details>
    );
  }

  return (
    <section style={sectionStyle}>
      <h2 style={h2Style}>¡Bienvenido a Auto Artículos! 👋</h2>
      <p style={{ fontSize: 13, color: "#6b7280", marginTop: -6 }}>
        Estos son los primeros pasos para dejar todo listo. Puedes volver a esta
        lista cuando quieras si te pierdes en el camino.
      </p>
      <OnboardingSteps steps={steps} />
    </section>
  );
}

function OnboardingSteps({
  steps,
}: {
  steps: {
    done: boolean;
    title: string;
    description: string;
    href: string;
    cta: string;
  }[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {steps.map((step, index) => (
        <div
          key={step.title}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "10px 14px",
            borderRadius: 8,
            background: step.done ? "#f3fbf6" : "#f7f8fa",
            border: step.done ? "1px solid #a8dfc0" : "1px solid #dfe3e8",
          }}
        >
          <span
            style={{
              fontSize: 18,
              lineHeight: "22px",
              flexShrink: 0,
            }}
          >
            {step.done ? "✅" : `${index + 1}.`}
          </span>
          <div style={{ flex: 1 }}>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 600,
                color: step.done ? "#031537" : "#16181d",
              }}
            >
              {step.title}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>
              {step.description}
            </p>
            {!step.done && (
              <Link
                href={step.href}
                style={{
                  display: "inline-block",
                  marginTop: 8,
                  fontSize: 12,
                  color: "#2f5fdb",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                {step.cta} →
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

