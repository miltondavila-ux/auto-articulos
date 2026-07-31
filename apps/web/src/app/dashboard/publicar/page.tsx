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
import type { CategoryRow } from "@/types/dashboard";

const MAX_TITLES_PER_BATCH = 20;

export default function PublicarPage() {
  const router = useRouter();
  const [titlesText, setTitlesText] = useState("");
  const [credentialsConfigured, setCredentialsConfigured] = useState(false);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [banner, setBanner] = useState<{
    type: "error" | "info";
    text: string;
  } | null>(null);
  const [starting, setStarting] = useState(false);
  const [hasActiveRun, setHasActiveRun] = useState(false);
  const [disableIndexing, setDisableIndexing] = useState(false);

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
  }, [loadCredentialsStatus, loadCategories, checkActiveRun]);

  const titleCount = titlesText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0).length;
  const overLimit = titleCount > MAX_TITLES_PER_BATCH;

  async function handleIniciar() {
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
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({
          type: "error",
          text: data.error ?? "Error al iniciar la ejecución",
        });
        return;
      }
      router.push("/dashboard");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      {!credentialsConfigured && (
        <div
          style={{
            marginTop: 20,
            padding: "12px 16px",
            borderRadius: 8,
            background: "#f5e6c8",
            color: "#8a6d1a",
            fontSize: 13,
          }}
        >
          Primero conecta tu cuenta de 10minutesWebsite en{" "}
          <Link href="/dashboard/configuracion" style={{ color: "#2f5fdb" }}>
            Configuración
          </Link>
          .
        </div>
      )}

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
          <Link href="/dashboard" style={{ color: "#2f5fdb" }}>
            Ver progreso en Inicio
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
        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          disabled={hasActiveRun || categories.length === 0}
          style={{ ...inputStyle, minWidth: 260 }}
        >
          <option value="">
            {categories.length === 0
              ? "Sin categorías sincronizadas"
              : "Elige una categoría"}
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {categories.length === 0 && (
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>
            Sincroniza tus categorías desde{" "}
            <Link href="/dashboard/configuracion" style={{ color: "#2f5fdb" }}>
              Configuración
            </Link>
            .
          </p>
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Títulos a publicar</h2>
        <p style={{ fontSize: 13, color: "#6b7280" }}>
          Un título por línea. Máximo {MAX_TITLES_PER_BATCH} por lote — si
          tienes más, divídelos en varios lotes.
        </p>
        <textarea
          value={titlesText}
          onChange={(e) => setTitlesText(e.target.value)}
          placeholder={
            "Un título por línea\nEj:\n5 consejos para vender tu casa rápido\nCómo elegir el mejor vecindario"
          }
          rows={8}
          disabled={hasActiveRun}
          style={{
            ...inputStyle,
            width: "100%",
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
        <p
          style={{
            fontSize: 12,
            marginTop: 6,
            color: overLimit ? "#d64545" : "#6b7280",
            fontWeight: overLimit ? 600 : 400,
          }}
        >
          {titleCount} / {MAX_TITLES_PER_BATCH} títulos
          {overLimit &&
            ` — quita ${titleCount - MAX_TITLES_PER_BATCH} para poder iniciar`}
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
            overLimit
          }
          style={disabledStyle(
            buttonStyle,
            starting ||
              hasActiveRun ||
              titlesText.trim().length === 0 ||
              !selectedCategoryId ||
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
    </div>
  );
}
