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

export default function PublicarPage() {
  const router = useRouter();
  const [titlesText, setTitlesText] = useState("");
  const [disableIndexing, setDisableIndexing] = useState(false);
  const [credentialsConfigured, setCredentialsConfigured] = useState(false);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [banner, setBanner] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const [starting, setStarting] = useState(false);
  const [hasActiveRun, setHasActiveRun] = useState(false);

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
        data.runs.some((r: { status: string }) => r.status === "pending" || r.status === "running")
      );
    }
  }, []);

  useEffect(() => {
    loadCredentialsStatus();
    loadCategories();
    checkActiveRun();
  }, [loadCredentialsStatus, loadCategories, checkActiveRun]);

  async function handleIniciar() {
    setStarting(true);
    setBanner(null);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titlesText, categoryId: selectedCategoryId, disableIndexing }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({ type: "error", text: data.error ?? "Error al iniciar la ejecución" });
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
            background: "#3a2f14",
            color: "#e8c777",
            fontSize: 13,
          }}
        >
          Primero conecta tu cuenta de 10minutesWebsite en{" "}
          <Link href="/dashboard/configuracion" style={{ color: "#4f7cff" }}>
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
            background: "#142a1b",
            color: "#7fd99a",
            fontSize: 13,
          }}
        >
          Ya hay una ejecución en curso.{" "}
          <Link href="/dashboard" style={{ color: "#4f7cff" }}>
            Ver progreso en Inicio
          </Link>
          .
        </div>
      )}

      <section style={readySectionStyle(Boolean(selectedCategoryId))}>
        <h2 style={h2Style}>Categoría</h2>
        <p style={{ fontSize: 13, color: "#9aa1ac" }}>
          Elige primero la categoría bajo la que se publicarán los artículos de esta ejecución.
        </p>
        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          disabled={hasActiveRun || categories.length === 0}
          style={{ ...inputStyle, minWidth: 260 }}
        >
          <option value="">
            {categories.length === 0 ? "Sin categorías sincronizadas" : "Elige una categoría"}
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {categories.length === 0 && (
          <p style={{ fontSize: 13, color: "#9aa1ac", marginTop: 8 }}>
            Sincroniza tus categorías desde{" "}
            <Link href="/dashboard/configuracion" style={{ color: "#4f7cff" }}>
              Configuración
            </Link>
            .
          </p>
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Títulos a publicar</h2>
        <textarea
          value={titlesText}
          onChange={(e) => setTitlesText(e.target.value)}
          placeholder={"Un título por línea\nEj:\n5 consejos para vender tu casa rápido\nCómo elegir el mejor vecindario"}
          rows={8}
          disabled={hasActiveRun}
          style={{ ...inputStyle, width: "100%", resize: "vertical", fontFamily: "inherit" }}
        />
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 12,
            fontSize: 13,
            color: "#9aa1ac",
          }}
        >
          <input
            type="checkbox"
            checked={disableIndexing}
            onChange={(e) => setDisableIndexing(e.target.checked)}
            disabled={hasActiveRun}
          />
          Desactivar indexación en buscadores para este lote (por defecto queda activada, como en
          10minutesWebsite)
        </label>
        <button
          onClick={handleIniciar}
          disabled={starting || hasActiveRun || titlesText.trim().length === 0 || !selectedCategoryId}
          style={disabledStyle(
            buttonStyle,
            starting || hasActiveRun || titlesText.trim().length === 0 || !selectedCategoryId
          )}
        >
          {hasActiveRun ? "Ejecución en curso..." : starting ? "Iniciando..." : "Iniciar"}
        </button>
        {!selectedCategoryId && !hasActiveRun && (
          <p style={{ fontSize: 13, color: "#9aa1ac", marginTop: 8 }}>
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
            background: banner.type === "error" ? "#3a1414" : "#142a1b",
            color: banner.type === "error" ? "#ff8787" : "#7fd99a",
            fontSize: 14,
          }}
        >
          {banner.text}
        </div>
      )}
    </div>
  );
}
