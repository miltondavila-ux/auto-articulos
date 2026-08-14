"use client";

import React from "react";
import Link from "next/link";
import {
  sectionStyle,
  buttonStyle,
} from "./dashboard-ui";

interface PreValidationGuardProps {
  type: "publicar" | "oportunidades";
  credentialsConfigured: boolean;
  hasCategories: boolean;
  categoriesCount?: number;
  hasLanguage: boolean;
  languageName?: string;
  hasImageCredits: boolean;
  googleConnected?: boolean;
  hasGoogleSiteUrl?: boolean;
  onOpenImageCreditsModal?: () => void;
  children: React.ReactNode;
}

export default function PreValidationGuard({
  type,
  credentialsConfigured,
  hasCategories,
  categoriesCount = 0,
  hasLanguage,
  languageName,
  hasImageCredits,
  googleConnected = false,
  hasGoogleSiteUrl = false,
  onOpenImageCreditsModal,
  children,
}: PreValidationGuardProps) {
  const isGoogleReady = googleConnected && hasGoogleSiteUrl;

  const isReady =
    type === "publicar"
      ? credentialsConfigured && hasCategories && hasLanguage && hasImageCredits
      : credentialsConfigured &&
        hasCategories &&
        hasLanguage &&
        isGoogleReady &&
        hasImageCredits;

  // Si todo está configurado, renderizamos el contenido normal sin alterar nada
  if (isReady) {
    return <>{children}</>;
  }

  // Si falta algo, identificamos el primer paso pendiente para dirigir al usuario
  let firstMissingStep = 1;
  let firstMissingName = "Conectar 10minutesWebsite";
  let firstMissingUrl = "/dashboard/configuracion?tab=wizard";

  if (!credentialsConfigured) {
    firstMissingStep = 1;
    firstMissingName = "Paso 1: Conectar 10minutesWebsite";
    firstMissingUrl = "/dashboard/configuracion?tab=wizard";
  } else if (!hasCategories) {
    firstMissingStep = 2;
    firstMissingName = "Paso 2: Sincronizar Categorías";
    firstMissingUrl = "/dashboard/configuracion?tab=wizard";
  } else if (!hasLanguage) {
    firstMissingStep = 3;
    firstMissingName = "Paso 3: Idioma de Redacción";
    firstMissingUrl = "/dashboard/configuracion?tab=wizard";
  } else if (type === "oportunidades" && !isGoogleReady) {
    firstMissingStep = 4;
    firstMissingName = "Paso 4: Google Search Console";
    firstMissingUrl = "/dashboard/configuracion?tab=wizard";
  } else if (!hasImageCredits) {
    firstMissingStep = 5;
    firstMissingName = "Solicitar créditos de imagen";
    firstMissingUrl = "https://www.10minuteswebsite.com/ayuda";
  }

  const steps = [
    {
      num: 1,
      title: "Cuenta de 10minutesWebsite",
      desc: "Tus credenciales para publicar artículos en tu sitio web.",
      ready: credentialsConfigured,
      readyText: "Conectada",
      missingText: "Falta conectar",
      actionUrl: "/dashboard/configuracion?tab=wizard",
      actionLabel: "Conectar cuenta",
    },
    {
      num: 2,
      title: "Categorías de artículos",
      desc: "Las categorías sincronizadas donde se clasificarán tus artículos.",
      ready: hasCategories,
      readyText: `${categoriesCount} categorías sincronizadas`,
      missingText: "Falta sincronizar categorías",
      actionUrl: "/dashboard/configuracion?tab=wizard",
      actionLabel: "Sincronizar ahora",
    },
    {
      num: 3,
      title: "Idioma de redacción",
      desc: "El idioma predeterminado en el que la IA escribirá tus artículos.",
      ready: hasLanguage,
      readyText: languageName ? `Configurado (${languageName})` : "Configurado",
      missingText: "Falta seleccionar idioma",
      actionUrl: "/dashboard/configuracion?tab=wizard",
      actionLabel: "Elegir idioma",
    },
    ...(type === "oportunidades"
      ? [
          {
            num: 4,
            title: "Google Search Console",
            desc: "Tu propiedad de Google conectada para detectar oportunidades de tráfico real.",
            ready: isGoogleReady,
            readyText: "Conectado y verificado",
            missingText: !googleConnected
              ? "Falta conectar Google"
              : "Falta seleccionar propiedad",
            actionUrl: "/dashboard/configuracion?tab=wizard",
            actionLabel: "Conectar Google Search Console",
          },
        ]
      : []),
    {
      num: type === "oportunidades" ? 5 : 4,
      title: "Créditos de imagen (10minutesWebsite)",
      desc: "Disponibilidad de créditos de generación de imágenes con IA.",
      ready: hasImageCredits,
      readyText: "Créditos disponibles",
      missingText: "Créditos agotados",
      isImageCredit: true,
      actionUrl: "https://www.10minuteswebsite.com/ayuda",
      actionLabel: "Solicitar créditos gratuitos",
    },
  ];

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", padding: "10px 0 30px" }}>
      <section
        style={{
          ...sectionStyle,
          padding: "28px 24px",
          borderRadius: 16,
          border: "1px solid #fed7aa",
          background: "linear-gradient(180deg, #fffaf5 0%, #ffffff 100%)",
          boxShadow: "0 10px 25px -5px rgba(234, 88, 12, 0.08)",
        }}
      >
        {/* Encabezado destacado */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#ffedd5",
              color: "#c2410c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              flexShrink: 0,
            }}
          >
            🛡️
          </div>
          <div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#9a3412",
                margin: "0 0 4px 0",
              }}
            >
              Configuración inicial requerida para {type === "publicar" ? "publicar artículos" : "explorar oportunidades"}
            </h2>
            <p style={{ fontSize: 14, color: "#7c2d12", margin: 0, lineHeight: 1.5 }}>
              Para asegurar que tus artículos se publiquen e indexen correctamente sin errores, el sistema valida que tengas listos estos pasos antes de continuar:
            </p>
          </div>
        </div>

        {/* Lista de pasos con checklist */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginBottom: 24,
          }}
        >
          {steps.map((step) => (
            <div
              key={step.num}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
                padding: "14px 16px",
                borderRadius: 10,
                background: step.ready ? "#f0fdf4" : "#fff7ed",
                border: `1px solid ${step.ready ? "#bbf7d0" : "#fed7aa"}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 260 }}>
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 13,
                    background: step.ready ? "#22c55e" : "#f97316",
                    color: "#ffffff",
                    flexShrink: 0,
                  }}
                >
                  {step.ready ? "✓" : step.num}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {step.desc}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: step.ready ? "#dcfce7" : "#ffedd5",
                    color: step.ready ? "#15803d" : "#c2410c",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {step.ready ? `✓ ${step.readyText}` : `⏳ ${step.missingText}`}
                </span>

                {!step.ready && (
                  step.isImageCredit ? (
                    <button
                      type="button"
                      onClick={onOpenImageCreditsModal}
                      style={{
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 6,
                        background: "#ea580c",
                        color: "#ffffff",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {step.actionLabel}
                    </button>
                  ) : (
                    <Link
                      href={step.actionUrl}
                      style={{
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 6,
                        background: "#2563eb",
                        color: "#ffffff",
                        textDecoration: "none",
                        display: "inline-block",
                      }}
                    >
                      {step.actionLabel} &rarr;
                    </Link>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Botón de llamada a la acción principal */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            padding: "16px 0 0",
            borderTop: "1px solid #fed7aa",
          }}
        >
          {firstMissingStep === 5 ? (
            <button
              type="button"
              onClick={onOpenImageCreditsModal}
              style={{
                ...buttonStyle,
                background: "#ea580c",
                color: "#ffffff",
                padding: "14px 28px",
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 10,
                boxShadow: "0 4px 12px rgba(234, 88, 12, 0.25)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                border: "none",
              }}
            >
              <span>🖼️ Solicitar créditos de imagen gratuitos</span>
              <span style={{ fontSize: 16 }}>&rarr;</span>
            </button>
          ) : (
            <Link
              href={firstMissingUrl}
              style={{
                ...buttonStyle,
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                color: "#ffffff",
                textDecoration: "none",
                padding: "14px 28px",
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 10,
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>🚀 Ir al Asistente de Configuración ({firstMissingName})</span>
              <span style={{ fontSize: 16 }}>&rarr;</span>
            </Link>
          )}

          <Link
            href="/dashboard/configuracion"
            style={{
              fontSize: 13,
              color: "#64748b",
              textDecoration: "underline",
            }}
          >
            O abrir el módulo de Configuración general
          </Link>
        </div>
      </section>
    </div>
  );
}
