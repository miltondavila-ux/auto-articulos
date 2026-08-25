"use client";

import { useEffect } from "react";
import { buttonStyle, secondaryButtonStyle } from "./dashboard-ui";
import { platformHelpUrl, platformProductName } from "@auto-articulos/shared";

interface ImageCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImageCredits?: () => void;
  platformDomain?: string;
}

export default function ImageCreditsModal({
  isOpen,
  onClose,
  onConfirmImageCredits,
  platformDomain = "net",
}: ImageCreditsModalProps) {
  const productName = platformProductName(platformDomain);
  const helpUrl = platformHelpUrl(platformDomain);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.2)",
        backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "rgba(255, 255, 255, 0.96)",
          borderRadius: 22,
          maxWidth: 440,
          width: "100%",
          padding: "30px 24px",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.15)",
          border: "1px solid rgba(0, 0, 0, 0.08)",
          textAlign: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="eyebrow" style={{ margin: "0 0 6px" }}>Atención</p>
        <h3
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: "#1d1d1f",
            margin: "0 0 10px 0",
            letterSpacing: "-0.025em",
          }}
        >
          Créditos de imagen agotados
        </h3>

        <p
          className="lead-copy"
          style={{
            fontSize: 14,
            color: "#6e6e73",
            lineHeight: 1.5,
            margin: "0 0 22px 0",
          }}
        >
          Tu cuenta de <strong>{productName}</strong> no tiene créditos
          disponibles para generar imágenes automáticas.
          <br />
          <br />
          {helpUrl ? (
            <>
              Puedes solicitar una recarga de créditos gratuitos en la página de ayuda de {productName}.
            </>
          ) : (
            <>
              Solicita una recarga de créditos gratuitos contactando al soporte de {productName}.
            </>
          )}
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {onConfirmImageCredits && (
            <button
              type="button"
              onClick={onConfirmImageCredits}
              className="secondary"
              style={{
                ...secondaryButtonStyle,
                padding: "10px 16px",
                fontSize: 13,
              }}
            >
              Ya recibí mis créditos
            </button>
          )}

          {helpUrl && (
            <a
              href={helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...buttonStyle,
                textDecoration: "none",
                padding: "12px 18px",
                fontSize: 14,
              }}
            >
              Solicitar créditos gratuitos &rarr;
            </a>
          )}

          <button
            type="button"
            onClick={onClose}
            className="secondary"
            style={{
              ...secondaryButtonStyle,
              padding: "10px 16px",
              fontSize: 13,
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
