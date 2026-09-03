"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  sectionStyle,
  h2Style,
  inputStyle,
  buttonStyle,
  secondaryButtonStyle,
  thStyle,
  tdStyle,
  disabledStyle,
  runStatusLabel,
  statusLabel,
} from "@/components/dashboard-ui";
import type { RunStatus, TitleStatus } from "@/types/dashboard";
import {
  normalizePlatformDomain,
  PLATFORM_DOMAIN_VALUES,
  PLATFORM_SERVERS,
  platformProductName,
  DEFAULT_DAILY_ARTICLE_LIMIT,
  type PlatformDomain,
} from "@auto-articulos/shared";
import { trialDaysRemaining } from "@/lib/trial";
import { SYSTEM_MODULES } from "@/lib/modules";

interface UserRow {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string;
  role: "admin" | "user";
  monthlyArticleLimit: number | null;
  dailyArticleLimit: number | null;
  maxTitlesPerBatch: number;
  platformDomain: string;
  contentLanguage: string;
  allowInstagramPublishing: boolean;
  allowLinkedInPublishing: boolean;
  allowThreadsPublishing: boolean;
  allowFacebookPublishing: boolean;
  allowPinterestPublishing: boolean;
  allowTumblrPublishing: boolean;
  allowBlueskyPublishing: boolean;
  allowDevToPublishing: boolean;
  aiImageGenerationEnabled: boolean;
  numeroCuenta?: number;
  moduleOverrides?: Record<string, "inherit" | "enabled" | "disabled">;
  profilePhotoUrl: string | null;
  businessLogoUrl: string | null;
  opportunitiesDisclosureAcceptedAt: string | null;
  createdAt: string;
  articlesPublished: number;
  currentPassword: string | null;
  isTrialSignup: boolean;
  trialStartedAt: string | null;
  trialUnlocked: boolean;
  disabledModules: string[];
  hasImageCredits: boolean;
  tenMinutesUsername?: string | null;
  connectedDomain?: string | null;
}

const PLATFORM_URL = "https://auto-articulos-web.vercel.app/login";

const permissionLabelStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  fontSize: 13,
  color: "#1d1d1f",
};
const createFieldStyle: CSSProperties = {
  display: "grid",
  gap: 5,
  fontSize: 12,
};

interface UsagePerUser {
  userId: string;
  email: string;
  runs: number;
  titles: number;
  events: number;
  estimatedBytes: number;
  shareOfContent: number;
  risk: "alto" | "medio" | "bajo";
  active: boolean;
}

interface UsageData {
  databaseSizeBytes: number;
  planStorageBytes: number;
  remainingBytes: number;
  percentUsed: number;
  perUser: UsagePerUser[];
}

const riskColors: Record<UsagePerUser["risk"], { bg: string; color: string }> =
  {
    alto: { bg: "rgba(255, 59, 48, 0.08)", color: "#ff3b30" },
    medio: { bg: "#fff4e5", color: "#8a4b08" },
    bajo: { bg: "rgba(52, 199, 89, 0.1)", color: "#16803c" },
  };

const PAGE_SIZE = 10;

function Field({
  label,
  children,
  filaCompleta = false,
}: {
  label: string;
  children: ReactNode;
  filaCompleta?: boolean;
}) {
  return (
    <div style={filaCompleta ? { gridColumn: "1 / -1" } : undefined}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#6e6e73",
          textTransform: "uppercase",
          letterSpacing: "0.03em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  totalCount,
  filteredCount,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  filteredCount: number;
  onChange: (page: number) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 10,
      }}
    >
      <span style={{ fontSize: 12, color: "#6e6e73" }}>
        {totalCount.toLocaleString("es-US")} usuarios en total
        {filteredCount !== totalCount &&
          ` · ${filteredCount.toLocaleString("es-US")} coinciden con el filtro`}
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          style={disabledStyle(
            { ...secondaryButtonStyle, padding: "4px 10px", fontSize: 12 },
            page <= 1,
          )}
        >
          ← Anterior
        </button>
        <span style={{ fontSize: 12, color: "#1d1d1f", fontWeight: 600 }}>
          Página {page} de {totalPages}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          style={disabledStyle(
            { ...secondaryButtonStyle, padding: "4px 10px", fontSize: 12 },
            page >= totalPages,
          )}
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function getUserDisplayName(u: UserRow): string {
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (u.name && u.name.trim()) return u.name.trim();
  return u.email.trim();
}

type UserCategoryFilter =
  | "all"
  | "user"
  | "admin"
  | "trial"
  | "trial_active"
  | "trial_unlocked"
  | "standard"
  | "no_image_credits";

