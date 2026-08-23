"use client";

import { useEffect, useRef, useState, useCallback, type FormEvent } from "react";
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
import PinterestSection from "@/components/PinterestSection";
import TumblrSection from "@/components/TumblrSection";
import BlueskySection from "@/components/BlueskySection";
import PhotoLogoUploader from "@/components/PhotoLogoUploader";
import OnboardingWizard from "@/components/OnboardingWizard";
import CategorySyncProgress, {
  type CategorySyncStatus,
} from "@/components/CategorySyncProgress";
import {
  DEFAULT_PLATFORM_DOMAIN,
  PLATFORM_SERVERS,
  platformForgotPasswordUrl,
  platformHelpUrl,
  platformProductNameOrNeutral,
} from "@auto-articulos/shared";

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
  // Servidor real de la cuenta, para enlazar al sitio correcto. Ver
  // PLATFORM_SERVERS: arranca en el default histórico por si /api/me tarda.
  const [platformBase, setPlatformBase] = useState(
    PLATFORM_SERVERS[DEFAULT_PLATFORM_DOMAIN].baseUrl,
  );
  // Para marca blanca (tagcrush): decide si el texto dice "10minutesWebsite"
  // o un término genérico. Ver platform-servers.ts.
  // Vacío a propósito hasta que /api/me diga el servidor real: mientras
  // tanto el texto usa el término genérico y nunca la marca equivocada.
  const [platformDomain, setPlatformDomain] = useState<string>("");
  const wizardRef = useRef<HTMLDivElement | null>(null);
  // Nombre de marca a mostrar y enlace de ayuda: genéricos en cuentas de
  // marca blanca (tagcrush) — ver platform-servers.ts.
  const productName = platformProductNameOrNeutral(platformDomain);
  const helpUrl = platformHelpUrl(platformDomain);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [articleSignature, setArticleSignature] = useState("");
  const [savingSignature, setSavingSignature] = useState(false);
  const [prompts, setPrompts] = useState<{ id: string; name: string; prompt: string }[]>([]);
  const [defaultPromptId, setDefaultPromptId] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [phone, setPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [businessLogoUrl, setBusinessLogoUrl] = useState<string | null>(null);
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);
  const [uploadingBusinessLogo, setUploadingBusinessLogo] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [allowInstagramPublishing, setAllowInstagramPublishing] = useState(false);
  const [allowFacebookPublishing, setAllowFacebookPublishing] = useState(false);
  const [modulosDeshabilitados, setModulosDeshabilitados] = useState<string[]>([]);
  const [allowLinkedInPublishing, setAllowLinkedInPublishing] = useState(false);
  const [allowThreadsPublishing, setAllowThreadsPublishing] = useState(false);
  const [allowPinterestPublishing, setAllowPinterestPublishing] = useState(false);
  const [allowTumblrPublishing, setAllowTumblrPublishing] = useState(false);
  const [allowBlueskyPublishing, setAllowBlueskyPublishing] = useState(false);
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
    const [langRes, meRes, promptsRes] = await Promise.all([
      fetch("/api/languages", { cache: "no-store" }),
      fetch("/api/me", { cache: "no-store" }),
      fetch("/api/prompts", { cache: "no-store" }),
    ]);
    if (langRes.ok) {
      const data = await langRes.json();
      setLanguages(data.languages);
      setLastLanguageSyncStatus(data.lastSyncJob?.status ?? null);
      setLastLanguageSyncError(data.lastSyncJob?.errorMessage ?? null);
    }
    if (promptsRes.ok) {
      const data = await promptsRes.json();
      setPrompts(data.prompts ?? []);
    }
    if (meRes.ok) {
       const data = await meRes.json();
       setContentLanguage(data.contentLanguage ?? "");
       setArticleSignature(data.articleSignature ?? "");
       setDefaultPromptId(data.defaultPromptId ?? "");
       setPhone(data.phone ?? "");
       setProfilePhotoUrl(data.profilePhotoUrl ?? null);
       setBusinessLogoUrl(data.businessLogoUrl ?? null);
        setIsAdmin(data.role === "admin");
        setUserEmail(data.email ?? "");
        setAllowInstagramPublishing(data.allowInstagramPublishing ?? false);
        if (Array.isArray(data.disabledModules)) {
          setModulosDeshabilitados(data.disabledModules);
        }
        setAllowFacebookPublishing(data.allowFacebookPublishing ?? false);
        setAllowLinkedInPublishing(data.allowLinkedInPublishing ?? false);
        setAllowThreadsPublishing(data.allowThreadsPublishing ?? false);
        setAllowPinterestPublishing(data.allowPinterestPublishing ?? false);
        setAllowTumblrPublishing(data.allowTumblrPublishing ?? false);
        setAllowBlueskyPublishing(data.allowBlueskyPublishing ?? false);
        if (typeof data.platformBaseUrl === "string" && data.platformBaseUrl) {
          setPlatformBase(data.platformBaseUrl);
        }
        if (typeof data.platformDomain === "string") {
          setPlatformDomain(data.platformDomain);
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

  async function handleSaveDefaultPrompt() {
    setSavingPrompt(true);
    setBanner(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultPromptId: defaultPromptId || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({
          type: "error",
          text: data.error ?? "Error al guardar el estilo de redacción por defecto",
        });
        return;
      }
      setBanner({ type: "info", text: "Estilo de redacción por defecto guardado." });
    } finally {
      setSavingPrompt(false);
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
  // La rejilla de pestañas es alta: al pulsar una, su contenido quedaba por
  // debajo del borde de la pantalla y parecía que no pasaba nada. Reportado
  // por Milton con el Asistente de Configuración Inicial.
  useEffect(() => {
    if (activeTab === "wizard" && wizardRef.current) {
      wizardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeTab]);

  const signatureBarColor =
    signaturePercent >= 95
      ? "#ff3b30"
      : signaturePercent >= 80
        ? "#ff9500"
        : "#1d1d1f";

  /*
   * La pestaña de redes sociales se muestra si el administrador le dio a esta
   * cuenta permiso para publicar en alguna red. Antes dependía de un correo
   * escrito en el código, así que dar el permiso desde Administración no
   * servía de nada: la pestaña seguía sin aparecer.
   */
  /*
   * Si el administrador le da a esta cuenta acceso al módulo de redes —aunque
   * esté apagado para todos los demás—, aquí debe poder configurarlo. Antes
   * podía ver el módulo pero no sus conexiones, así que el acceso no servía
   * de nada.
   */
  const tieneModuloRedes = !modulosDeshabilitados.includes("oportunidades-redes");

  const showSocialTab =
    isAdmin ||
    tieneModuloRedes ||
    allowThreadsPublishing ||
    allowInstagramPublishing ||
    allowFacebookPublishing ||
    allowLinkedInPublishing ||
    allowPinterestPublishing;
    allowTumblrPublishing;

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
      label: "Configuración Inicial",
      description:
        "Guía paso a paso interactiva para conectar tu web, categorías, idioma y Google Search Console.",
      badge: credentialsConfigured && categories.length > 0 && contentLanguage ? "✓ Listo" : "Guiado",
    },
    {
      id: "integrations",
      eyebrow: "Buscadores",
      label: "Indexación & SEO",
      description:
        "Conecta Google Search Console y Bing Webmaster Tools para monitorear y mejorar la indexación de tus artículos.",
    },
    ...(showSocialTab
      ? [
          {
            id: "social" as const,
            eyebrow: "Redes Sociales",
            label: "Publicación Automática",
            description:
              "Conecta Instagram, Threads y Google Business Profile para publicar tus artículos en redes sociales.",
          },
        ]
      : []),
    {
      id: "platform",
      eyebrow: productName,
      label: "Cuenta & Contenido",
      description:
        "Credenciales, categorías, idioma de redacción, firma y teléfono de contacto.",
      badge: credentialsConfigured ? "✓ Listo" : undefined,
    },
    {
      id: "mobile",
      eyebrow: "Dispositivos",
      label: "App Móvil",
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
      {/* Cabecera Apple Minimalista */}
      <div
        className="panel"
        style={{
          background: "rgba(255, 255, 255, 0.88)",
          borderRadius: 22,
          border: "1px solid rgba(0, 0, 0, 0.07)",
          padding: "24px 28px",
          marginBottom: 20,
          boxShadow: "none",
        }}
      >
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
            <p className="eyebrow" style={{ margin: "0 0 6px" }}>
              Preferencias del Sistema
            </p>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 600,
                margin: "0 0 6px 0",
                color: "#1d1d1f",
                letterSpacing: "-0.03em",
              }}
            >
              Configuración
            </h1>
            <p
              className="lead-copy"
              style={{
                margin: 0,
                maxWidth: 650,
              }}
            >
              Este es el módulo que hay que dejar listo antes que nada: sin él, el sistema no puede publicar por ti. Aquí guardas la clave de tu cuenta de{" "}
              {productName} para que el sistema pueda entrar a tu web, sincronizas las secciones donde irán los artículos, eliges el idioma en el que se escribirán y conectas Google Search Console, que es el registro de lo que la gente buscó antes de llegar a tu página.
            </p>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 15,
                lineHeight: 1.55,
                color: "#6e6e73",
              }}
            >
              Conectar tus redes sociales y personalizar la firma, el teléfono y el estilo de las imágenes es opcional. Si es tu primera vez, usa el asistente paso a paso: te lleva por lo obligatorio sin que tengas que saber dónde está cada cosa.
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
                background: "#ffffff",
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid #e5e5ea",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: credentialsConfigured ? "#34c759" : "#ff9500",
                }}
              />
              <span style={{ color: "#6e6e73", fontWeight: 500 }}>
                {productName}:
              </span>
              <span
                style={{
                  color: credentialsConfigured ? "#16803c" : "#8a4b08",
                  fontWeight: 600,
                }}
              >
                {credentialsConfigured ? "Conectado" : "Pendiente"}
              </span>
            </div>

            <div
              style={{
                background: "#ffffff",
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid #e5e5ea",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ color: "#6e6e73", fontWeight: 500 }}>
                Categorías:
              </span>
              <span style={{ color: "#1d1d1f", fontWeight: 600 }}>
                {categories.length} sincronizadas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Banner de Configuración Inicial (si no está en la pestaña wizard) */}
      {activeTab !== "wizard" && (
        <div
          onClick={() => setActiveTab("wizard")}
          className="row"
          style={{
            borderRadius: 14,
            padding: "16px 20px",
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 14,
            cursor: "pointer",
            background: "#ffffff",
            border: "1px solid #1d1d1f",
            boxShadow: "none",
            transition: "transform 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span className="step-badge" style={{ marginBottom: 0 }}>
              RECOMENDADO
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f" }}>
                Asistente de Configuración Inicial Paso a Paso
              </div>
              <p style={{ margin: "3px 0 0 0", fontSize: 13, color: "#6e6e73" }}>
                Conecta tu cuenta en 4 sencillos pasos ordenados: {productName} ➔ Categorías ➔ Idioma ➔ Google Search Console.
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
              padding: "9px 16px",
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            Abrir Asistente &rarr;
          </button>
        </div>
      )}

      {/* Selector de Pestañas Apple Minimalista */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {tabs.map((t) => {
          const isActive = activeTab === t.id;

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              aria-pressed={isActive}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                minHeight: 105,
                padding: "16px 18px",
                textAlign: "left",
                fontFamily: "inherit",
                cursor: "pointer",
                borderRadius: 14,
                border: isActive
                  ? "1px solid #1d1d1f"
                  : "1px solid #e5e5ea",
                background: "#ffffff",
                color: "#1d1d1f",
                boxShadow: "none",
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: isActive ? "#f5f5f7" : "#f5f5f7",
                    color: isActive ? "#1d1d1f" : "#6e6e73",
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {t.eyebrow}
                </span>

                {t.badge && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: 999,
                      background: "rgba(52, 199, 89, 0.1)",
                      color: "#16803c",
                    }}
                  >
                    {t.badge}
                  </span>
                )}
              </div>

              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: isActive ? "#1d1d1f" : "#1d1d1f",
                  margin: "4px 0 4px",
                }}
              >
                {t.label}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#6e6e73",
                  lineHeight: 1.4,
                }}
              >
                {t.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Pestaña 0: Wizard — Configuración Inicial Paso a Paso */}
      {activeTab === "wizard" && (
        <div ref={wizardRef}>
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
          {(allowThreadsPublishing || allowInstagramPublishing || allowFacebookPublishing || isAdmin || tieneModuloRedes) && (
            <ThreadsSection allowThreads={isAdmin || tieneModuloRedes || allowThreadsPublishing} allowInstagram={isAdmin || tieneModuloRedes || allowInstagramPublishing} allowFacebook={isAdmin || tieneModuloRedes || allowFacebookPublishing} isAdmin={isAdmin} />
          )}
          {/*
            X (Twitter) oculto a pedido de Milton (19/8/2026): X cobra por
            publicar mediante su API. El componente, sus rutas y los datos ya
            guardados se conservan intactos; solo se deja de mostrar, para
            poder reactivarlo borrando esta condición si algún día conviene.
          */}
          {false && <TwitterSection />}
          {(allowLinkedInPublishing || isAdmin || tieneModuloRedes) && (
            <LinkedInSection allowed={allowLinkedInPublishing || isAdmin || tieneModuloRedes} />
          )}
          {(allowPinterestPublishing || isAdmin || tieneModuloRedes) && (
            <PinterestSection allowed={allowPinterestPublishing || isAdmin || tieneModuloRedes} />
          )}
          {(allowTumblrPublishing || isAdmin || tieneModuloRedes) && (
            <TumblrSection allowed={allowTumblrPublishing || isAdmin || tieneModuloRedes} />
          )}
          {(allowBlueskyPublishing || isAdmin || tieneModuloRedes) && (
            <BlueskySection allowed={allowBlueskyPublishing || isAdmin || tieneModuloRedes} />
          )}
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
                Credenciales de {productName}{" "}
                {credentialsConfigured && <ReadyBadge />}
              </h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#6e6e73",
                  background: "#f5f5f7",
                  padding: "4px 10px",
                  borderRadius: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                Cifrado AES-256-GCM
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
                  border: "1px solid #e5e5ea",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#1d1d1f",
                      margin: 0,
                    }}
                  >
                    Credenciales guardadas y activas
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#6e6e73",
                      margin: "2px 0 0 0",
                    }}
                  >
                    Tus credenciales se usan solo para que el sistema publique artículos automáticamente en tu cuenta de {productName}. Nadie puede verlas.
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
                  placeholder={`Usuario de ${productName}`}
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
              <p style={{ fontSize: 12, color: "#6e6e73", marginTop: 10 }}>
                Ingresa tu usuario y contraseña de {platformBase.replace(/^https?:\/\//, "")} (no los de Auto Artículos). Si no recuerdas tu contraseña,{" "}
                <a
                  href={platformForgotPasswordUrl(platformDomain)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#0066cc", fontWeight: 600 }}
                >
                  recupérala con tu correo aquí
                </a>
                {helpUrl && (
                  <>
                    . Si aun así no logras entrar, escribe al{" "}
                    <a
                      href={helpUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#0066cc", fontWeight: 600 }}
                    >
                      servicio al cliente de {productName}
                    </a>
                    .
                  </>
                )}
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
                  color: "#1d1d1f",
                  background: "#f5f5f7",
                  padding: "4px 10px",
                  borderRadius: 999,
                }}
              >
                {categories.length} categorías
              </span>
            </div>

            <p style={{ fontSize: 13, color: "#6e6e73", marginBottom: 14 }}>
              Las categorías definen en qué secciones se publicarán tus artículos. Sincronízalas desde tu cuenta de {productName} para mantenerlas actualizadas.
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
              <p style={{ fontSize: 13, color: "#ff3b30", marginTop: 8 }}>
                Guarda primero tus credenciales arriba para sincronizar.
              </p>
            )}

            {/* Mismo componente que usa el asistente de Inicio, para que la
                espera se vea y se explique igual en los dos sitios donde se
                sincroniza (pedido de Milton, 15/8/2026). */}
            {syncInProgress && (
              <CategorySyncProgress
                status={(lastSyncStatus as CategorySyncStatus | null) ?? "pending"}
                categoriesCount={categories.length}
                errorMessage={lastSyncError}
                active={syncInProgress}
              />
            )}

            {lastSyncStatus === "error" && (
              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 13, color: "#ff3b30", margin: 0 }}>
                  La última sincronización falló.
                </p>
                {lastSyncError && (
                  <p
                    style={{
                      fontSize: 12,
                      color: "#ff3b30",
                      marginTop: 4,
                      fontFamily: "monospace",
                      whiteSpace: "pre-wrap",
                      background: "rgba(255, 59, 48, 0.08)",
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
                    color: "#6e6e73",
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
                          color: "#1d1d1f",
                          background: "#f5f5f7",
                          border: "1px solid #e5e5ea",
                          padding: "5px 12px",
                          borderRadius: 20,
                          boxShadow: "none",
                        }}
                      >
                        {c.name}
                        {c.panel ? ` (${c.panel})` : ""}
                      </span>
                    ))}
                </div>

                {categories.some((c) => c.isSequence) && (
                  <div style={{ marginTop: 16 }}>
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#1d1d1f",
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
                              color: "#1d1d1f",
                              background: "rgba(94, 92, 230, 0.08)",
                              border: "1px solid rgba(94, 92, 230, 0.25)",
                              padding: "5px 12px",
                              borderRadius: 20,
                            }}
                          >
                            {c.name}
                            {c.panel ? ` (${c.panel})` : ""}
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
                  color: "#1d1d1f",
                  background: "#f5f5f7",
                  padding: "4px 10px",
                  borderRadius: 999,
                }}
              >
                {activeLangName}
              </span>
            </div>

            <p style={{ fontSize: 13, color: "#6e6e73", marginBottom: 14 }}>
              Tus artículos se redactarán en este idioma. Sincroniza los idiomas disponibles desde tu cuenta de {productName} y elige el que prefieras.
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
              <p style={{ fontSize: 13, color: "#8a4b08", marginTop: 10 }}>
                Conectando con {productName} para sincronizar idiomas...
              </p>
            )}

            {lastLanguageSyncStatus === "error" && (
              <p style={{ fontSize: 13, color: "#ff3b30", marginTop: 10 }}>
                La última sincronización de idiomas falló
                {lastLanguageSyncError ? `: ${lastLanguageSyncError}` : "."}
              </p>
            )}
          </section>

          {/* Estilo de Redacción por Defecto */}
          <section style={sectionStyle}>
            <h2 style={h2Style}>Estilo de redacción por defecto</h2>
            <p style={{ fontSize: 13, color: "#6e6e73", marginBottom: 12 }}>
              Selecciona el estilo de escritura que se usará por defecto para tus artículos. Puedes cambiarlo individualmente al publicar un lote o ejecutar una oportunidad.
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select
                value={defaultPromptId}
                onChange={(e) => setDefaultPromptId(e.target.value)}
                style={{ ...inputStyle, width: 280, height: 40 }}
              >
                <option value="">STANDARD (Estilo predeterminado de la plataforma)</option>
                {prompts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSaveDefaultPrompt}
                disabled={savingPrompt}
                style={disabledStyle(secondaryButtonStyle, savingPrompt)}
              >
                {savingPrompt ? "Guardando..." : "Guardar estilo por defecto"}
              </button>
            </div>
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

            <p style={{ fontSize: 13, color: "#6e6e73", marginBottom: 12 }}>
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
                background: "#e5e5ea",
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
            <p style={{ fontSize: 13, color: "#6e6e73", marginBottom: 12 }}>
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
                  color: "#1d1d1f",
                  background: "rgba(94, 92, 230, 0.08)",
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(94, 92, 230, 0.25)",
                }}
              >
                Marca personal
              </span>
            </div>

            <p style={{ fontSize: 13, color: "#6e6e73", marginBottom: 14 }}>
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
                  color: "#1d1d1f",
                  background: "#f5f5f7",
                  padding: "4px 10px",
                  borderRadius: 999,
                  textTransform: "uppercase",
                }}
              >
                CÓDIGO QR DIRECTO
              </span>
              <h2 style={{ ...h2Style, marginTop: 10, fontSize: 18 }}>
                Abre Auto Artículos en tu Celular
              </h2>
              <p style={{ fontSize: 13, color: "#6e6e73", margin: "6px 0 16px 0" }}>
                Apunta la cámara de tu teléfono al código QR para acceder al instante.
              </p>

              <div
                style={{
                  background: "#ffffff",
                  padding: 16,
                  borderRadius: 16,
                  display: "inline-block",
                  boxShadow: "none",
                  border: "1px solid #e5e5ea",
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
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px 0", color: "#1d1d1f" }}>
                ¿Cómo agregar a la pantalla de inicio?
              </h3>

              <div
                style={{
                  background: "#f5f5f7",
                  border: "1px solid #e5e5ea",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px 0", color: "#1d1d1f" }}>
                  En iPhone / iPad (Safari):
                </p>
                <ol style={{ fontSize: 12, color: "#6e6e73", margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                  <li>Abre el enlace en Safari desde el código QR.</li>
                  <li>Toca el botón **Compartir** (icono cuadrado con flecha).</li>
                  <li>Selecciona **&quot;Agregar al inicio&quot;** (Add to Home Screen).</li>
                </ol>
              </div>

              <div
                style={{
                  background: "#f5f5f7",
                  border: "1px solid #e5e5ea",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px 0", color: "#1d1d1f" }}>
                  En Android (Chrome):
                </p>
                <ol style={{ fontSize: 12, color: "#6e6e73", margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
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
            border: "1px solid rgba(255, 59, 48, 0.3)",
            background: "rgba(255, 59, 48, 0.08)",
          }}
        >
          <h2 style={{ ...h2Style, color: "#ff3b30" }}>⚙Herramientas de Administrador (Temporal)</h2>
          <p style={{ fontSize: 13, color: "#ff3b30", marginBottom: 12 }}>
            Repara hasta 20 artículos por lote, completando cada artículo antes de abrir el siguiente.
          </p>
          <button
            onClick={handleTriggerFix}
            disabled={triggeringFix}
            style={{
              ...secondaryButtonStyle,
              background: "#ff3b30",
              color: "#ffffff",
              border: "1px solid #ff3b30",
              padding: "10px 20px",
              fontWeight: 700,
            }}
          >
            {triggeringFix ? "Iniciando lote..." : "Procesar siguiente lote de 20"}
          </button>
          <button
            onClick={handleClearFixHistory}
            disabled={clearingFixHistory || triggeringFix}
            style={{
              ...secondaryButtonStyle,
              marginLeft: 10,
              background: "#ffffff",
              color: "#ff3b30",
              border: "1px solid #ff3b30",
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
                border: "1px solid rgba(255, 59, 48, 0.3)",
                boxShadow: "none",
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
                    <span style={{ fontWeight: 700, color: "#ff3b30", fontSize: 13 }}>
                      Estado: {fixStatus.status === "running" ? "⏳ Procesando..." : "⏳ En cola (Iniciando robot...)"}
                    </span>
                    {fixStatus.total ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#ff3b30" }}>
                        Progreso: {fixStatus.processed} / {fixStatus.total} ({Math.round(((fixStatus.processed || 0) / (fixStatus.total || 1)) * 100)}%)
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "#6e6e73" }}>Cargando información del lote...</span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {fixStatus.total ? (
                    <div
                      style={{
                        width: "100%",
                        height: 10,
                        background: "rgba(255, 59, 48, 0.08)",
                        borderRadius: 999,
                        overflow: "hidden",
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.round(((fixStatus.processed || 0) / (fixStatus.total || 1)) * 100)}%`,
                          height: "100%",
                          background: "#ff3b30",
                          borderRadius: 999,
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  ) : null}

                  {/* Live console logs */}
                  {fixStatus.logs && fixStatus.logs.length > 0 ? (
                    <div>
                      <h3 style={{ fontSize: 12, fontWeight: 700, color: "#ff3b30", margin: "0 0 6px 0" }}>
                        Consola de avance en tiempo real:
                      </h3>
                      <div
                        style={{
                          background: "#1d1d1f",
                          color: "#f5f5f7",
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
                <div style={{ marginTop: 16, borderTop: "1px solid rgba(255, 59, 48, 0.08)", paddingTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: "#ff3b30", margin: 0 }}>
                      Historial de Lotes Procesados
                    </h3>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#ff3b30", background: "rgba(255, 59, 48, 0.15)", padding: "2px 8px", borderRadius: 999 }}>
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
                          borderBottom: "1px solid rgba(255, 59, 48, 0.08)",
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
                            color: "#ff3b30",
                          }}
                        >
                          <span style={{ userSelect: "none" }}>
                            {isExpanded ? "▼" : "▶"}{" "}
                            <strong>Lote #{fixStatus.history!.length - index}</strong>{" "}
                            <span style={{ fontWeight: 400, color: "#6e6e73", marginLeft: 4 }}>
                              (Iniciado: {new Date(batch.createdAt).toLocaleTimeString("es-ES")}
                              {batch.finishedAt ? ` | Finalizado: ${new Date(batch.finishedAt).toLocaleTimeString("es-ES")} | Duración: ${(() => {
                                const sec = Math.round((new Date(batch.finishedAt).getTime() - new Date(batch.createdAt).getTime()) / 1000);
                                return sec > 60 ? `${Math.floor(sec / 60)} min ${sec % 60}s` : `${sec}s`;
                              })()}` : " | En curso"})
                            </span>
                          </span>
                          <span style={{ fontSize: 11, color: "#6e6e73", display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: batch.status === "success" ? "rgba(52, 199, 89, 0.1)" : batch.status === "running" ? "rgba(255, 149, 0, 0.15)" : "rgba(255, 59, 48, 0.08)",
                                color: batch.status === "success" ? "#16803c" : batch.status === "running" ? "#8a4b08" : "#ff3b30",
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
                          <div style={{ marginTop: 8, paddingLeft: 14, background: "rgba(255, 59, 48, 0.05)", borderRadius: 6, padding: 8 }}>
                            {batch.articles && batch.articles.length > 0 ? (
                              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11 }}>
                                {batch.articles.map((art, idx) => (
                                  <li key={idx} style={{ marginBottom: 4 }}>
                                    <span style={{ color: art.status === "repaired" ? "#16803c" : "#6e6e73", fontWeight: 700, marginRight: 6 }}>
                                      [{art.status === "repaired" ? "REPARADO" : "CORRECTO"}]
                                    </span>
                                    <a
                                      href={art.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ color: "#0066cc", textDecoration: "underline" }}
                                    >
                                      {art.title}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div style={{ fontSize: 11, color: "#6e6e73", fontStyle: "italic" }}>No se procesó ningún artículo en este lote o el worker se detuvo antes de iniciar.</div>
                            )}
                            {batch.stopPoint ? (
                              <div style={{ color: "#ff3b30", marginTop: 6, fontSize: 11, fontWeight: 500 }}>
                                Detenido: {batch.stopPoint}
                              </div>
                            ) : null}

                            {/* Logs de este lote específico */}
                            {batch.logs && batch.logs.length > 0 ? (
                              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed rgba(255, 59, 48, 0.08)" }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#ff3b30", marginBottom: 4 }}>
                                  Registro de avances (Log de la tanda):
                                </div>
                                <div
                                  style={{
                                    background: "#1d1d1f",
                                    color: "#f5f5f7",
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
            background: banner.type === "error" ? "rgba(255, 59, 48, 0.08)" : "rgba(52, 199, 89, 0.1)",
            color: banner.type === "error" ? "#ff3b30" : "#16803c",
            border:
              banner.type === "error"
                ? "1px solid rgba(255, 59, 48, 0.3)"
                : "1px solid rgba(52, 199, 89, 0.25)",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "none",
          }}
        >
          {banner.type === "error" ? "" : ""}
          {banner.text}
        </div>
      )}
    </div>
  );
}
