"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  buttonStyle,
  disabledStyle,
  h2Style,
  inputStyle,
  secondaryButtonStyle,
  sectionStyle,
} from "@/components/dashboard-ui";
import ImageCreditsModal from "@/components/ImageCreditsModal";
import { Modulo } from "@/components/ModuleIntro";
import PreValidationGuard from "@/components/PreValidationGuard";

interface OpportunityTitle {
  id: string;
  text: string;
  rationale: string | null;
}

interface OpportunityGroup {
  id: string;
  rationale: string | null;
  impressions: number;
  clicks: number;
  category: { id: string; name: string; panel: string };
  titles: OpportunityTitle[];
}

const DEFAULT_MAX_TITLES_PER_BATCH = 20;

// Botonera propia de esta pantalla. No se usa `buttonStyle` compartido porque
// su azul lleno domina la página; el lenguaje de Apple reserva el azul para
// enlaces y deja las acciones en grafito. Es local a propósito: cambiar el
// estilo compartido afectaría a toda la plataforma.
const pillPrimary: CSSProperties = {
  padding: "11px 22px",
  borderRadius: 980,
  border: "none",
  background: "#1d1d1f",
  color: "#ffffff",
  fontWeight: 500,
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "opacity 0.15s ease",
};

const pillSecondary: CSSProperties = {
  padding: "10px 20px",
  borderRadius: 980,
  border: "1px solid #d2d2d7",
  background: "#ffffff",
  color: "#1d1d1f",
  fontWeight: 500,
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const pillQuiet: CSSProperties = {
  ...pillSecondary,
  padding: "7px 15px",
  fontSize: 13,
  background: "#f5f5f7",
  border: "1px solid transparent",
};

const stepCardStyle: CSSProperties = {
  ...sectionStyle,
  padding: "clamp(18px, 3vw, 28px)",
  marginTop: 14,
};

/** Encabezado de paso: número en círculo, título y una línea de apoyo. */
function StepHeader({
  number,
  title,
  hint,
}: {
  number: number;
  title: string;
  hint: string;
}) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 16 }}>
      <div
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: 30,
          height: 30,
          borderRadius: 980,
          background: "#1d1d1f",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {number}
      </div>
      <div>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#86868b",
          }}
        >
          Paso {number}
        </p>
        <h2 style={{ ...h2Style, margin: "2px 0 0", fontSize: 21 }}>{title}</h2>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#6e6e73", lineHeight: 1.5 }}>
          {hint}
        </p>
      </div>
    </div>
  );
}

