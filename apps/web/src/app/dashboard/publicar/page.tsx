"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  sectionStyle,
  h2Style,
  inputStyle,
  buttonStyle,
  readySectionStyle,
  disabledStyle,
} from "@/components/dashboard-ui";
import ImageCreditsModal from "@/components/ImageCreditsModal";
import PreValidationGuard from "@/components/PreValidationGuard";
import type { CategoryRow } from "@/types/dashboard";

const DEFAULT_MAX_TITLES_PER_BATCH = 20;
const IMAGE_CREDITS_CONFIRMED_KEY = "auto-articulos:image-credits-confirmed";

export default function PublicarPage() {
  const router = useRouter();
  const [titlesText, setTitlesText] = useState("");
  const [credentialsConfigured, setCredentialsConfigured] = useState(false);
  const [hasImageCredits, setHasImageCredits] = useState(true);
  const [showImageCreditsModal, setShowImageCreditsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [useSequenceCategory, setUseSequenceCategory] = useState(false);
  const [banner, setBanner] = useState<{
    type: "error" | "info";
    text: string;
  } | null>(null);
  const [starting, setStarting] = useState(false);
  const [hasActiveRun, setHasActiveRun] = useState(false);
  const [disableIndexing, setDisableIndexing] = useState(false);
  const [maxTitlesPerBatch, setMaxTitlesPerBatch] = useState(
    DEFAULT_MAX_TITLES_PER_BATCH,
  );
  // Idioma de ESTE lote (pedido del usuario, 7/8/2026: el idioma es del
  // artículo, no del usuario). Arranca en el configurado del usuario, así que
  // quien no lo toque publica exactamente como antes.
  const [languages, setLanguages] = useState<
    { id: string; externalId: string; name: string }[]
  >([]);
  const [contentLanguage, setContentLanguage] = useState("");
  // Para marca blanca (tagcrush): PreValidationGuard necesita saber el
  // servidor de la cuenta para no mostrar "10minutesWebsite" ni enlaces de
  // ayuda equivocados. Ver packages/shared/src/platform-servers.ts.
  const [platformDomain, setPlatformDomain] = useState<string>("net");

  const loadUserLimits = useCallback(async () => {
    const res = await fetch("/api/me", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (
        typeof data.maxTitlesPerBatch === "number" &&
        data.maxTitlesPerBatch >= 1
      ) {
        setMaxTitlesPerBatch(data.maxTitlesPerBatch);
      }
      if (typeof data.contentLanguage === "string") {
        setContentLanguage(data.contentLanguage);
      }
      if (typeof data.hasImageCredits === "boolean") {
        setHasImageCredits(
          data.hasImageCredits ||
            window.localStorage.getItem(IMAGE_CREDITS_CONFIRMED_KEY) === "true",
        );
      }
      if (typeof data.platformDomain === "string") {
        setPlatformDomain(data.platformDomain);
      }
    }
  }, []);

  const confirmImageCredits = useCallback(() => {
    window.localStorage.setItem(IMAGE_CREDITS_CONFIRMED_KEY, "true");
    setHasImageCredits(true);
    setBanner({
      type: "info",
      text: "Has indicado que ya recibiste créditos. Puedes intentar publicar; si aún no están activos, vuelve aquí y solicítalos.",
    });
  }, []);

  const loadLanguages = useCallback(async () => {
    const res = await fetch("/api/languages");
    if (res.ok) {
      const data = await res.json();
      setLanguages(data.languages ?? []);
    }
  }, []);

  const loadCredentialsStatus = useCallback(async () => {
    const res = await fetch("/api/credentials");
    if (res.ok) {
      const data = await res.json();
      setCredentialsConfigured(Boolean(data.configured));
    }
  }, []);

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories);
    }
  }, []);

  const checkActiveRun = useCallback(async () => {
    const res = await fetch("/api/runs");
    if (res.ok) {
      const data = await res.json();
      setHasActiveRun(
        data.runs.some(
          (r: { status: string }) =>
            r.status === "pending" || r.status === "running",
        ),
      );
    }
  }, []);

  useEffect(() => {
    Promise.all([
      loadCredentialsStatus(),
      loadCategories(),
      checkActiveRun(),
      loadUserLimits(),
      loadLanguages(),
    ]).finally(() => setLoading(false));
  }, [
    loadCredentialsStatus,
    loadCategories,
    checkActiveRun,
    loadUserLimits,
    loadLanguages,
  ]);

  // 10minutesWebsite distingue categorías "regulares" de categorías "de
  // secuencia" — por defecto solo se ofrecen las regulares; las de
  // secuencia quedan en una lista aparte, para usarlas solo si se elige
  // explícitamente (pedido del usuario, 5/8/2026).
  const regularCategories = categories.filter((c) => !c.isSequence);
  const sequenceCategories = categories.filter((c) => c.isSequence);
  const visibleCategories = useSequenceCategory
    ? sequenceCategories
    : regularCategories;

  const titleCount = titlesText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0).length;
  const overLimit = titleCount > maxTitlesPerBatch;

  async function handleIniciar() {
    if (!hasImageCredits) {
      setShowImageCreditsModal(true);
      return;
    }
    if (!contentLanguage.trim()) {
      setBanner({
        type: "error",
        text: "Debes configurar tu idioma de redacción en Configuración antes de publicar.",
      });
      return;
    }
    setStarting(true);
    setBanner(null);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titlesText,
          categoryId: selectedCategoryId,
          disableIndexing,
          contentLanguage,
          confirmedImageCredits: hasImageCredits,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "NO_IMAGE_CREDITS") {
          window.localStorage.removeItem(IMAGE_CREDITS_CONFIRMED_KEY);
          setHasImageCredits(false);
          setShowImageCreditsModal(true);
        }
        setBanner({
          type: "error",
          text: data.error ?? "Error al iniciar la ejecución",
        });
        return;
      }
      if (typeof data.workerWarning === "string") {
        window.sessionStorage.setItem("auto-articulos-worker-warning", data.workerWarning);
      }
      router.push("/dashboard/publicaciones-en-curso");
    } finally {
      setStarting(false);
    }
  }

  const activeLangName =
    languages.find((l) => l.externalId === contentLanguage)?.name ||
    (contentLanguage === "es" ? "Español" : contentLanguage === "en" ? "Inglés" : contentLanguage);

  return (
    <div>
      <PreValidationGuard
        type="publicar"
        credentialsConfigured={credentialsConfigured}
        hasCategories={categories.length > 0}
        categoriesCount={categories.length}
        hasLanguage={Boolean(contentLanguage && contentLanguage.trim().length > 0)}
        languageName={activeLangName}
        hasImageCredits={hasImageCredits}
        platformDomain={platformDomain}
        onOpenImageCreditsModal={() => setShowImageCreditsModal(true)}
        loading={loading}
        onConfirmImageCredits={() => {
          setHasImageCredits(true);
          setBanner({
            type: "info",
            text: "Has indicado que ya recibiste créditos. Puedes intentar publicar; si aún no están activos, vuelve aquí y solicítalos.",
          });
        }}
      >
        {!hasImageCredits && (
          <div
