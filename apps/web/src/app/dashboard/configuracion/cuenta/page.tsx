"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import ModuleIntro, { IntroP } from "@/components/ModuleIntro";
import ConfiguracionSubNav from "@/components/ConfiguracionSubNav";
import AdminFixPatriciaPanel from "@/components/AdminFixPatriciaPanel";
import CategorySyncProgress, {
  type CategorySyncStatus,
} from "@/components/CategorySyncProgress";
import {
  sectionStyle,
  h2Style,
  inputStyle,
  secondaryButtonStyle,
  readySectionStyle,
  disabledStyle,
} from "@/components/dashboard-ui";
import type { CategoryRow, LanguageRow, SyncStatus } from "@/types/dashboard";
import {
  DEFAULT_PLATFORM_DOMAIN,
  PLATFORM_SERVERS,
  platformForgotPasswordUrl,
  platformHelpUrl,
  platformProductNameOrNeutral,
} from "@auto-articulos/shared";

/**
 * Página "Cuenta", parte del rediseño "RENEW CONFIGURACION" (7/9/2026).
 *
 * Antes esto era una de las 7 secciones mezcladas en el mismo bloque que
 * "Contenido" dentro de `ConfiguracionView.tsx` — ambas pestañas mostraban
 * exactamente el mismo contenido. Esta página es solo lo que define el
 * ACCESO de la cuenta: con qué usuario/contraseña publica, qué categorías
 * tiene sincronizadas y en qué idioma escribe. El resto (firma, teléfono,
 * fotos, estilo de redacción) vive ahora en Contenido.
 *
 * Lógica y llamadas a la API idénticas a las que ya existían — solo se
 * relocalizaron, no se reescribieron.
 */
export default function ConfiguracionCuentaPage() {
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
  const [platformBase, setPlatformBase] = useState(
    PLATFORM_SERVERS[DEFAULT_PLATFORM_DOMAIN].baseUrl,
  );
  const [platformDomain, setPlatformDomain] = useState<string>("");
  const productName = platformProductNameOrNeutral(platformDomain);
  const helpUrl = platformHelpUrl(platformDomain);
  const [banner, setBanner] = useState<{
    type: "error" | "info";
    text: string;
  } | null>(null);

  const syncInProgress =
    lastSyncStatus === "pending" || lastSyncStatus === "running";
  const languageSyncInProgress =
    lastLanguageSyncStatus === "pending" || lastLanguageSyncStatus === "running";
  const showCredentialsForm = editingCredentials || !credentialsConfigured;

  const activeLangName =
    languages.find((l) => l.externalId === contentLanguage)?.name ??
    "Sin definir";

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
  }, [loadCredentialsStatus, loadCategories, loadLanguages]);

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

  return (
    <div>
      <ModuleIntro titulo="Cuenta">
        <IntroP>
          Aquí vive el acceso de tu cuenta: el usuario y contraseña con los
          que el sistema publica por ti, las categorías donde puede publicar,
          y el idioma en que escribe tus artículos.
        </IntroP>
        <IntroP>
          Si buscas la firma de tus artículos, tu teléfono de contacto o las
          fotos para redes sociales, eso vive en Contenido.
        </IntroP>
      </ModuleIntro>
      <ConfiguracionSubNav />

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
              {credentialsConfigured && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#6e6e73",
                    background: "#f5f5f7",
                    padding: "2px 8px",
                    borderRadius: 999,
                    marginLeft: 8,
                    verticalAlign: "middle",
                  }}
                >
                  Listo
                </span>
              )}
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
              Ingresa tu usuario y contraseña de {platformBase.replace(/^https?:\/\//, "")} (no los de SEO TOTAL). Si no recuerdas tu contraseña,{" "}
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
                            background: "#f5f5f7",
                            border: "1px solid #e5e5ea",
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
            <p style={{ fontSize: 13, color: "#6e6e73", marginTop: 10 }}>
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
      </div>

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
          {banner.text}
        </div>
      )}

      <AdminFixPatriciaPanel />
    </div>
  );
}
