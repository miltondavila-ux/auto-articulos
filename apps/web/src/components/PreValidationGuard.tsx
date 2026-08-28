"use client";

import React from "react";
import Link from "next/link";
import {
  sectionStyle,
  buttonStyle,
} from "./dashboard-ui";
import { platformProductName, platformHelpUrl } from "@auto-articulos/shared";

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
  platformDomain?: string;
  loading?: boolean;
  onOpenImageCreditsModal?: () => void;
  onConfirmImageCredits?: () => void;
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
  platformDomain = "net",
  loading = false,
  onOpenImageCreditsModal,
  onConfirmImageCredits,
  children,
}: PreValidationGuardProps) {
  const productName = platformProductName(platformDomain);
  const helpUrl = platformHelpUrl(platformDomain);
  const isGoogleReady = googleConnected && hasGoogleSiteUrl;

  if (loading) {
    return (
      <div style={{ maxWidth: 840, margin: "0 auto", padding: "10px 0 30px" }}>
        <section className="panel" style={{ ...sectionStyle, padding: 28 }}>
          <div style={{ height: 12, width: 140, background: "rgba(0,0,0,0.06)", borderRadius: 6, marginBottom: 12 }} />
          <div style={{ height: 24, width: 280, background: "rgba(0,0,0,0.06)", borderRadius: 6, marginBottom: 16 }} />
          <div style={{ height: 14, width: "70%", background: "rgba(0,0,0,0.04)", borderRadius: 4, marginBottom: 24 }} />
          <div style={{ display: "grid", gap: 10 }}>
            {[1, 2, 3].map((n) => (
              <div key={n} className="row" style={{ height: 56, background: "#ffffff", borderRadius: 12, border: "1px solid #e5e5ea" }} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  const isReady =
    type === "publicar"
      ? credentialsConfigured && hasCategories && hasLanguage && hasImageCredits
      : credentialsConfigured &&
        hasCategories &&
        hasLanguage &&
        isGoogleReady &&
        hasImageCredits;

  if (isReady) {
    return <>{children}</>;
  }

  let firstMissingName = `Paso 1: Conectar ${productName}`;
  let firstMissingUrl = "/dashboard/configuracion?tab=wizard";

  if (!credentialsConfigured) {
    firstMissingName = `Paso 1: Conectar ${productName}`;
    firstMissingUrl = "/dashboard/configuracion?tab=wizard";
  } else if (!hasCategories) {
    firstMissingName = "Paso 2: Sincronizar Categorías";
    firstMissingUrl = "/dashboard/configuracion?tab=wizard";
  } else if (!hasLanguage) {
    firstMissingName = "Paso 3: Idioma de Redacción";
    firstMissingUrl = "/dashboard/configuracion?tab=wizard";
  } else if (type === "oportunidades" && !isGoogleReady) {
    firstMissingName = "Paso 4: Google Search Console";
    firstMissingUrl = "/dashboard/configuracion?tab=wizard";
  } else if (!hasImageCredits) {
    firstMissingName = "Solicitar créditos de imagen";
    firstMissingUrl = helpUrl ?? "#";
  }

  const steps = [
    {
      num: 1,
      title: `Cuenta de ${productName}`,
      desc: "Tus credenciales para publicar artículos en tu sitio web.",
      ready: credentialsConfigured,
      readyText: "Conectada",
      missingText: "Falta conectar",
      actionUrl: "/dashboard/configuracion?tab=wizard",
      actionLabel: "Conectar",
    },
    {
      num: 2,
      title: "Categorías de artículos",
      desc: "Las categorías sincronizadas donde se clasificarán tus artículos.",
      ready: hasCategories,
      readyText: `${categoriesCount} categorías`,
      missingText: "Falta sincronizar",
      actionUrl: "/dashboard/configuracion?tab=wizard",
      actionLabel: "Sincronizar",
    },
    {
      num: 3,
      title: "Idioma de redacción",
      desc: "El idioma predeterminado en el que la IA escribirá tus artículos.",
      ready: hasLanguage,
      readyText: languageName ? `${languageName}` : "Configurado",
      missingText: "Falta seleccionar",
      actionUrl: "/dashboard/configuracion?tab=wizard",
      actionLabel: "Elegir idioma",
    },
    ...(type === "oportunidades"
      ? [
          {
            num: 4,
            title: "Google Search Console",
            desc: "Tu propiedad conectada para detectar oportunidades de tráfico real.",
            ready: isGoogleReady,
            readyText: "Conectado",
            missingText: !googleConnected
              ? "Falta conectar"
              : "Falta seleccionar propiedad",
            actionUrl: "/dashboard/configuracion?tab=wizard",
            actionLabel: "Conectar GSC",
          },
        ]
      : []),
    {
      num: type === "oportunidades" ? 5 : 4,
      title: `Créditos de imagen (${productName})`,
      desc: "Disponibilidad de créditos de generación de imágenes con IA.",
      ready: hasImageCredits,
      readyText: "Disponibles",
      missingText: "Agotados",
      isImageCredit: true,
      actionUrl: helpUrl ?? "#",
      actionLabel: "Solicitar créditos",
    },
  ];

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", padding: "10px 0 30px" }}>
      <section className="panel" style={{ ...sectionStyle, padding: 28 }}>
        <p className="eyebrow" style={{ margin: "0 0 6px" }}>Validación Previa</p>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "#1d1d1f",
            margin: "0 0 8px 0",
          }}
        >
          Requisitos previos para {type === "publicar" ? "publicar artículos" : "explorar oportunidades"}
        </h2>
        <p className="lead-copy" style={{ margin: "0 0 20px" }}>
          Para asegurar que tus artículos se procesen sin inconvenientes, completa estos pasos antes de continuar:
        </p>

        {/* Lista de pasos tipo fila Apple */}
        <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
          {steps.map((step) => (
            <div
              key={step.num}
              className="row"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
                padding: "14px 16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 240 }}>
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                    fontSize: 12,
                    background: step.ready ? "#e8f2ff" : "#f5f5f7",
                    color: step.ready ? "#0071e3" : "#6e6e73",
                    flexShrink: 0,
                  }}
                >
                  {step.ready ? "✓" : step.num}
                </span>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14, color: "#1d1d1f" }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#6e6e73", marginTop: 2 }}>
                    {step.desc}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: step.ready ? "rgba(52, 199, 89, 0.1)" : "#fff4e5",
                    color: step.ready ? "#16803c" : "#8a4b08",
                  }}
                >
                  {step.ready ? `✓ ${step.readyText}` : `Pendiente: ${step.missingText}`}
                </span>

                {!step.ready && (
                  step.isImageCredit ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {onConfirmImageCredits && (
                        <button
                          type="button"
                          onClick={onConfirmImageCredits}
                          className="secondary"
                          style={{ padding: "6px 12px", fontSize: 12, borderRadius: 8 }}
                        >
                          Ya recibí mis créditos
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={onOpenImageCreditsModal}
                        className="secondary"
                        style={{ padding: "6px 12px", fontSize: 12, borderRadius: 8 }}
                      >
                        {step.actionLabel}
                      </button>
                    </div>
                  ) : (
                    <Link
                      href={step.actionUrl}
                      className="link-button"
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
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

        {/* CTA Principal */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            paddingTop: 16,
            borderTop: "1px solid #e5e5ea",
          }}
        >
          {firstMissingName.includes("créditos") ? (
            <button
              type="button"
              onClick={onOpenImageCreditsModal}
              style={{
                ...buttonStyle,
                padding: "12px 24px",
                fontSize: 14,
              }}
            >
              Solicitar créditos de imagen
            </button>
          ) : (
            <Link
              href={firstMissingUrl}
              style={{
                ...buttonStyle,
                textDecoration: "none",
                padding: "12px 24px",
                fontSize: 14,
              }}
            >
              Ir a Configuración ({firstMissingName}) &rarr;
            </Link>
          )}

          <Link
            href="/dashboard/configuracion"
            className="link-button"
            style={{ fontSize: 13 }}
          >
            Abrir Configuración general
          </Link>
        </div>
      </section>
    </div>
  );
}
