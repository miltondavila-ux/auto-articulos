"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface ConfigurationCheck {
  id: string;
  label: string;
  configured: boolean;
  required: boolean;
  section: "platform" | "seo" | "social" | "content";
  description: string;
  actionUrl: string;
  actionLabel: string;
}

interface ConfigurationStatusResponse {
  checks: ConfigurationCheck[];
  summary: {
    requiredTotal: number;
    requiredConfigured: number;
    totalChecks: number;
    totalConfigured: number;
    isFullyConfigured: boolean;
    percentage: number;
  };
}

const SECTION_META = {
  platform: { label: "Cuenta & Plataforma", icon: "⚙️", color: "#2f5fdb" },
  seo: { label: "SEO & Indexación", icon: "🔍", color: "#8b5cf6" },
  social: { label: "Redes Sociales", icon: "📱", color: "#0ea5e9" },
  content: { label: "Contenido", icon: "✍️", color: "#f59e0b" },
} as const;

export default function ConfigurationStatus() {
  const [data, setData] = useState<ConfigurationStatusResponse | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/configuration-status");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Error loading configuration status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // Recargar cuando cambie la ruta (después de configurar algo)
  useEffect(() => {
    loadStatus();
  }, [pathname]);

  if (loading || !data) return null;

  const { checks, summary } = data;

  // Si todo está configurado, mostrar solo un banner verde colapsable
  if (summary.isFullyConfigured) {
    return (
      <details
        style={{
          background: "#f3fbf6",
          border: "1px solid #a8dfc0",
          borderRadius: 10,
          marginTop: 15,
          marginBottom: 5,
          overflow: "hidden",
        }}
      >
        <summary
          style={{
            padding: "12px 16px",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            color: "#1e8a4b",
            display: "flex",
            alignItems: "center",
            gap: 8,
            listStyle: "none",
          }}
        >
          <span style={{ fontSize: 16 }}>✅</span>
          Plataforma configurada al {summary.percentage}% —{" "}
          <span style={{ fontWeight: 400, color: "#6b7280" }}>
            haz clic para ver detalles
          </span>
        </summary>
        <div style={{ padding: "0 16px 16px" }}>
          <ConfiguredGrid checks={checks} />
        </div>
      </details>
    );
  }

  // Si faltan cosas, mostrar banner con progreso y checklist expandible
  const pendingRequired = checks.filter((c) => c.required && !c.configured);
  const pendingOptional = checks.filter((c) => !c.required && !c.configured);

  return (
    <div
      style={{
        background: pendingRequired.length > 0 ? "#fffbeb" : "#f0f9ff",
        border: pendingRequired.length > 0 ? "1px solid #fcd34d" : "1px solid #bae6fd",
        borderRadius: 10,
        marginTop: 15,
        marginBottom: 5,
        overflow: "hidden",
      }}
    >
      {/* Header always visible */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "12px 16px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <span style={{ fontSize: 16 }}>
            {pendingRequired.length > 0 ? "⚠️" : "📋"}
          </span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: pendingRequired.length > 0 ? "#92400e" : "#0c4a6e",
              }}
            >
              {pendingRequired.length > 0
                ? `Faltan ${pendingRequired.length} configuración${pendingRequired.length > 1 ? "es" : ""} obligatoria${pendingRequired.length > 1 ? "s" : ""}`
                : `${pendingOptional.length} configuración${pendingOptional.length > 1 ? "es" : ""} opcional${pendingOptional.length > 1 ? "es" : ""} disponible${pendingOptional.length > 1 ? "s" : ""}`}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
                marginTop: 2,
              }}
            >
              {summary.totalConfigured} de {summary.totalChecks} módulos activos ({summary.percentage}%)
            </div>
          </div>
          {/* Progress bar */}
          <div
            style={{
              width: 80,
              height: 6,
              background: "#e5e7eb",
              borderRadius: 3,
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: `${summary.percentage}%`,
                height: "100%",
                background: pendingRequired.length > 0 ? "#f59e0b" : "#10b981",
                borderRadius: 3,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
        <span
          style={{
            fontSize: 12,
            color: "#6b7280",
            transition: "transform 0.2s",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▼
        </span>
      </div>

      {/* Expanded checklist */}
      {expanded && (
        <div
          style={{
            padding: "0 16px 16px",
            borderTop: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          {/* Required items first */}
          {pendingRequired.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#92400e",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 8,
                }}
              >
                Obligatorio para publicar
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {pendingRequired.map((check) => (
                      <CheckRow key={check.id} check={check} />
                    ))}
              </div>
            </div>
          )}

          {/* All checks grouped by section */}
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 8,
              }}
            >
              Todos los módulos
            </div>
            {(["platform", "seo", "social", "content"] as const).map(
              (section) => {
                const sectionChecks = checks.filter((c) => c.section === section);
                if (sectionChecks.length === 0) return null;
                const meta = SECTION_META[section];
                const configuredCount = sectionChecks.filter(
                  (c) => c.configured,
                ).length;
                return (
                  <div key={section} style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: meta.color,
                        marginBottom: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span>{meta.icon}</span>
                      {meta.label}
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 400,
                          color: "#9ca3af",
                        }}
                      >
                        ({configuredCount}/{sectionChecks.length})
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {sectionChecks.map((check) => (
                        <CheckRow key={check.id} check={check} />
                      ))}
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CheckRow({ check }: { check: ConfigurationCheck }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 6,
        background: check.configured ? "#f3fbf6" : "#ffffff",
        border: check.configured
          ? "1px solid #d1fae5"
          : "1px solid #e5e7eb",
        fontSize: 13,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>
          {check.configured ? "✅" : check.required ? "🔴" : "⚪"}
        </span>
        <div>
          <div
            style={{
              fontWeight: 500,
              color: check.configured ? "#065f46" : "#16181d",
            }}
          >
            {check.label}
          </div>
          {!check.configured && (
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>
              {check.description}
            </div>
          )}
        </div>
      </div>
      {!check.configured && (
        <Link
          href={check.actionUrl}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#2f5fdb",
            textDecoration: "none",
            whiteSpace: "nowrap",
            padding: "4px 10px",
            borderRadius: 6,
            background: "#eef2ff",
            border: "1px solid #c7d2fe",
            transition: "background 0.15s",
            flexShrink: 0,
          }}
        >
          {check.actionLabel} →
        </Link>
      )}
    </div>
  );
}

function ConfiguredGrid({ checks }: { checks: ConfigurationCheck[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
      {checks
        .filter((c) => c.configured)
        .map((check) => (
          <div
            key={check.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "#065f46",
            }}
          >
            <span>✅</span>
            <span>{check.label}</span>
          </div>
        ))}
    </div>
  );
}