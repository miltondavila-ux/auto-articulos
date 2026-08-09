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
  const [isAdmin, setIsAdmin] = useState(false);
  const [triggeringFix, setTriggeringFix] = useState(false);
  const [fixStatus, setFixStatus] = useState<{
    active: boolean;
    status?: string;
    total?: number;
    processed?: number;
    repaired?: { title: string; url: string }[];
    logs?: string[];
  } | null>(null);
  const MAX_SIGNATURE_LEN = 700;
  const [banner, setBanner] = useState<{
    type: "error" | "info";
    text: string;
  } | null>(null);

  const loadFixStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/fix-patricia/status");
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
      setLastSyncStatus(data.lastSyncJob?.status ?? null);
      setLastSyncError(data.lastSyncJob?.errorMessage ?? null);
    }
  }, []);

  const loadLanguages = useCallback(async () => {
    const [langRes, meRes] = await Promise.all([
      fetch("/api/languages"),
      fetch("/api/me"),
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
       setIsAdmin(data.role === "admin");
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

  async function handleTriggerFix() {
    if (!confirm("¿Estás seguro de que deseas iniciar el proceso de reparación en lote para los artículos de Patricia Coy?")) {
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
        text: "Reparación programada con éxito. Puedes ver el progreso en tiempo real en la pestaña Historial.",
      });
    } finally {
      setTriggeringFix(false);
    }
  }

  const [activeTab, setActiveTab] = useState<
    "integrations" | "platform" | "editor" | "mobile"
  >("integrations");

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

  const tabs: {
    id: "integrations" | "platform" | "editor" | "mobile";
    eyebrow: string;
    label: string;
    description: string;
    badge?: string;
  }[] = [
    {
      id: "integrations",
      eyebrow: "Buscadores y Redes",
      label: "🔍 Integraciones",
      description:
        "Conecta Google Search Console, Bing Webmaster Tools y Google Business Profile.",
    },
    {
      id: "platform",
      eyebrow: "10minutesWebsite",
      label: "🔐 Cuenta & Categorías",
      description:
        "Credenciales cifradas de tu cuenta y sincronización de categorías.",
      badge: credentialsConfigured ? "✓ Listo" : undefined,
    },
    {
      id: "editor",
      eyebrow: "IA & Estilo",
      label: "✍️ Redacción & Firma",
      description:
        "Idioma por defecto de tus artículos y texto o firma final automática.",
    },
    {
      id: "mobile",
      eyebrow: "Dispositivos",
      label: "📱 App Móvil & PWA",
      description:
        "Código QR para escanear e instrucciones de instalación en tu celular.",
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
              Gestiona integraciones con buscadores, credenciales cifradas de
              10minutesWebsite, preferencias de redacción e instalación móvil desde un panel unificado.
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
                border: isActive
                  ? "2px solid #2563eb"
                  : "1px solid rgba(226, 232, 240, 0.8)",
                background: isActive
                  ? "linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)"
                  : "#ffffff",
                color: "#0f172a",
                boxShadow: isActive
                  ? "0 10px 24px rgba(37, 99, 235, 0.15)"
                  : "0 2px 8px rgba(15, 23, 42, 0.04)",
                transform: isActive ? "translateY(-2px)" : "translateY(0)",
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
                    height: 3,
                    background:
                      "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)",
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
                    background: isActive ? "#dbeafe" : "#f1f5f9",
                    color: isActive ? "#1d4ed8" : "#64748b",
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {t.eyebrow}
                </span>
                {t.badge && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#15803d",
                      background: "#dcfce7",
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
                  color: isActive ? "#1e40af" : "#0f172a",
                }}
              >
                {t.label}
              </span>
              <span
                style={{
                  display: "block",
                  marginTop: 4,
                  color: "#64748b",
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

      {/* Pestaña 1: Buscadores & Redes (Integraciones Marketplace) */}
      {activeTab === "integrations" && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <GoogleSearchConsoleSection />
          <BingWebmasterSection />
          <BusinessProfileSection />
          <ThreadsSection />
        </div>
      )}

      {/* Pestaña 2: 10minutesWebsite Hub */}
      {activeTab === "platform" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Credenciales Card */}
          <section style={readySectionStyle(credentialsConfigured)}>
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
                    Tus datos se usan únicamente por el worker headless para publicar artículos a tu nombre.
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
                Son tu usuario y contraseña de 10minutesWebsite, no los de Auto
                Artículos. Si no recuerdas tu contraseña de 10minutesWebsite,{" "}
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
              Sincroniza las categorías reales de tu cuenta de 10minutesWebsite.
              Se actualizan solas al hacer clic en el botón inferior.
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
        </div>
      )}

      {/* Pestaña 3: Redacción & Estilo Hub */}
      {activeTab === "editor" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Idioma Card */}
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
              <h2 style={{ ...h2Style, margin: 0 }}>Idioma Predeterminado de Redacción</h2>
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
              Sincroniza los idiomas que soporta tu cuenta en 10minutesWebsite y elige cuál quieres usar por defecto.
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

          {/* Firma / Texto Final Card con Barra de Progreso Dinámica */}
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
              <h2 style={{ ...h2Style, margin: 0 }}>Firma / Texto al Final del Artículo</h2>
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
              Este texto o firma profesional se añadirá automáticamente al final de cada artículo nuevo publicado.
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

            {/* Dynamic Character Progress Bar */}
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

          {/* Teléfono de Contacto (WhatsApp / Llamada) */}
          <section style={sectionStyle}>
            <h2 style={h2Style}>Teléfono de Contacto (WhatsApp / Llamadas)</h2>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
              Ingresa tu número de teléfono (con código de país, ej: <code>+19546529929</code>). Este número se utilizará para enlazar automáticamente los botones de WhatsApp y llamadas en el contenido de tus artículos, previniendo que se publiquen con marcadores vacíos.
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
        </div>
      )}

      {/* Pestaña 4: Acceso Móvil Hub */}
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
      {isAdmin && (
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
            Esta es una herramienta provisional para corregir en lote todos los artículos de **Patricia Coy** que fueron creados sin el número de teléfono (reemplazando <code>PHONE_NUMBER</code> por <code>+19546529929</code>). Al hacer clic en el botón, se agendará una tarea en segundo plano que podrás monitorear desde el Historial.
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
            {triggeringFix ? "Iniciando reparación..." : "🚀 Reparar artículos de Patricia Coy"}
          </button>

          {fixStatus && fixStatus.active && (
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontWeight: 700, color: "#991b1b", fontSize: 13 }}>
                  Estado: {fixStatus.status === "running" ? "⏳ Procesando..." : fixStatus.status === "success" ? "✅ Completado" : `⚠️ ${fixStatus.status}`}
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

              {/* Repaired Articles List */}
              {fixStatus.repaired && fixStatus.repaired.length > 0 ? (
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 12, fontWeight: 700, color: "#7f1d1d", margin: "0 0 6px 0" }}>
                    🔗 Artículos reparados con éxito:
                  </h3>
                  <div
                    style={{
                      maxHeight: 150,
                      overflowY: "auto",
                      background: "#fef2f2",
                      border: "1px solid #fee2e2",
                      borderRadius: 6,
                      padding: 8,
                    }}
                  >
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                      {fixStatus.repaired.map((art, idx) => (
                        <li key={idx} style={{ marginBottom: 4 }}>
                          <a
                            href={art.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#2563eb", textDecoration: "underline", fontWeight: 600 }}
                          >
                            {art.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
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