function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString("es-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OportunidadesPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<OpportunityGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisSeconds, setAnalysisSeconds] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [maxTitlesPerBatch, setMaxTitlesPerBatch] = useState(
    DEFAULT_MAX_TITLES_PER_BATCH,
  );
  const [lastAnalysisAt, setLastAnalysisAt] = useState<string | null>(null);
  const [disableIndexing, setDisableIndexing] = useState(false);
  // Idioma con el que se ejecutará lo que se publique desde aquí (mismo criterio
  // que en Publicar, pedido del usuario 7/8/2026). Arranca en el configurado del
  // usuario, así que quien no lo toque publica igual que antes.
  const [languages, setLanguages] = useState<
    { id: string; externalId: string; name: string }[]
  >([]);
  const [contentLanguage, setContentLanguage] = useState("");
  const [disclosureAcceptedAt, setDisclosureAcceptedAt] = useState<
    string | null | undefined
  >(undefined);
  const [acceptingDisclosure, setAcceptingDisclosure] = useState(false);
  const [message, setMessage] = useState<{
    kind: "error" | "info" | "success";
    text: string;
  } | null>(null);
  // Pedido explícito del usuario (11/8/2026): el enfriamiento de 3 días es
  // ahora solo una recomendación — si el último análisis no encontró nada
  // nuevo, se ofrece la opción de forzar un análisis nuevo bajo el propio
  // criterio del usuario, en vez de dejarlo bloqueado sin poder intentar.
  const [canForce, setCanForce] = useState(false);
  const [hasImageCredits, setHasImageCredits] = useState(true);
  const [showImageCreditsModal, setShowImageCreditsModal] = useState(false);
  // Pedido explícito del usuario (11/8/2026, cuenta de Lorena Álvarez, ya
  // conectada): el aviso "Necesitas tener Google conectado..." se mostraba
  // SIEMPRE, sin revisar nada — ni siquiera esta página consultaba el
  // estado real de la conexión. Ahora sí, y solo se muestra si de verdad
  // falta algo.
  const [setupStatus, setSetupStatus] = useState<{
    googleConnected: boolean;
    hasSiteUrl: boolean;
    hasCategories: boolean;
  } | null>(null);
  // Paneles reales de la cuenta (ver Category.panel), derivados de sus
  // categorías. [] en cuentas sin esta función — la enorme mayoría — y ahí
  // no se muestra ningún selector, comportamiento idéntico al de siempre.
  const [availablePanels, setAvailablePanels] = useState<string[]>([]);
  const [selectedPanel, setSelectedPanel] = useState("");
  // Para marca blanca (tagcrush): PreValidationGuard necesita el servidor
  // de la cuenta para no mostrar "10minutesWebsite" ni enlaces equivocados.
  const [platformDomain, setPlatformDomain] = useState<string>("net");
  const [prompts, setPrompts] = useState<{ id: string; name: string; prompt: string }[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState("");

  const load = useCallback(async () => {
    const [
      opportunitiesResponse,
      meResponse,
      languagesResponse,
      googleResponse,
      categoriesResponse,
      promptsResponse,
    ] = await Promise.all([
      fetch("/api/opportunities", { cache: "no-store" }),
      fetch("/api/me", { cache: "no-store" }),
      fetch("/api/languages", { cache: "no-store" }),
      fetch("/api/search-integrations/google", { cache: "no-store" }),
      fetch("/api/categories", { cache: "no-store" }),
      fetch("/api/prompts", { cache: "no-store" }),
    ]);
    const data = await opportunitiesResponse.json().catch(() => ({}));
    if (opportunitiesResponse.ok) {
      setGroups(data.groups ?? []);
      setLastAnalysisAt(data.lastAnalysisAt ?? null);
      if (data.noNewOpportunities) {
        const nextDate = data.nextAvailableAt
          ? formatDateTime(data.nextAvailableAt)
          : null;
        setMessage({
          kind: "info",
          text: `Con la información actual de Search Console no encontramos nuevas oportunidades para publicar. Te recomendamos esperar al menos 3 días antes de repetir el análisis${nextDate ? ` (podrás volver a intentarlo a partir del ${nextDate})` : ""}, para darle tiempo a Google de reflejar cambios en tus datos. Si prefieres, puedes intentarlo de todas formas ahora mismo.`,
        });
        if (data.canForce) setCanForce(true);
      } else {
        setMessage(null);
        setCanForce(false);
      }
    }
    if (meResponse.ok) {
      const me = await meResponse.json();
      if (
        typeof me.maxTitlesPerBatch === "number" &&
        me.maxTitlesPerBatch >= 1
      ) {
        setMaxTitlesPerBatch(me.maxTitlesPerBatch);
      }
      setDisclosureAcceptedAt(me.opportunitiesDisclosureAcceptedAt ?? null);
      if (typeof me.contentLanguage === "string") {
        setContentLanguage(me.contentLanguage);
      }
      if (typeof me.hasImageCredits === "boolean") {
        setHasImageCredits(me.hasImageCredits);
      }
      if (typeof me.defaultPromptId === "string" && me.defaultPromptId) {
        setSelectedPromptId(me.defaultPromptId);
      }
      if (typeof me.platformDomain === "string") {
        setPlatformDomain(me.platformDomain);
      }
    }
    if (promptsResponse.ok) {
      const promptsData = await promptsResponse.json().catch(() => ({}));
      setPrompts(promptsData.prompts ?? []);
    }
    if (languagesResponse.ok) {
      const langs = await languagesResponse.json().catch(() => ({}));
      setLanguages(langs.languages ?? []);
    }
    const google = await googleResponse.json().catch(() => ({}));
    const categoriesData = await categoriesResponse.json().catch(() => ({}));
    const allCategories: { panel?: string }[] = Array.isArray(
      categoriesData.categories,
    )
      ? categoriesData.categories
      : [];
    setSetupStatus({
      googleConnected: Boolean(google.connected),
      hasSiteUrl: Boolean(google.siteUrl),
      hasCategories: allCategories.length > 0,
    });
    const panels = Array.from(
      new Set(allCategories.map((c) => c.panel).filter((p): p is string => Boolean(p))),
    );
    setAvailablePanels(panels);
    setSelectedPanel((prev) => (prev && panels.includes(prev) ? prev : panels[0] ?? ""));
    setLoading(false);
  }, []);

  async function acceptDisclosure() {
    setAcceptingDisclosure(true);
    try {
      const response = await fetch("/api/opportunities/disclosure", {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setDisclosureAcceptedAt(data.opportunitiesDisclosureAcceptedAt);
      }
    } finally {
      setAcceptingDisclosure(false);
    }
  }

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!analyzing) return;
    setAnalysisSeconds(0);
    const timer = window.setInterval(
      () => setAnalysisSeconds((seconds) => seconds + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [analyzing]);

  const analysisStages = [
    "Consultando datos de Search Console",
    "Comparando impresiones y tendencias",
    "Creando oportunidades long tail",
    "Validando duplicados y canibalización",
  ];
  const currentStage = Math.min(
    analysisStages.length - 1,
    Math.floor(analysisSeconds / 7),
  );
  const analysisProgress = Math.min(92, 8 + analysisSeconds * 3);
  const elapsedTime = `${Math.floor(analysisSeconds / 60)}:${String(
    analysisSeconds % 60,
  ).padStart(2, "0")}`;

  async function analyze(force = false) {
    setAnalyzing(true);
    setMessage(null);
    setCanForce(false);
    try {
      const response = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force, panel: selectedPanel }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error ?? "No se pudo completar el análisis.");
      setGroups(data.groups ?? []);
      if (data.lastAnalysisAt) setLastAnalysisAt(data.lastAnalysisAt);
      if (data.noNewOpportunities) {
        const nextDate = data.nextAvailableAt
          ? formatDateTime(data.nextAvailableAt)
          : null;
        setMessage({
          kind: "info",
          text: force
            ? "Con la información actual de Search Console no encontramos nuevas oportunidades para publicar, ni siquiera forzando el análisis."
            : `Con la información actual de Search Console no encontramos nuevas oportunidades para publicar. Te recomendamos esperar al menos 3 días antes de repetir el análisis${nextDate ? ` (podrás volver a intentarlo a partir del ${nextDate})` : ""}, para darle tiempo a Google de reflejar cambios en tus datos. Si prefieres, puedes intentarlo de todas formas ahora mismo.`,
        });
        if (!force && data.canForce) setCanForce(true);
      } else {
        setMessage({
          kind: "success",
          text: "Análisis completado con datos de Search Console.",
        });
      }
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setAnalyzing(false);
    }
  }

  async function remove(kind: "groups" | "titles", id: string) {
    setBusyId(id);
    setMessage(null);
    const response = await fetch(`/api/opportunities/${kind}/${id}`, {
      method: "DELETE",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      setMessage({ kind: "error", text: data.error ?? "No se pudo eliminar." });
    await load();
    setBusyId(null);
  }

  async function executeAll() {
    if (!hasImageCredits) {
      setShowImageCreditsModal(true);
      return;
    }
    if (!contentLanguage.trim()) {
      setMessage({
        kind: "error",
        text: "Debes configurar tu idioma de redacción en Configuración antes de publicar.",
      });
      return;
    }
    setBusyId("__all__");
    setMessage(null);
    const response = await fetch("/api/opportunities/execute-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disableIndexing, contentLanguage, promptId: selectedPromptId || null }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data.code === "NO_IMAGE_CREDITS") {
        setShowImageCreditsModal(true);
      }
      setMessage({
        kind: "error",
        text: data.error ?? "No se pudo publicar todas las categorías.",
      });
      await load();
      setBusyId(null);
      return;
    }
    router.push("/dashboard/publicaciones-en-curso");
    router.refresh();
  }

  async function execute(type: "group" | "title", id: string) {
    if (!hasImageCredits) {
      setShowImageCreditsModal(true);
      return;
    }
    if (!contentLanguage.trim()) {
      setMessage({
        kind: "error",
        text: "Debes configurar tu idioma de redacción en Configuración antes de ejecutar.",
      });
      return;
    }
    setBusyId(id);
    setMessage(null);
    const response = await fetch("/api/opportunities/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, disableIndexing, contentLanguage, promptId: selectedPromptId || null }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data.code === "NO_IMAGE_CREDITS") {
        setShowImageCreditsModal(true);
      }
      setMessage({ kind: "error", text: data.error ?? "No se pudo ejecutar." });
      // Si el servidor dice que ya no existe, la lista en pantalla está
      // desactualizada (p. ej. otra pestaña ya la ejecutó/eliminó) —
      // refrescamos para que no se sigan reintentando datos fantasma.
      await load();
      setBusyId(null);
      return;
    }
    router.push("/dashboard/publicaciones-en-curso");
    router.refresh();
  }

  if (loading) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <section style={sectionStyle}>
          <div style={{ height: 26, width: 220, background: "rgba(0,0,0,0.06)", borderRadius: 6, marginBottom: 12 }} />
          <div style={{ height: 14, width: "85%", background: "rgba(0,0,0,0.04)", borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 14, width: "60%", background: "rgba(0,0,0,0.04)", borderRadius: 4, marginBottom: 20 }} />
          <div style={{ height: 42, width: 190, background: "rgba(0,0,0,0.06)", borderRadius: 11 }} />
        </section>
      </div>
    );
  }

  if (disclosureAcceptedAt === null) {
    return (
      <section style={sectionStyle}>
        <h2 style={h2Style}>Aviso importante sobre Oportunidades</h2>
        <p style={{ color: "#1d1d1f", fontSize: 14, lineHeight: 1.6 }}>
          Las oportunidades que vas a ver aquí son generadas mediante un
          algoritmo automatizado conectado a fuentes como Google Search
          Console y Bing, y los resultados son producidos con inteligencia
          artificial.
        </p>
        <p style={{ color: "#1d1d1f", fontSize: 14, lineHeight: 1.6 }}>
          Cada usuario es responsable de revisar el contenido y decidir si
          desea publicarlo o no. El administrador del programa no asume
          responsabilidad por las decisiones de publicación ni por los
          resultados derivados del uso de estas oportunidades.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={acceptDisclosure}
            disabled={acceptingDisclosure}
            style={disabledStyle(
              { ...buttonStyle, marginTop: 0 },
              acceptingDisclosure,
            )}
          >
            {acceptingDisclosure ? "Guardando..." : "Acepto y entiendo"}
          </button>
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <button
              type="button"
              style={{ ...secondaryButtonStyle, marginTop: 0 }}
            >
              Volver a Inicio
            </button>
          </Link>
        </div>
      </section>
    );
  }

  const activeLangName =
    languages.find((l) => l.externalId === contentLanguage)?.name ||
    (contentLanguage === "es" ? "Español" : contentLanguage === "en" ? "Inglés" : contentLanguage);

  return (
    <div>
      <PreValidationGuard
        type="oportunidades"
        credentialsConfigured={true}
        hasCategories={Boolean(setupStatus?.hasCategories)}
        hasLanguage={Boolean(contentLanguage && contentLanguage.trim().length > 0)}
        languageName={activeLangName}
        hasImageCredits={hasImageCredits}
        googleConnected={Boolean(setupStatus?.googleConnected)}
        hasGoogleSiteUrl={Boolean(setupStatus?.hasSiteUrl)}
        platformDomain={platformDomain}
        onOpenImageCreditsModal={() => setShowImageCreditsModal(true)}
      >
        {/* ------------------------------------------------------------------
            Introducción. Va primero y sin adornos: mucha gente llegaba aquí
            sin saber qué hace el módulo ni para qué le sirve.
        ------------------------------------------------------------------- */}
        <section style={{ ...stepCardStyle, marginTop: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#86868b",
            }}
          >
            Antes de avanzar, lee esto
          </p>
          <h1
            style={{
              margin: "8px 0 0",
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "#1d1d1f",
            }}
          >
            Oportunidades
          </h1>
          <div style={{ marginTop: 12 }}>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: "#1d1d1f" }}>
              Aquí el sistema te propone títulos de artículos. No se los
              inventa: los deduce de <strong>lo que Google ya te está
              mostrando</strong>. Tu Google Search Console guarda lo que
              escribió la gente en el buscador antes de llegar a tu página, y
              de ahí salen las propuestas: de búsquedas reales, hechas por
              personas reales que ya llegaron a tu sitio.
            </p>
            <p style={{ margin: "10px 0 0", fontSize: 16, lineHeight: 1.55, color: "#1d1d1f" }}>
              Con eso se arman títulos de <strong>cola larga</strong>. Suena
              técnico, pero es sencillo: en vez de pelear por una palabra corta
              y muy disputada como &ldquo;seguros&rdquo;, donde compites contra
              empresas enormes y no sales nunca, se apunta a la búsqueda larga y
              concreta que hace una persona con una duda real, del estilo
              &ldquo;cuánto cuesta un seguro dental para mayores de 60 en
              Miami&rdquo;.
            </p>
            <p style={{ margin: "10px 0 0", fontSize: 16, lineHeight: 1.55, color: "#1d1d1f" }}>
              Esas búsquedas las hace menos gente, pero casi nadie escribe sobre
              ellas, así que es mucho más fácil aparecer de primero. Y quien
              busca así ya sabe lo que quiere: llega más decidido. Juntas
              muchas búsquedas pequeñas y acabas sumando más visitas que con una
              grande, a la que de todos modos no ibas a llegar.
            </p>
            <p style={{ margin: "10px 0 0", fontSize: 16, lineHeight: 1.55, color: "#1d1d1f" }}>
              Cada artículo que se posiciona atrae visitas nuevas, y esas
              visitas le confirman a Google que tu sitio responde bien, lo que
              hace que el siguiente artículo lo tenga más fácil. Es un efecto
              bola de nieve: empieza pequeño y va creciendo solo.
            </p>
            <p style={{ margin: "10px 0 0", fontSize: 16, lineHeight: 1.55, color: "#1d1d1f" }}>
              Aquí el tema lo elige el sistema. Si prefieres decidirlo tú y
              escribir tus propios títulos, ese es <Modulo id="publicar" />.
            </p>
            <p style={{ margin: "10px 0 0", fontSize: 16, lineHeight: 1.55, color: "#6e6e73" }}>
              Son tres pasos. Pides el análisis, eliges cómo quieres que se
              escriban y revisas antes de publicar. Nada se publica sin que tú
              lo mandes; el avance se ve luego en{" "}
              <Modulo id="publicaciones-en-curso" />.
            </p>
          </div>
        </section>

        {/* ---------------------------- PASO 1 ---------------------------- */}
        <section style={stepCardStyle}>
          <StepHeader
            number={1}
            title="Pide el análisis"
            hint="El sistema revisa tu Google Search Console y propone títulos por categoría. Tarda unos minutos."
          />

          {availablePanels.length > 1 && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>
                ¿Para cuál sitio generar oportunidades?
                <select
                  value={selectedPanel}
                  onChange={(e) => setSelectedPanel(e.target.value)}
                  style={{ ...inputStyle, marginTop: 4, maxWidth: 260 }}
                >
                  {availablePanels.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => analyze()}
              disabled={analyzing}
              style={disabledStyle({ ...pillPrimary }, analyzing)}
            >
              {analyzing
                ? "Analizando Search Console..."
                : groups.length
                  ? "Actualizar análisis"
                  : "Analizar oportunidades"}
            </button>
            {lastAnalysisAt && (
              <span style={{ fontSize: 13, color: "#86868b" }}>
                Último análisis: {formatDateTime(lastAnalysisAt)}
              </span>
            )}
          </div>

          {analyzing && (
            <div
              role="status"
              aria-live="polite"
              style={{
                marginTop: 18,
                padding: 18,
                border: "1px solid #e5e5ea",
                borderRadius: 16,
                background: "#f5f5f7",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <strong style={{ fontSize: 14, color: "#1d1d1f", fontWeight: 600 }}>
                  {analysisStages[currentStage]}
                </strong>
                <span
                  style={{
                    minWidth: 52,
                    textAlign: "center",
                    padding: "4px 10px",
                    borderRadius: 980,
                    background: "#ffffff",
                    border: "1px solid #e5e5ea",
                    color: "#1d1d1f",
                    fontSize: 12,
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 600,
                  }}
                >
                  {elapsedTime}
                </span>
              </div>
              <div
                aria-hidden="true"
                style={{
                  height: 6,
                  borderRadius: 980,
                  background: "rgba(0, 0, 0, 0.08)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${analysisProgress}%`,
                    height: "100%",
                    borderRadius: 980,
                    background: "#1d1d1f",
                    transition: "width 1s linear",
                  }}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: 8,
                  marginTop: 14,
                }}
              >
                {analysisStages.map((stage, index) => (
                  <div
                    key={stage}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      color:
                        index < currentStage
                          ? "#1d1d1f"
                          : index === currentStage
                            ? "#1d1d1f"
                            : "#a1a1a6",
                      fontWeight: index === currentStage ? 600 : 400,
                    }}
                  >
                    <span aria-hidden="true">
                      {index < currentStage
                        ? "✓"
                        : index === currentStage
                          ? "●"
                          : "○"}
                    </span>
                    <span>{stage}</span>
                  </div>
                ))}
              </div>
              <p style={{ margin: "14px 0 0", color: "#86868b", fontSize: 12 }}>
                El tiempo depende de la cantidad de datos. No cierres esta página
                mientras termina el análisis.
              </p>
            </div>
          )}

          {setupStatus &&
            (!setupStatus.googleConnected ||
              !setupStatus.hasSiteUrl ||
              !setupStatus.hasCategories ||
              !contentLanguage) && (
              <div
                style={{
                  marginTop: 16,
                  padding: "14px 16px",
                  borderRadius: 14,
                  background: "#fff8f0",
                  border: "1px solid rgba(255, 149, 0, 0.25)",
                  color: "#8a4b08",
                  fontSize: 13,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <strong>Antes de analizar, te falta completar:</strong>
                <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
                  {(!setupStatus.googleConnected || !setupStatus.hasSiteUrl) && (
                    <li>
                      <Link
                        href="/dashboard/configuracion?tab=integrations#google"
                        style={{ color: "#0066cc", fontWeight: 600 }}
                      >
                        {!setupStatus.googleConnected
                          ? "Conectar Google Search Console"
                          : "Elegir propiedad de Search Console"}
                      </Link>
                    </li>
                  )}
                  {!setupStatus.hasCategories && (
                    <li>
                      <Link
                        href="/dashboard/configuracion?tab=platform#categories"
                        style={{ color: "#0066cc", fontWeight: 600 }}
                      >
                        Sincronizar tus categorías
                      </Link>
                    </li>
                  )}
                  {!contentLanguage && (
                    <li>
                      <Link
                        href="/dashboard/configuracion?tab=platform#language"
                        style={{ color: "#0066cc", fontWeight: 600 }}
                      >
                        Configurar tu idioma de redacción
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            )}

          {!hasImageCredits && (
            <div
              style={{
                marginTop: 16,
                padding: "14px 16px",
                borderRadius: 14,
                background: "#fff8f0",
                border: "1px solid rgba(255, 149, 0, 0.25)",
                color: "#8a4b08",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <span>Tu cuenta no tiene créditos de imagen disponibles.</span>
              <button
                type="button"
                onClick={() => setShowImageCreditsModal(true)}
                style={{ ...pillQuiet, background: "#ffffff", border: "1px solid rgba(255, 149, 0, 0.4)", color: "#8a4b08" }}
              >
                Solicitar créditos gratuitos
              </button>
            </div>
          )}
        </section>

        {/* ---------------------------- PASO 2 ---------------------------- */}
        <section style={stepCardStyle}>
          <StepHeader
            number={2}
            title="Elige cómo se escribirán"
            hint="Esto solo afecta a los artículos que publiques desde esta pantalla. No cambia tu configuración general."
          />

          <div style={{ display: "grid", gap: 18, maxWidth: 420 }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#1d1d1f",
                  marginBottom: 6,
                }}
              >
                Idioma de los artículos
              </label>
              <select
                value={contentLanguage}
                onChange={(e) => setContentLanguage(e.target.value)}
                disabled={languages.length === 0}
                style={{ ...inputStyle, width: "100%" }}
              >
                {languages.length === 0 ? (
                  <option value="">Sin idiomas sincronizados</option>
                ) : (
                  languages.map((l) => (
                    <option key={l.id} value={l.externalId}>
                      {l.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#1d1d1f",
                  marginBottom: 6,
                }}
              >
                Estilo de escritura
              </label>
              <select
                value={selectedPromptId}
                onChange={(e) => setSelectedPromptId(e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
              >
                <option value="">STANDARD (Estilo predeterminado de la plataforma)</option>
                {prompts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              fontSize: 14,
              color: "#1d1d1f",
              margin: "20px 0 0",
              maxWidth: 560,
              lineHeight: 1.5,
            }}
          >
            <input
              type="checkbox"
              checked={disableIndexing}
              onChange={(e) => setDisableIndexing(e.target.checked)}
              style={{ marginTop: 3 }}
            />
            <span>
              Desactivar indexación en buscadores al ejecutar
              <span style={{ display: "block", color: "#86868b", fontSize: 13 }}>
                Por defecto queda activada, igual que en la plataforma. Déjala
                así si quieres que Google encuentre estos artículos.
              </span>
            </span>
          </label>

          <p style={{ color: "#86868b", fontSize: 13, margin: "18px 0 0" }}>
            Tu máximo permitido es de {maxTitlesPerBatch} títulos por lote.
          </p>
        </section>

        {/* ---------------------------- PASO 3 ---------------------------- */}
        <section style={stepCardStyle}>
          <StepHeader
            number={3}
            title="Revisa y publica"
            hint="Lee los títulos propuestos. Puedes borrar los que no te convenzan y publicar solo lo que te guste."
          />

          {message && (
            <div
              style={{
                marginBottom: 18,
                padding: "14px 16px",
                borderRadius: 14,
                background:
                  message.kind === "error"
                    ? "#fff2f1"
                    : message.kind === "info"
                      ? "#f5f5f7"
                      : "#f2faf4",
                border:
                  message.kind === "error"
                    ? "1px solid rgba(255, 59, 48, 0.25)"
                    : message.kind === "info"
                      ? "1px solid #e5e5ea"
                      : "1px solid rgba(52, 199, 89, 0.25)",
                color:
                  message.kind === "error"
                    ? "#ff3b30"
                    : message.kind === "info"
                      ? "#6e6e73"
                      : "#16803c",
                fontSize: 14,
              }}
            >
              {message.text}
              {canForce && (
                <div style={{ marginTop: 12 }}>
                  <button
                    onClick={() => analyze(true)}
                    disabled={analyzing}
                    style={disabledStyle({ ...pillSecondary }, analyzing)}
                  >
                    Analizar de todas formas ahora
                  </button>
                </div>
              )}
            </div>
          )}

          {groups.length === 0 && (
            <p style={{ margin: 0, color: "#86868b", fontSize: 15, lineHeight: 1.6 }}>
              Todavía no hay propuestas. Vuelve al paso 1 y pide el primer
              análisis; cuando termine, los títulos aparecerán aquí.
            </p>
          )}

          {groups.length > 0 && (() => {
            const totalTitles = groups.reduce(
              (sum, g) => sum + g.titles.length,
              0,
            );
            const overLimit = totalTitles > maxTitlesPerBatch;
            const disabled = busyId !== null || overLimit || !contentLanguage;
            return (
              <div style={{ marginBottom: 24 }}>
                <button
                  onClick={executeAll}
                  disabled={disabled}
                  title={
                    !contentLanguage
                      ? "Debes configurar tu idioma de redacción en Configuración antes de publicar."
                      : overLimit
                        ? `Tienes ${totalTitles} títulos en ${groups.length} categorías, más de tu máximo de ${maxTitlesPerBatch} por lote.`
                        : undefined
                  }
                  style={disabledStyle({ ...pillPrimary }, disabled)}
                >
                  {busyId === "__all__"
                    ? "Publicando todas..."
                    : overLimit
                      ? `Supera el máximo (${totalTitles}/${maxTitlesPerBatch})`
                      : `Publicar todas las categorías (${totalTitles})`}
                </button>
                {overLimit && (
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "#ff3b30" }}>
                    Tienes {totalTitles} títulos en {groups.length} categorías,
                    más de tu máximo de {maxTitlesPerBatch} por lote. Publica
                    categoría por categoría, o elimina algunos títulos primero.
                  </p>
                )}
                {!contentLanguage && (
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "#ff3b30" }}>
                    Debes seleccionar un idioma de redacción en el paso 2 antes
                    de publicar.
                  </p>
                )}
              </div>
            );
          })()}

          <div style={{ display: "grid", gap: 16 }}>
            {groups.map((group) => (
              <div
                key={group.id}
                style={{
                  border: "1px solid #e5e5ea",
                  borderRadius: 18,
                  padding: 20,
                  background: "#ffffff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: "0 0 4px",
                        fontSize: 17,
                        fontWeight: 600,
                        letterSpacing: "-0.01em",
                        color: "#1d1d1f",
                      }}
                    >
                      {group.category.name}
                      {group.category.panel ? ` (${group.category.panel})` : ""}
                    </h3>
                    <p style={{ margin: 0, color: "#6e6e73", fontSize: 13, lineHeight: 1.5 }}>
                      {group.rationale}
                    </p>
                    <p style={{ color: "#86868b", fontSize: 12, marginTop: 6 }}>
                      {Math.round(group.impressions).toLocaleString("es-US")}{" "}
                      impresiones · {Math.round(group.clicks).toLocaleString("es-US")}{" "}
                      clics
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() => execute("group", group.id)}
                      disabled={
                        busyId !== null ||
                        group.titles.length > maxTitlesPerBatch ||
                        !contentLanguage
                      }
                      title={
                        !contentLanguage
                          ? "Debes configurar tu idioma de redacción en Configuración antes de ejecutar."
                          : group.titles.length > maxTitlesPerBatch
                            ? `Esta categoría supera tu máximo de ${maxTitlesPerBatch} títulos por lote.`
                            : undefined
                      }
                      style={disabledStyle(
                        { ...pillPrimary, padding: "9px 18px", fontSize: 13 },
                        busyId !== null ||
                          group.titles.length > maxTitlesPerBatch ||
                          !contentLanguage,
                      )}
                    >
                      {group.titles.length > maxTitlesPerBatch
                        ? `Supera el máximo (${group.titles.length}/${maxTitlesPerBatch})`
                        : `Publicar categoría (${group.titles.length})`}
                    </button>
                    <button
                      onClick={() => remove("groups", group.id)}
                      disabled={busyId !== null}
                      style={disabledStyle({ ...pillQuiet }, busyId !== null)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 18 }}>
                  {group.titles.map((title, index) => (
                    <div
                      key={title.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 16,
                        padding: "12px 14px",
                        borderRadius: 12,
                        background: "#f5f5f7",
                      }}
                    >
                      <div style={{ minWidth: 200, flex: "1 1 200px" }}>
                        <strong style={{ fontSize: 14, color: "#1d1d1f", fontWeight: 500 }}>
                          {index + 1}. {title.text}
                        </strong>
                        {title.rationale && (
                          <div style={{ color: "#86868b", fontSize: 12, marginTop: 3 }}>
                            {title.rationale}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <button
                          onClick={() => execute("title", title.id)}
                          disabled={busyId !== null || !contentLanguage}
                          title={
                            !contentLanguage
                              ? "Debes configurar tu idioma de redacción en Configuración antes de ejecutar."
                              : undefined
                          }
                          style={disabledStyle(
                            { ...pillQuiet, background: "#ffffff", border: "1px solid #d2d2d7" },
                            busyId !== null || !contentLanguage,
                          )}
                        >
                          Publicar
                        </button>
                        <button
                          onClick={() => remove("titles", title.id)}
                          disabled={busyId !== null}
                          style={disabledStyle(
                            { ...pillQuiet, color: "#ff3b30" },
                            busyId !== null,
                          )}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

      </PreValidationGuard>

      <ImageCreditsModal
        isOpen={showImageCreditsModal}
        onClose={() => setShowImageCreditsModal(false)}
        platformDomain={platformDomain}
      />
    </div>
  );
}
