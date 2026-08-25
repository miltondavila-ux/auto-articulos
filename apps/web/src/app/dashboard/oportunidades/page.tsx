"use client";

import { useCallback, useEffect, useState } from "react";
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

  const load = useCallback(async () => {
    const [
      opportunitiesResponse,
      meResponse,
      languagesResponse,
      googleResponse,
      categoriesResponse,
    ] = await Promise.all([
      fetch("/api/opportunities", { cache: "no-store" }),
      fetch("/api/me", { cache: "no-store" }),
      fetch("/api/languages", { cache: "no-store" }),
      fetch("/api/search-integrations/google", { cache: "no-store" }),
      fetch("/api/categories", { cache: "no-store" }),
    ]);
    const data = await opportunitiesResponse.json().catch(() => ({}));
    if (opportunitiesResponse.ok) {
      setGroups(data.groups ?? []);
      setLastAnalysisAt(data.lastAnalysisAt ?? null);
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
      if (typeof me.platformDomain === "string") {
        setPlatformDomain(me.platformDomain);
      }
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

  const confirmImageCredits = useCallback(() => {
    setHasImageCredits(true);
    setMessage({
      kind: "info",
      text: "Has indicado que ya recibiste créditos. Puedes intentar continuar; si aún no están activos, vuelve aquí y solicítalos.",
    });
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
      body: JSON.stringify({ disableIndexing, contentLanguage }),
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
      body: JSON.stringify({ type, id, disableIndexing, contentLanguage }),
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

  if (!loading && disclosureAcceptedAt === null) {
    return (
      <section style={sectionStyle}>
        <h2 style={h2Style}>Aviso importante sobre Oportunidades</h2>
        <p style={{ color: "#16181d", fontSize: 14, lineHeight: 1.6 }}>
          Las oportunidades que vas a ver aquí son generadas mediante un
          algoritmo automatizado conectado a fuentes como Google Search
          Console y Bing, y los resultados son producidos con inteligencia
          artificial.
        </p>
        <p style={{ color: "#16181d", fontSize: 14, lineHeight: 1.6 }}>
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
        <section style={sectionStyle}>
        <h2 style={h2Style}>Oportunidades SEO</h2>
        <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.55 }}>
          Analiza impresiones, tendencias, posiciones, consultas y páginas de tu
          propiedad de Google Search Console. El sistema selecciona hasta 10
          categorías y crea 9 oportunidades long tail únicas para cada una,
          evitando duplicados y canibalización.
        </p>
        {availablePanels.length > 1 && (
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
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
            gap: 12,
            flexWrap: "wrap",
            marginTop: 12,
          }}
        >
          <button
            onClick={() => analyze()}
            disabled={analyzing}
            style={disabledStyle({ ...buttonStyle, marginTop: 0 }, analyzing)}
          >
            {analyzing
              ? "Analizando Search Console..."
              : groups.length
                ? "Actualizar análisis"
                : "Analizar oportunidades"}
          </button>
          {lastAnalysisAt && (
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              Último análisis: {formatDateTime(lastAnalysisAt)}
            </span>
          )}
        </div>
        {analyzing && (
          <div
            role="status"
            aria-live="polite"
            style={{
              marginTop: 16,
              padding: 16,
              border: "1px solid #b8caf7",
              borderRadius: 10,
              background: "#f3f6ff",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <strong style={{ fontSize: 14, color: "#24458f" }}>
                {analysisStages[currentStage]}
              </strong>
              <span
                style={{
                  minWidth: 52,
                  textAlign: "center",
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: "#dfe8ff",
                  color: "#24458f",
                  fontSize: 12,
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 700,
                }}
              >
                {elapsedTime}
              </span>
            </div>
            <div
              aria-hidden="true"
              style={{
                height: 8,
                borderRadius: 999,
                background: "#dfe5f2",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${analysisProgress}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: "linear-gradient(90deg, #2f5fdb, #4dd8e8)",
                  transition: "width 1s linear",
                }}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: 8,
                marginTop: 12,
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
                        ? "#15803d"
                        : index === currentStage
                          ? "#24458f"
                          : "#8a97ab",
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
            <p style={{ margin: "12px 0 0", color: "#5e6b83", fontSize: 12 }}>
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
                marginTop: 12,
                padding: "10px 14px",
                borderRadius: 8,
                background: "#fef3c7",
                color: "#92400e",
                fontSize: 13,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <strong>Faltan configuraciones para aprovechar Oportunidades:</strong>
              <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
                {(!setupStatus.googleConnected || !setupStatus.hasSiteUrl) && (
                  <li>
                    <Link
                      href="/dashboard/configuracion?tab=integrations#google"
                      style={{ color: "#2563eb", fontWeight: 600 }}
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
                      style={{ color: "#2563eb", fontWeight: 600 }}
                    >
                      Sincronizar tus categorías
                    </Link>
                  </li>
                )}
                {!contentLanguage && (
                  <li>
                    <Link
                      href="/dashboard/configuracion?tab=platform#language"
                      style={{ color: "#2563eb", fontWeight: 600 }}
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
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 8,
              background: "#f5f5f7",
              border: "1px solid #e5e5ea",
              color: "#1d1d1f",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span>
              ⚠️ Tu cuenta de 10minutesWebsite no tiene créditos de imagen disponibles.
            </span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={confirmImageCredits}
                style={{
                  ...secondaryButtonStyle,
                  padding: "7px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              >
                Ya recibí mis créditos
              </button>
              <button
                type="button"
                onClick={() => setShowImageCreditsModal(true)}
                style={{
                  ...secondaryButtonStyle,
                  padding: "7px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              >
                Solicitar créditos gratuitos
              </button>
            </div>
          </div>
        )}
        <p style={{ color: "#6b7280", fontSize: 12 }}>
          Tu máximo permitido es de {maxTitlesPerBatch} títulos por lote.
        </p>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "#6b7280",
            margin: "10px 0 0",
          }}
        >
          <input
            type="checkbox"
            checked={disableIndexing}
            onChange={(e) => setDisableIndexing(e.target.checked)}
          />
          Desactivar indexación en buscadores al ejecutar (por defecto queda
          activada, como en 10minutesWebsite)
        </label>

        <div style={{ marginTop: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              color: "#6b7280",
              marginBottom: 6,
            }}
          >
            Idioma con el que se escribirán los artículos que ejecutes desde
            aquí. Solo aplica a lo que ejecutes ahora; no cambia tu
            configuración.
          </label>
          <select
            value={contentLanguage}
            onChange={(e) => setContentLanguage(e.target.value)}
            disabled={languages.length === 0}
            style={{ ...inputStyle, width: "100%", maxWidth: 320 }}
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

        {groups.length > 0 && (
          <div style={{ marginTop: 16 }}>
            {(() => {
              const totalTitles = groups.reduce(
                (sum, g) => sum + g.titles.length,
                0,
              );
              const overLimit = totalTitles > maxTitlesPerBatch;
              const disabled = busyId !== null || overLimit || !contentLanguage;
              return (
                <>
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
                    style={disabledStyle(
                      { ...buttonStyle, marginTop: 0 },
                      disabled,
                    )}
                  >
                    {busyId === "__all__"
                      ? "Publicando todas..."
                      : overLimit
                        ? `Supera el máximo (${totalTitles}/${maxTitlesPerBatch})`
                        : `Publicar todas las categorías (${totalTitles})`}
                  </button>
                  {overLimit && (
                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: 12,
                        color: "#d64545",
                      }}
                    >
                      Tienes {totalTitles} títulos en {groups.length}{" "}
                      categorías, más de tu máximo de {maxTitlesPerBatch} por
                      lote. Publica categoría por categoría, o elimina algunos
                      títulos primero.
                    </p>
                  )}
                  {!contentLanguage && (
                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: 12,
                        color: "#d64545",
                      }}
                    >
                      Debes seleccionar o configurar un idioma de redacción antes de publicar.
                    </p>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </section>

      {message && (
        <div
          style={{
            marginTop: 16,
            padding: "12px 16px",
            borderRadius: 12,
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
                  ? "1px solid rgba(0, 0, 0, 0.08)"
                  : "1px solid rgba(52, 199, 89, 0.25)",
            color:
              message.kind === "error"
                ? "#ff3b30"
                : message.kind === "info"
                  ? "#6e6e73"
                  : "#16803c",
            fontSize: 13,
          }}
        >
          {message.text}
          {canForce && (
            <div style={{ marginTop: 10 }}>
              <button
                onClick={() => analyze(true)}
                disabled={analyzing}
                className="secondary"
                style={{
                  fontSize: 13,
                  padding: "6px 14px",
                }}
              >
                Analizar de todas formas ahora
              </button>
            </div>
          )}
        </div>
      )}

      {loading && <p className="muted" style={{ marginTop: 20 }}>Cargando oportunidades...</p>}
      {!loading && groups.length === 0 && (
        <section style={sectionStyle}>
          <p className="muted" style={{ margin: 0 }}>
            Todavía no hay oportunidades guardadas. Presiona el botón para crear
            el primer análisis.
          </p>
        </section>
      )}

      {groups.map((group) => (
        <section key={group.id} style={sectionStyle}>
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
              <h2 style={{ ...h2Style, marginBottom: 4 }}>
                {group.category.name}
                {group.category.panel ? ` (${group.category.panel})` : ""}
              </h2>
              <p style={{ margin: 0, color: "#6e6e73", fontSize: 13 }}>
                {group.rationale}
              </p>
              <p style={{ color: "#86868b", fontSize: 12, marginTop: 4 }}>
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
                  { ...buttonStyle, marginTop: 0 },
                  busyId !== null ||
                    group.titles.length > maxTitlesPerBatch ||
                    !contentLanguage,
                )}
              >
                {group.titles.length > maxTitlesPerBatch
                  ? `Supera el máximo (${group.titles.length}/${maxTitlesPerBatch})`
                  : `Ejecutar categoría (${group.titles.length})`}
              </button>
              <button
                onClick={() => remove("groups", group.id)}
                disabled={busyId !== null}
                className="secondary"
                style={disabledStyle({ ...secondaryButtonStyle, marginTop: 0 }, busyId !== null)}
              >
                Eliminar categoría
              </button>
            </div>
          </div>
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {group.titles.map((title, index) => (
              <div
                key={title.id}
                className="row"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 16,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #e5e5ea",
                  background: "#ffffff",
                }}
              >
                <div style={{ minWidth: 200, flex: "1 1 200px" }}>
                  <strong style={{ fontSize: 14, color: "#1d1d1f" }}>
                    {index + 1}. {title.text}
                  </strong>
                  {title.rationale && (
                    <div
                      style={{ color: "#6e6e73", fontSize: 12, marginTop: 3 }}
                    >
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
                    className="secondary"
                    style={disabledStyle(
                      { ...secondaryButtonStyle, fontSize: 12, padding: "6px 12px" },
                      busyId !== null || !contentLanguage,
                    )}
                  >
                    Ejecutar
                  </button>
                  <button
                    onClick={() => remove("titles", title.id)}
                    disabled={busyId !== null}
                    className="secondary"
                    style={disabledStyle(
                      { ...secondaryButtonStyle, color: "#ff3b30", fontSize: 12, padding: "6px 12px" },
                      busyId !== null,
                    )}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      </PreValidationGuard>

      <ImageCreditsModal
        isOpen={showImageCreditsModal}
        onClose={() => setShowImageCreditsModal(false)}
        platformDomain={platformDomain}
      />
    </div>
  );
}
