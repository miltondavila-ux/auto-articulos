"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { RunRow } from "@/types/dashboard";

/**
 * Pedido directo de Milton (29/8/2026): cuando 10minutesWebsite responde
 * "Insufficient credits" (créditos GENERALES de la app, no de la cuenta del
 * usuario), no basta con dejarlo en el log del título — debe aparecer un
 * popup que corte la atención, con un QR directo a WhatsApp para recargar.
 * No detiene nada del lado de Auto Artículos: el título ya queda en error y
 * el resto del lote sigue solo; esto es únicamente un aviso visual.
 */
const WHATSAPP_URL = "https://wa.link/ohi9ut";
const MARKER = "Sin créditos de imagen en 10minutesWebsite";
const DISMISSED_KEY = "auto-articulos-credits-alert-dismissed";

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage puede fallar (modo privado, cuota); el popup solo
    // volvería a aparecer, no es crítico.
  }
}

export default function CreditsQrAlert() {
  const [pendingTitleId, setPendingTitleId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const dismissedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    dismissedRef.current = loadDismissed();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/runs", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const runs: RunRow[] = data.runs ?? [];
        for (const run of runs) {
          for (const title of run.titles ?? []) {
            if (
              title.status === "error" &&
              typeof title.errorMessage === "string" &&
              title.errorMessage.startsWith(MARKER) &&
              !dismissedRef.current.has(title.id)
            ) {
              if (!cancelled) setPendingTitleId(title.id);
              return;
            }
          }
        }
      } catch {
        // Falla de red en el poll: se reintenta en el siguiente ciclo, no
        // hace falta mostrar nada por esto.
      }
    };

    poll();
    const interval = setInterval(poll, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!pendingTitleId) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(WHATSAPP_URL, { width: 220, margin: 1 })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(null));
  }, [pendingTitleId]);

  if (!pendingTitleId) return null;

  const handleDismiss = () => {
    const next = new Set(dismissedRef.current);
    next.add(pendingTitleId);
    dismissedRef.current = next;
    saveDismissed(next);
    setPendingTitleId(null);
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.55)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          padding: "28px 26px",
          maxWidth: 380,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            margin: "0 0 10px",
            color: "#1d1d1f",
          }}
        >
          Créditos de imagen agotados
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "#3a3a3c",
            lineHeight: 1.5,
            margin: "0 0 18px",
          }}
        >
          10minutesWebsite se quedó sin créditos generales para generar
          imágenes. Escanea con tu móvil.
        </p>
        {qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="Código QR para recargar créditos por WhatsApp"
            width={180}
            height={180}
            style={{ margin: "0 auto 14px", display: "block" }}
          />
        )}
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            fontSize: 13,
            color: "#0a84ff",
            marginBottom: 20,
            wordBreak: "break-all",
          }}
        >
          {WHATSAPP_URL}
        </a>
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            background: "#1d1d1f",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "10px 28px",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}