type UserSortOrder =
  | "alpha_asc"
  | "alpha_desc"
  | "newest"
  | "oldest"
  | "articles_desc";

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [monthlyArticleLimit, setMonthlyArticleLimit] = useState("300");
  const [dailyArticleLimit, setDailyArticleLimit] = useState(
    String(DEFAULT_DAILY_ARTICLE_LIMIT),
  );
  const [maxTitlesPerBatch, setMaxTitlesPerBatch] = useState("20");
  // Servidor de la cuenta nueva. Antes se pedía el país y de él se derivaba
  // el servidor (Europa -> .site, resto del mundo -> .net); pedido de
  // Milton (15/8/2026): "no hemos debido preguntar por país sino por
  // continente" — el país nunca importó por sí mismo. Como Administración ya
  // elige el servidor directamente (incluye tagcrush, que no depende de
  // geografía), el país era un paso intermedio innecesario. El servidor
  // vuelve a validarse en POST /api/admin/users.
  const [platformDomain, setPlatformDomain] =
    useState<PlatformDomain>("net");
  const [creating, setCreating] = useState(false);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [search, setSearch] = useState("");
  const [userCategory, setUserCategory] = useState<UserCategoryFilter>("all");
  const [sortOrder, setSortOrder] = useState<UserSortOrder>("alpha_asc");
  const [accessPage, setAccessPage] = useState(1);
  const [tab, setTab] = useState<"crear" | "uso" | "accesos" | "modulos" | "prompts">("accesos");
  const [prompts, setPrompts] = useState<{ id: string; name: string; prompt: string }[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [promptName, setPromptName] = useState("");
  const [promptText, setPromptText] = useState("");
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [promptBanner, setPromptBanner] = useState<{ type: "error" | "info"; text: string } | null>(null);
  // Prompt del generador de imágenes con IA para redes sociales (20/8/2026):
  // global, no por usuario — Milton lo edita directo desde acá en vez de
  // pedir un redeploy cada vez que quiere ajustar el texto.
  const [aiImagePrompt, setAiImagePrompt] = useState("");
  const [loadingAiImagePrompt, setLoadingAiImagePrompt] = useState(false);
  const [savingAiImagePrompt, setSavingAiImagePrompt] = useState(false);
  const [aiImagePromptBanner, setAiImagePromptBanner] = useState<{ type: "error" | "info"; text: string } | null>(null);

  async function loadAiImagePrompt() {
    setLoadingAiImagePrompt(true);
    try {
      const res = await fetch("/api/admin/ai-image-prompt");
      if (res.ok) {
        const data = await res.json();
        setAiImagePrompt(data.prompt ?? "");
      }
    } catch (e) {
      console.error("Error al cargar el prompt de imágenes IA", e);
    } finally {
      setLoadingAiImagePrompt(false);
    }
  }

  async function handleSaveAiImagePrompt() {
    setSavingAiImagePrompt(true);
    setAiImagePromptBanner(null);
    try {
      const res = await fetch("/api/admin/ai-image-prompt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiImagePrompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiImagePromptBanner({ type: "error", text: data.error ?? "Error al guardar el prompt" });
        return;
      }
      setAiImagePromptBanner({ type: "info", text: "Prompt de imágenes con IA guardado con éxito" });
      setAiImagePrompt(data.prompt ?? "");
    } catch (e: any) {
      setAiImagePromptBanner({ type: "error", text: e.message || "Error al conectar con el servidor" });
    } finally {
      setSavingAiImagePrompt(false);
    }
  }

  async function loadPrompts() {
    setLoadingPrompts(true);
    try {
      const res = await fetch("/api/prompts");
      if (res.ok) {
        const data = await res.json();
        setPrompts(data.prompts ?? []);
      }
    } catch (e) {
      console.error("Error al cargar prompts", e);
    } finally {
      setLoadingPrompts(false);
    }
  }

  async function handleSavePrompt(e: React.FormEvent) {
    e.preventDefault();
    if (!promptName.trim() || !promptText.trim()) return;
    setSavingPrompt(true);
    setPromptBanner(null);
    try {
      const url = editingPromptId ? `/api/admin/prompts/${editingPromptId}` : "/api/admin/prompts";
      const method = editingPromptId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: promptName, prompt: promptText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromptBanner({ type: "error", text: data.error ?? "Error al guardar el prompt" });
        return;
      }
      setPromptBanner({ type: "info", text: editingPromptId ? "Prompt actualizado con éxito" : "Prompt creado con éxito" });
      setPromptName("");
      setPromptText("");
      setEditingPromptId(null);
      loadPrompts();
    } catch (e: any) {
      setPromptBanner({ type: "error", text: e.message || "Error al conectar con el servidor" });
    } finally {
      setSavingPrompt(false);
    }
  }

  async function handleDeletePrompt(id: string) {
    if (!confirm("¿Estás seguro de que deseas eliminar este estilo de redacción?")) return;
    setPromptBanner(null);
    try {
      const res = await fetch(`/api/admin/prompts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPromptBanner({ type: "info", text: "Prompt eliminado con éxito" });
        loadPrompts();
      } else {
        const data = await res.json();
        setPromptBanner({ type: "error", text: data.error ?? "Error al eliminar el prompt" });
      }
    } catch (e: any) {
      setPromptBanner({ type: "error", text: e.message || "Error al conectar con el servidor" });
    }
  }
  const [globalDisabledModules, setGlobalDisabledModules] = useState<string[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [savingGlobalModules, setSavingGlobalModules] = useState(false);
  const [globalModulesSaved, setGlobalModulesSaved] = useState(false);
  const [globalModulesError, setGlobalModulesError] = useState<string | null>(null);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [banner, setBanner] = useState<{
    type: "error" | "info";
    text: string;
  } | null>(null);

  async function loadUsers() {
    const res = await fetch(`/api/admin/users?_t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    });
    if (res.status === 403) {
      setForbidden(true);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setCurrentUserId(data.currentUserId ?? "");
    }
  }

  async function loadUsage() {
    setLoadingUsage(true);
    try {
      const res = await fetch(`/api/admin/usage?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (res.ok) {
        setUsage(await res.json());
      }
    } finally {
      setLoadingUsage(false);
    }
  }

  async function loadGlobalModules() {
    setLoadingModules(true);
    try {
      const res = await fetch(`/api/admin/modules?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.globalDisabledModules)) {
          setGlobalDisabledModules(data.globalDisabledModules);
        }
      }
    } catch (err) {
      console.error("Error loading global modules", err);
    } finally {
      setLoadingModules(false);
    }
  }

  async function loadMaintenance() {
    setLoadingMaintenance(true);
    try {
      const res = await fetch(`/api/admin/maintenance?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        setMaintenanceEnabled(Boolean(data.enabled));
      }
    } finally {
      setLoadingMaintenance(false);
    }
  }

  async function handleMaintenanceChange(enabled: boolean) {
    setSavingMaintenance(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar el mantenimiento.");
      setMaintenanceEnabled(enabled);
    } catch (error) {
      console.error(error);
    } finally {
      setSavingMaintenance(false);
    }
  }

  async function handleSaveGlobalModules() {
    setSavingGlobalModules(true);
    setGlobalModulesError(null);
    setGlobalModulesSaved(false);
    try {
      const res = await fetch("/api/admin/modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ globalDisabledModules }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGlobalModulesError(
          data.error ?? "No se pudo guardar la visibilidad global.",
        );
        return;
      }
      setGlobalModulesSaved(true);
      setTimeout(() => setGlobalModulesSaved(false), 3000);
      loadGlobalModules();
    } catch {
      setGlobalModulesError("Error de conexión al guardar los módulos.");
    } finally {
      setSavingGlobalModules(false);
    }
  }

  useEffect(() => {
    loadUsers();
    loadUsage();
    loadGlobalModules();
    loadMaintenance();
  }, []);

  useEffect(() => {
    if (tab === "prompts") {
      loadPrompts();
      loadAiImagePrompt();
    }
  }, [tab]);

  const filteredUsers = users
    .filter((u) => {
      // Category / Type filter
      if (userCategory === "admin" && u.role !== "admin") return false;
      if (userCategory === "user" && u.role !== "user") return false;
      const enPrueba = u.isTrialSignup && u.role !== "admin";
      if (userCategory === "trial" && !enPrueba) return false;
      if (
        userCategory === "trial_active" &&
        (!enPrueba || u.trialUnlocked)
      )
        return false;
      if (
        userCategory === "trial_unlocked" &&
        (!enPrueba || !u.trialUnlocked)
      )
        return false;
      if (userCategory === "standard" && enPrueba) return false;
      if (userCategory === "no_image_credits" && u.hasImageCredits !== false)
        return false;

      // Search query
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        (u.firstName ?? "").toLowerCase().includes(q) ||
        (u.lastName ?? "").toLowerCase().includes(q) ||
        (u.name ?? "").toLowerCase().includes(q) ||
        (u.phone ?? "").toLowerCase().includes(q) ||
        String(u.numeroCuenta ?? "") === q.replace("#", "")
      );
    })
    .sort((a, b) => {
      if (sortOrder === "alpha_asc") {
        return getUserDisplayName(a).localeCompare(
          getUserDisplayName(b),
          "es",
          { sensitivity: "base", numeric: true },
        );
      }
      if (sortOrder === "alpha_desc") {
        return getUserDisplayName(b).localeCompare(
          getUserDisplayName(a),
          "es",
          { sensitivity: "base", numeric: true },
        );
      }
      if (sortOrder === "newest") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      if (sortOrder === "oldest") {
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }
      if (sortOrder === "articles_desc") {
        return (b.articlesPublished ?? 0) - (a.articlesPublished ?? 0);
      }
      return 0;
    });

  const totalAccessPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / PAGE_SIZE),
  );
  const pagedUsers = filteredUsers.slice(
    (accessPage - 1) * PAGE_SIZE,
    accessPage * PAGE_SIZE,
  );

  useEffect(() => {
    setAccessPage(1);
  }, [search, userCategory, sortOrder]);

  useEffect(() => {
    setAccessPage((p) => Math.min(p, totalAccessPages));
  }, [totalAccessPages]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          email,
          password,
          role,
          monthlyArticleLimit: Number(monthlyArticleLimit),
          dailyArticleLimit: Number(dailyArticleLimit),
          maxTitlesPerBatch: Number(maxTitlesPerBatch),
          platformDomain,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({
          type: "error",
          text: data.error ?? "Error al crear el usuario",
        });
        return;
      }
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setPassword("");
      setRole("user");
      setMonthlyArticleLimit("300");
      setDailyArticleLimit("95");
      setMaxTitlesPerBatch("20");
      setPlatformDomain("net");
      setBanner({ type: "info", text: `Usuario ${data.user.email} creado.` });
      loadUsers();
    } finally {
      setCreating(false);
    }
  }

  if (forbidden) {
    return (
      <section style={sectionStyle}>
        <h2 style={h2Style}>Administración</h2>
        <p style={{ fontSize: 13, color: "#6e6e73" }}>
          Esta sección es solo para administradores.
        </p>
      </section>
    );
  }

  const totalPublished = users.reduce(
    (total, user) => total + user.articlesPublished,
    0,
  );
  const adminCount = users.filter((user) => user.role === "admin").length;
  const activeNow = usage?.perUser.filter((user) => user.active).length ?? 0;
  const metrics = [
    {
      label: "Usuarios totales",
      value: users.length.toLocaleString("es-US"),
      detail: `${adminCount} con acceso administrativo`,
      color: "#1d1d1f",
    },
    {
      label: "Activos ahora",
      value: loadingUsage ? "…" : activeNow.toLocaleString("es-US"),
      detail: "Con ejecuciones en curso o pendientes",
      color: "#34c759",
    },
    {
      label: "Artículos publicados",
      value: totalPublished.toLocaleString("es-US"),
      detail: "Suma de todas las cuentas",
      color: "#1d1d1f",
    },
    {
      label: "Base de datos usada",
      value: usage ? `${(usage.percentUsed * 100).toFixed(1)}%` : "…",
      detail: usage
        ? `${formatBytes(usage.remainingBytes)} disponibles`
        : "Calculando almacenamiento",
      color: "#ff9500",
    },
  ];
  const tabs: {
    id: typeof tab;
    label: string;
    description: string;
    eyebrow: string;
  }[] = [
    {
      id: "accesos",
      label: "Accesos a usuarios",
      description: "Roles, credenciales, límites e historial por cuenta.",
      eyebrow: `${users.length} cuentas`,
    },
    {
      id: "crear",
      label: "Creación de usuarios",
      description: "Da acceso a una nueva persona con límites personalizados.",
      eyebrow: "Nueva cuenta",
    },
    {
      id: "uso",
      label: "Uso de la base de datos",
      description: "Capacidad, actividad y consumo detallado por usuario.",
      eyebrow: usage
        ? `${formatBytes(usage.databaseSizeBytes)} usados`
        : "Métricas",
    },
    {
      id: "modulos",
      label: "Visibilidad de módulos",
      description: "Oculta o muestra secciones completas en mantenimiento o desarrollo.",
      eyebrow:
        globalDisabledModules.length > 0
          ? `${globalDisabledModules.length} ocultos`
          : "Todos visibles",
    },
    {
      id: "prompts",
      label: "Prompts",
      description: "Estilos de redacción de artículos y el prompt del generador de imágenes con IA para redes sociales.",
      eyebrow: "Redacción e imágenes",
    },
  ];

  function openSection(section: typeof tab) {
    setTab(section);
    window.requestAnimationFrame(() => {
      document.getElementById("administracion-contenido")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto" }}>
      <section
        className="panel"
        style={{
          ...sectionStyle,
          padding: "24px 28px",
          marginTop: 0,
          marginBottom: 16,
        }}
      >
        <p className="eyebrow" style={{ margin: "0 0 4px" }}>
          Centro de Control
        </p>
        <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 600, color: "#1d1d1f", letterSpacing: "-0.03em" }}>
          Administración
        </h1>
        <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.55, color: "#1d1d1f" }}>
          Desde aquí gestionas las cuentas de la plataforma: crear usuarios, cambiar sus contraseñas, ver cuánto consume cada uno y decidir a qué módulos y a qué redes sociales tiene acceso.
        </p>
        <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.55, color: "#1d1d1f" }}>
          El control de módulos tiene tres posturas por usuario: heredar lo que diga la configuración general, forzar que lo vea aunque esté oculto para todos, o forzar que no lo vea aunque esté visible.
        </p>
        <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.55, color: "#1d1d1f" }}>
          También está aquí el modo de mantenimiento, que oculta la plataforma a todo el mundo menos a los administradores mientras se trabaja en ella.
        </p>
        <p
          className="lead-copy"
          style={{
            margin: 0,
            maxWidth: 720,
          }}
        >
          Supervisa la actividad de la plataforma, controla los accesos y administra la capacidad desde un solo lugar.
        </p>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="row"
            style={{
              padding: "16px 18px",
              borderRadius: 14,
              background: "#ffffff",
              color: "#1d1d1f",
              border: "1px solid #e5e5ea",
            }}
          >
            <div className="muted" style={{ fontSize: 12, fontWeight: 500 }}>
              {metric.label}
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 24,
                lineHeight: 1.1,
                fontWeight: 600,
                color: "#1d1d1f",
              }}
            >
              {metric.value}
            </div>
            <div className="muted" style={{ marginTop: 6, fontSize: 11 }}>
              {metric.detail}
            </div>
          </div>
        ))}
      </div>

      <div
        aria-label="Secciones de administración"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => openSection(t.id)}
            aria-pressed={tab === t.id}
            aria-controls="administracion-contenido"
            className="row"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              padding: 16,
              textAlign: "left",
              fontFamily: "inherit",
              cursor: "pointer",
              borderRadius: 14,
              border: tab === t.id ? "1px solid #1d1d1f" : "1px solid #e5e5ea",
              background: "#ffffff",
              color: "#1d1d1f",
              boxShadow: "none",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                padding: "2px 8px",
                borderRadius: 999,
                background: tab === t.id ? "#f5f5f7" : "#f5f5f7",
                color: tab === t.id ? "#1d1d1f" : "#6e6e73",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {t.eyebrow}
            </span>
            <span
              style={{
                display: "block",
                marginTop: 8,
                fontSize: 15,
                fontWeight: 600,
                color: "#1d1d1f",
              }}
            >
              {t.label}
            </span>
            <span
              className="muted"
              style={{
                display: "block",
                marginTop: 4,
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              {t.description}
            </span>
          </button>
        ))}
      </div>

      {tab === "crear" && (
        <section id="administracion-contenido" style={sectionStyle}>
          <h2 style={h2Style}>Agregar usuario</h2>
          <p style={{ fontSize: 13, color: "#6e6e73" }}>
            Crea una cuenta para dar acceso a otra persona. Cada usuario tiene
            sus propias credenciales de 10minutesWebsite y su propio historial,
            completamente separados.
          </p>
          <form
            onSubmit={handleCreate}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 12,
              alignItems: "end",
            }}
          >
            <label style={createFieldStyle}>
              Nombre
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={createFieldStyle}>
              Apellido
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={createFieldStyle}>
              Teléfono
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={createFieldStyle}>
              Correo electrónico
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={createFieldStyle}>
              Contraseña temporal
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={createFieldStyle}>
              Rol
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "user")}
                style={inputStyle}
              >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </label>
            <label style={createFieldStyle}>
              Límite mensual de artículos
              <input
                type="number"
                min={0}
                step={1}
                required
                value={monthlyArticleLimit}
                onChange={(e) => setMonthlyArticleLimit(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={createFieldStyle}>
              Límite diario de artículos
              <input
                type="number"
                min={0}
                step={1}
                required
                value={dailyArticleLimit}
                onChange={(e) => setDailyArticleLimit(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={createFieldStyle}>
              Máximo de títulos por lote
              <input
                type="number"
                min={1}
                step={1}
                required
                value={maxTitlesPerBatch}
                onChange={(e) => setMaxTitlesPerBatch(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={createFieldStyle}>
              Servidor de la plataforma
              <select
                value={platformDomain}
                onChange={(e) =>
                  setPlatformDomain(e.target.value as PlatformDomain)
                }
                style={inputStyle}
              >
                {PLATFORM_DOMAIN_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {PLATFORM_SERVERS[value].label}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: 11, color: "#6e6e73", marginTop: 4 }}>
                Europa usa 10minuteswebsite.site, el resto del mundo
                10minuteswebsite.net, y tagcrush.net es aparte (no depende de
                geografía). Si te equivocas acá, el robot no podrá iniciar
                sesión con esta cuenta.
              </span>
            </label>
            <button
              type="submit"
              disabled={creating}
              style={disabledStyle(
                { ...buttonStyle, width: "100%", marginTop: 0 },
                creating,
              )}
            >
              {creating ? "Creando..." : "Crear usuario"}
            </button>
          </form>
          {banner && (
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                marginTop: 12,
                background: banner.type === "error" ? "rgba(255, 59, 48, 0.08)" : "rgba(52, 199, 89, 0.1)",
                color: banner.type === "error" ? "#ff3b30" : "#16803c",
                fontSize: 14,
              }}
            >
              {banner.text}
            </div>
          )}
        </section>
      )}

      {tab === "uso" && (
        <section id="administracion-contenido" style={sectionStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <h2 style={h2Style}>Uso de la base de datos (Supabase)</h2>
            <button
              onClick={loadUsage}
              disabled={loadingUsage}
              style={disabledStyle(
                { ...secondaryButtonStyle, padding: "4px 10px", fontSize: 12 },
                loadingUsage,
              )}
            >
              {loadingUsage ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
          <p style={{ fontSize: 13, color: "#6e6e73", marginTop: -6 }}>
            Tamaño real de la base y cuánto contenido corresponde a cada
            usuario, calculado directamente con SQL (no consume cuota de
            transferencia extra al mirarlo).
          </p>
          {usage && (
            <>
              <div style={{ marginTop: 8 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <span>
                    Usado: {formatBytes(usage.databaseSizeBytes)} de{" "}
                    {formatBytes(usage.planStorageBytes)}
                  </span>
                  <span
                    style={{
                      color: usage.percentUsed >= 0.8 ? "#ff3b30" : "#6e6e73",
                    }}
                  >
                    {(usage.percentUsed * 100).toFixed(1)}% usado — quedan{" "}
                    {formatBytes(usage.remainingBytes)} libres
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: "#f5f5f7",
                    borderRadius: 999,
                    overflow: "hidden",
                    marginTop: 6,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, usage.percentUsed * 100)}%`,
                      background:
                        usage.percentUsed >= 0.8 ? "#ff3b30" : "#1d1d1f",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  marginTop: 14,
                }}
              >
                {usage.perUser.map((row) => (
                  <details
                    key={row.userId}
                    style={{
                      border: "1px solid #e5e5ea",
                      borderRadius: 10,
                      background: row.active ? "rgba(0, 0, 0, 0.06)" : "#fff",
                      color: "#1d1d1f",
                      overflow: "hidden",
                    }}
                  >
                    <summary
                      style={{
                        cursor: "pointer",
                        listStyle: "none",
                        padding: "12px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          wordBreak: "break-word",
                        }}
                      >
                        {row.email}
                        {row.active && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: "#1d1d1f",
                              color: "#fff",
                            }}
                          >
                            ● En uso ahora
                          </span>
                        )}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: riskColors[row.risk].bg,
                          color: riskColors[row.risk].color,
                        }}
                      >
                        {row.risk}
                      </span>
                    </summary>
                    <div
                      style={{
                        padding: 14,
                        borderTop: "1px solid #e5e5ea",
                        background: "#f5f5f7",
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: 14,
                      }}
                    >
                      <Field label="Ejecuciones">{row.runs}</Field>
                      <Field label="Títulos">{row.titles}</Field>
                      <Field label="Eventos de log">{row.events}</Field>
                      <Field label="Peso estimado">
                        {formatBytes(row.estimatedBytes)}
                      </Field>
                      <Field label="% del contenido total">
                        {(row.shareOfContent * 100).toFixed(1)}%
                      </Field>
                    </div>
                  </details>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {tab === "accesos" && (
        <section id="administracion-contenido" style={sectionStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <h2 style={{ ...h2Style, margin: 0 }}>Usuarios con acceso</h2>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <input
                type="text"
                placeholder="Buscar por nombre, correo, teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...inputStyle, width: 220, margin: 0 }}
              />
              <select
                aria-label="Filtrar por categoría o tipo de usuario"
                value={userCategory}
                onChange={(e) =>
                  setUserCategory(e.target.value as UserCategoryFilter)
                }
                style={{
                  ...inputStyle,
                  width: "auto",
                  minWidth: 175,
                  margin: 0,
                  cursor: "pointer",
                }}
              >
                <option value="all">Todos los tipos</option>
                <option value="user">Usuarios regulares</option>
                <option value="admin">Administradores</option>
                <option value="trial">Prueba gratuita (Trial)</option>
                <option value="trial_active">Pruebas en curso (7 días)</option>
                <option value="trial_unlocked">Pruebas desbloqueadas</option>
                <option value="standard">Cuentas estándar (sin prueba)</option>
                <option value="no_image_credits">Sin créditos de imagen</option>
              </select>
              <select
                aria-label="Ordenar lista de usuarios"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as UserSortOrder)}
                style={{
                  ...inputStyle,
                  width: "auto",
                  minWidth: 165,
                  margin: 0,
                  cursor: "pointer",
                }}
              >
                <option value="alpha_asc">Nombre (A → Z)</option>
                <option value="alpha_desc">Nombre (Z → A)</option>
                <option value="newest">Más recientes</option>
                <option value="oldest">Más antiguos</option>
                <option value="articles_desc">Más artículos</option>
              </select>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "#6e6e73", marginTop: 4 }}>
            Listado ordenado alfabéticamente por defecto. Puedes filtrar por categoría o buscar por nombre/correo. Haz clic en una cuenta para ver o editar sus accesos y configuración.
          </p>

          <div style={{ marginTop: 10 }}>
            <Pagination
              page={accessPage}
              totalPages={totalAccessPages}
              totalCount={users.length}
              filteredCount={filteredUsers.length}
              onChange={setAccessPage}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginTop: 12,
            }}
          >
            {pagedUsers.length === 0 && (
              <p style={{ fontSize: 13, color: "#6e6e73" }}>
                No se encontraron usuarios.
              </p>
            )}
            {pagedUsers.map((u) => (
              <UserCard
                key={u.id}
                user={u}
                globalDisabledModules={globalDisabledModules}
                isCurrentUser={u.id === currentUserId}
                onUpdated={loadUsers}
              />
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <Pagination
              page={accessPage}
              totalPages={totalAccessPages}
              totalCount={users.length}
              filteredCount={filteredUsers.length}
              onChange={setAccessPage}
            />
          </div>
        </section>
      )}

      {tab === "modulos" && (
        <section id="administracion-contenido" style={sectionStyle}>
          <div
            style={{
              marginBottom: 20,
              padding: 16,
              borderRadius: 14,
              background: maintenanceEnabled ? "#fff4e5" : "#f5f5f7",
              border: maintenanceEnabled
                ? "1px solid rgba(255,149,0,.35)"
                : "1px solid #e5e5ea",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={{ ...h2Style, margin: 0, fontSize: 18 }}>Mantenimiento global</h2>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6e6e73" }}>
                Bloquea el acceso de usuarios y muestra solo el aviso de mantenimiento. Los administradores conservan el acceso.
              </p>
              <strong style={{ display: "block", marginTop: 8, fontSize: 12, color: maintenanceEnabled ? "#8a4b08" : "#16803c" }}>
                {loadingMaintenance ? "Consultando..." : maintenanceEnabled ? "Activo" : "Inactivo"}
              </strong>
            </div>
            <button
              type="button"
              onClick={() => handleMaintenanceChange(!maintenanceEnabled)}
              disabled={loadingMaintenance || savingMaintenance}
              style={disabledStyle(
                maintenanceEnabled
                  ? { ...secondaryButtonStyle, color: "#8a4b08", borderColor: "rgba(255,149,0,.45)" }
                  : { ...buttonStyle, marginTop: 0 },
                loadingMaintenance || savingMaintenance,
              )}
            >
              {savingMaintenance
                ? "Guardando..."
                : maintenanceEnabled
                  ? "Desactivar mantenimiento"
                  : "Activar mantenimiento"}
            </button>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <h2 style={h2Style}>Visibilidad global de módulos</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                onClick={loadGlobalModules}
                disabled={loadingModules}
                style={disabledStyle(
                  {
                    ...secondaryButtonStyle,
                    padding: "6px 12px",
                    fontSize: 12,
                  },
                  loadingModules,
                )}
              >
                {loadingModules ? "Actualizando..." : "Actualizar"}
              </button>
              <button
                type="button"
                onClick={handleSaveGlobalModules}
                disabled={savingGlobalModules}
                style={disabledStyle(
                  {
                    ...buttonStyle,
                    marginTop: 0,
                    padding: "6px 14px",
                    fontSize: 13,
                  },
                  savingGlobalModules,
                )}
              >
                {savingGlobalModules
                  ? "Guardando..."
                  : "Guardar visibilidad global"}
              </button>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "#6e6e73", marginTop: -4 }}>
            Controla qué módulos del sistema están visibles para los usuarios
            regulares. Si un módulo está en desarrollo o reparación, desmárcalo
            aquí para ocultarlo completamente de su menú y bloquear su acceso
            temporalmente. Los administradores siempre conservan acceso para
            probarlo y desarrollarlo.
          </p>

          {globalModulesSaved && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                marginTop: 8,
                background: "rgba(52, 199, 89, 0.1)",
                color: "#16803c",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              ✓ Configuración de visibilidad global guardada correctamente.
            </div>
          )}

          {globalModulesError && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                marginTop: 8,
                background: "rgba(255, 59, 48, 0.08)",
                color: "#ff3b30",
                fontSize: 13,
              }}
            >
              {globalModulesError}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            {SYSTEM_MODULES.map((mod) => {
              const isHidden = globalDisabledModules.includes(mod.id);
              return (
                <div
                  key={mod.id}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: isHidden ? "#fff4e5" : "#ffffff",
                    border: isHidden
                      ? "1px solid rgba(255, 149, 0, 0.3)"
                      : "1px solid #e5e5ea",
                    boxShadow: "none",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <strong style={{ fontSize: 15, color: "#1d1d1f" }}>
                        {mod.label}
                      </strong>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: isHidden ? "rgba(255, 149, 0, 0.15)" : "rgba(52, 199, 89, 0.1)",
                          color: isHidden ? "#8a4b08" : "#16803c",
                          border: isHidden
                            ? "1px solid rgba(255, 149, 0, 0.3)"
                            : "1px solid rgba(52, 199, 89, 0.25)",
                        }}
                      >
                        {isHidden
                          ? "Oculto para usuarios"
                          : "Visible para todos"}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6e6e73",
                        marginTop: 4,
                        lineHeight: 1.4,
                      }}
                    >
                      {mod.description}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6e6e73",
                        marginTop: 6,
                        fontFamily: "monospace",
                      }}
                    >
                      {mod.href}
                    </div>
                  </div>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      color: isHidden ? "#8a4b08" : "#1d1d1f",
                      paddingTop: 10,
                      borderTop: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!isHidden}
                      onChange={(e) => {
                        const visible = e.target.checked;
                        setGlobalDisabledModules((prev) =>
                          visible
                            ? prev.filter((id) => id !== mod.id)
                            : [...prev, mod.id],
                        );
                      }}
                      style={{
                        width: 18,
                        height: 18,
                        accentColor: "#1d1d1f",
                        cursor: "pointer",
                      }}
                    />
                    <span>
                      {isHidden
                        ? "Habilitar (hacer visible para todos)"
                        : "Visible para usuarios"}
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tab === "prompts" && (
        <>
        <section id="administracion-contenido" style={sectionStyle}>
          <h2 style={h2Style}>
            {editingPromptId ? "Editar estilo de redacción" : "Agregar nuevo estilo de redacción (Prompt)"}
          </h2>
          <p style={{ fontSize: 13, color: "#6e6e73" }}>
            Los prompts de redacción personalizados permiten a los usuarios elegir diferentes estilos de escritura al generar artículos.
            Puedes usar placeholders como <code style={{ background: "#f5f5f7", padding: "2px 4px", borderRadius: 4 }}>{"{title}"}</code> o <code style={{ background: "#f5f5f7", padding: "2px 4px", borderRadius: 4 }}>{"{keyword}"}</code> en el texto del prompt, que serán reemplazados automáticamente con el tema del artículo.
          </p>

          <form onSubmit={handleSavePrompt} style={{ marginTop: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 600 }}>
                Nombre del estilo (ej. Profesional, Directo, Creativo)
                <input
                  type="text"
                  required
                  placeholder="Nombre corto"
                  value={promptName}
                  onChange={(e) => setPromptName(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 600 }}>
                Instrucciones del Prompt
                <textarea
                  required
                  placeholder="Instrucciones detalladas que recibirá la IA para escribir el artículo. Ej: Escribe un artículo con tono informal sobre {title}..."
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  rows={8}
                  style={{ ...inputStyle, fontFamily: "inherit" }}
                />
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <button
                  type="submit"
                  disabled={savingPrompt}
                  style={disabledStyle(buttonStyle, savingPrompt)}
                >
                  {savingPrompt ? "Guardando..." : "Guardar Estilo"}
                </button>
                {editingPromptId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPromptId(null);
                      setPromptName("");
                      setPromptText("");
                    }}
                    style={secondaryButtonStyle}
                  >
                    Cancelar Edición
                  </button>
                )}
              </div>
            </div>
          </form>

          {promptBanner && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                marginTop: 14,
                background: promptBanner.type === "error" ? "#fff2f1" : "#eafaf0",
                color: promptBanner.type === "error" ? "#d64545" : "#16803c",
                fontSize: 13,
              }}
            >
              {promptBanner.text}
            </div>
          )}

          <h2 style={{ ...h2Style, marginTop: 28 }}>Estilos de redacción registrados</h2>
          {loadingPrompts ? (
            <p style={{ fontSize: 13, color: "#6e6e73" }}>Cargando estilos...</p>
          ) : prompts.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6e6e73" }}>No hay estilos personalizados guardados. Todos los artículos se generarán con el flujo estándar.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
              {prompts.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    border: "1px solid #e4e9f1",
                    background: "#ffffff",
                    boxShadow: "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <strong style={{ fontSize: 15, color: "#1d1d1f" }}>{p.name}</strong>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <button
                        onClick={() => {
                          setEditingPromptId(p.id);
                          setPromptName(p.name);
                          setPromptText(p.prompt);
                          window.scrollTo({ top: 300, behavior: "smooth" });
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#1d1d1f",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeletePrompt(p.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ff3b30",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  <pre
                    style={{
                      fontSize: 12,
                      color: "#6e6e73",
                      background: "#f5f5f7",
                      padding: 10,
                      borderRadius: 6,
                      whiteSpace: "pre-wrap",
                      margin: 0,
                      maxHeight: 120,
                      overflowY: "auto",
                      fontFamily: "inherit",
                    }}
                  >
                    {p.prompt}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Prompt del generador de imágenes con IA (redes sociales)</h2>
          <p style={{ fontSize: 13, color: "#6e6e73" }}>
            Este prompt es global — aplica a todas las cuentas, no por usuario. Define el criterio
            que usa la IA para transformar la imagen OG del artículo en la imagen final de
            Instagram Story/Reel (fondo, retoque, composición, tipografía, marca). Si lo dejas
            vacío, se usa el prompt por defecto del sistema.
          </p>
          {loadingAiImagePrompt ? (
            <p style={{ fontSize: 13, color: "#6e6e73" }}>Cargando...</p>
          ) : (
            <>
              <textarea
                value={aiImagePrompt}
                onChange={(e) => setAiImagePrompt(e.target.value)}
                placeholder="Ej: Eres un Director Creativo Senior especializado en transformar artículos, imágenes OG y recursos de marca en publicaciones visuales de alto impacto..."
                rows={20}
                style={{
                  ...inputStyle,
                  width: "100%",
                  resize: "vertical",
                  fontFamily: "inherit",
                  lineHeight: 1.5,
                  marginTop: 12,
                }}
              />
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={handleSaveAiImagePrompt}
                  disabled={savingAiImagePrompt}
                  style={disabledStyle(buttonStyle, savingAiImagePrompt)}
                >
                  {savingAiImagePrompt ? "Guardando..." : "Guardar prompt de imágenes IA"}
                </button>
              </div>
              {aiImagePromptBanner && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    marginTop: 14,
                    background: aiImagePromptBanner.type === "error" ? "#fdecec" : "#eafaf0",
                    color: aiImagePromptBanner.type === "error" ? "#d64545" : "#16803c",
                    fontSize: 13,
                  }}
                >
                  {aiImagePromptBanner.text}
                </div>
              )}
            </>
          )}
        </section>
        </>
      )}

    </div>
  );
}

