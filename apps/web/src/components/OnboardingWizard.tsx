"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import Link from "next/link";
import {
  sectionStyle,
  inputStyle,
  secondaryButtonStyle,
} from "./dashboard-ui";
import type { CategoryRow, LanguageRow, RunRow } from "@/types/dashboard";

interface OnboardingWizardProps {
  variant?: "standalone" | "embedded";
  onUpdated?: () => void;
}

export default function OnboardingWizard({
  variant: _variant = "embedded",
  onUpdated,
}: OnboardingWizardProps) {
  const [loading, setLoading] = useState(true);
  const [credentialsConfigured, setCredentialsConfigured] = useState(false);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [contentLanguage, setContentLanguage] = useState("");
  const [googleData, setGoogleData] = useState<{
    connected: boolean;
    siteUrl?: string | null;
    sites?: { siteUrl: string; permissionLevel: string }[];
  } | null>(null);
  const [hasPublishedAny, setHasPublishedAny] = useState(false);

  // Estados de edición manual para pasos completados
  const [editingCreds, setEditingCreds] = useState(false);
  const [editingLang, setEditingLang] = useState(false);
  const [editingGoogleSite, setEditingGoogleSite] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [savingCreds, setSavingCreds] = useState(false);

  const [syncingCategories, setSyncingCategories] = useState(false);
  const [syncingLanguages, setSyncingLanguages] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [savingGoogleSite, setSavingGoogleSite] = useState(false);
  const [selectedGoogleSite, setSelectedGoogleSite] = useState("");

  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [credRes, catRes, langRes, meRes, googleRes, runsRes] =
        await Promise.all([
          fetch("/api/credentials", { cache: "no-store" }),
          fetch("/api/categories", { cache: "no-store" }),
          fetch("/api/languages", { cache: "no-store" }),
          fetch("/api/me", { cache: "no-store" }),
          fetch("/api/search-integrations/google", { cache: "no-store" }),
          fetch("/api/runs", { cache: "no-store" }),
        ]);

      if (credRes.ok) {
        const data = await credRes.json();
        setCredentialsConfigured(Boolean(data.configured));
      }
      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(data.categories || []);
      }
      if (langRes.ok) {
        const data = await langRes.json();
        setLanguages(data.languages || []);
      }
      if (meRes.ok) {
        const data = await meRes.json();
        setContentLanguage(data.contentLanguage || "");
      }
      if (googleRes.ok) {
        const data = await googleRes.json();
        setGoogleData(data);
        if (data.siteUrl) setSelectedGoogleSite(data.siteUrl);
      }
      if (runsRes.ok) {
        const data = await runsRes.json();
        const runs: RunRow[] = data.runs || [];
        setHasPublishedAny(runs.some((r) => r.titles.some((t) => t.status === "success")));
      }
    } catch (err) {
      console.error("Error al cargar estado del wizard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Acciones
  async function handleSaveCredentials(e: FormEvent) {
    e.preventDefault();
    setSavingCreds(true);
    setMessage(null);
    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Error al guardar credenciales" });
        return;
      }
      setUsername("");
      setPassword("");
      setEditingCreds(false);
      setMessage({ type: "success", text: "Credenciales de 10minutesWebsite guardadas con éxito." });
      await loadAll();
      onUpdated?.();
    } finally {
      setSavingCreds(false);
    }
  }

  async function handleSyncCategories() {
    setSyncingCategories(true);
    setMessage(null);
    try {
      const res = await fetch("/api/categories/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Error al sincronizar categorías" });
        return;
      }
      setMessage({ type: "success", text: "Categorías sincronizadas correctamente." });
      await loadAll();
      onUpdated?.();
    } finally {
      setSyncingCategories(false);
    }
  }

  async function handleSaveLanguage(langId: string) {
    setSavingLanguage(true);
    setMessage(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentLanguage: langId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Error al guardar idioma" });
        return;
      }
      setContentLanguage(langId);
      setEditingLang(false);
      setMessage({ type: "success", text: "Idioma de redacción confirmado con éxito." });
      await loadAll();
      onUpdated?.();
    } finally {
      setSavingLanguage(false);
    }
  }

  async function handleSyncLanguagesList() {
    setSyncingLanguages(true);
    setMessage(null);
    try {
      const res = await fetch("/api/languages/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Error al sincronizar lista de idiomas" });
        return;
      }
      await loadAll();
      setMessage({ type: "success", text: "Lista de idiomas actualizada desde 10minutesWebsite." });
    } finally {
      setSyncingLanguages(false);
    }
  }

  async function handleSaveGoogleSite(e: FormEvent) {
    e.preventDefault();
    setSavingGoogleSite(true);
    setMessage(null);
    try {
      const res = await fetch("/api/search-integrations/google", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl: selectedGoogleSite }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Error al guardar el sitio de Google" });
        return;
      }
      setEditingGoogleSite(false);
      setMessage({ type: "success", text: "Sitio web de Google Search Console confirmado con éxito." });
      await loadAll();
      onUpdated?.();
    } finally {
      setSavingGoogleSite(false);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // EVALUACIÓN SECUENCIAL ESTRICTA
  // Un paso SOLO está completado si los anteriores también lo están
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const step1Done = credentialsConfigured;
  const step2Done = step1Done && categories.length > 0;
  const step3Done = step1Done && step2Done && Boolean(contentLanguage);
  const step4Done = step1Done && step2Done && step3Done && Boolean(googleData?.connected && googleData?.siteUrl);
  const step5Done = step1Done && step2Done && step3Done && step4Done && hasPublishedAny;

  // Determinar paso activo exacto (1..5)
  let activeStep = 1;
  if (step1Done && !step2Done) activeStep = 2;
  else if (step1Done && step2Done && !step3Done) activeStep = 3;
  else if (step1Done && step2Done && step3Done && !step4Done) activeStep = 4;
  else if (step1Done && step2Done && step3Done && step4Done) activeStep = 5;

  const totalCoreSteps = 4;
  const completedCoreSteps = [step1Done, step2Done, step3Done, step4Done].filter(Boolean).length;
  const allCoreDone = completedCoreSteps === totalCoreSteps;
  const progressPercent = Math.round((completedCoreSteps / totalCoreSteps) * 100);

  const activeLangName =
    languages.find((l) => l.externalId === contentLanguage)?.name ||
    (contentLanguage === "es" ? "Español" : contentLanguage === "en" ? "Inglés" : contentLanguage);

  if (loading) {
    return (
      <div style={{ ...sectionStyle, padding: "24px", textAlign: "center", color: "#6b7280" }}>
        Cargando asistente de configuración...
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Mensajes de feedback */}
      {message && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 500,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background:
              message.type === "success"
                ? "#eafaf0"
                : message.type === "error"
                  ? "#fde8e8"
                  : "#eff6ff",
            border:
              message.type === "success"
                ? "1px solid #a8dfc0"
                : message.type === "error"
                  ? "1px solid #f8b4b4"
                  : "1px solid #bfdbfe",
            color:
              message.type === "success"
                ? "#1e8a4b"
                : message.type === "error"
                  ? "#9b1c1c"
                  : "#1e40af",
          }}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              color: "inherit",
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div
        style={{
          background: "#ffffff",
          borderRadius: 14,
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
          overflow: "hidden",
        }}
      >
        {/* Cabecera del Wizard */}
        <div
          style={{
            padding: "20px 24px",
            background: "linear-gradient(135deg, #071330 0%, #17347a 100%)",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                }}
              >
                GUÍA PASO A PASO
              </span>
              <span style={{ fontSize: 13, opacity: 0.9 }}>
                {completedCoreSteps} de {totalCoreSteps} pasos listos ({progressPercent}%)
              </span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#ffffff" }}>
              {allCoreDone
                ? "🎉 ¡Configuración Inicial Completa!"
                : "🚀 Configuración Inicial: Pon a punto tu cuenta"}
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#cbd5e1", maxWidth: 620 }}>
              Completa estos 4 pasos en orden para dejar tu plataforma 100% activa para redactar y posicionar artículos.
            </p>
          </div>

          <div style={{ minWidth: 160, textAlign: "right" }}>
            <div
              style={{
                width: "100%",
                height: 8,
                background: "rgba(255, 255, 255, 0.2)",
                borderRadius: 999,
                overflow: "hidden",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  background: "#4ade80",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: allCoreDone ? "#4ade80" : "#93c5fd" }}>
              {allCoreDone ? "100% Configurado" : `${progressPercent}% completado`}
            </span>
          </div>
        </div>

        {/* Lista Vertical de Pasos */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* PASO 1: 10minutesWebsite                               */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <StepCard
            stepNumber={1}
            title="Conectar tu cuenta de 10minutesWebsite"
            subtitle="Ingresa el usuario y contraseña con los que entras a tu plataforma de 10minutesWebsite."
            isDone={step1Done}
            isActive={activeStep === 1}
            badgeText={step1Done ? "Conectado" : "Paso 1 en curso"}
          >
            {step1Done && !editingCreds ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                  marginTop: 10,
                  padding: "10px 14px",
                  background: "#f0fdf4",
                  borderRadius: 8,
                  border: "1px solid #bbf7d0",
                }}
              >
                <div style={{ fontSize: 13, color: "#166534" }}>
                  ✅ Credenciales de 10minutesWebsite guardadas y verificadas de forma segura.
                </div>
                <button
                  type="button"
                  onClick={() => setEditingCreds(true)}
                  style={{ ...secondaryButtonStyle, fontSize: 12, padding: "6px 12px" }}
                >
                  Modificar
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 12 }}>
                {/* Cuadro de ayuda para contraseña */}
                <div
                  style={{
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: 8,
                    padding: "12px 14px",
                    marginBottom: 14,
                    fontSize: 13,
                    color: "#1e40af",
                    lineHeight: 1.45,
                  }}
                >
                  <p style={{ margin: "0 0 6px 0", fontWeight: 700 }}>
                    💡 ¿No tienes o no recuerdas tu contraseña de 10minutesWebsite?
                  </p>
                  <p style={{ margin: "0 0 8px 0" }}>
                    Puedes recuperarla o crear una nueva en segundos aquí:
                  </p>
                  <a
                    href="https://10minuteswebsite.net/dashboard/forgot-password.php"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "#2563eb",
                      color: "#ffffff",
                      padding: "6px 12px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    🔑 Resetear contraseña en 10minutesWebsite ↗
                  </a>
                  <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#3b82f6" }}>
                    <strong>Recomendación práctica:</strong> Al generar tu contraseña en 10minutesWebsite, copia y pega esa misma clave aquí para que ambos sistemas queden sincronizados.
                  </p>
                </div>

                <form
                  onSubmit={handleSaveCredentials}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 12,
                    alignItems: "flex-end",
                  }}
                >
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                      Usuario o Email de 10minutesWebsite:
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="ejemplo@tudominio.com"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                      Contraseña de 10minutesWebsite:
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="submit"
                      disabled={savingCreds}
                      style={{
                        background: "#2f5fdb",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "10px 18px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: savingCreds ? "not-allowed" : "pointer",
                        opacity: savingCreds ? 0.7 : 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {savingCreds ? "Guardando..." : "Guardar y Continuar →"}
                    </button>
                    {step1Done && (
                      <button
                        type="button"
                        onClick={() => setEditingCreds(false)}
                        style={{ ...secondaryButtonStyle, fontSize: 13, padding: "10px 14px" }}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </StepCard>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* PASO 2: Sincronizar Categorías                          */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <StepCard
            stepNumber={2}
            title="Sincronizar las Categorías de tu Web"
            subtitle="Auto Artículos descarga las categorías creadas en tu web de 10minutesWebsite para saber dónde clasificar los artículos."
            isDone={step2Done}
            isActive={activeStep === 2}
            badgeText={
              step2Done
                ? `${categories.length} ${categories.length === 1 ? "categoría" : "categorías"} listas`
                : activeStep === 2
                  ? "Paso 2 en curso"
                  : "Pendiente"
            }
          >
            <div style={{ marginTop: 10 }}>
              {!step1Done ? (
                <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
                  🔒 Este paso se desbloqueará automáticamente al completar el Paso 1.
                </p>
              ) : step2Done ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 12,
                      padding: "10px 14px",
                      background: "#f0fdf4",
                      borderRadius: 8,
                      border: "1px solid #bbf7d0",
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontSize: 13, color: "#166534" }}>
                      ✅ <strong>{categories.length} categorías</strong> sincronizadas y listas para publicar.
                    </div>
                    <button
                      type="button"
                      onClick={handleSyncCategories}
                      disabled={syncingCategories}
                      style={{ ...secondaryButtonStyle, fontSize: 12, padding: "6px 12px" }}
                    >
                      {syncingCategories ? "Sincronizando..." : "Volver a sincronizar"}
                    </button>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {categories.map((cat) => (
                      <span
                        key={cat.id}
                        style={{
                          background: "#e0f2fe",
                          color: "#0369a1",
                          fontSize: 12,
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontWeight: 500,
                        }}
                      >
                        🏷️ {cat.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: 8,
                    padding: "14px 16px",
                  }}
                >
                  <p style={{ margin: "0 0 10px 0", fontSize: 13, color: "#1e40af", fontWeight: 500 }}>
                    Haz clic a continuación para conectar con tu cuenta de 10minutesWebsite y descargar tus categorías:
                  </p>
                  <button
                    type="button"
                    onClick={handleSyncCategories}
                    disabled={syncingCategories}
                    style={{
                      background: "#2f5fdb",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 20px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: syncingCategories ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      boxShadow: "0 4px 12px rgba(47, 95, 219, 0.25)",
                    }}
                  >
                    {syncingCategories ? "🔄 Conectando y descargando..." : "⚡ Sincronizar mis Categorías Ahora →"}
                  </button>
                </div>
              )}
            </div>
          </StepCard>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* PASO 3: Idioma de Redacción                             */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <StepCard
            stepNumber={3}
            title="Seleccionar el Idioma de Redacción"
            subtitle="Indica el idioma en el que la Inteligencia Artificial debe redactar los artículos para tu sitio."
            isDone={step3Done}
            isActive={activeStep === 3}
            badgeText={
              step3Done
                ? `Idioma: ${activeLangName}`
                : activeStep === 3
                  ? "Paso 3 en curso"
                  : "Pendiente"
            }
          >
            <div style={{ marginTop: 10 }}>
              {!step2Done ? (
                <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
                  🔒 Este paso se desbloqueará automáticamente al completar el Paso 2.
                </p>
              ) : step3Done && !editingLang ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                    padding: "10px 14px",
                    background: "#f0fdf4",
                    borderRadius: 8,
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <div style={{ fontSize: 13, color: "#166534" }}>
                    ✅ Idioma activo: <strong>{activeLangName}</strong>. Los artículos se generarán en este idioma.
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingLang(true)}
                    style={{ ...secondaryButtonStyle, fontSize: 12, padding: "6px 12px" }}
                  >
                    Cambiar idioma
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: 8,
                    padding: "14px 16px",
                  }}
                >
                  <p style={{ fontSize: 13, color: "#1e40af", margin: "0 0 10px 0", fontWeight: 500 }}>
                    Elige el idioma principal para tus artículos:
                  </p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                    <select
                      value={contentLanguage || "es"}
                      onChange={(e) => handleSaveLanguage(e.target.value)}
                      disabled={savingLanguage}
                      style={{
                        ...inputStyle,
                        maxWidth: 320,
                        fontWeight: 600,
                        color: "#1e40af",
                        background: "#fff",
                      }}
                    >
                      {languages.length > 0 ? (
                        languages.map((lang) => (
                          <option key={lang.id} value={lang.externalId}>
                            {lang.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="es">Español</option>
                          <option value="en">Inglés</option>
                        </>
                      )}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleSaveLanguage(contentLanguage || "es")}
                      disabled={savingLanguage}
                      style={{
                        background: "#2f5fdb",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "9px 16px",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: savingLanguage ? "not-allowed" : "pointer",
                      }}
                    >
                      {savingLanguage ? "Guardando..." : "Confirmar Idioma →"}
                    </button>

                    <button
                      type="button"
                      onClick={handleSyncLanguagesList}
                      disabled={syncingLanguages}
                      style={{ ...secondaryButtonStyle, fontSize: 12, padding: "8px 12px" }}
                      title="Descargar idiomas actualizados desde 10minutesWebsite"
                    >
                      {syncingLanguages ? "Sincronizando..." : "🔄 Recargar lista"}
                    </button>

                    {step3Done && (
                      <button
                        type="button"
                        onClick={() => setEditingLang(false)}
                        style={{ ...secondaryButtonStyle, fontSize: 12, padding: "8px 12px" }}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </StepCard>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* PASO 4: Google Search Console                           */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <StepCard
            stepNumber={4}
            title="Conectar Google Search Console"
            subtitle="Permite a Auto Artículos indexar tus artículos inmediatamente y analizar las búsquedas que te traen visitas."
            isDone={step4Done}
            isActive={activeStep === 4}
            badgeText={
              step4Done
                ? "GSC Conectado"
                : activeStep === 4
                  ? "Paso 4 en curso"
                  : "Pendiente"
            }
          >
            <div style={{ marginTop: 10 }}>
              {!step3Done ? (
                <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
                  🔒 Este paso se desbloqueará automáticamente al completar el Paso 3.
                </p>
              ) : (
                <div>
                  {step4Done && !editingGoogleSite ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 12,
                        padding: "10px 14px",
                        background: "#f0fdf4",
                        borderRadius: 8,
                        border: "1px solid #bbf7d0",
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ fontSize: 13, color: "#166534" }}>
                        ✅ Google Search Console conectado y activo en: <strong>{googleData?.siteUrl}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingGoogleSite(true)}
                        style={{ ...secondaryButtonStyle, fontSize: 12, padding: "6px 12px" }}
                      >
                        Cambiar sitio
                      </button>
                    </div>
                  ) : null}

                  <div
                    style={{
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      borderRadius: 8,
                      padding: "12px 14px",
                      marginBottom: 12,
                      fontSize: 13,
                      color: "#1e40af",
                      lineHeight: 1.5,
                    }}
                  >
                    <p style={{ margin: "0 0 4px 0", fontWeight: 700 }}>
                      🌐 Instrucción importante antes de conectar:
                    </p>
                    <p style={{ margin: "0 0 10px 0" }}>
                      Abre tu <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontWeight: 700, textDecoration: "underline" }}>Google Search Console ↗</a> en una pestaña al lado de tu navegador, asegúrate de que funciona y que lo tienes activado con la misma cuenta de Google dueña de tu sitio web, y luego haz clic en el botón de abajo.
                    </p>

                    <div
                      style={{
                        background: "#ffffff",
                        border: "1px solid #dbeafe",
                        borderRadius: 6,
                        padding: "10px 12px",
                        marginTop: 8,
                      }}
                    >
                      <p style={{ margin: "0 0 4px 0", fontWeight: 700, color: "#0f172a", fontSize: 13 }}>
                        📺 ¿No tienes el Google Search Console?
                      </p>
                      <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "#475569" }}>
                        Aprende cómo activarte paso a paso con este video tutorial:
                      </p>
                      <a
                        href="https://youtu.be/c9aOFmvaHHo?si=0K0XfnbJPE2j8OMt&t=5"
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "#dc2626",
                          color: "#ffffff",
                          textDecoration: "none",
                          padding: "6px 12px",
                          borderRadius: 6,
                          fontWeight: 700,
                          fontSize: 12,
                          boxShadow: "0 2px 6px rgba(220, 38, 38, 0.2)",
                        }}
                      >
                        ▶️ Ver video: Cómo activar Google Search Console ↗
                      </a>
                    </div>
                  </div>

                  {!googleData?.connected ? (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <a
                        href="/api/search-integrations/google/connect"
                        style={{
                          background: "#2f5fdb",
                          color: "#fff",
                          textDecoration: "none",
                          borderRadius: 8,
                          padding: "10px 20px",
                          fontSize: 13,
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          boxShadow: "0 4px 12px rgba(47, 95, 219, 0.25)",
                        }}
                      >
                        🔗 Conectar Google Search Console con Google OAuth →
                      </a>
                    </div>
                  ) : (
                    <div>
                      {googleData.sites && googleData.sites.length > 0 && (
                        <form onSubmit={handleSaveGoogleSite} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          <select
                            value={selectedGoogleSite}
                            onChange={(e) => setSelectedGoogleSite(e.target.value)}
                            style={{ ...inputStyle, maxWidth: 360, background: "#fff", color: "#0f172a" }}
                          >
                            <option value="">-- Selecciona la propiedad de tu sitio --</option>
                            {googleData.sites.map((s) => (
                              <option key={s.siteUrl} value={s.siteUrl}>
                                {s.siteUrl}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            disabled={savingGoogleSite || !selectedGoogleSite}
                            style={{
                              background: "#2f5fdb",
                              color: "#fff",
                              border: "none",
                              borderRadius: 8,
                              padding: "9px 16px",
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: savingGoogleSite || !selectedGoogleSite ? "not-allowed" : "pointer",
                            }}
                          >
                            {savingGoogleSite ? "Guardando..." : "Confirmar Sitio →"}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </StepCard>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* PASO 5: META FINAL - PUBLICAR PRIMER ARTÍCULO          */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <StepCard
            stepNumber={5}
            title="¡Todo Listo! Publica tu Primer Artículo"
            subtitle="Tu plataforma está 100% calibrada para generar contenido optimizado e indexable."
            isDone={step5Done}
            isActive={activeStep === 5}
            badgeText={
              step5Done
                ? "Artículos Publicados"
                : allCoreDone
                  ? "¡Listo para empezar!"
                  : "Pendiente"
            }
          >
            <div style={{ marginTop: 10 }}>
              {!allCoreDone ? (
                <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
                  🔒 Completa los 4 pasos anteriores para comenzar a publicar artículos automatizados.
                </p>
              ) : (
                <div
                  style={{
                    background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                    border: "1px solid #86efac",
                    borderRadius: 10,
                    padding: "16px 18px",
                  }}
                >
                  <p style={{ margin: "0 0 8px 0", fontSize: 15, fontWeight: 800, color: "#14532d" }}>
                    🚀 ¡Felicitaciones! Has completado todos los pasos de configuración inicial.
                  </p>
                  <p style={{ margin: "0 0 14px 0", fontSize: 13, color: "#166534" }}>
                    Ahora puedes publicar tus primeros títulos o explorar las oportunidades automáticas sugeridas por la IA.
                  </p>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Link
                      href="/dashboard/publicar"
                      style={{
                        background: "#15803d",
                        color: "#fff",
                        textDecoration: "none",
                        padding: "10px 18px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        display: "inline-block",
                      }}
                    >
                      ✍️ Publicar Artículo Ahora →
                    </Link>
                    <Link
                      href="/dashboard/oportunidades"
                      style={{
                        background: "#ffffff",
                        color: "#15803d",
                        border: "1px solid #86efac",
                        textDecoration: "none",
                        padding: "10px 18px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        display: "inline-block",
                      }}
                    >
                      🔍 Explorar Oportunidades SEO
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </StepCard>
        </div>
      </div>
    </div>
  );
}

function StepCard({
  stepNumber,
  title,
  subtitle,
  isDone,
  isActive,
  badgeText,
  children,
}: {
  stepNumber: number;
  title: string;
  subtitle: string;
  isDone: boolean;
  isActive: boolean;
  badgeText?: string;
  children: React.ReactNode;
}) {
  const isPending = !isDone && !isActive;

  return (
    <div
      style={{
        borderRadius: 12,
        transition: "all 0.25s ease",
        border: isDone
          ? "1px solid #bbf7d0"
          : isActive
            ? "2px solid #2563eb"
            : "1px solid #e2e8f0",
        background: isDone
          ? "#fcfdfd"
          : isActive
            ? "#ffffff"
            : "#f8fafc",
        boxShadow: isActive
          ? "0 8px 24px rgba(37, 99, 235, 0.12)"
          : isDone
            ? "0 1px 4px rgba(0, 0, 0, 0.02)"
            : "none",
        opacity: isPending ? 0.6 : 1,
        padding: "18px 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 800,
              flexShrink: 0,
              background: isDone
                ? "#22c55e"
                : isActive
                  ? "#2563eb"
                  : "#cbd5e1",
              color: "#ffffff",
              boxShadow: isActive ? "0 0 10px rgba(37, 99, 235, 0.4)" : "none",
            }}
          >
            {isDone ? "✓" : stepNumber}
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                color: isDone ? "#166534" : isActive ? "#0f172a" : "#64748b",
              }}
            >
              {title}
            </h3>
            <p
              style={{
                margin: "3px 0 0 0",
                fontSize: 12,
                color: isDone ? "#15803d" : isActive ? "#475569" : "#94a3b8",
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </p>
          </div>
        </div>

        {badgeText && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 999,
              background: isDone
                ? "#dcfce7"
                : isActive
                  ? "#dbeafe"
                  : "#f1f5f9",
              color: isDone
                ? "#15803d"
                : isActive
                  ? "#1e40af"
                  : "#64748b",
              border: isDone
                ? "1px solid #86efac"
                : isActive
                  ? "1px solid #93c5fd"
                  : "1px solid #e2e8f0",
            }}
          >
            {isDone ? `✅ ${badgeText}` : isActive ? `👉 ${badgeText}` : badgeText}
          </span>
        )}
      </div>

      <div style={{ marginTop: 6, paddingLeft: 44 }}>
        {children}
      </div>
    </div>
  );
}
