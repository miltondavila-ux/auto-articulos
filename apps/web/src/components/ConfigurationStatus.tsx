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
  platform: { label: "Cuenta & Plataforma" },
  seo: { label: "SEO & Indexación" },
  social: { label: "Redes Sociales" },
  content: { label: "Contenido" },
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

  useEffect(() => {
    loadStatus();
  }, [pathname]);

  if (loading || !data) return null;

  const { checks, summary } = data;

  if (summary.percentage === 100) {
    return (
      <details
        className="row"
        style={{
          background: "#ffffff",
          border: "1px solid #e5e5ea",
          borderRadius: 14,
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
            fontWeight: 500,
            color: "#16803c",
            display: "flex",
            alignItems: "center",
            gap: 8,
            listStyle: "none",
          }}
        >
          <span>✓</span>
          Plataforma configurada al 100% —{" "}
          <span className="muted" style={{ fontWeight: 400 }}>
            ver detalles
          </span>
        </summary>
        <div style={{ padding: "0 16px 16px" }}>
          <ConfiguredGrid checks={checks} />
        </div>
      </details>
    );
  }

  const pendingRequired = checks.filter((c) => c.required && !c.configured);
  const pendingOptional = checks.filter((c) => !c.required && !c.configured);

  return (
    <div
      className="row"
      style={{
        background: "#ffffff",
        border: "1px solid #e5e5ea",
        borderRadius: 14,
        marginTop: 15,
        marginBottom: 5,
        overflow: "hidden",
      }}
    >
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
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#1d1d1f",
              }}
            >
              {pendingRequired.length > 0
                ? `${pendingRequired.length} configuración${pendingRequired.length > 1 ? "es" : ""} pendiente${pendingRequired.length > 1 ? "s" : ""}`
                : `${pendingOptional.length} opción${pendingOptional.length > 1 ? "es" : ""} adicional${pendingOptional.length > 1 ? "es" : ""}`}
            </div>
            <div
              className="muted"
              style={{
                fontSize: 12,
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
              height: 4,
              background: "rgba(0,0,0,0.06)",
              borderRadius: 999,
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: `${summary.percentage}%`,
                height: "100%",
                background: "#0071e3",
                borderRadius: 999,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
        <span
          className="muted"
          style={{
            fontSize: 11,
            transition: "transform 0.2s",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▼
        </span>
      </div>

      {expanded && (
        <div
          style={{
            padding: "0 16px 16px",
            borderTop: "1px solid #e5e5ea",
          }}
        >
          {pendingRequired.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                Obligatorio para publicar
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {pendingRequired.map((check) => (
                  <CheckRow key={check.id} check={check} />
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
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
                        color: "#1d1d1f",
                        marginBottom: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {meta.label}
                      <span className="muted" style={{ fontSize: 11, fontWeight: 400 }}>
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
        borderRadius: 8,
        background: check.configured ? "#ffffff" : "#f5f5f7",
        border: "1px solid #e5e5ea",
        fontSize: 13,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
        <span style={{ fontSize: 12, flexShrink: 0, color: check.configured ? "#16803c" : "#86868b" }}>
          {check.configured ? "✓" : "○"}
        </span>
        <div>
          <div
            style={{
              fontWeight: 500,
              color: check.configured ? "#16803c" : "#1d1d1f",
            }}
          >
            {check.label}
          </div>
          {!check.configured && (
            <div className="muted" style={{ fontSize: 11, marginTop: 1 }}>
              {check.description}
            </div>
          )}
        </div>
      </div>
      {!check.configured && (
        <Link
          href={check.actionUrl}
          className="link-button"
          style={{
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {check.actionLabel} &rarr;
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
              color: "#16803c",
            }}
          >
            <span>✓</span>
            <span>{check.label}</span>
          </div>
        ))}
    </div>
  );
}