function UserCard({
  user,
  globalDisabledModules = [],
  isCurrentUser,
  onUpdated,
}: {
  user: UserRow;
  globalDisabledModules?: string[];
  isCurrentUser: boolean;
  onUpdated: () => void;
}) {
  const [value, setValue] = useState(
    user.monthlyArticleLimit === null ? "" : String(user.monthlyArticleLimit),
  );
  const [dailyValue, setDailyValue] = useState(
    user.dailyArticleLimit === null ? "" : String(user.dailyArticleLimit),
  );
  const [savingDaily, setSavingDaily] = useState(false);
  const [batchValue, setBatchValue] = useState(String(user.maxTitlesPerBatch));
  const [savingBatch, setSavingBatch] = useState(false);
  const [batchLimitError, setBatchLimitError] = useState<string | null>(null);
  const [roleValue, setRoleValue] = useState<"admin" | "user">(user.role);
  const [savingRole, setSavingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [domainValue, setDomainValue] = useState<PlatformDomain>(
    normalizePlatformDomain(user.platformDomain),
  );
  const [savingDomain, setSavingDomain] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState(user.firstName ?? "");
  const [editLastName, setEditLastName] = useState(user.lastName ?? "");
  const [editPhone, setEditPhone] = useState(user.phone ?? "");
  const [editEmail, setEditEmail] = useState(user.email);
  const [newPassword, setNewPassword] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [permInstagram, setPermInstagram] = useState(
    Boolean(user.allowInstagramPublishing),
  );
  const [permLinkedIn, setPermLinkedIn] = useState(
    Boolean(user.allowLinkedInPublishing),
  );
  const [permThreads, setPermThreads] = useState(
    Boolean(user.allowThreadsPublishing),
  );
  const [permFacebook, setPermFacebook] = useState(
    Boolean(user.allowFacebookPublishing),
  );
  const [permPinterest, setPermPinterest] = useState(
    Boolean(user.allowPinterestPublishing),
  );
  const [permTumblr, setPermTumblr] = useState(
    Boolean(user.allowTumblrPublishing),
  );
  const [permBluesky, setPermBluesky] = useState(Boolean(user.allowBlueskyPublishing));
  const [permDevTo, setPermDevTo] = useState(Boolean(user.allowDevToPublishing));
  const [permAiImageGeneration, setPermAiImageGeneration] = useState(
    Boolean(user.aiImageGenerationEnabled),
  );
  // Sistema de prueba gratuita (13/8/2026): estado de prueba y desbloqueo manual.
  const [permIsTrialSignup, setPermIsTrialSignup] = useState(
    Boolean(user.isTrialSignup),
  );
  const [permTrialUnlocked, setPermTrialUnlocked] = useState(
    Boolean(user.trialUnlocked),
  );
  const [permImageCredits, setPermImageCredits] = useState(
    user.hasImageCredits !== false,
  );
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [permissionsSaved, setPermissionsSaved] = useState(false);
  const [moduleOverrides, setModuleOverrides] = useState<
    Record<string, "inherit" | "enabled" | "disabled">
  >(user.moduleOverrides ?? {});
  const [userDisabledModules, setUserDisabledModules] = useState<string[]>(
    user.disabledModules ?? [],
  );
  const [savingUserModules, setSavingUserModules] = useState(false);
  const [userModulesError, setUserModulesError] = useState<string | null>(null);
  const [userModulesSaved, setUserModulesSaved] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [impersonateError, setImpersonateError] = useState<string | null>(
    null,
  );

  // Los permisos ya no se guardan al hacer clic en cada casilla: se editan en
  // local y se persisten todos juntos con el botón "Guardar permisos".
  useEffect(() => {
    setPermInstagram(Boolean(user.allowInstagramPublishing));
    setPermLinkedIn(Boolean(user.allowLinkedInPublishing));
    setPermThreads(Boolean(user.allowThreadsPublishing));
    setPermFacebook(Boolean(user.allowFacebookPublishing));
    setPermPinterest(Boolean(user.allowPinterestPublishing));
    setPermTumblr(Boolean(user.allowTumblrPublishing));
    setPermBluesky(Boolean(user.allowBlueskyPublishing));
    setPermDevTo(Boolean(user.allowDevToPublishing));
    setPermAiImageGeneration(Boolean(user.aiImageGenerationEnabled));
    setPermIsTrialSignup(Boolean(user.isTrialSignup));
    setPermTrialUnlocked(Boolean(user.trialUnlocked));
    setPermImageCredits(user.hasImageCredits !== false);
    setUserDisabledModules(user.disabledModules ?? []);
  }, [user]);

  const permissionsDirty =
    permInstagram !== Boolean(user.allowInstagramPublishing) ||
    permLinkedIn !== Boolean(user.allowLinkedInPublishing) ||
    permThreads !== Boolean(user.allowThreadsPublishing) ||
    permFacebook !== Boolean(user.allowFacebookPublishing) ||
    permPinterest !== Boolean(user.allowPinterestPublishing) ||
    permTumblr !== Boolean(user.allowTumblrPublishing) ||
    permBluesky !== Boolean(user.allowBlueskyPublishing) ||
    permDevTo !== Boolean(user.allowDevToPublishing) ||
    permAiImageGeneration !== Boolean(user.aiImageGenerationEnabled) ||
    permIsTrialSignup !== Boolean(user.isTrialSignup) ||
    permTrialUnlocked !== Boolean(user.trialUnlocked) ||
    permImageCredits !== (user.hasImageCredits !== false);

  const userModulesDirty =
    JSON.stringify(moduleOverrides) !== JSON.stringify(user.moduleOverrides ?? {}) ||
    JSON.stringify((userDisabledModules ?? []).slice().sort()) !==
    JSON.stringify((user.disabledModules ?? []).slice().sort());

  async function handleSaveUserModules() {
    setSavingUserModules(true);
    setUserModulesError(null);
    setUserModulesSaved(false);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          moduleOverrides,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUserModulesError(
          data.error ?? "No se pudieron guardar los módulos del usuario.",
        );
        return;
      }
      setUserModulesSaved(true);
      setTimeout(() => setUserModulesSaved(false), 2500);
      onUpdated();
    } catch {
      setUserModulesError("Error de conexión al guardar los módulos.");
    } finally {
      setSavingUserModules(false);
    }
  }

  async function handleCopyCredentials() {
    const text = `Correo electrónico: ${user.email}\nClave: ${user.currentPassword ?? "(no disponible, resetéala con Editar)"}\nAcceso a la plataforma: ${PLATFORM_URL}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveLimit() {
    setSaving(true);
    try {
      const monthlyArticleLimit = value.trim() === "" ? null : Number(value);
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, monthlyArticleLimit }),
      });
      onUpdated();
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDailyLimit() {
    setSavingDaily(true);
    try {
      const dailyArticleLimit =
        dailyValue.trim() === "" ? null : Number(dailyValue);
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, dailyArticleLimit }),
      });
      onUpdated();
    } finally {
      setSavingDaily(false);
    }
  }

  async function handleSaveBatchLimit() {
    setSavingBatch(true);
    setBatchLimitError(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          maxTitlesPerBatch: Number(batchValue),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setBatchLimitError(data.error ?? "No se pudo guardar el máximo.");
        return;
      }
      onUpdated();
    } finally {
      setSavingBatch(false);
    }
  }

  async function handleSaveRole() {
    setSavingRole(true);
    setRoleError(null);
    try {
      const bodyPayload: Record<string, unknown> = {
        userId: user.id,
        role: roleValue,
      };
      if (roleValue === "admin") {
        bodyPayload.trialUnlocked = true;
        if (user.isTrialSignup) {
          bodyPayload.isTrialSignup = false;
        }
      }
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setRoleError(data.error ?? "No se pudo guardar el rol.");
        return;
      }
      onUpdated();
    } finally {
      setSavingRole(false);
    }
  }

  async function handleConvertToStandard() {
    setSavingPermissions(true);
    setPermissionsError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          isTrialSignup: false,
          trialUnlocked: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPermissionsError(
          data.error ?? "No se pudo convertir a cuenta estándar.",
        );
        return;
      }
      setPermIsTrialSignup(false);
      setPermTrialUnlocked(true);
      setPermissionsSaved(true);
      setTimeout(() => setPermissionsSaved(false), 2500);
      onUpdated();
    } catch {
      setPermissionsError("Error de conexión al convertir la cuenta.");
    } finally {
      setSavingPermissions(false);
    }
  }

  async function handleSaveDomain() {
    setSavingDomain(true);
    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, platformDomain: domainValue }),
      });
      onUpdated();
    } finally {
      setSavingDomain(false);
    }
  }

  async function handleSavePermissions() {
    setSavingPermissions(true);
    setPermissionsError(null);
    setPermissionsSaved(false);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          allowInstagramPublishing: permInstagram,
          allowLinkedInPublishing: permLinkedIn,
          allowThreadsPublishing: permThreads,
          allowFacebookPublishing: permFacebook,
          allowPinterestPublishing: permPinterest,
          allowTumblrPublishing: permTumblr,
          allowBlueskyPublishing: permBluesky,
          allowDevToPublishing: permDevTo,
          aiImageGenerationEnabled: permAiImageGeneration,
          isTrialSignup: permIsTrialSignup,
          trialUnlocked: permTrialUnlocked,
          hasImageCredits: permImageCredits,
          // El acceso a los módulos viaja con el mismo botón: tenerlo en una
          // sección aparte hacía que se guardaran los permisos y el acceso se
          // quedara sin guardar sin que nadie se diera cuenta.
          moduleOverrides,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPermissionsError(data.error ?? "No se pudieron guardar los permisos.");
        return;
      }
      setPermissionsSaved(true);
      setTimeout(() => setPermissionsSaved(false), 2500);
      onUpdated();
    } catch {
      setPermissionsError("No se pudieron guardar los permisos. Revisa tu conexión.");
    } finally {
      setSavingPermissions(false);
    }
  }

  async function handleSaveEdit() {
    setSaving(true);
    setEditError(null);
    try {
      const body: Record<string, unknown> = { userId: user.id };
      if (editEmail.trim() !== user.email) body.email = editEmail.trim();
      if (editFirstName.trim() !== (user.firstName ?? ""))
        body.firstName = editFirstName.trim();
      if (editLastName.trim() !== (user.lastName ?? ""))
        body.lastName = editLastName.trim();
      if (editPhone.trim() !== (user.phone ?? ""))
        body.phone = editPhone.trim();
      if (newPassword.trim() !== "") body.newPassword = newPassword.trim();

      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data.error ?? "No se pudo guardar.");
        return;
      }
      setNewPassword("");
      setEditing(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  }

  async function handleImpersonate() {
    setImpersonating(true);
    setImpersonateError(null);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setImpersonateError(data.error ?? "No se pudo acceder a la cuenta.");
        return;
      }
      window.location.href = "/dashboard";
    } finally {
      setImpersonating(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(data.error ?? "No se pudo eliminar.");
        return;
      }
      onUpdated();
    } finally {
      setDeleting(false);
    }
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <details
      style={{
        border: "1px solid #e5e5ea",
        borderRadius: 10,
        background: "#fff",
        color: "#1d1d1f",
        overflow: "hidden",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          listStyle: "none",
          padding: "12px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {user.numeroCuenta !== undefined && (
              <span
                title="Número de cuenta. Es fijo: no cambia al filtrar ni al reordenar la lista."
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#86868b",
                  fontVariantNumeric: "tabular-nums",
                  minWidth: 34,
                }}
              >
                #{user.numeroCuenta}
              </span>
            )}
            <strong style={{ fontSize: 14 }}>{fullName || "(sin nombre)"}</strong>
            {user.isTrialSignup && user.role !== "admin" && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: user.trialUnlocked ? "rgba(52, 199, 89, 0.1)" : "#fff4e5",
                  color: user.trialUnlocked ? "#16803c" : "#8a4b08",
                  border: `1px solid ${user.trialUnlocked ? "rgba(52, 199, 89, 0.25)" : "rgba(255, 149, 0, 0.25)"}`,
                }}
                title={
                  user.trialUnlocked
                    ? "Se registró desde Solicitar prueba; ya tiene acceso permanente desbloqueado."
                    : "Se registró desde Solicitar prueba; sin desbloquear, pierde el acceso al terminar los 7 días."
                }
              >
                {user.trialUnlocked
                  ? "Prueba desbloqueada"
                  : user.trialStartedAt
                    ? (() => {
                        const dias = trialDaysRemaining(new Date(user.trialStartedAt));
                        if (dias <= 0) return "Prueba vencida";
                        return `Prueba · le queda${dias === 1 ? "" : "n"} ${dias} día${dias === 1 ? "" : "s"}`;
                      })()
                    : "Prueba gratuita"}
              </span>
            )}
            {user.connectedDomain && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: "#f5f5f7",
                  color: "#1d1d1f",
                  border: "1px solid #d2d2d7",
                }}
                title={`Dominio vinculado: ${user.connectedDomain}`}
              >
                {user.connectedDomain}
              </span>
            )}
            {user.hasImageCredits === false && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: "rgba(255, 59, 48, 0.08)",
                  color: "#ff3b30",
                  border: "1px solid rgba(255, 59, 48, 0.3)",
                }}
                title={`Esta cuenta se quedó sin créditos de imagen en ${platformProductName(user.platformDomain)}.`}
              >
                SIN CRÉDITOS IMAGEN
              </span>
            )}
          </div>
          <span
            style={{ fontSize: 12, color: "#6e6e73", wordBreak: "break-word" }}
          >
            {user.email}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {isCurrentUser && (
            <span style={{ fontSize: 11, color: "#6e6e73" }}>Tu cuenta</span>
          )}
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 999,
              background: user.role === "admin" ? "rgba(0, 0, 0, 0.12)" : "#f5f5f7",
              color: user.role === "admin" ? "#1d1d1f" : "#6e6e73",
            }}
          >
            {user.role === "admin" ? "Administrador" : "Usuario"}
          </span>
          <span style={{ fontSize: 11, color: "#6e6e73" }}>
            {user.articlesPublished} artículos
          </span>
        </div>
      </summary>

      <div
        style={{
          padding: "14px",
          borderTop: "1px solid #e5e5ea",
          background: "#f5f5f7",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 14,
          }}
        >
          <Field label="Teléfono">{user.phone ?? "—"}</Field>

          <Field label="Dominio Web Vinculado">
            <span style={{ fontSize: 13, color: user.connectedDomain ? "#1d1d1f" : "#6e6e73", wordBreak: "break-all" }}>
              {user.connectedDomain ? `${user.connectedDomain}` : "Sin dominio vinculado"}
            </span>
          </Field>

          <Field label={`Cuenta ${platformProductName(user.platformDomain)}`}>
            <span style={{ fontSize: 13, color: user.tenMinutesUsername ? "#1d1d1f" : "#6e6e73", wordBreak: "break-all" }}>
              {user.tenMinutesUsername ? `${user.tenMinutesUsername}` : "Sin credenciales guardadas"}
            </span>
          </Field>

          <Field label="Rol">
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select
                value={roleValue}
                onChange={(event) =>
                  setRoleValue(event.target.value as "admin" | "user")
                }
                disabled={isCurrentUser || savingRole}
                aria-label={`Rol de ${user.email}`}
                style={{ ...inputStyle, width: 132 }}
              >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
              {!isCurrentUser && (
                <button
                  onClick={handleSaveRole}
                  disabled={savingRole || roleValue === user.role}
                  style={disabledStyle(
                    { ...buttonStyle, padding: "4px 10px", fontSize: 12 },
                    savingRole || roleValue === user.role,
                  )}
                >
                  {savingRole ? "..." : "Guardar"}
                </button>
              )}
            </div>
            {roleError && (
              <div style={{ fontSize: 11, color: "#ff3b30", marginTop: 4 }}>
                {roleError}
              </div>
            )}
          </Field>

          <Field label="Permisos y estado de cuenta">
            <div style={{ display: "grid", gap: 6 }}>
              <label style={permissionLabelStyle}>
                <input
                  type="checkbox"
                  checked={permInstagram}
                  onChange={(e) => setPermInstagram(e.target.checked)}
                  disabled={savingPermissions}
                  style={{ accentColor: "#1d1d1f", width: 16, height: 16 }}
                />
                Publicar en Instagram
              </label>
              <label style={permissionLabelStyle}>
                <input
                  type="checkbox"
                  checked={permLinkedIn}
                  onChange={(e) => setPermLinkedIn(e.target.checked)}
                  disabled={savingPermissions}
                  style={{ accentColor: "#1d1d1f", width: 16, height: 16 }}
                />
                Publicar en LinkedIn
              </label>
              <label style={permissionLabelStyle}>
                <input
                  type="checkbox"
                  checked={permThreads}
                  onChange={(e) => setPermThreads(e.target.checked)}
                  disabled={savingPermissions}
                  style={{ accentColor: "#000000", width: 16, height: 16 }}
                />
                Publicar en Threads
              </label>
              <label style={permissionLabelStyle}>
                <input
                  type="checkbox"
                  checked={permFacebook}
                  onChange={(e) => setPermFacebook(e.target.checked)}
                  disabled={savingPermissions}
                  style={{ accentColor: "#1d1d1f", width: 16, height: 16 }}
                />
                Publicar en Facebook Pages
              </label>
              <label style={permissionLabelStyle}>
                <input
                  type="checkbox"
                  checked={permPinterest}
                  onChange={(e) => setPermPinterest(e.target.checked)}
                  disabled={savingPermissions}
                  style={{ accentColor: "#e60023", width: 16, height: 16 }}
                />
                Conectar y publicar en Pinterest
              </label>
              <label style={permissionLabelStyle}>
                <input
                  type="checkbox"
                  checked={permTumblr}
                  onChange={(e) => setPermTumblr(e.target.checked)}
                  disabled={savingPermissions}
                  style={{ accentColor: "#36465d", width: 16, height: 16 }}
                />
                Conectar y publicar en Tumblr
              </label>
              <label style={permissionLabelStyle}>
                <input type="checkbox" checked={permBluesky} onChange={(e) => setPermBluesky(e.target.checked)} disabled={savingPermissions} style={{ accentColor: "#1d1d1f", width: 16, height: 16 }} />
                Conectar y publicar en Bluesky
              </label>
              <label style={permissionLabelStyle}>
                <input type="checkbox" checked={permDevTo} onChange={(e) => setPermDevTo(e.target.checked)} disabled={savingPermissions} style={{ accentColor: "#1d1d1f", width: 16, height: 16 }} />
                Conectar y publicar artículos en DEV.to
              </label>
              <label style={permissionLabelStyle}>
                <input
                  type="checkbox"
                  checked={permAiImageGeneration}
                  onChange={(e) => setPermAiImageGeneration(e.target.checked)}
                  disabled={savingPermissions}
                  style={{ accentColor: "#1d1d1f", width: 16, height: 16 }}
                />
                Generador de imágenes con IA (Instagram Story/Reel)
              </label>
              <label style={permissionLabelStyle}>
                <input
                  type="checkbox"
                  checked={permImageCredits}
                  onChange={(e) => setPermImageCredits(e.target.checked)}
                  disabled={savingPermissions}
                  style={{ accentColor: "#ff9500", width: 16, height: 16 }}
                />
                Créditos de imagen disponibles ({platformProductName(user.platformDomain)})
              </label>

              <div
                style={{
                  marginTop: 6,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: permIsTrialSignup ? "#fff4e5" : "#f5f5f7",
                  border: `1px solid ${permIsTrialSignup ? "rgba(255, 149, 0, 0.3)" : "#e5e5ea"}`,
                  display: "grid",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: permIsTrialSignup ? "#8a4b08" : "#6e6e73",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Modalidad de acceso
                </div>
                <label style={permissionLabelStyle}>
                  <input
                    type="checkbox"
                    checked={permIsTrialSignup}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setPermIsTrialSignup(checked);
                      if (!checked) {
                        setPermTrialUnlocked(true);
                      }
                    }}
                    disabled={savingPermissions}
                    style={{ accentColor: "#ff9500", width: 16, height: 16 }}
                  />
                  Cuenta en prueba gratuita (Free Trial)
                </label>

                {permIsTrialSignup ? (
                  <>
                    <label style={{ ...permissionLabelStyle, paddingLeft: 12 }}>
                      <input
                        type="checkbox"
                        checked={permTrialUnlocked}
                        onChange={(e) => setPermTrialUnlocked(e.target.checked)}
                        disabled={savingPermissions}
                        style={{ accentColor: "#16803c", width: 16, height: 16 }}
                      />
                      Desbloqueado permanente (sin límite de 7 días)
                    </label>
                    <div style={{ marginTop: 2 }}>
                      <button
                        type="button"
                        onClick={handleConvertToStandard}
                        disabled={savingPermissions}
                        style={disabledStyle(
                          {
                            ...secondaryButtonStyle,
                            padding: "4px 8px",
                            fontSize: 11,
                            background: "#f5f5f7",
                            color: "#1d1d1f",
                            borderColor: "rgba(0, 0, 0, 0.25)",
                          },
                          savingPermissions,
                        )}
                      >
                        Convertir a cuenta estándar (quitar prueba)
                      </button>
                    </div>
                  </>
                ) : (
                  <span style={{ fontSize: 11, color: "#16803c", fontWeight: 600 }}>
                    ✓ Cuenta estándar (acceso regular permanente)
                  </span>
                )}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 4 }}>
                <button
                  onClick={handleSavePermissions}
                  disabled={savingPermissions || (!permissionsDirty && !userModulesDirty)}
                  style={disabledStyle(
                    { ...buttonStyle, padding: "4px 10px", fontSize: 12 },
                    savingPermissions || !permissionsDirty,
                  )}
                >
                  {savingPermissions ? "Guardando..." : "Guardar permisos y accesos"}
                </button>
                {permissionsSaved && (
                  <span style={{ fontSize: 11, color: "#16803c" }}>
                    Permisos guardados
                  </span>
                )}
              </div>
              {permissionsError && (
                <div style={{ fontSize: 11, color: "#ff3b30" }}>
                  {permissionsError}
                </div>
              )}
            </div>
          </Field>

          <Field label="Acceso a módulos (esta cuenta)" filaCompleta>
            <p style={{ margin: "0 0 8px", fontSize: 11, lineHeight: 1.5, color: "#6e6e73" }}>
              <strong>Dárselo a esta cuenta</strong> pasa por encima del apagado
              global: aunque el módulo esté oculto para todos, esta persona sí lo
              verá. Se guarda con el botón <strong>Guardar permisos y accesos</strong> de arriba.
            </p>
            <div style={{ display: "grid", gap: 6 }}>
              {SYSTEM_MODULES.map((mod) => {
                const acceso = moduleOverrides[mod.id] ?? "inherit";
                const isGloballyDisabled = globalDisabledModules.includes(mod.id);
                return (
                  <label
                    key={mod.id}
                    style={{
                      ...permissionLabelStyle,
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <span>{mod.label}</span>
                    <span
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 8,
                        flex: "1 1 240px",
                        justifyContent: "flex-end",
                      }}
                    >
                      {isGloballyDisabled && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "1px 5px",
                            borderRadius: 4,
                            background: "#fff4e5",
                            color: "#8a4b08",
                            border: "1px solid rgba(255, 149, 0, 0.25)",
                          }}
                          title="Este módulo está oculto globalmente para todos los usuarios"
                        >
                          Oculto global
                        </span>
                      )}
                      <select
                        value={acceso}
                        onChange={(e) =>
                          setModuleOverrides((prev) => ({
                            ...prev,
                            [mod.id]: e.target.value as "inherit" | "enabled" | "disabled",
                          }))
                        }
                        disabled={savingUserModules}
                        style={{
                          flex: "1 1 220px",
                          maxWidth: 280,
                          margin: 0,
                          fontSize: 13,
                          padding: "8px 10px",
                          minHeight: 36,
                          cursor: "pointer",
                        }}
                      >
                        <option value="inherit">Según la config. general</option>
                        <option value="enabled">Dárselo a esta cuenta</option>
                        <option value="disabled">Quitárselo a esta cuenta</option>
                      </select>
                    </span>
                  </label>
                );
              })}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginTop: 4,
                }}
              >
                <button
                  onClick={handleSaveUserModules}
                  disabled={savingUserModules || !userModulesDirty}
                  style={disabledStyle(
                    { ...buttonStyle, padding: "4px 10px", fontSize: 12 },
                    savingUserModules || !userModulesDirty,
                  )}
                >
                  {savingUserModules ? "Guardando..." : "Guardar módulos"}
                </button>
                {userModulesSaved && (
                  <span style={{ fontSize: 11, color: "#16803c" }}>
                    Módulos guardados
                  </span>
                )}
              </div>
              {userModulesError && (
                <div style={{ fontSize: 11, color: "#ff3b30" }}>
                  {userModulesError}
                </div>
              )}
            </div>
          </Field>

          <Field label="Foto de perfil (URL)">
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="text"
                placeholder="https://..."
                defaultValue={user.profilePhotoUrl ?? ""}
                onBlur={async (e) => {
                  const val = e.target.value.trim() || null;
                  if (val !== user.profilePhotoUrl) {
                    await fetch("/api/admin/users", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId: user.id, profilePhotoUrl: val }),
                    });
                    onUpdated();
                  }
                }}
                style={{ ...inputStyle, width: 200 }}
              />
            </div>
          </Field>

          <Field label="Logo del negocio (URL)">
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="text"
                placeholder="https://..."
                defaultValue={user.businessLogoUrl ?? ""}
                onBlur={async (e) => {
                  const val = e.target.value.trim() || null;
                  if (val !== user.businessLogoUrl) {
                    await fetch("/api/admin/users", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId: user.id, businessLogoUrl: val }),
                    });
                    onUpdated();
                  }
                }}
                style={{ ...inputStyle, width: 200 }}
              />
            </div>
          </Field>

          <Field label="Límite mensual">
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="number"
                min={0}
                placeholder="Sin límite"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                style={{ ...inputStyle, width: 100 }}
              />
              <button
                onClick={handleSaveLimit}
                disabled={saving}
                style={disabledStyle(
                  { ...buttonStyle, padding: "4px 10px", fontSize: 12 },
                  saving,
                )}
              >
                {saving ? "..." : "Guardar"}
              </button>
            </div>
          </Field>

          <Field label="Límite diario">
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="number"
                min={0}
                placeholder="Sin límite"
                value={dailyValue}
                onChange={(e) => setDailyValue(e.target.value)}
                style={{ ...inputStyle, width: 100 }}
              />
              <button
                onClick={handleSaveDailyLimit}
                disabled={savingDaily}
                style={disabledStyle(
                  { ...buttonStyle, padding: "4px 10px", fontSize: 12 },
                  savingDaily,
                )}
              >
                {savingDaily ? "..." : "Guardar"}
              </button>
            </div>
          </Field>

          <Field label="Máximo por lote">
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="number"
                min={1}
                step={1}
                value={batchValue}
                onChange={(e) => setBatchValue(e.target.value)}
                style={{ ...inputStyle, width: 86 }}
              />
              <button
                onClick={handleSaveBatchLimit}
                disabled={savingBatch}
                style={disabledStyle(
                  { ...buttonStyle, padding: "4px 10px", fontSize: 12 },
                  savingBatch,
                )}
              >
                {savingBatch ? "..." : "Guardar"}
              </button>
            </div>
            {batchLimitError && (
              <div style={{ fontSize: 11, color: "#ff3b30", marginTop: 4 }}>
                {batchLimitError}
              </div>
            )}
          </Field>

          <Field label="Servidor">
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select
                value={domainValue}
                onChange={(e) =>
                  setDomainValue(e.target.value as PlatformDomain)
                }
                disabled={savingDomain}
                aria-label={`Servidor de ${user.email}`}
                style={{ ...inputStyle, width: 150 }}
              >
                {PLATFORM_DOMAIN_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {PLATFORM_SERVERS[value].label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSaveDomain}
                disabled={
                  savingDomain ||
                  domainValue === normalizePlatformDomain(user.platformDomain)
                }
                style={disabledStyle(
                  { ...buttonStyle, padding: "4px 10px", fontSize: 12 },
                  savingDomain ||
                    domainValue ===
                      normalizePlatformDomain(user.platformDomain),
                )}
              >
                {savingDomain ? "..." : "Guardar"}
              </button>
            </div>
          </Field>

          <Field label="Creado">
            {new Date(user.createdAt).toLocaleDateString()}
          </Field>

          <Field label="Aviso de Oportunidades">
            {user.opportunitiesDisclosureAcceptedAt
              ? `Aceptado el ${new Date(
                  user.opportunitiesDisclosureAcceptedAt,
                ).toLocaleString("es-US")}`
              : "Todavía no aceptado"}
          </Field>
        </div>

        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginTop: 16,
          }}
        >
          <button
            onClick={handleImpersonate}
            disabled={isCurrentUser || user.role === "admin" || impersonating}
            title={
              isCurrentUser
                ? "Ya estás en tu propia cuenta."
                : user.role === "admin"
                  ? "No puedes acceder a la cuenta de otro administrador."
                  : undefined
            }
            style={disabledStyle(
              {
                ...secondaryButtonStyle,
                padding: "4px 10px",
                fontSize: 12,
                color: "#1d1d1f",
              },
              isCurrentUser || user.role === "admin" || impersonating,
            )}
          >
            {impersonating ? "Entrando..." : "Acceder como"}
          </button>
          <button
            onClick={handleCopyCredentials}
            disabled={!user.currentPassword}
            title={
              user.currentPassword
                ? undefined
                : "No hay clave recuperable guardada — usa Editar para poner una nueva."
            }
            style={disabledStyle(
              {
                ...secondaryButtonStyle,
                padding: "4px 10px",
                fontSize: 12,
                background: copied
                  ? "rgba(52, 199, 89, 0.1)"
                  : secondaryButtonStyle.background,
                color: copied ? "#16803c" : secondaryButtonStyle.color,
              },
              !user.currentPassword,
            )}
          >
            {copied ? "¡Copiado!" : "Copiar credenciales"}
          </button>
          <button
            onClick={() => setEditing((v) => !v)}
            style={{
              ...secondaryButtonStyle,
              padding: "4px 10px",
              fontSize: 12,
            }}
          >
            {editing ? "Cancelar" : "Editar"}
          </button>
          {!confirmingDelete ? (
            <button
              onClick={() => setConfirmingDelete(true)}
              style={{
                background: "none",
                color: "#ff3b30",
                border: "1px solid rgba(255, 59, 48, 0.08)",
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Eliminar
            </button>
          ) : (
            <>
              <span style={{ fontSize: 12, color: "#8a4b08" }}>¿Seguro?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  background: "rgba(255, 59, 48, 0.08)",
                  color: "#ff3b30",
                  border: "1px solid rgba(255, 59, 48, 0.25)",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: deleting ? "default" : "pointer",
                }}
              >
                {deleting ? "..." : "Sí"}
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                style={{
                  background: "none",
                  color: "#6e6e73",
                  border: "1px solid #e5e5ea",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 12,
                  cursor: deleting ? "default" : "pointer",
                }}
              >
                No
              </button>
            </>
          )}
        </div>
        {deleteError && (
          <div style={{ fontSize: 11, color: "#ff3b30", marginTop: 6 }}>
            {deleteError}
          </div>
        )}
        {impersonateError && (
          <div style={{ fontSize: 11, color: "#ff3b30", marginTop: 6 }}>
            {impersonateError}
          </div>
        )}

        {editing && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 10px",
              background: "#f5f5f7",
              borderRadius: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <input
                type="text"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                style={{ ...inputStyle, width: 140 }}
                placeholder="Nombre"
              />
              <input
                type="text"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                style={{ ...inputStyle, width: 140 }}
                placeholder="Apellido"
              />
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                style={{ ...inputStyle, width: 220 }}
                placeholder="Correo"
              />
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                style={{ ...inputStyle, width: 140 }}
                placeholder="Teléfono"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ ...inputStyle, width: 200 }}
                placeholder="Nueva contraseña (opcional)"
              />
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                style={disabledStyle({ ...buttonStyle, marginTop: 0 }, saving)}
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
            {editError && (
              <p style={{ fontSize: 12, color: "#ff3b30", marginTop: 6 }}>
                {editError}
              </p>
            )}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <UserHistorial email={user.email} />
        </div>
      </div>
    </details>
  );
}

interface AdminTitleSummary {
  id: string;
  text: string;
  status: string;
  attempts: number;
  articleUrl: string | null;
  finalTitle: string | null;
  errorMessage: string | null;
}

interface AdminRunSummary {
  id: string;
  status: string;
  createdAt: string;
  finishedAt: string | null;
  category: { name: string } | null;
  titles: AdminTitleSummary[];
}

function UserHistorial({ email }: { email: string }) {
  const [runs, setRuns] = useState<AdminRunSummary[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadHistorial() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/inspect-runs?email=${encodeURIComponent(email)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <details
      onToggle={(e) => {
        if ((e.target as HTMLDetailsElement).open && !runs) loadHistorial();
      }}
    >
      <summary style={{ cursor: "pointer", fontSize: 12, color: "#6e6e73" }}>
        Ver historial
      </summary>
      {loading && !runs && (
        <p style={{ fontSize: 12, color: "#6e6e73", marginTop: 6 }}>
          Cargando...
        </p>
      )}
      {runs && runs.length === 0 && (
        <p style={{ fontSize: 12, color: "#6e6e73", marginTop: 6 }}>
          Todavía no tiene ejecuciones.
        </p>
      )}
      {runs && runs.length > 0 && (
        <div
          style={{
            marginTop: 6,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {runs.map((run) => {
            const successCount = run.titles.filter(
              (t) => t.status === "success",
            ).length;
            return (
              <details
                key={run.id}
                style={{
                  background: "#f5f5f7",
                  border: "1px solid #e5e5ea",
                  borderRadius: 6,
                  padding: "6px 10px",
                }}
              >
                <summary
                  style={{ cursor: "pointer", fontSize: 12, color: "#1d1d1f" }}
                >
                  {new Date(run.createdAt).toLocaleString()} —{" "}
                  {run.category?.name ?? "—"} — {successCount}/
                  {run.titles.length} publicados —{" "}
                  {runStatusLabel(run.status as RunStatus)}
                </summary>
                <table
                  className="responsive-table"
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 11,
                    marginTop: 6,
                  }}
                >
                  <thead>
                    <tr style={{ textAlign: "left", color: "#6e6e73" }}>
                      <th style={thStyle}>Título</th>
                      <th style={thStyle}>Estado</th>
                      <th style={thStyle}>Intentos</th>
                      <th style={thStyle}>Enlace / Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.titles.map((title) => (
                      <tr
                        key={title.id}
                        style={{ borderTop: "1px solid #e5e5ea" }}
                      >
                        <td style={tdStyle} data-label="Título">
                          {title.text}
                          {title.finalTitle &&
                            title.finalTitle !== title.text && (
                              <div
                                style={{
                                  fontSize: 10,
                                  color: "#6e6e73",
                                  marginTop: 2,
                                }}
                              >
                                Publicado como: {title.finalTitle}
                              </div>
                            )}
                        </td>
                        <td style={tdStyle} data-label="Estado">
                          {statusLabel(title.status as TitleStatus)}
                        </td>
                        <td style={tdStyle} data-label="Intentos">
                          {title.attempts}
                        </td>
                        <td style={tdStyle} data-label="Enlace / Error">
                          {title.articleUrl ? (
                            <a
                              href={title.articleUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#0066cc", fontWeight: 600 }}
                            >
                              Ver artículo
                            </a>
                          ) : (
                            (title.errorMessage ?? "—")
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            );
          })}
        </div>
      )}
    </details>
  );
}
