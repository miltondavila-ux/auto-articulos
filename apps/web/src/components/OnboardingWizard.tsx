"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import Link from "next/link";
import {
  sectionStyle,
  inputStyle,
  secondaryButtonStyle,
} from "./dashboard-ui";
import {
  platformForgotPasswordUrl,
  platformProductNameOrNeutral,
} from "@auto-articulos/shared";
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
  // Para marca blanca (tagcrush): decide si el texto dice "10minutesWebsite"
  // o un término genérico. Ver platform-servers.ts.
  // Vacío a propósito hasta que /api/me diga el servidor real: mientras
  // tanto el texto usa el término genérico y nunca la marca equivocada.
  const [platformDomain, setPlatformDomain] = useState<string>("");
  const [selectedLang, setSelectedLang] = useState("");
  const [googleData, setGoogleData] = useState<{
    connected: boolean;
    siteUrl?: string | null;
    sitemapUrl?: string | null;
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
  // Estado del último job de sincronización, tal como lo hace la pantalla de
  // Configuración (Cuenta & Contenido). Es lo que permite seguir esperando
  // mientras el worker trabaja, en vez de rendirse a los 50 segundos.
  const [lastSyncStatus, setLastSyncStatus] = useState<string | null>(null);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  // true solo si la persona pulsó sincronizar en esta visita: evita saludarla
  // con un "sincronizado" cada vez que abre el asistente.
  const [syncRequested, setSyncRequested] = useState(false);
  const [syncingLanguages, setSyncingLanguages] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [savingGoogleSite, setSavingGoogleSite] = useState(false);
  const [selectedGoogleSite, setSelectedGoogleSite] = useState("");

  const [showManualCategory, setShowManualCategory] = useState(false);
  const [manualCategoryName, setManualCategoryName] = useState("");
  const [savingManualCategory, setSavingManualCategory] = useState(false);
  const [customGoogleSite, setCustomGoogleSite] = useState(false);

  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // `surfaceLastSyncError` solo se usa en la carga inicial. Sin esto, el error
  // del último intento de sincronizar únicamente se veía durante los ~50
  // segundos de sondeo de handleSyncCategories: si el worker tardaba más que
  // eso (encolar un runner de GitHub Actions ha llegado a tomar 14 minutos) o
  // si la persona recargaba, el fallo quedaba invisible y el Paso 2 mostraba
  // otra vez el botón, como si nunca se hubiera intentado nada. Fue justo lo
  // que ocultó durante horas el caso de Estee Soto (14/8/2026): su cuenta vive
  // en tagcrush.net, el login a 10minuteswebsite.net fallaba siempre, y el
  // mensaje que lo decía nunca llegaba a verse.
  const loadAll = useCallback(async (surfaceLastSyncError = false) => {
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
        const loadedCats: CategoryRow[] = data.categories || [];
        setCategories(loadedCats);
        const lastJob = data.lastSyncJob;
        setLastSyncStatus(lastJob?.status ?? null);
        setLastSyncError(lastJob?.errorMessage ?? null);
        // Mismo hueco que el del error (ver comentario arriba): si la última
        // sincronización SÍ terminó pero sin encontrar categorías reales en
        // el sitio, eso tampoco se veía al recargar — solo durante el
        // sondeo en vivo. Silencio total, indistinguible de "nunca se
        // intentó nada".
        if (surfaceLastSyncError && loadedCats.length === 0 && lastJob) {
          if (lastJob.status === "error") {
            setMessage({
              type: "error",
              text: `❌ El último intento de sincronizar falló: ${lastJob.errorMessage || "no se pudo conectar"}`,
            });
          } else if (lastJob.status === "success") {
            setMessage({
              type: "info",
              text: "La última conexión con tu sitio funcionó, pero no se encontraron categorías creadas. Créalas en tu plataforma y vuelve a sincronizar.",
            });
          }
        }
      }
      if (langRes.ok) {
        const data = await langRes.json();
        setLanguages(data.languages || []);
      }
      if (meRes.ok) {
        const data = await meRes.json();
        const lang = data.contentLanguage || "";
        setContentLanguage(lang);
        setSelectedLang(lang || "es");
        if (typeof data.platformDomain === "string") {
          setPlatformDomain(data.platformDomain);
        }
      }
      if (googleRes.ok) {
        const data = await googleRes.json();
        setGoogleData(data);
        if (data.siteUrl) {
          setSelectedGoogleSite(data.siteUrl);
        } else if (data.sites && data.sites.length > 0) {
          setSelectedGoogleSite(data.sites[0].siteUrl);
        }
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
    loadAll(true);
  }, [loadAll]);

  // Un job encolado o corriendo significa que el worker todavía no terminó.
  const categorySyncInProgress =
    lastSyncStatus === "pending" || lastSyncStatus === "running";

  // La espera, copiada de Configuración: se consulta cada 3 segundos mientras
  // el job siga vivo, sin límite de intentos. El worker corre en GitHub
  // Actions y puede tardar varios minutos; cualquier tope fijo se queda corto
  // justo cuando más importa.
  useEffect(() => {
    if (!categorySyncInProgress) return;
    const interval = setInterval(() => {
      loadAll();
    }, 3000);
    return () => clearInterval(interval);
  }, [categorySyncInProgress, loadAll]);

  // Resultado del intento, una vez que el job dejó de estar en curso. Los
  // errores se muestran siempre (son la única pista de qué falló); el éxito,
  // solo si la persona pidió sincronizar en esta visita, para no saludarla con
  // un "sincronizado" cada vez que abre el asistente.
  useEffect(() => {
    if (categorySyncInProgress) return;
    if (lastSyncStatus === "error") {
      setMessage({
        type: "error",
        text: `❌ No se pudieron descargar las categorías: ${lastSyncError || "no se pudo conectar"}`,
      });
      return;
    }
    if (!syncRequested || lastSyncStatus !== "success") return;
    if (categories.length > 0) {
      setMessage({
        type: "success",
        text: `¡Listo! Se descargaron ${categories.length} categorías de tu sitio web.`,
      });
      onUpdated?.();
    } else {
      setMessage({
        type: "info",
        text: "La conexión funcionó, pero tu sitio no tiene categorías creadas todavía. Créalas en tu plataforma y vuelve a sincronizar.",
      });
    }
    setSyncRequested(false);
  }, [
    categorySyncInProgress,
    lastSyncStatus,
    lastSyncError,
    syncRequested,
    categories.length,
    onUpdated,
  ]);

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
      setMessage({ type: "success", text: `Credenciales de ${productName} guardadas con éxito.` });
      await loadAll();
      onUpdated?.();
    } finally {
      setSavingCreds(false);
    }
  }

  // Mismo algoritmo que la pantalla de Configuración (Cuenta & Contenido),
  // que sí funciona: encolar el trabajo y salir. La espera la lleva el
  // useEffect de abajo, consultando cada 3 segundos MIENTRAS el job siga vivo.
  //
  // Antes esta función traía su propio bucle de 25 intentos × 2 s = 50
  // segundos y luego se rendía con un "continúa en segundo plano" que ya no
  // volvía a mirar nunca más. Como el worker corre en GitHub Actions y casi
  // siempre tarda más que eso, la persona se quedaba mirando el botón sin
  // saber si algo estaba pasando — el rollo del Paso 2 durante todo el
  // 14/8/2026.
  async function handleSyncCategories() {
    setSyncingCategories(true);
    setSyncRequested(true);
    setMessage({
      type: "info",
      text: "Conectando con tu sitio para descargar tus categorías...",
    });
    try {
      const [catRes] = await Promise.all([
        fetch("/api/categories/sync", { method: "POST" }),
        fetch("/api/languages/sync", { method: "POST" }).catch(() => null),
      ]);
      const data = await catRes.json().catch(() => ({}));
      if (!catRes.ok) {
        setMessage({
          type: "error",
          text: data.error || "Error al solicitar sincronización de categorías",
        });
        return;
      }
      await loadAll();
    } catch {
      setMessage({
        type: "error",
        text: "Error de red al sincronizar categorías. Inténtalo de nuevo.",
      });
    } finally {
      setSyncingCategories(false);
    }
  }

  async function handleSaveManualCategory(e: FormEvent) {
    e.preventDefault();
    const cleanName = manualCategoryName.trim();
    if (!cleanName) return;
    setSavingManualCategory(true);
    setMessage(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Error al guardar la categoría." });
        return;
      }
      setManualCategoryName("");
      setShowManualCategory(false);
      setMessage({ type: "success", text: `Categoría "${cleanName}" agregada con éxito.` });
      await loadAll();
      onUpdated?.();
    } finally {
      setSavingManualCategory(false);
    }
  }

  async function handleSaveLanguage(langId: string) {
    const cleanLang = (langId || selectedLang || "es").trim();
    if (!cleanLang) {
      setMessage({ type: "error", text: "Por favor selecciona un idioma válido." });
      return;
    }
    setSavingLanguage(true);
    setMessage(null);
    try {
      // 1. Guardar idioma en el backend
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentLanguage: cleanLang }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Error al guardar idioma" });
        return;
      }

      // 2. DOBLE VALIDACIÓN: Comprobar activamente contra la BD que quedó persistido
      const verifyRes = await fetch(`/api/me?_t=${Date.now()}`, { cache: "no-store" });
      const verifyData = await verifyRes.json().catch(() => ({}));
      if (verifyData.contentLanguage !== cleanLang) {
        setMessage({
          type: "error",
          text: "Fallo de doble validación: el idioma no se confirmó en la base de datos. Inténtalo nuevamente.",
        });
        return;
      }

      setContentLanguage(cleanLang);
      setSelectedLang(cleanLang);
      setEditingLang(false);
      const name =
        languages.find((l) => l.externalId === cleanLang)?.name ||
        (cleanLang === "es" ? "Español" : cleanLang === "en" ? "Inglés" : cleanLang);
      setMessage({
        type: "success",
        text: `Doble validación exitosa: Idioma ${name} confirmado y verificado en la base de datos.`,
      });
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
      setMessage({ type: "success", text: `Lista de idiomas actualizada desde ${productName}.` });
    } finally {
      setSyncingLanguages(false);
    }
  }

  async function handleSaveGoogleSite(e: FormEvent) {
    e.preventDefault();
    const siteToSave = selectedGoogleSite || googleData?.sites?.[0]?.siteUrl;
    if (!siteToSave) {
      setMessage({ type: "error", text: "Por favor selecciona un sitio web." });
      return;
    }
    setSavingGoogleSite(true);
    setMessage(null);
    try {
      const res = await fetch("/api/search-integrations/google", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteUrl: siteToSave,
          sitemapUrl: googleData?.sitemapUrl || "",
        }),
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

  // Nombre de marca a mostrar: "10minutesWebsite" para cuentas normales, un
  // término genérico para marca blanca (tagcrush) — ver platform-servers.ts.
  const productName = platformProductNameOrNeutral(platformDomain);

  const activeLangName =
    languages.find((l) => l.externalId === contentLanguage)?.name ||
    (contentLanguage === "es" ? "Español" : contentLanguage === "en" ? "Inglés" : contentLanguage);

  if (loading) {
    return (
      <div style={{ ...sectionStyle, padding: "24px", textAlign: "center", color: "#6e6e73" }}>
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
                ? "rgba(52, 199, 89, 0.1)"
                : message.type === "error"
                  ? "rgba(255, 59, 48, 0.08)"
                  : "#f5f5f7",
            border:
              message.type === "success"
                ? "1px solid rgba(52, 199, 89, 0.25)"
                : message.type === "error"
                  ? "1px solid rgba(255, 59, 48, 0.3)"
                  : "1px solid rgba(0, 0, 0, 0.25)",
            color:
              message.type === "success"
                ? "#16803c"
                : message.type === "error"
                  ? "#ff3b30"
                  : "#1d1d1f",
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
        className="panel"
        style={{
          background: "rgba(255, 255, 255, 0.88)",
          borderRadius: 22,
          border: "1px solid rgba(0, 0, 0, 0.07)",
          boxShadow: "none",
          overflow: "hidden",
          padding: 0,
        }}
      >
        {/* Cabecera del Wizard */}
        <div
          style={{
            padding: "24px 28px",
            background: "#ffffff",
            borderBottom: "1px solid rgba(0, 0, 0, 0.07)",
            color: "#1d1d1f",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span className="step-badge" style={{ marginBottom: 0 }}>
                GUÍA PASO A PASO
              </span>
              <span className="muted" style={{ fontSize: 13 }}>
                {completedCoreSteps} de {totalCoreSteps} pasos listos ({progressPercent}%)
              </span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: "#1d1d1f", letterSpacing: "-0.025em" }}>
              {allCoreDone
                ? "Configuración Inicial Completa"
                : "Configuración Inicial: Puesta a punto"}
            </h2>
            <p className="lead-copy" style={{ margin: "6px 0 0", maxWidth: 620 }}>
              Completa estos 4 pasos en orden para dejar tu plataforma 100% activa para redactar y posicionar artículos.
            </p>
          </div>

          <div style={{ minWidth: 160, textAlign: "right" }}>
            <div
              style={{
                width: "100%",
                height: 6,
                background: "rgba(0, 0, 0, 0.06)",
                borderRadius: 999,
                overflow: "hidden",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  background: allCoreDone ? "#34c759" : "#1d1d1f",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: allCoreDone ? "#16803c" : "#1d1d1f" }}>
              {allCoreDone ? "100% Configurado" : `${progressPercent}% completado`}
            </span>
          </div>
        </div>

        {/* Lista Vertical de Pasos */}
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* PASO 1: 10minutesWebsite                               */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <StepCard
            stepNumber={1}
            title={`Conectar tu cuenta de ${productName}`}
            subtitle={`Ingresa el usuario y contraseña con los que entras a tu plataforma de ${productName}.`}
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
                  background: "rgba(52, 199, 89, 0.1)",
                  borderRadius: 8,
                  border: "1px solid rgba(52, 199, 89, 0.25)",
                }}
              >
                <div style={{ fontSize: 13, color: "#16803c" }}>
                  Credenciales de {productName} guardadas y verificadas de forma segura.
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
                {/* Cuadro de recomendación fuerte para resetear contraseña */}
                <div
                  style={{
                    background: "#fff4e5",
                    border: "1.5px solid rgba(255, 149, 0, 0.4)",
                    borderRadius: 8,
                    padding: "12px 14px",
                    marginBottom: 14,
                    fontSize: 13,
                    color: "#8a5a00",
                    lineHeight: 1.45,
                  }}
                >
                  <p style={{ margin: "0 0 6px 0", fontWeight: 700 }}>
                    Paso recomendado antes de continuar: resetea tu contraseña de la plataforma
                  </p>
                  <p style={{ margin: "0 0 8px 0" }}>
                    Aunque ya conozcas tu contraseña, te recomendamos generarla de nuevo aquí. Así evitas errores por claves antiguas, olvidadas o mal copiadas, y te aseguras de que la que ingreses abajo sea exactamente la correcta.
                  </p>
                  <a
                    href={platformForgotPasswordUrl(platformDomain)}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "#ff9500",
                      color: "#ffffff",
                      padding: "7px 14px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    Resetear contraseña de la plataforma ahora ↗
                  </a>
                  <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#8a5a00" }}>
                    <strong>Importante:</strong> al generar tu nueva contraseña en la plataforma, copia y pega esa misma clave en el campo de abajo para que ambos sistemas queden sincronizados.
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
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#1d1d1f", marginBottom: 4 }}>
                      Usuario o Email de {productName}:
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
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#1d1d1f", marginBottom: 4 }}>
                      Contraseña de {productName}:
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
                        background: "#1d1d1f",
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
            subtitle={`Auto Artículos descarga las categorías creadas en tu web de ${productName} para saber dónde clasificar los artículos.`}
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
                <p style={{ fontSize: 13, color: "#6e6e73", margin: 0 }}>
                  Este paso se desbloqueará automáticamente al completar el Paso 1.
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
                      background: "rgba(52, 199, 89, 0.1)",
                      borderRadius: 8,
                      border: "1px solid rgba(52, 199, 89, 0.25)",
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontSize: 13, color: "#16803c" }}>
                      <strong>{categories.length} categorías</strong> sincronizadas y listas para publicar.
                    </div>
                    <button
                      type="button"
                      onClick={handleSyncCategories}
                      disabled={syncingCategories || categorySyncInProgress}
                      style={{ ...secondaryButtonStyle, fontSize: 12, padding: "6px 12px" }}
                    >
                      {syncingCategories || categorySyncInProgress
                        ? "Sincronizando... (puede tardar varios minutos)"
                        : "Volver a sincronizar"}
                    </button>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {categories.map((cat) => (
                      <span
                        key={cat.id}
                        style={{
                          background: "#f5f5f7",
                          color: "#1d1d1f",
                          fontSize: 12,
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontWeight: 500,
                        }}
                      >
                        {cat.name}
                        {cat.panel ? ` (${cat.panel})` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: "#f5f5f7",
                    border: "1px solid #d2d2d7",
                    borderRadius: 8,
                    padding: "14px 16px",
                  }}
                >
                  {syncingCategories || categorySyncInProgress ? (
                    <div
                      style={{
                        background: "#ffffff",
                        border: "2px solid #1d1d1f",
                        borderRadius: 10,
                        padding: "18px 20px",
                        textAlign: "center",
                        boxShadow: "none",
                      }}
                    >
                      <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
                      <h4 style={{ margin: "0 0 6px 0", fontSize: 16, color: "#1d1d1f", fontWeight: 800 }}>
                        Conectando con tu sitio web de {productName}...
                      </h4>
                      <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#6e6e73", lineHeight: 1.5, maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>
                        Nuestro robot está ingresando a tu cuenta para descargar automáticamente todas las categorías de tu web. Puede tardar <strong>unos minutos</strong> según la cola de trabajo; esta pantalla se actualiza sola cuando termine, no hace falta que hagas nada.
                      </p>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          background: "#f5f5f7",
                          color: "#1d1d1f",
                          padding: "8px 16px",
                          borderRadius: 20,
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        <span>Sincronización en curso... por favor no recargues la página</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p style={{ margin: "0 0 10px 0", fontSize: 13, color: "#1d1d1f", fontWeight: 500 }}>
                        Haz clic a continuación para conectar con tu cuenta de {productName} y descargar tus categorías:
                      </p>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={handleSyncCategories}
                          disabled={syncingCategories}
                          style={{
                            background: "#1d1d1f",
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
                            boxShadow: "none",
                          }}
                        >
                          Sincronizar mis Categorías Ahora →
                        </button>
                      </div>

                      <div style={{ marginTop: 12, borderTop: "1px dashed rgba(0, 0, 0, 0.25)", paddingTop: 10 }}>
                        {!showManualCategory ? (
                          <button
                            type="button"
                            onClick={() => setShowManualCategory(true)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#1d1d1f",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              textDecoration: "underline",
                              padding: 0,
                            }}
                          >
                            ➕ ¿Quieres agregar una categoría manualmente? Haz clic aquí
                          </button>
                        ) : (
                          <form
                            onSubmit={handleSaveManualCategory}
                            style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
                          >
                            <input
                              type="text"
                              placeholder="Ej: Noticias, Blog, Servicios..."
                              value={manualCategoryName}
                              onChange={(e) => setManualCategoryName(e.target.value)}
                              disabled={savingManualCategory}
                              style={{ ...inputStyle, maxWidth: 260, fontSize: 13, background: "#fff" }}
                            />
                            <button
                              type="submit"
                              disabled={savingManualCategory || !manualCategoryName.trim()}
                              style={{
                                background: "#1d1d1f",
                                color: "#fff",
                                border: "none",
                                borderRadius: 8,
                                padding: "8px 14px",
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: savingManualCategory || !manualCategoryName.trim() ? "not-allowed" : "pointer",
                              }}
                            >
                              {savingManualCategory ? "Guardando..." : "Guardar Categoría"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowManualCategory(false)}
                              style={{ ...secondaryButtonStyle, padding: "8px 12px", fontSize: 12 }}
                            >
                              Cancelar
                            </button>
                          </form>
                        )}
                      </div>
                    </>
                  )}
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
                <p style={{ fontSize: 13, color: "#6e6e73", margin: 0 }}>
                  Este paso se desbloqueará automáticamente al completar el Paso 2.
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
                    background: "rgba(52, 199, 89, 0.1)",
                    borderRadius: 8,
                    border: "1px solid rgba(52, 199, 89, 0.25)",
                  }}
                >
                  <div style={{ fontSize: 13, color: "#16803c" }}>
                    Idioma activo: <strong>{activeLangName}</strong>. Los artículos se generarán en este idioma.
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
                    background: "#f5f5f7",
                    border: "1px solid #d2d2d7",
                    borderRadius: 8,
                    padding: "14px 16px",
                  }}
                >
                  <p style={{ fontSize: 13, color: "#1d1d1f", margin: "0 0 10px 0", fontWeight: 500 }}>
                    Elige el idioma principal para tus artículos:
                  </p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                    <select
                      value={selectedLang || contentLanguage || "es"}
                      onChange={(e) => setSelectedLang(e.target.value)}
                      disabled={savingLanguage}
                      style={{
                        ...inputStyle,
                        maxWidth: 320,
                        fontWeight: 600,
                        color: "#1d1d1f",
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
                      onClick={() => handleSaveLanguage(selectedLang || contentLanguage || "es")}
                      disabled={savingLanguage}
                      style={{
                        background: "#1d1d1f",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "9px 16px",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: savingLanguage ? "not-allowed" : "pointer",
                      }}
                    >
                      {savingLanguage ? "Validando en BD..." : "Confirmar y Validar Idioma →"}
                    </button>

                    <button
                      type="button"
                      onClick={handleSyncLanguagesList}
                      disabled={syncingLanguages}
                      style={{ ...secondaryButtonStyle, fontSize: 12, padding: "8px 12px" }}
                      title={`Descargar idiomas actualizados desde ${productName}`}
                    >
                      {syncingLanguages ? "Sincronizando..." : "Recargar lista"}
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
              {/* Bloque del video tutorial: SIEMPRE VISIBLE */}
              <div
                style={{
                  background: "#f5f5f7",
                  border: "1px solid #d2d2d7",
                  borderRadius: 8,
                  padding: "14px 16px",
                  marginBottom: 14,
                  fontSize: 13,
                  color: "#1d1d1f",
                  lineHeight: 1.5,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}></span>
                  <strong style={{ fontSize: 14, color: "#1d1d1f" }}>¿No tienes el Google Search Console?</strong>
                </div>
                <p style={{ margin: "0 0 10px 0", fontSize: 13, color: "#6e6e73" }}>
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
                    background: "#ff3b30",
                    color: "#ffffff",
                    textDecoration: "none",
                    padding: "8px 14px",
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 13,
                    boxShadow: "none",
                  }}
                >
                  ▶Ver video: Cómo activar Google Search Console ↗
                </a>
              </div>

              {!step3Done ? (
                <p style={{ fontSize: 13, color: "#6e6e73", margin: 0 }}>
                  El botón de conexión se desbloqueará automáticamente al completar el Paso 3.
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
                        background: "rgba(52, 199, 89, 0.1)",
                        borderRadius: 8,
                        border: "1px solid rgba(52, 199, 89, 0.25)",
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ fontSize: 13, color: "#16803c" }}>
                        Google Search Console conectado y activo en: <strong>{googleData?.siteUrl}</strong>
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
                      background: "#f5f5f7",
                      border: "1px solid #e5e5ea",
                      borderRadius: 8,
                      padding: "12px 14px",
                      marginBottom: 12,
                      fontSize: 13,
                      color: "#6e6e73",
                      lineHeight: 1.5,
                    }}
                  >
                    <p style={{ margin: "0 0 4px 0", fontWeight: 700 }}>
                      Instrucción antes de conectar:
                    </p>
                    <p style={{ margin: 0 }}>
                      Abre tu <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" style={{ color: "#1d1d1f", fontWeight: 700, textDecoration: "underline" }}>Google Search Console ↗</a> en una pestaña al lado de tu navegador, asegúrate de que funciona y que lo tienes activado con la misma cuenta de Google dueña de tu sitio web, y luego haz clic en el botón de abajo.
                    </p>
                  </div>

                  {!googleData?.connected ? (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <a
                        href="/api/search-integrations/google/connect?returnTo=/dashboard"
                        style={{
                          background: "#1d1d1f",
                          color: "#fff",
                          textDecoration: "none",
                          borderRadius: 8,
                          padding: "10px 20px",
                          fontSize: 13,
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          boxShadow: "none",
                        }}
                      >
                        Conectar Google Search Console con Google OAuth →
                      </a>
                    </div>
                  ) : (
                    <div>
                      {googleData.sites && googleData.sites.length > 0 && !customGoogleSite ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <form
                            onSubmit={handleSaveGoogleSite}
                            style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}
                          >
                            <select
                              value={selectedGoogleSite}
                              onChange={(e) => setSelectedGoogleSite(e.target.value)}
                              style={{ ...inputStyle, maxWidth: 360, background: "#fff", color: "#1d1d1f" }}
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
                                background: "#1d1d1f",
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

                          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => setCustomGoogleSite(true)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#1d1d1f",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                textDecoration: "underline",
                                padding: 0,
                              }}
                            >
                              ✏¿No ves tu sitio? Ingresar URL manualmente
                            </button>
                            <a
                              href="/api/search-integrations/google/connect?returnTo=/dashboard&prompt=select_account"
                              style={{ ...secondaryButtonStyle, textDecoration: "none", fontSize: 12, padding: "6px 12px" }}
                            >
                              Cambiar cuenta de Google
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {(!googleData.sites || googleData.sites.length === 0) && (
                            <div
                              style={{
                                background: "#fff4e5",
                                border: "1px solid rgba(255, 149, 0, 0.3)",
                                borderRadius: 8,
                                padding: "10px 14px",
                                fontSize: 13,
                                color: "#8a4b08",
                              }}
                            >
                              Tu cuenta de Google está vinculada, pero no tiene sitios listados en Google Search Console. Puedes ingresar la URL exacta de tu propiedad a continuación:
                            </div>
                          )}

                          <form
                            onSubmit={handleSaveGoogleSite}
                            style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}
                          >
                            <input
                              type="text"
                              placeholder="https://www.tusitio.com/ o sc-domain:tusitio.com"
                              value={selectedGoogleSite}
                              onChange={(e) => setSelectedGoogleSite(e.target.value)}
                              disabled={savingGoogleSite}
                              style={{ ...inputStyle, maxWidth: 360, background: "#fff", color: "#1d1d1f" }}
                            />
                            <button
                              type="submit"
                              disabled={savingGoogleSite || !selectedGoogleSite.trim()}
                              style={{
                                background: "#1d1d1f",
                                color: "#fff",
                                border: "none",
                                borderRadius: 8,
                                padding: "9px 16px",
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: savingGoogleSite || !selectedGoogleSite.trim() ? "not-allowed" : "pointer",
                              }}
                            >
                              {savingGoogleSite ? "Guardando..." : "Confirmar Sitio →"}
                            </button>
                          </form>

                          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                            {googleData.sites && googleData.sites.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setCustomGoogleSite(false)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#1d1d1f",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  textDecoration: "underline",
                                  padding: 0,
                                }}
                              >
                                Volver a la lista de sitios detectados
                              </button>
                            )}
                            <a
                              href="/api/search-integrations/google/connect?returnTo=/dashboard&prompt=select_account"
                              style={{ ...secondaryButtonStyle, textDecoration: "none", fontSize: 12, padding: "6px 12px" }}
                            >
                              Cambiar cuenta de Google
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </StepCard>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* PASO 5: META FINAL - CREAR Y EXPLORAR OPORTUNIDADES SEO */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <StepCard
            stepNumber={5}
            title="Crear y Explorar Oportunidades SEO"
            subtitle="Tu plataforma está lista. Ahora dirígete al módulo de Oportunidades para que la IA analice las búsquedas de tu audiencia en Google y te sugiera los mejores temas listos para publicar."
            isDone={step5Done}
            isActive={activeStep === 5}
            badgeText={
              step5Done
                ? "Oportunidades en marcha"
                : allCoreDone
                  ? "¡Listo para empezar!"
                  : "Pendiente"
            }
          >
            <div style={{ marginTop: 10 }}>
              {!allCoreDone ? (
                <p style={{ fontSize: 13, color: "#6e6e73", margin: 0 }}>
                  Completa los 4 pasos anteriores para comenzar a generar oportunidades de posicionamiento SEO.
                </p>
              ) : (
                <div
                  style={{
                    background: "linear-gradient(135deg, #f5f5f7 0%, #f5f5f7 100%)",
                    border: "1px solid #d2d2d7",
                    borderRadius: 10,
                    padding: "18px 20px",
                  }}
                >
                  <p style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 800, color: "#1d1d1f" }}>
                    ¡Felicitaciones! Has completado todos los pasos de configuración inicial.
                  </p>
                  <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#1d1d1f", lineHeight: 1.5 }}>
                    El siguiente paso es ingresar al módulo de <strong>Oportunidades</strong>. La Inteligencia Artificial analizará las consultas de tus clientes potenciales en Google y creará ideas de contenido listas para publicar con 1 solo clic.
                  </p>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <Link
                      href="/dashboard/oportunidades"
                      style={{
                        background: "#1d1d1f",
                        color: "#fff",
                        textDecoration: "none",
                        padding: "11px 20px",
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        boxShadow: "none",
                      }}
                    >
                      Ir a Crear Oportunidades SEO →
                    </Link>
                    <Link
                      href="/dashboard/publicar"
                      style={{
                        background: "#ffffff",
                        color: "#0066cc",
                        border: "1px solid #d2d2d7",
                        textDecoration: "none",
                        padding: "10px 16px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        display: "inline-block",
                      }}
                    >
                      ✍O redactar un artículo directamente
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
        borderRadius: 14,
        transition: "all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)",
        border: isActive
          ? "1px solid #1d1d1f"
          : "1px solid #e5e5ea",
        background: "#ffffff",
        boxShadow: "none",
        opacity: isPending ? 0.65 : 1,
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
              width: 28,
              height: 28,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
              background: isDone
                ? "#f5f5f7"
                : isActive
                  ? "#1d1d1f"
                  : "#f5f5f7",
              color: isDone
                ? "#1d1d1f"
                : isActive
                  ? "#ffffff"
                  : "#6e6e73",
            }}
          >
            {isDone ? "✓" : stepNumber}
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 600,
                color: "#1d1d1f",
              }}
            >
              {title}
            </h3>
            <p
              style={{
                margin: "3px 0 0 0",
                fontSize: 13,
                color: "#6e6e73",
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
              fontWeight: 500,
              padding: "4px 10px",
              borderRadius: 999,
              background: isDone
                ? "rgba(52, 199, 89, 0.1)"
                : isActive
                  ? "#f5f5f7"
                  : "#f5f5f7",
              color: isDone
                ? "#16803c"
                : isActive
                  ? "#1d1d1f"
                  : "#6e6e73",
            }}
          >
            {isDone ? `✓ ${badgeText}` : badgeText}
          </span>
        )}
      </div>

      <div style={{ marginTop: 6, paddingLeft: 40 }}>
        {children}
      </div>
    </div>
  );
}
