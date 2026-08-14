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

  const loadUserLimits = useCallback(async () => {
    const res = await fetch("/api/me");
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
        setHasImageCredits(data.hasImageCredits);
      }
    }
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
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "NO_IMAGE_CREDITS") {
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
        onOpenImageCreditsModal={() => setShowImageCreditsModal(true)}
      >
        {hasActiveRun && (
          <div
            style={{
              marginTop: 20,
              padding: "12px 16px",
              borderRadius: 8,
              background: "#eafaf0",
              color: "#1e8a4b",
              fontSize: 13,
            }}
          >
            Ya hay una ejecución en curso.{" "}
            <Link
              href="/dashboard/publicaciones-en-curso"
              style={{ color: "#2f5fdb" }}
            >
              Ver progreso en Publicaciones en Curso
            </Link>
            .
          </div>
        )}

        <section style={readySectionStyle(Boolean(selectedCategoryId))}>
          <h2 style={h2Style}>Categoría</h2>
          <p style={{ fontSize: 13, color: "#6b7280" }}>
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
                color: "#6b7280",
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
              </option>
            ))}
          </select>
          {categories.length === 0 && (
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>
              Sincroniza tus categorías desde{" "}
              <Link href="/dashboard/configuracion?tab=platform#categories" style={{ color: "#2f5fdb", fontWeight: 600 }}>
                Configuración &gt; Categorías
              </Link>
              .
            </p>
          )}

          <h2 style={{ ...h2Style, marginTop: 24 }}>Idioma de este lote</h2>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
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
          <p style={{ fontSize: 13, color: "#6b7280" }}>
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
            style={{ ...inputStyle, width: "100%", fontFamily: "monospace" }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              marginTop: 4,
              color: overLimit ? "#d64545" : "#6b7280",
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
          <p style={{ fontSize: 13, color: "#6b7280" }}>
            Al iniciar, se creará una nueva ejecución en segundo plano que
            procesará los artículos uno a uno.
          </p>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "#6b7280",
              margin: "10px 0",
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
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>
              Elige una categoría arriba antes de iniciar.
            </p>
          )}
          {!contentLanguage && !hasActiveRun && (
            <p style={{ fontSize: 13, color: "#d64545", marginTop: 8 }}>
              Debes seleccionar o configurar un idioma de redacción antes de iniciar.
            </p>
          )}
        </section>

        {banner && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              marginTop: 8,
              background: banner.type === "error" ? "#fdecec" : "#eafaf0",
              color: banner.type === "error" ? "#d64545" : "#1e8a4b",
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
      />
    </div>
  );
}
