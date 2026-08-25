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
    loadCredentialsStatus();
    loadCategories();
    checkActiveRun();
    loadUserLimits();
    loadLanguages();
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
      >
        {!hasImageCredits && (
          <div
            style={{
              marginTop: 20,
              padding: "12px 16px",
              borderRadius: 12,
              background: "#ffffff",
              border: "1px solid #e5e5ea",
              boxShadow: "0 6px 18px rgba(0, 0, 0, 0.04)",
              color: "#1d1d1f",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <span>
              Si ya te dieron créditos, confírmalo para poder intentar publicar.
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={confirmImageCredits}
                style={{
                  background: "#1d1d1f",
                  color: "#ffffff",
                  border: "1px solid #1d1d1f",
                  padding: "7px 14px",
                  minWidth: 170,
                  height: 36,
                  borderRadius: 18,
                  fontSize: 12,
                  fontWeight: 600,
                  lineHeight: "20px",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
              >
                Ya recibí mis créditos
              </button>
              <button
                type="button"
                onClick={() => setShowImageCreditsModal(true)}
                style={{
                  background: "#ffffff",
                  color: "#1d1d1f",
                  border: "1px solid #d2d2d7",
                  padding: "7px 14px",
                  minWidth: 170,
                  height: 36,
                  borderRadius: 18,
                  fontSize: 12,
                  fontWeight: 600,
                  lineHeight: "20px",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
              >
                Solicitar créditos
              </button>
            </div>
          </div>
        )}
        {hasActiveRun && (
          <div
            style={{
              marginTop: 20,
              padding: "12px 16px",
              borderRadius: 12,
              background: "#f2faf4",
              border: "1px solid rgba(52, 199, 89, 0.3)",
              color: "#16803c",
              fontSize: 13,
            }}
          >
            Ya hay una ejecución en curso.{" "}
            <Link
              href="/dashboard/publicaciones-en-curso"
              style={{ color: "#0071e3", fontWeight: 500 }}
            >
              Ver progreso en Publicaciones en Curso
            </Link>
            .
          </div>
        )}

        <section style={readySectionStyle(Boolean(selectedCategoryId))}>
          <h2 style={h2Style}>Categoría</h2>
          <p style={{ fontSize: 13, color: "#6e6e73", margin: "0 0 12px" }}>
            Elige primero la categoría bajo la que se publicarán los artículos de
            esta ejecución.
          </p>
          {sequenceCategories.length > 0 && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: "#6e6e73",
                margin: "8px 0",
              }}
            >
              <input
                type="checkbox"
                checked={useSequenceCategory}
                disabled={hasActiveRun}
                onChange={(e) => {
                  setUseSequenceCategory(e.target.checked);
                  setSelectedCategoryId("");
                }}
              />
              Usar una categoría de secuencia en vez de una regular
            </label>
          )}
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            disabled={hasActiveRun || visibleCategories.length === 0}
            style={{ ...inputStyle, width: "100%" }}
          >
            <option value="">
              {visibleCategories.length === 0
                ? "Sin categorías sincronizadas"
                : "Elige una categoría"}
            </option>
            {visibleCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.panel ? ` (${c.panel})` : ""}
              </option>
            ))}
          </select>
          {categories.length === 0 && (
            <p style={{ fontSize: 13, color: "#6e6e73", marginTop: 8 }}>
              Sincroniza tus categorías desde{" "}
              <Link href="/dashboard/configuracion?tab=platform#categories" style={{ color: "#0071e3", fontWeight: 500 }}>
                Configuración &gt; Categorías
              </Link>
              .
            </p>
          )}

          <h2 style={{ ...h2Style, marginTop: 24 }}>Idioma de este lote</h2>
          <p style={{ fontSize: 13, color: "#6e6e73", marginBottom: 8 }}>
            En este idioma se escribirán los artículos de este lote. Puedes dar
            los títulos en español aunque elijas otro idioma. Solo aplica a este
            lote; no cambia tu configuración.
          </p>
          <select
            value={contentLanguage}
            onChange={(e) => setContentLanguage(e.target.value)}
            disabled={hasActiveRun || languages.length === 0}
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
        </section>

        <section style={readySectionStyle(titleCount > 0 && !overLimit)}>
          <h2 style={h2Style}>Títulos</h2>
          <p style={{ fontSize: 13, color: "#6e6e73", margin: "0 0 12px" }}>
            Pega un título por línea. Puedes publicar como máximo{" "}
            <strong>{maxTitlesPerBatch}</strong> por lote (si tienes más,
            divídelos en varios lotes).
          </p>
          <textarea
            value={titlesText}
            onChange={(e) => setTitlesText(e.target.value)}
            placeholder={"Título del primer artículo\nTítulo del segundo artículo"}
            rows={8}
            disabled={hasActiveRun}
            style={{ ...inputStyle, width: "100%", fontFamily: "inherit" }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              marginTop: 6,
              color: overLimit ? "#ff3b30" : "#6e6e73",
            }}
          >
            <span>
              {titleCount} de {maxTitlesPerBatch} títulos
            </span>
            {overLimit && (
              <span>
                Supera el máximo permitido ({titleCount}/{maxTitlesPerBatch})
              </span>
            )}
          </div>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Publicar</h2>
          <p style={{ fontSize: 13, color: "#6e6e73", margin: "0 0 12px" }}>
            Al iniciar, se creará una nueva ejecución en segundo plano que
            procesará los artículos uno a uno.
          </p>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "#6e6e73",
              margin: "10px 0 14px",
            }}
          >
            <input
              type="checkbox"
              checked={disableIndexing}
              disabled={hasActiveRun}
              onChange={(e) => setDisableIndexing(e.target.checked)}
            />
            Desactivar indexación en buscadores para este lote (por defecto queda
            activada, como en 10minutesWebsite)
          </label>
          <button
            onClick={handleIniciar}
            disabled={
              starting ||
              hasActiveRun ||
              titlesText.trim().length === 0 ||
              !selectedCategoryId ||
              !contentLanguage ||
              overLimit
            }
            style={disabledStyle(
              buttonStyle,
              starting ||
                hasActiveRun ||
                titlesText.trim().length === 0 ||
                !selectedCategoryId ||
                !contentLanguage ||
                overLimit,
            )}
          >
            {hasActiveRun
              ? "Ejecución en curso..."
              : starting
                ? "Iniciando..."
                : "Iniciar"}
          </button>
          {!selectedCategoryId && !hasActiveRun && (
            <p style={{ fontSize: 13, color: "#6e6e73", marginTop: 8 }}>
              Elige una categoría arriba antes de iniciar.
            </p>
          )}
          {!contentLanguage && !hasActiveRun && (
            <p style={{ fontSize: 13, color: "#ff3b30", marginTop: 8 }}>
              Debes seleccionar o configurar un idioma de redacción antes de iniciar.
            </p>
          )}
        </section>

        {banner && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              marginTop: 12,
              background: banner.type === "error" ? "#fff2f1" : "#f2faf4",
              border: banner.type === "error" ? "1px solid rgba(255, 59, 48, 0.25)" : "1px solid rgba(52, 199, 89, 0.25)",
              color: banner.type === "error" ? "#ff3b30" : "#16803c",
              fontSize: 14,
            }}
          >
            {banner.text}
          </div>
        )}
      </PreValidationGuard>

      <ImageCreditsModal
        isOpen={showImageCreditsModal}
        onClose={() => setShowImageCreditsModal(false)}
        platformDomain={platformDomain}
      />
    </div>
  );
}
