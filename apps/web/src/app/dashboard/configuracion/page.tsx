"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import {
  sectionStyle,
  h2Style,
  inputStyle,
  secondaryButtonStyle,
  readySectionStyle,
  disabledStyle,
  ReadyBadge,
} from "@/components/dashboard-ui";
import type { CategoryRow, LanguageRow, SyncStatus } from "@/types/dashboard";
import GoogleSearchConsoleSection from "@/components/GoogleSearchConsoleSection";
import BusinessProfileSection from "@/components/BusinessProfileSection";
import BingWebmasterSection from "@/components/BingWebmasterSection";
import ThreadsSection from "@/components/ThreadsSection";
import TwitterSection from "@/components/TwitterSection";
import LinkedInSection from "@/components/LinkedInSection";
import PhotoLogoUploader from "@/components/PhotoLogoUploader";
import OnboardingWizard from "@/components/OnboardingWizard";

export default function ConfiguracionPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [credentialsConfigured, setCredentialsConfigured] = useState(false);
  const [editingCredentials, setEditingCredentials] = useState(false);
  const [savingCreds, setSavingCreds] = useState(false);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [lastSyncStatus, setLastSyncStatus] = useState<SyncStatus | null>(null);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [lastLanguageSyncStatus, setLastLanguageSyncStatus] =
    useState<SyncStatus | null>(null);
  const [lastLanguageSyncError, setLastLanguageSyncError] = useState<
    string | null
  >(null);
  const [languageSyncing, setLanguageSyncing] = useState(false);
  const [contentLanguage, setContentLanguage] = useState("");
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [articleSignature, setArticleSignature] = useState("");
  const [savingSignature, setSavingSignature] = useState(false);
  const [phone, setPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [savingImagePrompt, setSavingImagePrompt] = useState(false);
  const [infographicPrompt, setInfographicPrompt] = useState("");
  const [savingInfographicPrompt, setSavingInfographicPrompt] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [businessLogoUrl, setBusinessLogoUrl] = useState<string | null>(null);
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);
  const [uploadingBusinessLogo, setUploadingBusinessLogo] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [allowInstagramPublishing, setAllowInstagramPublishing] = useState(false);
  const [allowLinkedInPublishing, setAllowLinkedInPublishing] = useState(false);
  const [allowThreadsPublishing, setAllowThreadsPublishing] = useState(false);
  const [disabledModules, setDisabledModules] = useState<string[]>([]);
  const [triggeringFix, setTriggeringFix] = useState(false);
  const [clearingFixHistory, setClearingFixHistory] = useState(false);
  const [fixStatus, setFixStatus] = useState<{
    active: boolean;
    status?: string;
    total?: number;
    processed?: number;
    repaired?: { title: string; url: string }[];
    logs?: string[];
    history?: {
      id: string;
      status: string;
      createdAt: string;
      finishedAt: string | null;
      repairedCount: number;
      alreadyCorrectCount: number;
      totalReviewed: number;
      articles: { title: string; url: string; status: "repaired" | "already_correct" }[];
      logs: string[];
      stopPoint: string | null;
    }[];
    repairedHistory?: { title: string; url: string }[];
  } | null>(null);
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});
  const MAX_SIGNATURE_LEN = 700;
  const [banner, setBanner] = useState<{
    type: "error" | "info";
    text: string;
  } | null>(null);

  const loadFixStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/fix-patricia/status", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setFixStatus(data);
      }
    } catch (e) {
      console.error("Error al cargar estado de reparacion:", e);
    }
  }, []);

  const syncInProgress =
    lastSyncStatus === "pending" || lastSyncStatus === "running";
  const languageSyncInProgress =
    lastLanguageSyncStatus === "pending" || lastLanguageSyncStatus === "running";

  const loadCredentialsStatus = useCallback(async () => {
    const res = await fetch("/api/credentials", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setCredentialsConfigured(Boolean(data.configured));
    }
  }, []);

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/categories", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories);
      setLastSyncStatus(data.lastSyncJob?.status ?? null);
      setLastSyncError(data.lastSyncJob?.errorMessage ?? null);
    }
  }, []);

  const loadLanguages = useCallback(async () => {
    const [langRes, meRes] = await Promise.all([
      fetch("/api/languages", { cache: "no-store" }),
      fetch("/api/me", { cache: "no-store" }),
    ]);
    if (langRes.ok) {
      const data = await langRes.json();
      setLanguages(data.languages);
      setLastLanguageSyncStatus(data.lastSyncJob?.status ?? null);
      setLastLanguageSyncError(data.lastSyncJob?.errorMessage ?? null);
    }
    if (meRes.ok) {
       const data = await meRes.json();
       setContentLanguage(data.contentLanguage ?? "");
       setArticleSignature(data.articleSignature ?? "");
       setPhone(data.phone ?? "");
       setImagePrompt(data.imagePrompt ?? "");
       setInfographicPrompt(data.infographicPrompt ?? "");
       setProfilePhotoUrl(data.profilePhotoUrl ?? null);
       setBusinessLogoUrl(data.businessLogoUrl ?? null);
        setIsAdmin(data.role === "admin");
        setUserEmail(data.email ?? "");
        setAllowInstagramPublishing(data.allowInstagramPublishing ?? false);
        setAllowLinkedInPublishing(data.allowLinkedInPublishing ?? false);
        setAllowThreadsPublishing(data.allowThreadsPublishing ?? false);
        if (Array.isArray(data.disabledModules)) {
          setDisabledModules(data.disabledModules);
        }
    }
  }, []);

  useEffect(() => {
    loadCredentialsStatus();
    loadCategories();
    loadLanguages();
    loadFixStatus();
  }, [loadCredentialsStatus, loadCategories, loadLanguages, loadFixStatus]);

  useEffect(() => {
    if (!isAdmin) return;
    const interval = setInterval(loadFixStatus, 3000);
    return () => clearInterval(interval);
  }, [isAdmin, loadFixStatus]);

  useEffect(() => {
    if (!syncInProgress) return;
    const interval = setInterval(loadCategories, 3000);
    return () => clearInterval(interval);
  }, [syncInProgress, loadCategories]);

  useEffect(() => {
    if (!languageSyncInProgress) return;
    const interval = setInterval(loadLanguages, 3000);
    return () => clearInterval(interval);
  }, [languageSyncInProgress, loadLanguages]);

  async function handleSaveCredentials(e: FormEvent) {
    e.preventDefault();
    setSavingCreds(true);
    setBanner(null);
    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setBanner({
          type: "error",
          text: data.error ?? "Error al guardar credenciales",
        });
        return;
      }
      setUsername("");
      setPassword("");
      setEditingCredentials(false);
      setBanner({
        type: "info",
        text: "Credenciales guardadas de forma cifrada.",
      });
      loadCredentialsStatus();
    } finally {
      setSavingCreds(false);
    }
  }

  async function handleSyncCategories() {
    setSyncing(true);
    setBanner(null);
    try {
      const res = await fetch("/api/categories/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({
          type: "error",
          text: data.error ?? "Error al sincronizar categorías",
        });
        return;
      }
      loadCategories();
    } finally {
      setSyncing(false);
    }
  }

  async function handleSyncLanguages() {
    setLanguageSyncing(true);
    setBanner(null);
    try {
      const res = await fetch("/api/languages/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({
          type: "error",
          text: data.error ?? "Error al sincronizar idiomas",
        });
        return;
      }
      loadLanguages();
    } finally {
      setLanguageSyncing(false);
    }
  }

  async function handleSaveLanguage() {
    setSavingLanguage(true);
    setBanner(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentLanguage }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({
          type: "error",
          text: data.error ?? "Error al guardar el idioma",
        });
        return;
      }
      setBanner({ type: "info", text: "Idioma de los artículos guardado." });
    } finally {
      setSavingLanguage(false);
    }
  }

  async function handleSaveSignature() {
    setSavingSignature(true);
    setBanner(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleSignature }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({
          type: "error",
          text: data.error ?? "Error al guardar el texto final",
        });
        return;
      }
      setBanner({ type: "info", text: "Texto final del artículo guardado." });
    } finally {
      setSavingSignature(false);
    }
  }

  async function handleSavePhone() {
    setSavingPhone(true);
    setBanner(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({
          type: "error",
          text: data.error ?? "Error al guardar el teléfono",
        });
        return;
      }
      setBanner({ type: "info", text: "Número de teléfono guardado con éxito." });
    } finally {
      setSavingPhone(false);
    }
  }

  async function handleSaveImagePrompt() {
    setSavingImagePrompt(true);
    setBanner(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePrompt: imagePrompt.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({
          type: "error",
          text: data.error ?? "Error al guardar el prompt de imagen",
        });
        return;
      }
      setImagePrompt(data.imagePrompt ?? "");
      setBanner({ type: "info", text: "Prompt de imagen guardado con éxito." });
    } finally {
      setSavingImagePrompt(false);
    }
  }

  async function handleSaveInfographicPrompt() {
    setSavingInfographicPrompt(true);
    setBanner(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ infographicPrompt: infographicPrompt.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({
          type: "error",
          text: data.error ?? "Error al guardar el prompt de infografía",
        });
        return;
      }
      setInfographicPrompt(data.infographicPrompt ?? "");
      setBanner({ type: "info", text: "Prompt de infografía guardado con éxito." });
    } finally {
      setSavingInfographicPrompt(false);
    }
  }

  async function handleUploadImage(type: "profile" | "logo", file: File) {
    const setUploading = type === "profile" ? setUploadingProfilePhoto : setUploadingBusinessLogo;
    setUploading(true);
    setImageUploadError(null);
    try {
      const formData = new FormData();
      formData.append("type", type);
      formData.append("file", file);
      const res = await fetch("/api/me/upload-image", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error ?? "Error al subir la imagen.";
        setImageUploadError(msg);
        throw new Error(msg);
      }
      if (type === "profile") {
        setProfilePhotoUrl(data.url);
      } else {
        setBusinessLogoUrl(data.url);
      }
      const kb = data.sizeBytes ? Math.round(data.sizeBytes / 1024) : null;
      const sizeNote = kb ? ` (${kb}KB)` : "";
      setBanner({
        type: "info",
        text:
          (type === "profile" ? "Foto de perfil guardada" : "Logo guardado") + sizeNote + ".",
      });
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Error de conexión al subir la imagen.";
      setImageUploadError(msg);
      throw err;
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveImage(type: "profile" | "logo") {
    const label = type === "profile" ? "tu foto de perfil" : "el logo del negocio";
    if (!confirm(`¿Deseas eliminar ${label}?`)) return;
    const setUploading = type === "profile" ? setUploadingProfilePhoto : setUploadingBusinessLogo;
    setUploading(true);
    try {
      await fetch("/api/me/upload-image", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (type === "profile") {
        setProfilePhotoUrl(null);
      } else {
        setBusinessLogoUrl(null);
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleTriggerFix() {
    if (!confirm("¿Deseas procesar el siguiente lote de hasta 20 artículos de Patricia Coy?")) {
      return;
    }
    setTriggeringFix(true);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/fix-patricia", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({
          type: "error",
          text: data.error ?? "Error al iniciar la reparación",
        });
        return;
      }
      setBanner({
        type: "info",
        text: "Reparación programada con éxito. El progreso aparecerá debajo de este botón.",
      });
    } finally {
      setTriggeringFix(false);
    }
  }

  async function handleClearFixHistory() {
    if (!confirm("¿Borrar definitivamente todo el historial y los logs de la herramienta Patricia Coy? Esto no borra artículos.")) return;
    setClearingFixHistory(true);
    try {
      const res = await fetch("/api/admin/fix-patricia", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({ type: "error", text: data.error ?? "No se pudo borrar el historial" });
        return;
      }
      setFixStatus({ active: false, history: [], logs: [], repaired: [] });
      setBanner({ type: "info", text: `Historial reiniciado: ${data.deletedRuns ?? 0} corridas eliminadas.` });
    } finally {
      setClearingFixHistory(false);
    }
  }

  const [activeTab, setActiveTab] = useState<
    "wizard" | "integrations" | "social" | "platform" | "mobile"
  >("integrations");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (
      tabParam === "wizard" ||
      tabParam === "integrations" ||
      tabParam === "social" ||
      tabParam === "platform" ||
      tabParam === "mobile"
    ) {
      setActiveTab(tabParam);
    }

    const hash = window.location.hash;
    if (hash === "#credentials" || hash === "#categories" || hash === "#language") {
      setActiveTab("platform");
      setTimeout(() => {
        const el = document.getElementById(hash.replace("#", ""));
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    } else if (hash === "#google" || hash === "#bing") {
      setActiveTab("integrations");
      setTimeout(() => {
        const el = document.getElementById(hash.replace("#", ""));
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, []);

  const showCredentialsForm = editingCredentials || !credentialsConfigured;

  const signaturePercent = Math.min(
    100,
    Math.round((articleSignature.length / MAX_SIGNATURE_LEN) * 100),
  );

  const signatureBarColor =
    signaturePercent >= 95
      ? "#ef4444"
      : signaturePercent >= 80
        ? "#f59e0b"
        : "#2563eb";

  const showSocialTab =
    isAdmin || !disabledModules.includes("oportunidades-redes");

  useEffect(() => {
    if (activeTab === "social" && !showSocialTab) {
      setActiveTab("integrations");
    }
  }, [activeTab, showSocialTab]);

  const tabs: {
    id: "wizard" | "integrations" | "social" | "platform" | "mobile";
    eyebrow: string;
    label: string;
    description: string;
    badge?: string;
  }[] = [
    {
      id: "wizard",
      eyebrow: "Paso a Paso",
      label: "🚀 Configuración Inicial",
      description:
        "Guía paso a paso interactiva para conectar tu web, categorías, idioma y Google Search Console.",
      badge: credentialsConfigured && categories.length > 0 && contentLanguage ? "✓ Listo" : "Guiado",
    },
    {
      id: "integrations",
      eyebrow: "Buscadores",
      label: "🔍 Indexación & SEO",
      description:
        "Conecta Google Search Console y Bing Webmaster Tools para monitorear y mejorar la indexación de tus artículos.",
    },
    ...(showSocialTab
      ? [
          {
            id: "social" as const,
            eyebrow: "Redes Sociales",
            label: "📱 Publicación Automática",
            description:
              "Conecta Instagram, Threads y Google Business Profile para publicar tus artículos en redes sociales.",
          },
        ]
      : []),
    {
      id: "platform",
      eyebrow: "10minutesWebsite",
      label: "🔐 Cuenta & Contenido",
      description:
        "Credenciales, categorías, idioma de redacción, firma y teléfono de contacto.",
      badge: credentialsConfigured ? "✓ Listo" : undefined,
    },
    {
      id: "mobile",
      eyebrow: "Dispositivos",
      label: "📲 App Móvil",
      description:
        "Código QR e instrucciones para instalar Auto Artículos en tu celular.",
    },
  ];

  const activeLangName =
    languages.find((l) => l.externalId === contentLanguage)?.name ??
    "Sin definir";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Hero Control Center Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #071330 0%, #0f2766 100%)",
          color: "#ffffff",
          borderRadius: 16,
          padding: "24px 28px",
          marginBottom: 20,
          boxShadow: "0 14px 36px rgba(7, 19, 48, 0.25)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow accent */}
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(59,130,246,0.3) 0%, rgba(0,0,0,0) 70%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 999,
                background: "rgba(59, 130, 246, 0.2)",
                border: "1px solid rgba(59, 130, 246, 0.4)",
                color: "#93c5fd",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.05em",
                marginBottom: 10,
              }}
            >
              🎛️ CENTRO DE CONTROL PRO
            </span>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 800,
                margin: "0 0 6px 0",
                color: "#ffffff",
                letterSpacing: "-0.02em",
              }}
            >
              Configuración del Sistema
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "#cbd5e1",
                margin: 0,
                maxWidth: 650,
                lineHeight: 1.45,
              }}
            >
              Conecta tus buscadores y redes sociales, configura tu cuenta de
               10minutesWebsite, personaliza el contenido de tus artículos y accede desde tu celular.
            </p>
          </div>

          {/* Status Chips Bar */}
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignSelf: "center",
            }}
          >
            <div
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                backdropFilter: "blur(8px)",
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255, 255, 255, 0.12)",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: credentialsConfigured ? "#22c55e" : "#f59e0b",
                  boxShadow: credentialsConfigured
                    ? "0 0 8px #22c55e"
                    : "0 0 8px #f59e0b",
                }}
              />
              <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
                10minutesWebsite:
              </span>
              <span
                style={{
                  color: credentialsConfigured ? "#4ade80" : "#fbbf24",
                  fontWeight: 700,
                }}
              >
                {credentialsConfigured ? "Cifrado & Activo" : "Pendiente"}
              </span>
            </div>

            <div
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                backdropFilter: "blur(8px)",
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255, 255, 255, 0.12)",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
                Categorías:
              </span>
              <span style={{ color: "#60a5fa", fontWeight: 700 }}>
                {categories.length} sincronizadas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Banner Prominente de Configuración Inicial (si no está en la pestaña wizard) */}
      {activeTab !== "wizard" && (
        <div
          onClick={() => setActiveTab("wizard")}
          style={{
            background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
            color: "#ffffff",
            borderRadius: 14,
            padding: "16px 20px",
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 14,
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(37, 99, 235, 0.25)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(255, 255, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              🚀
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    background: "#fbbf24",
                    color: "#78350f",
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 6,
                    letterSpacing: "0.05em",
                  }}
                >
                  GUÍA RECOMENDADA
                </span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#ffffff" }}>
                  Asistente de Configuración Inicial Paso a Paso
                </span>
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#bfdbfe" }}>
                Conecta tu cuenta en 4 sencillos pasos ordenados: 10minutesWebsite ➔ Categorías ➔ Idioma ➔ Google Search Console.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab("wizard");
            }}
            style={{
              background: "#ffffff",
              color: "#1e3a8a",
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            Abrir Asistente Paso a Paso →
          </button>
        </div>
      )}

      {/* Pro Selector de Pestañas (Glassmorphism & Interactive Cards) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          const isWizard = t.id === "wizard";

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              aria-pressed={isActive}
              style={{
                position: "relative",
                minHeight: 115,
                padding: "18px 20px",
                overflow: "hidden",
                textAlign: "left",
                fontFamily: "inherit",
                cursor: "pointer",
                borderRadius: 14,
                border: isWizard
                  ? isActive
                    ? "2px solid #1d4ed8"
                    : "2px solid #3b82f6"
                  : isActive
                    ? "2px solid #2563eb"
                    : "1px solid rgba(226, 232, 240, 0.8)",
                background: isWizard
                  ? isActive
                    ? "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)"
                    : "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)"
                  : isActive
                    ? "linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)"
                    : "#ffffff",
                color: isWizard && isActive ? "#ffffff" : "#0f172a",
                boxShadow: isWizard
                  ? isActive
                    ? "0 12px 28px rgba(37, 99, 235, 0.3)"
                    : "0 6px 18px rgba(37, 99, 235, 0.15)"
                  : isActive
                    ? "0 10px 24px rgba(37, 99, 235, 0.15)"
                    : "0 2px 8px rgba(15, 23, 42, 0.04)",
                transform: isActive || isWizard ? "translateY(-2px)" : "translateY(0)",
                transition: "all 0.2s ease-in-out",
              }}
            >
              {/* Active Indicator Bar */}
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: isWizard
                      ? "#60a5fa"
                      : "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)",
                  }}
                />
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: isWizard
                      ? isActive
                        ? "rgba(255, 255, 255, 0.2)"
                        : "#bfdbfe"
                      : isActive
                        ? "#dbeafe"
                        : "#f1f5f9",
                    color: isWizard
                      ? isActive
                        ? "#ffffff"
                        : "#1e3a8a"
                      : isActive
                        ? "#1d4ed8"
                        : "#64748b",
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {isWizard ? "⭐ " + t.eyebrow : t.eyebrow}
                </span>
                {t.badge && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isWizard && isActive ? "#22c55e" : "#15803d",
                      background: isWizard && isActive ? "rgba(255, 255, 255, 0.9)" : "#dcfce7",
                      padding: "2px 8px",
                      borderRadius: 999,
                    }}
                  >
                    {t.badge}
                  </span>
                )}
              </div>
              <span
                style={{
                  display: "block",
                  marginTop: 10,
                  fontSize: 16,
                  fontWeight: 800,
                  color: isWizard
                    ? isActive
                      ? "#ffffff"
                      : "#1e3a8a"
                    : isActive
                      ? "#1e40af"
                      : "#0f172a",
                }}
              >
                {t.label}
              </span>
              <span
                style={{
                  display: "block",
                  marginTop: 4,
                  color: isWizard
                    ? isActive
                      ? "#dbeafe"
                      : "#334155"
                    : "#64748b",
                  fontSize: 12,
                  lineHeight: 1.4,
                }}
              >
                {t.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pestaña 0: Wizard — Configuración Inicial Paso a Paso */}
      {activeTab === "wizard" && (
        <div>
          <OnboardingWizard
            variant="standalone"
            onUpdated={() => {
              loadCredentialsStatus();
              loadCategories();
              loadLanguages();
            }}
          />
        </div>
      )}

      {/* Pestaña 1: Buscadores — Indexación en Google y Bing */}
      {activeTab === "integrations" && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div id="google">
            <GoogleSearchConsoleSection />
          </div>
          <div id="bing">
            <BingWebmasterSection />
          </div>
        </div>
      )}

      {/* Pestaña 2: Redes Sociales — Publicación automática */}
      {activeTab === "social" && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <BusinessProfileSection />
          {(allowThreadsPublishing || allowInstagramPublishing || isAdmin) && (
            <ThreadsSection allowThreads={allowThreadsPublishing} allowInstagram={allowInstagramPublishing} />
          )}
          <TwitterSection />
          {(allowLinkedInPublishing || isAdmin) && <LinkedInSection allowed={allowLinkedInPublishing} />}
        </div>
      )}

      {/* Pestaña 3: Cuenta & Contenido */}
      {activeTab === "platform" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Credenciales Card */}
          <section id="credentials" style={readySectionStyle(credentialsConfigured)}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <h2 style={{ ...h2Style, margin: 0 }}>
                Credenciales de 10minutesWebsite{" "}
                {credentialsConfigured && <ReadyBadge />}
              </h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#475569",
                  background: "#f1f5f9",
                  padding: "4px 10px",
                  borderRadius: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                🔒 Cifrado AES-256-GCM
              </span>
            </div>

            {!showCredentialsForm && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "rgba(255,255,255,0.7)",
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#1e293b",
                      margin: 0,
                    }}
                  >
                    Credenciales guardadas y activas
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      margin: "2px 0 0 0",
                    }}
                  >
                    Tus credenciales se usan solo para que el sistema publique artículos automáticamente en tu cuenta de 10minutesWebsite. Nadie puede verlas.
                  </p>
                </div>
                <button
                  onClick={() => setEditingCredentials(true)}
                  style={secondaryButtonStyle}
                >
                  Actualizar
                </button>
              </div>
            )}

            {showCredentialsForm && (
              <form
                onSubmit={handleSaveCredentials}
                style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}
              >
                <input
                  placeholder="Usuario de 10minutesWebsite"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ ...inputStyle, minWidth: 240 }}
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle, minWidth: 200 }}
                />
                <button
                  type="submit"
                  disabled={savingCreds}
                  style={disabledStyle(secondaryButtonStyle, savingCreds)}
                >
                  {savingCreds ? "Guardando..." : "Guardar credenciales"}
                </button>
                {credentialsConfigured && (
                  <button
                    type="button"
                    onClick={() => setEditingCredentials(false)}
                    style={secondaryButtonStyle}
                  >
                    Cancelar
                  </button>
                )}
              </form>
            )}
            {showCredentialsForm && (
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 10 }}>
                Ingresa tu usuario y contraseña de 10minutesWebsite (no los de Auto Artículos). Si no recuerdas tu contraseña,{" "}
                <a
                  href="https://10minuteswebsite.net/dashboard/forgot-password.php"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#2563eb", fontWeight: 600 }}
                >
                  recupérala con tu correo aquí
                </a>
                . Si aun así no logras entrar, escribe al{" "}
                <a
                  href="https://www.10minuteswebsite.com/ayuda"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#2563eb", fontWeight: 600 }}
                >
                  servicio al cliente de 10minutesWebsite
                </a>
                .
              </p>
            )}
          </section>

          {/* Categorías Card con Tag Cloud View */}
          <section id="categories" style={sectionStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <h2 style={{ ...h2Style, margin: 0 }}>Categorías Sincronizadas</h2>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#2563eb",
                  background: "#eff6ff",
                  padding: "4px 10px",
                  borderRadius: 999,
                }}
              >
                {categories.length} categorías
              </span>
            </div>

            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
              Las categorías definen en qué secciones se publicarán tus artículos. Sincronízalas desde tu cuenta de 10minutesWebsite para mantenerlas actualizadas.
            </p>

            <button
              onClick={handleSyncCategories}
              disabled={syncing || syncInProgress || !credentialsConfigured}
              style={disabledStyle(
                secondaryButtonStyle,
                syncing || syncInProgress || !credentialsConfigured,
              )}
            >
              {syncing || syncInProgress
                ? "Sincronizando..."
                : "Sincronizar categorías ahora"}
            </button>

            {!credentialsConfigured && (
              <p style={{ fontSize: 13, color: "#e11d48", marginTop: 8 }}>
                Guarda primero tus credenciales arriba para sincronizar.
              </p>
            )}

            {syncInProgress && (
              <p
                style={{
                  fontSize: 13,
                  color: "#b45309",
                  marginTop: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#fffbeb",
                  padding: "8px 12px",
                  borderRadius: 8,
                }}
              >
                <style>{`
                  @keyframes auto-articulos-spin {
                    to { transform: rotate(360deg); }
                  }
                `}</style>
                <span
                  aria-hidden
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    border: "2px solid #fef3c7",
                    borderTopColor: "#b45309",
                    borderRadius: "50%",
                    animation: "auto-articulos-spin 0.8s linear infinite",
                    flexShrink: 0,
                  }}
                />
                {lastSyncStatus === "running"
                  ? "Conectando con 10minutesWebsite..."
                  : "En cola de sincronización. Esta pantalla se actualizará automáticamente."}
              </p>
            )}

            {lastSyncStatus === "error" && (
              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 13, color: "#ef4444", margin: 0 }}>
                  La última sincronización falló.
                </p>
                {lastSyncError && (
                  <p
                    style={{
                      fontSize: 12,
                      color: "#b91c1c",
                      marginTop: 4,
                      fontFamily: "monospace",
                      whiteSpace: "pre-wrap",
                      background: "#fef2f2",
                      padding: "8px 12px",
                      borderRadius: 6,
                    }}
                  >
                    {lastSyncError}
                  </p>
                )}
              </div>
            )}

            {/* Tag Cloud Vista Enriquecida */}
            {categories.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#475569",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  Categorías Estándar:
                </p>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {categories
                    .filter((c) => !c.isSequence)
                    .map((c) => (
                      <span
                        key={c.id}
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#1e293b",
                          background: "#f8fafc",
                          border: "1px solid #cbd5e1",
                          padding: "5px 12px",
                          borderRadius: 20,
                          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                        }}
                      >
                        📂 {c.name}
                      </span>
                    ))}
                </div>

                {categories.some((c) => c.isSequence) && (
                  <div style={{ marginTop: 16 }}>
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#6b21a8",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      Categorías de Secuencia:
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      {categories
                        .filter((c) => c.isSequence)
                        .map((c) => (
                          <span
                            key={c.id}
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "#6b21a8",
                              background: "#f3e8ff",
                              border: "1px solid #d8b4fe",
                              padding: "5px 12px",
                              borderRadius: 20,
                            }}
                          >
                            ⚡ {c.name}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Idioma Predeterminado de Redacción */}
          <section id="language" style={sectionStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <h2 style={{ ...h2Style, margin: 0 }}>Idioma de Redacción</h2>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#0369a1",
                  background: "#e0f2fe",
                  padding: "4px 10px",
                  borderRadius: 999,
                }}
              >
                🌐 {activeLangName}
              </span>
            </div>

            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
              Tus artículos se redactarán en este idioma. Sincroniza los idiomas disponibles desde tu cuenta de 10minutesWebsite y elige el que prefieras.
            </p>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={handleSyncLanguages}
                disabled={
                  languageSyncing ||
                  languageSyncInProgress ||
                  !credentialsConfigured
                }
                style={disabledStyle(
                  secondaryButtonStyle,
                  languageSyncing ||
                    languageSyncInProgress ||
                    !credentialsConfigured,
                )}
              >
                {languageSyncing || languageSyncInProgress
                  ? "Sincronizando..."
                  : "Sincronizar idiomas de tu cuenta"}
              </button>

              {languages.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <select
                    value={contentLanguage}
                    onChange={(e) => setContentLanguage(e.target.value)}
                    style={{ ...inputStyle, width: 220, height: 40 }}
                  >
                    <option value="">Seleccionar idioma...</option>
                    {languages.map((l) => (
                      <option key={l.id} value={l.externalId}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleSaveLanguage}
                    disabled={savingLanguage || !contentLanguage}
                    style={disabledStyle(
                      secondaryButtonStyle,
                      savingLanguage || !contentLanguage,
                    )}
                  >
                    {savingLanguage ? "Guardando..." : "Guardar como preferido"}
                  </button>
                </div>
              )}
            </div>

            {languageSyncInProgress && (
              <p style={{ fontSize: 13, color: "#b45309", marginTop: 10 }}>
                Conectando con 10minutesWebsite para sincronizar idiomas...
              </p>
            )}

            {lastLanguageSyncStatus === "error" && (
              <p style={{ fontSize: 13, color: "#ef4444", marginTop: 10 }}>
                La última sincronización de idiomas falló
                {lastLanguageSyncError ? `: ${lastLanguageSyncError}` : "."}
              </p>
            )}
          </section>

          {/* Firma / Texto al Final del Artículo */}
          <section style={sectionStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <h2 style={{ ...h2Style, margin: 0 }}>Firma al Final del Artículo</h2>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: signatureBarColor,
                  background: `${signatureBarColor}15`,
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: `1px solid ${signatureBarColor}30`,
                }}
              >
                {articleSignature.length} / {MAX_SIGNATURE_LEN} caracteres ({signaturePercent}%)
              </span>
            </div>

            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
              Este texto se agregará automáticamente al final de cada artículo nuevo. Puedes usarlo como firma profesional, datos de contacto o un llamado a la acción.
            </p>

            <textarea
              value={articleSignature}
              onChange={(e) =>
                e.target.value.length <= MAX_SIGNATURE_LEN &&
                setArticleSignature(e.target.value)
              }
              placeholder='Ej: "Verónica Rojas, Agente Inmobiliario Licenciada en Florida, comparte su análisis..."'
              rows={5}
              style={{
                ...inputStyle,
                width: "100%",
                resize: "vertical",
                fontFamily: "inherit",
                lineHeight: 1.5,
              }}
            />

            <div
              style={{
                width: "100%",
                height: 6,
                background: "#e2e8f0",
                borderRadius: 999,
                marginTop: 8,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${signaturePercent}%`,
                  height: "100%",
                  background: signatureBarColor,
                  borderRadius: 999,
                  transition: "width 0.2s ease, background 0.2s ease",
                }}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                onClick={handleSaveSignature}
                disabled={savingSignature}
                style={disabledStyle(secondaryButtonStyle, savingSignature)}
              >
                {savingSignature ? "Guardando firma..." : "Guardar firma final"}
              </button>
            </div>
          </section>

          {/* Teléfono de Contacto */}
          <section style={sectionStyle}>
            <h2 style={h2Style}>Teléfono de Contacto</h2>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
              Este número se usará en los botones de WhatsApp y llamada dentro de tus artículos. Incluye el código de país (ej: <code>+19546529929</code>).
            </p>

            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: +19546529929"
              style={{
                ...inputStyle,
                width: "100%",
                maxWidth: 400,
              }}
            />

            <div style={{ marginTop: 12 }}>
              <button
                onClick={handleSavePhone}
                disabled={savingPhone}
                style={disabledStyle(secondaryButtonStyle, savingPhone)}
              >
                {savingPhone ? "Guardando teléfono..." : "Guardar número de teléfono"}
              </button>
            </div>
          </section>

          {/* Foto de perfil y Logo del negocio — cada usuario sube los suyos */}
          <section style={sectionStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <h2 style={{ ...h2Style, margin: 0 }}>Tu foto y logo para redes sociales</h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#7c3aed",
                  background: "#f3e8ff",
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "1px solid #ddd6fe",
                }}
              >
                📸 Marca personal
              </span>
            </div>

            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
              Estas dos imágenes se usan como elementos visuales al generar las
              publicaciones de Instagram, Threads, X y LinkedIn (carruseles,
              reels e infografías). Sube aquí las tuyas y el sistema las
              optimizará automáticamente. No necesitas preocuparte por el
              tamaño: el servidor las deja listas en óptimas condiciones para
              que el prompt de redes sociales las use sin perder calidad.
            </p>

            <PhotoLogoUploader
              type="profile"
              currentUrl={profilePhotoUrl}
              uploading={uploadingProfilePhoto}
              onUpload={handleUploadImage}
              onRemove={handleRemoveImage}
              errorMessage={imageUploadError}
              label="Tu foto de perfil"
              description="Una foto tuya con buen encuadre. Aparece en cada composición de redes sociales que genere el sistema."
              targetWidth={600}
              targetHeight={600}
              maxKb={200}
            />

            <PhotoLogoUploader
              type="logo"
              currentUrl={businessLogoUrl}
              uploading={uploadingBusinessLogo}
              onUpload={handleUploadImage}
              onRemove={handleRemoveImage}
              errorMessage={imageUploadError}
              label="Logo de tu negocio"
              description="El logo de tu marca o negocio. Idealmente con fondo transparente. Se estampa en una esquina de cada publicación."
              targetWidth={500}
              targetHeight={250}
              maxKb={200}
            />
          </section>

          {/* Prompts Personalizados para Imágenes (solo admins) */}
          {isAdmin && (
          <section style={sectionStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <h2 style={{ ...h2Style, margin: 0 }}>Prompts de Imágenes</h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#7c3aed",
                  background: "#f3e8ff",
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "1px solid #ddd6fe",
                }}
              >
                🎨 Personalización IA
              </span>
            </div>

            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
              Personaliza los prompts que la IA usa para generar imágenes de artículos y publicaciones de redes sociales. Si dejas el campo vacío, se usará el prompt por defecto del sistema.
            </p>

            {/* Image Prompt */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#1e293b",
                  marginBottom: 6,
                }}
              >
                Prompt para Imágenes de Artículos y Redes
              </label>
              <p style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                Este prompt se usa como base para generar imágenes de artículos (10minutesWebsite) y publicaciones de Threads, Instagram Reels y Carruseles. El sistema agregará automáticamente el resumen del artículo al final.
              </p>
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder='Ej: "Crea una imagen hiperrealista donde haya humanos y tomando en cuenta este texto:"'
                rows={3}
                style={{
                  ...inputStyle,
                  width: "100%",
                  resize: "vertical",
                  fontFamily: "inherit",
                  lineHeight: 1.5,
                }}
              />
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={handleSaveImagePrompt}
                  disabled={savingImagePrompt}
                  style={disabledStyle(secondaryButtonStyle, savingImagePrompt)}
                >
                  {savingImagePrompt ? "Guardando..." : "Guardar prompt de imagen"}
                </button>
              </div>
            </div>

            {/* Infographic Prompt */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#1e293b",
                  marginBottom: 6,
                }}
              >
                Prompt para Infografías de Instagram
              </label>
              <p style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                Este prompt define el estilo visual de las infografías que se publican en Instagram. Se combina con el prompt base de imagen para generar el resultado final.
              </p>
              <textarea
                value={infographicPrompt}
                onChange={(e) => setInfographicPrompt(e.target.value)}
                placeholder='Ej: "Estilo infografía profesional con datos, números, iconos y gráficos minimalistas. Fondo claro con acentos de color."'
                rows={3}
                style={{
                  ...inputStyle,
                  width: "100%",
                  resize: "vertical",
                  fontFamily: "inherit",
                  lineHeight: 1.5,
                }}
              />
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={handleSaveInfographicPrompt}
                  disabled={savingInfographicPrompt}
                  style={disabledStyle(secondaryButtonStyle, savingInfographicPrompt)}
                >
                  {savingInfographicPrompt ? "Guardando..." : "Guardar prompt de infografía"}
                </button>
              </div>
            </div>
          </section>
          )}
        </div>
      )}

      {/* Pestaña 4: App Móvil */}
      {activeTab === "mobile" && (
        <section
          style={{
            ...sectionStyle,
            padding: 30,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
              alignItems: "center",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  color: "#2563eb",
                  background: "#eff6ff",
                  padding: "4px 10px",
                  borderRadius: 999,
                  textTransform: "uppercase",
                }}
              >
                📱 CÓDIGO QR DIRECTO
              </span>
              <h2 style={{ ...h2Style, marginTop: 10, fontSize: 18 }}>
                Abre Auto Artículos en tu Celular
              </h2>
              <p style={{ fontSize: 13, color: "#64748b", margin: "6px 0 16px 0" }}>
                Apunta la cámara de tu teléfono al código QR para acceder al instante.
              </p>

              <div
                style={{
                  background: "#ffffff",
                  padding: 16,
                  borderRadius: 16,
                  display: "inline-block",
                  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                  border: "1px solid #e2e8f0",
                }}
              >
                <img
                  src="/qr-app.svg"
                  alt="Código QR para abrir Auto Artículos en el celular"
                  width={180}
                  height={180}
                  style={{ display: "block" }}
                />
              </div>
            </div>

            {/* PWA Instructions */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px 0", color: "#0f172a" }}>
                💡 ¿Cómo agregar a la pantalla de inicio?
              </h3>

              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px 0", color: "#1e293b" }}>
                  🍏 En iPhone / iPad (Safari):
                </p>
                <ol style={{ fontSize: 12, color: "#475569", margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                  <li>Abre el enlace en Safari desde el código QR.</li>
                  <li>Toca el botón **Compartir** (icono cuadrado con flecha).</li>
                  <li>Selecciona **&quot;Agregar al inicio&quot;** (Add to Home Screen).</li>
                </ol>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px 0", color: "#1e293b" }}>
                  🤖 En Android (Chrome):
                </p>
                <ol style={{ fontSize: 12, color: "#475569", margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                  <li>Abre la página en Google Chrome.</li>
                  <li>Toca los tres puntos de menú (⋮) en la esquina superior.</li>
                  <li>Elige **&quot;Instalar aplicación&quot;** o **&quot;Agregar a inicio&quot;**.</li>
                </ol>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Pestaña de administración temporal para reparación (visible solo para administradores) */}
      {isAdmin && userEmail === "miltondavila@gmail.com" && (
        <section
          style={{
            ...sectionStyle,
            marginTop: 30,
            border: "1px solid #f87171",
            background: "#fef2f2",
          }}
        >
          <h2 style={{ ...h2Style, color: "#991b1b" }}>⚙️ Herramientas de Administrador (Temporal)</h2>
          <p style={{ fontSize: 13, color: "#7f1d1d", marginBottom: 12 }}>
            Repara hasta 20 artículos por lote, completando cada artículo antes de abrir el siguiente.
          </p>
          <button
            onClick={handleTriggerFix}
            disabled={triggeringFix}
            style={{
              ...secondaryButtonStyle,
              background: "#dc2626",
              color: "#ffffff",
              border: "1px solid #b91c1c",
              padding: "10px 20px",
              fontWeight: 700,
            }}
          >
            {triggeringFix ? "Iniciando lote..." : "🚀 Procesar siguiente lote de 20"}
          </button>
          <button
            onClick={handleClearFixHistory}
            disabled={clearingFixHistory || triggeringFix}
            style={{
              ...secondaryButtonStyle,
              marginLeft: 10,
              background: "#ffffff",
              color: "#991b1b",
              border: "1px solid #b91c1c",
              padding: "10px 20px",
              fontWeight: 700,
            }}
          >
            {clearingFixHistory ? "Borrando..." : "Borrar historial y logs"}
          </button>

          {fixStatus && (fixStatus.active || (fixStatus.history && fixStatus.history.length > 0)) && (
            <div
              style={{
                marginTop: 20,
                padding: 16,
                borderRadius: 8,
                background: "#ffffff",
                border: "1px solid #fca5a5",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
            >
              {/* Área de trabajo activa (Visible solo cuando está en proceso o en cola) */}
              {fixStatus.active && (fixStatus.status === "running" || fixStatus.status === "pending") && (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontWeight: 700, color: "#991b1b", fontSize: 13 }}>
                      Estado: {fixStatus.status === "running" ? "⏳ Procesando..." : "⏳ En cola (Iniciando robot...)"}
                    </span>
                    {fixStatus.total ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#7f1d1d" }}>
                        Progreso: {fixStatus.processed} / {fixStatus.total} ({Math.round(((fixStatus.processed || 0) / (fixStatus.total || 1)) * 100)}%)
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "#64748b" }}>Cargando información del lote...</span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {fixStatus.total ? (
                    <div
                      style={{
                        width: "100%",
                        height: 10,
                        background: "#fee2e2",
                        borderRadius: 999,
                        overflow: "hidden",
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.round(((fixStatus.processed || 0) / (fixStatus.total || 1)) * 100)}%`,
                          height: "100%",
                          background: "#ef4444",
                          borderRadius: 999,
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  ) : null}

                  {/* Live console logs */}
                  {fixStatus.logs && fixStatus.logs.length > 0 ? (
                    <div>
                      <h3 style={{ fontSize: 12, fontWeight: 700, color: "#7f1d1d", margin: "0 0 6px 0" }}>
                        📋 Consola de avance en tiempo real:
                      </h3>
                      <div
                        style={{
                          background: "#1e1e2e",
                          color: "#cdd6f4",
                          fontFamily: "monospace",
                          fontSize: 11,
                          padding: 10,
                          borderRadius: 6,
                          maxHeight: 180,
                          overflowY: "auto",
                          lineHeight: 1.4,
                        }}
                      >
                        {fixStatus.logs.map((log, idx) => (
                          <div key={idx} style={{ marginBottom: 2, whiteSpace: "pre-wrap" }}>
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {fixStatus.history && fixStatus.history.length > 0 ? (
                <div style={{ marginTop: 16, borderTop: "1px solid #fee2e2", paddingTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: "#991b1b", margin: 0 }}>
                      📋 Historial de Lotes Procesados
                    </h3>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#7f1d1d", background: "#fecaca", padding: "2px 8px", borderRadius: 999 }}>
                      Total revisados: {fixStatus.history.reduce((acc, curr) => acc + (curr.totalReviewed || 0), 0)}
                    </span>
                  </div>

                  {fixStatus.history.map((batch, index) => {
                    const isExpanded = !!expandedBatches[batch.id];
                    return (
                      <div
                        key={batch.id}
                        style={{
                          fontSize: 12,
                          padding: "10px 0",
                          borderBottom: "1px solid #fee2e2",
                        }}
                      >
                        <div
                          onClick={() => setExpandedBatches(prev => ({ ...prev, [batch.id]: !prev[batch.id] }))}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                            fontWeight: 600,
                            color: "#7f1d1d",
                          }}
                        >
                          <span style={{ userSelect: "none" }}>
                            {isExpanded ? "▼" : "▶"}{" "}
                            <strong>Lote #{fixStatus.history!.length - index}</strong>{" "}
                            <span style={{ fontWeight: 400, color: "#475569", marginLeft: 4 }}>
                              (Iniciado: {new Date(batch.createdAt).toLocaleTimeString("es-ES")}
                              {batch.finishedAt ? ` | Finalizado: ${new Date(batch.finishedAt).toLocaleTimeString("es-ES")} | Duración: ${(() => {
                                const sec = Math.round((new Date(batch.finishedAt).getTime() - new Date(batch.createdAt).getTime()) / 1000);
                                return sec > 60 ? `${Math.floor(sec / 60)} min ${sec % 60}s` : `${sec}s`;
                              })()}` : " | En curso"})
                            </span>
                          </span>
                          <span style={{ fontSize: 11, color: "#475569", display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: batch.status === "success" ? "#dcfce7" : batch.status === "running" ? "#fef9c3" : "#fee2e2",
                                color: batch.status === "success" ? "#166534" : batch.status === "running" ? "#854d0e" : "#991b1b",
                              }}
                            >
                              {batch.status === "success" ? "Completado" : batch.status === "running" ? "Procesando" : batch.status}
                            </span>
                            <span>
                              Revisados: {batch.totalReviewed} (Reparados: {batch.repairedCount}, Correctos: {batch.alreadyCorrectCount})
                            </span>
                          </span>
                        </div>

                        {isExpanded && (
                          <div style={{ marginTop: 8, paddingLeft: 14, background: "#fcf8f8", borderRadius: 6, padding: 8 }}>
                            {batch.articles && batch.articles.length > 0 ? (
                              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11 }}>
                                {batch.articles.map((art, idx) => (
                                  <li key={idx} style={{ marginBottom: 4 }}>
                                    <span style={{ color: art.status === "repaired" ? "#16a34a" : "#64748b", fontWeight: 700, marginRight: 6 }}>
                                      [{art.status === "repaired" ? "REPARADO" : "CORRECTO"}]
                                    </span>
                                    <a
                                      href={art.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ color: "#2563eb", textDecoration: "underline" }}
                                    >
                                      {art.title}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div style={{ fontSize: 11, color: "#64748b", fontStyle: "italic" }}>No se procesó ningún artículo en este lote o el worker se detuvo antes de iniciar.</div>
                            )}
                            {batch.stopPoint ? (
                              <div style={{ color: "#b91c1c", marginTop: 6, fontSize: 11, fontWeight: 500 }}>
                                🏁 Detenido: {batch.stopPoint}
                              </div>
                            ) : null}

                            {/* Logs de este lote específico */}
                            {batch.logs && batch.logs.length > 0 ? (
                              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #fee2e2" }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#7f1d1d", marginBottom: 4 }}>
                                  📋 Registro de avances (Log de la tanda):
                                </div>
                                <div
                                  style={{
                                    background: "#1e1e2e",
                                    color: "#cdd6f4",
                                    fontFamily: "monospace",
                                    fontSize: 10,
                                    padding: 8,
                                    borderRadius: 4,
                                    maxHeight: 120,
                                    overflowY: "auto",
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {batch.logs.map((log, idx) => (
                                    <div key={idx} style={{ marginBottom: 2, whiteSpace: "pre-wrap" }}>
                                      {log}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}

            </div>
          )}
        </section>
      )}

      {/* Global Alert Notification Banner */}
      {banner && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: 12,
            marginTop: 20,
            background: banner.type === "error" ? "#fef2f2" : "#f0fdf4",
            color: banner.type === "error" ? "#991b1b" : "#166534",
            border:
              banner.type === "error"
                ? "1px solid #fecaca"
                : "1px solid #bbf7d0",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
          }}
        >
          {banner.type === "error" ? "⚠️ " : "✅ "}
          {banner.text}
        </div>
      )}
    </div>
  );
}
