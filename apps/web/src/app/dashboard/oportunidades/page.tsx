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
const IMAGE_CREDITS_CONFIRMED_KEY = "auto-articulos:image-credits-confirmed";

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
        setHasImageCredits(
          me.hasImageCredits ||
            window.localStorage.getItem(IMAGE_CREDITS_CONFIRMED_KEY) === "true",
        );
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
    window.localStorage.setItem(IMAGE_CREDITS_CONFIRMED_KEY, "true");
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
      body: JSON.stringify({
        disableIndexing,
        contentLanguage,
        confirmedImageCredits: hasImageCredits,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data.code === "NO_IMAGE_CREDITS") {
        window.localStorage.removeItem(IMAGE_CREDITS_CONFIRMED_KEY);
        setHasImageCredits(false);
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
    const publishedCount = Number(data.publishedCount ?? 0);
    const pendingCount = Number(data.pendingCount ?? 0);
    setMessage({
      kind: "info",
      text: pendingCount > 0
        ? `Se publicarán ${publishedCount} títulos según tu cupo. Quedaron ${pendingCount} títulos pendientes en Oportunidades.`
        : `Se publicarán ${publishedCount} títulos. No quedaron títulos pendientes.`,
    });
    if (typeof data.workerWarning === "string") {
      window.sessionStorage.setItem("auto-articulos-worker-warning", data.workerWarning);
    }
    setBusyId(null);
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
      body: JSON.stringify({
        type,
        id,
        disableIndexing,
        contentLanguage,
        confirmedImageCredits: hasImageCredits,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data.code === "NO_IMAGE_CREDITS") {
        window.localStorage.removeItem(IMAGE_CREDITS_CONFIRMED_KEY);
        setHasImageCredits(false);
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
    if (typeof data.workerWarning === "string") {
      window.sessionStorage.setItem("auto-articulos-worker-warning", data.workerWarning);
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
