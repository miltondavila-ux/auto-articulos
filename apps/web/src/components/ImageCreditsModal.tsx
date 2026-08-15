"use client";

import { useEffect } from "react";
import { buttonStyle, secondaryButtonStyle } from "./dashboard-ui";
import { platformHelpUrl, platformProductName } from "@auto-articulos/shared";

interface ImageCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Ver platform-servers.ts. Default "net" = comportamiento histórico.
  platformDomain?: string;
}

export default function ImageCreditsModal({
  isOpen,
  onClose,
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
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
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
          background: "#ffffff",
          borderRadius: 16,
          maxWidth: 480,
          width: "100%",
          padding: "28px 24px",
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          border: "1px solid #e2e8f0",
          textAlign: "center",
          animation: "fadeIn 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ícono llamativo */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#fef3c7",
            color: "#d97706",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            margin: "0 auto 16px auto",
          }}
        >
          🖼️
        </div>

        <h3
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#0f172a",
            marginBottom: 8,
          }}
        >
          Créditos de imagen agotados
        </h3>

        <p
          style={{
            fontSize: 14,
            color: "#475569",
            lineHeight: 1.5,
            marginBottom: 20,
          }}
        >
          Tu cuenta de <strong>{productName}</strong> no tiene créditos
          disponibles para generar las imágenes automáticas de tus artículos.
          <br />
          <br />
          {helpUrl ? (
            <>
              Puedes solicitar una recarga de <strong>créditos de imagen gratuitos</strong>{" "}
              en la página de ayuda de {productName}.
            </>
          ) : (
            <>
              Solicita una recarga de <strong>créditos de imagen gratuitos</strong>{" "}
              contactando al soporte de {productName}.
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
          {helpUrl && (
            <a
              href={helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...buttonStyle,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                textDecoration: "none",
                padding: "12px 18px",
                fontSize: 14,
                fontWeight: 600,
                background: "#2563eb",
                color: "#ffffff",
                borderRadius: 8,
              }}
            >
              <span>👉 Solicitar créditos de imagen gratuitos</span>
              <span style={{ fontSize: 16 }}>↗</span>
            </a>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              ...secondaryButtonStyle,
              padding: "10px 16px",
              fontSize: 13,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              color: "#475569",
              cursor: "pointer",
            }}
          >
            Entendido, ya lo reviso
          </button>
        </div>

        <p
          style={{
            fontSize: 12,
            color: "#94a3b8",
            marginTop: 16,
            marginBottom: 0,
          }}
        >
          Una vez que el soporte de {productName} te asigne más créditos, podrás continuar publicando con normalidad.
        </p>
      </div>
    </div>
  );
}
