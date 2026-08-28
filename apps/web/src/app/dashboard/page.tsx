"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import type { RunRow } from "@/types/dashboard";
import PerformanceDashboard from "@/components/PerformanceDashboard";
import OnboardingWizard from "@/components/OnboardingWizard";
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

  const [wizardComplete, setWizardComplete] = useState<boolean | null>(null);

  const checkWizardStatus = useCallback(async () => {
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

      setWizardComplete(step1 && step2 && step3 && step4);
    } catch {
      setWizardComplete(false);
    }
  }, []);

  useEffect(() => {
    checkWizardStatus();
  }, [checkWizardStatus]);

  return (
    <div>
      <ComienzaAqui />
      {showTrialWelcome && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(0, 113, 227, 0.9) 0%, rgba(0, 75, 153, 0.9) 100%)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            color: "#fff",
            borderRadius: 16,
            padding: "20px 24px",
            marginTop: 4,
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            boxShadow: "0 12px 32px rgba(0, 113, 227, 0.35)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>
              🎉 ¡Bienvenido! Tienes {TRIAL_DAYS} días de prueba gratuita.
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.9 }}>
              Explora todo el sistema sin restricciones durante este período.
            </p>
          </div>
          <button
            onClick={() => setShowTrialWelcome(false)}
            style={{
              background: "rgba(255, 255, 255, 0.18)",
              border: "1px solid rgba(255, 255, 255, 0.35)",
              borderRadius: 10,
              color: "#fff",
              padding: "8px 18px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)",
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
                padding: "12px 16px",
                borderRadius: 12,
                background: "#f2faf4",
                border: "1px solid rgba(52, 199, 89, 0.3)",
                fontSize: 13,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
              }}
            >
              <span style={{ color: "#1e8a4b" }}>
                ✓ Artículo publicado: <strong style={{ color: "#1d1d1f" }}>{n.text}</strong>
                {n.url && (
                  <>
                    {" — "}
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#0071e3", textDecoration: "underline" }}
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

      {wizardComplete === false ? (
        <OnboardingWizard onUpdated={checkWizardStatus} />
      ) : wizardComplete === true ? (
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
            color: "#1e8a4b",
            fontSize: 13,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
          }}
        >
          Hay una publicación en curso.{" "}
          <Link
            href="/dashboard/publicaciones-en-curso"
            style={{ color: "#0071e3", fontWeight: 600, textDecoration: "underline" }}
          >
            Ver progreso en Publicaciones en Curso
          </Link>
          .
        </div>
      )}
    </div>
  );
}

