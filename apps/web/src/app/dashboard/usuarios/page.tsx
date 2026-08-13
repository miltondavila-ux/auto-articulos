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
}

const PLATFORM_URL = "https://auto-articulos-web.vercel.app/login";
const permissionLabelStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  fontSize: 13,
  color: "#16181d",
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
    alto: { bg: "#fdecec", color: "#d64545" },
    medio: { bg: "#fff8e6", color: "#8a6d1a" },
    bajo: { bg: "#dff5e6", color: "#1e8a4b" },
  };

const PAGE_SIZE = 10;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#8a94a6",
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
      <span style={{ fontSize: 12, color: "#6b7280" }}>
        {totalCount.toLocaleString("es-US")} usuarios en total
        {filteredCount !== totalCount &&
          ` · ${filteredCount.toLocaleString("es-US")} coinciden con la búsqueda`}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
        <span style={{ fontSize: 12, color: "#16181d", fontWeight: 600 }}>
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
  const [dailyArticleLimit, setDailyArticleLimit] = useState("95");
  const [maxTitlesPerBatch, setMaxTitlesPerBatch] = useState("20");
  const [platformDomain, setPlatformDomain] = useState<"net" | "site">("net");
  const [creating, setCreating] = useState(false);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [search, setSearch] = useState("");
  const [accessPage, setAccessPage] = useState(1);
  const [tab, setTab] = useState<"crear" | "uso" | "accesos" | "modulos">("accesos");
  const [globalDisabledModules, setGlobalDisabledModules] = useState<string[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [savingGlobalModules, setSavingGlobalModules] = useState(false);
  const [globalModulesSaved, setGlobalModulesSaved] = useState(false);
  const [globalModulesError, setGlobalModulesError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{
    type: "error" | "info";
    text: string;
  } | null>(null);

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
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
      const res = await fetch("/api/admin/usage");
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
      const res = await fetch("/api/admin/modules");
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
  }, []);

  const filteredUsers = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      (u.firstName ?? "").toLowerCase().includes(q) ||
      (u.lastName ?? "").toLowerCase().includes(q) ||
      (u.name ?? "").toLowerCase().includes(q)
    );
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
  }, [search]);

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
        <p style={{ fontSize: 13, color: "#6b7280" }}>
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
      color: "#2f5fdb",
    },
    {
      label: "Activos ahora",
      value: loadingUsage ? "…" : activeNow.toLocaleString("es-US"),
      detail: "Con ejecuciones en curso o pendientes",
      color: "#16a06b",
    },
    {
      label: "Artículos publicados",
      value: totalPublished.toLocaleString("es-US"),
      detail: "Suma de todas las cuentas",
      color: "#7c3aed",
    },
    {
      label: "Base de datos usada",
      value: usage ? `${(usage.percentUsed * 100).toFixed(1)}%` : "…",
      detail: usage
        ? `${formatBytes(usage.remainingBytes)} disponibles`
        : "Calculando almacenamiento",
      color: "#d97706",
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
    <div>
      <section
        style={{
          marginTop: 20,
          padding: "26px 28px",
          borderRadius: 18,
          color: "#fff",
          background:
            "radial-gradient(circle at 85% 10%, rgba(77, 216, 232, 0.3), transparent 34%), linear-gradient(135deg, #102f72 0%, #174d9a 52%, #117c92 100%)",
          border: "1px solid rgba(151, 214, 255, 0.35)",
          boxShadow: "0 20px 45px rgba(0, 9, 35, 0.24)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.15em",
            color: "#aeeef5",
            textTransform: "uppercase",
          }}
        >
          Centro de control
        </div>
        <h2 style={{ margin: "8px 0 6px", fontSize: 28 }}>Administración</h2>
        <p
          style={{
            margin: 0,
            maxWidth: 720,
            color: "rgba(255,255,255,0.78)",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          Supervisa la actividad de la plataforma, controla los accesos y
          administra la capacidad desde un solo lugar.
        </p>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 12,
          marginTop: 14,
        }}
      >
        {metrics.map((metric) => (
          <div
            key={metric.label}
            style={{
              position: "relative",
              overflow: "hidden",
              minHeight: 116,
              padding: "18px 19px",
              borderRadius: 14,
              background: "#fff",
              color: "#16181d",
              border: "1px solid #e4e9f1",
              boxShadow: "0 8px 22px rgba(12, 35, 75, 0.08)",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: metric.color,
                opacity: 0.1,
                right: -18,
                top: -20,
              }}
            />
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
              {metric.label}
            </div>
            <div
              style={{
                marginTop: 7,
                fontSize: 27,
                lineHeight: 1,
                fontWeight: 800,
                color: metric.color,
              }}
            >
              {metric.value}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: "#7b8798" }}>
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
          marginTop: 14,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => openSection(t.id)}
            aria-pressed={tab === t.id}
            aria-controls="administracion-contenido"
            style={{
              position: "relative",
              minHeight: 126,
              padding: 18,
              overflow: "hidden",
              textAlign: "left",
              fontFamily: "inherit",
              cursor: "pointer",
              borderRadius: 14,
              border: tab === t.id ? "1px solid #78cfe0" : "1px solid #e4e9f1",
              background:
                tab === t.id
                  ? "linear-gradient(135deg, #effbff 0%, #f5f8ff 100%)"
                  : "#fff",
              color: "#16181d",
              boxShadow:
                tab === t.id
                  ? "0 10px 26px rgba(47, 95, 219, 0.12)"
                  : "0 4px 14px rgba(12, 35, 75, 0.06)",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                padding: "3px 8px",
                borderRadius: 999,
                background: tab === t.id ? "#d7f3f8" : "#eef2f7",
                color: tab === t.id ? "#0d7283" : "#64748b",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {t.eyebrow}
            </span>
            <span
              style={{
                display: "block",
                marginTop: 11,
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              {t.label}
            </span>
            <span
              style={{
                display: "block",
                marginTop: 5,
                maxWidth: 330,
                color: "#6b7280",
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              {t.description}
            </span>
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                right: 16,
                bottom: 12,
                color: tab === t.id ? "#0d7283" : "#a4afbd",
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              →
            </span>
          </button>
        ))}
      </div>

      {tab === "crear" && (
        <section id="administracion-contenido" style={sectionStyle}>
          <h2 style={h2Style}>Agregar usuario</h2>
          <p style={{ fontSize: 13, color: "#6b7280" }}>
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
              Servidor de 10minutesWebsite
              <select
                value={platformDomain}
                onChange={(e) =>
                  setPlatformDomain(e.target.value as "net" | "site")
                }
                style={inputStyle}
              >
                <option value="net">10minuteswebsite.net</option>
                <option value="site">10minuteswebsite.site</option>
              </select>
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
                background: banner.type === "error" ? "#fdecec" : "#eafaf0",
                color: banner.type === "error" ? "#d64545" : "#1e8a4b",
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
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: -6 }}>
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
                      color: usage.percentUsed >= 0.8 ? "#d64545" : "#6b7280",
                    }}
                  >
                    {(usage.percentUsed * 100).toFixed(1)}% usado — quedan{" "}
                    {formatBytes(usage.remainingBytes)} libres
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: "#e9ecf1",
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
                        usage.percentUsed >= 0.8 ? "#d64545" : "#2f5fdb",
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
                      border: "1px solid #e5e8ec",
                      borderRadius: 10,
                      background: row.active ? "#e6f4ff" : "#fff",
                      color: "#16181d",
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
                              background: "#2f5fdb",
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
                        borderTop: "1px solid #eef1f4",
                        background: "#fafbfc",
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
              gap: 8,
            }}
          >
            <h2 style={h2Style}>Usuarios con acceso</h2>
            <input
              type="text"
              placeholder="Buscar por correo, nombre o apellido..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle, width: 280 }}
            />
          </div>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: -4 }}>
            Cambia el rol a <strong>Administrador</strong> para que esa cuenta
            vea y gestione las mismas secciones administrativas que tú. Haz
            clic en una cuenta para ver el detalle.
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
              <p style={{ fontSize: 13, color: "#6b7280" }}>
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
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <h2 style={h2Style}>Visibilidad global de módulos</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: -4 }}>
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
                background: "#eafaf0",
                color: "#1e8a4b",
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
                background: "#fdecec",
                color: "#d64545",
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
                    background: isHidden ? "#fffcf4" : "#ffffff",
                    border: isHidden
                      ? "1px solid #f6d289"
                      : "1px solid #e4e9f1",
                    boxShadow: "0 2px 8px rgba(0, 9, 35, 0.04)",
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
                      <strong style={{ fontSize: 15, color: "#16181d" }}>
                        {mod.label}
                      </strong>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: isHidden ? "#fff3d6" : "#e6f8ef",
                          color: isHidden ? "#a05e03" : "#0d7f44",
                          border: isHidden
                            ? "1px solid #fedc97"
                            : "1px solid #b7ebd0",
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
                        color: "#6b7280",
                        marginTop: 4,
                        lineHeight: 1.4,
                      }}
                    >
                      {mod.description}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#8a94a6",
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
                      color: isHidden ? "#a05e03" : "#16181d",
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
                        accentColor: "#0d7283",
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
  const [domainValue, setDomainValue] = useState<"net" | "site">(
    user.platformDomain === "site" ? "site" : "net",
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
  // Sistema de prueba gratuita (13/8/2026): "desbloqueo" manual del admin.
  // Mismo patrón que los permisos de redes sociales de arriba.
  const [permTrialUnlocked, setPermTrialUnlocked] = useState(
    Boolean(user.trialUnlocked),
  );
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [permissionsSaved, setPermissionsSaved] = useState(false);
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
    setPermTrialUnlocked(Boolean(user.trialUnlocked));
    setUserDisabledModules(user.disabledModules ?? []);
  }, [
    user.allowInstagramPublishing,
    user.allowLinkedInPublishing,
    user.allowThreadsPublishing,
    user.trialUnlocked,
    user.disabledModules,
  ]);

  const permissionsDirty =
    permInstagram !== Boolean(user.allowInstagramPublishing) ||
    permLinkedIn !== Boolean(user.allowLinkedInPublishing) ||
    permThreads !== Boolean(user.allowThreadsPublishing) ||
    permTrialUnlocked !== Boolean(user.trialUnlocked);

  const userModulesDirty =
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
          disabledModules: userDisabledModules,
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
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: roleValue }),
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
          trialUnlocked: permTrialUnlocked,
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
        border: "1px solid #e5e8ec",
        borderRadius: 10,
        background: "#fff",
        color: "#16181d",
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
            <strong style={{ fontSize: 14 }}>{fullName || "(sin nombre)"}</strong>
            {user.isTrialSignup && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: user.trialUnlocked ? "#eafaf0" : "#fff8e6",
                  color: user.trialUnlocked ? "#1a7f47" : "#8a6d1a",
                  border: `1px solid ${user.trialUnlocked ? "#a8dfc0" : "#f0deac"}`,
                }}
                title={
                  user.trialUnlocked
                    ? "Se registró desde Solicitar prueba; ya tiene acceso permanente desbloqueado."
                    : "Se registró desde Solicitar prueba; sin desbloquear, pierde el acceso al terminar los 7 días."
                }
              >
                🎁 PRUEBA
                {!user.trialUnlocked && user.trialStartedAt
                  ? ` · ${trialDaysRemaining(new Date(user.trialStartedAt))}d`
                  : ""}
              </span>
            )}
          </div>
          <span
            style={{ fontSize: 12, color: "#6b7280", wordBreak: "break-word" }}
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
            <span style={{ fontSize: 11, color: "#6b7280" }}>Tu cuenta</span>
          )}
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 999,
              background: user.role === "admin" ? "#dfe8ff" : "#eef2f7",
              color: user.role === "admin" ? "#24458f" : "#64748b",
            }}
          >
            {user.role === "admin" ? "Administrador" : "Usuario"}
          </span>
          <span style={{ fontSize: 11, color: "#6b7280" }}>
            {user.articlesPublished} artículos
          </span>
        </div>
      </summary>

      <div
        style={{
          padding: "14px",
          borderTop: "1px solid #eef1f4",
          background: "#fafbfc",
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
              <div style={{ fontSize: 11, color: "#d64545", marginTop: 4 }}>
                {roleError}
              </div>
            )}
          </Field>

          <Field label="Permisos de publicación en redes">
            <div style={{ display: "grid", gap: 6 }}>
              <label style={permissionLabelStyle}>
                <input
                  type="checkbox"
                  checked={permInstagram}
                  onChange={(e) => setPermInstagram(e.target.checked)}
                  disabled={savingPermissions}
                  style={{ accentColor: "#8134af", width: 16, height: 16 }}
                />
                Publicar en Instagram
              </label>
              <label style={permissionLabelStyle}>
                <input
                  type="checkbox"
                  checked={permLinkedIn}
                  onChange={(e) => setPermLinkedIn(e.target.checked)}
                  disabled={savingPermissions}
                  style={{ accentColor: "#0077b5", width: 16, height: 16 }}
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
              {user.isTrialSignup && (
                <label style={permissionLabelStyle}>
                  <input
                    type="checkbox"
                    checked={permTrialUnlocked}
                    onChange={(e) => setPermTrialUnlocked(e.target.checked)}
                    disabled={savingPermissions}
                    style={{ accentColor: "#1a7f47", width: 16, height: 16 }}
                  />
                  Desbloqueado (acceso permanente, sin límite de 7 días)
                </label>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={handleSavePermissions}
                  disabled={savingPermissions || !permissionsDirty}
                  style={disabledStyle(
                    { ...buttonStyle, padding: "4px 10px", fontSize: 12 },
                    savingPermissions || !permissionsDirty,
                  )}
                >
                  {savingPermissions ? "Guardando..." : "Guardar permisos"}
                </button>
                {permissionsSaved && (
                  <span style={{ fontSize: 11, color: "#1a7f47" }}>
                    Permisos guardados
                  </span>
                )}
              </div>
              {permissionsError && (
                <div style={{ fontSize: 11, color: "#d64545" }}>
                  {permissionsError}
                </div>
              )}
            </div>
          </Field>

          <Field label="Visibilidad de módulos (esta cuenta)">
            <div style={{ display: "grid", gap: 6 }}>
              {SYSTEM_MODULES.map((mod) => {
                const isAllowed = !userDisabledModules.includes(mod.id);
                const isGloballyDisabled = globalDisabledModules.includes(
                  mod.id,
                );
                return (
                  <label key={mod.id} style={permissionLabelStyle}>
                    <input
                      type="checkbox"
                      checked={isAllowed}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUserDisabledModules((prev) =>
                          checked
                            ? prev.filter((id) => id !== mod.id)
                            : [...prev, mod.id],
                        );
                      }}
                      disabled={savingUserModules}
                      style={{
                        accentColor: "#0d7283",
                        width: 16,
                        height: 16,
                      }}
                    />
                    <span>{mod.label}</span>
                    {isGloballyDisabled && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "1px 5px",
                          borderRadius: 4,
                          background: "#fff8e6",
                          color: "#8a6d1a",
                          border: "1px solid #f0deac",
                        }}
                        title="Este módulo ya está oculto globalmente para todos los usuarios"
                      >
                        Oculto global
                      </span>
                    )}
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
                  <span style={{ fontSize: 11, color: "#1a7f47" }}>
                    Módulos guardados
                  </span>
                )}
              </div>
              {userModulesError && (
                <div style={{ fontSize: 11, color: "#d64545" }}>
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
              <div style={{ fontSize: 11, color: "#d64545", marginTop: 4 }}>
                {batchLimitError}
              </div>
            )}
          </Field>

          <Field label="Servidor">
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select
                value={domainValue}
                onChange={(e) =>
                  setDomainValue(e.target.value as "net" | "site")
                }
                disabled={savingDomain}
                aria-label={`Servidor de ${user.email}`}
                style={{ ...inputStyle, width: 96 }}
              >
                <option value="net">.net</option>
                <option value="site">.site</option>
              </select>
              <button
                onClick={handleSaveDomain}
                disabled={
                  savingDomain ||
                  domainValue ===
                    (user.platformDomain === "site" ? "site" : "net")
                }
                style={disabledStyle(
                  { ...buttonStyle, padding: "4px 10px", fontSize: 12 },
                  savingDomain ||
                    domainValue ===
                      (user.platformDomain === "site" ? "site" : "net"),
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
                color: "#2f5fdb",
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
                  ? "#dff5e6"
                  : secondaryButtonStyle.background,
                color: copied ? "#1e8a4b" : secondaryButtonStyle.color,
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
                color: "#d64545",
                border: "1px solid #fde8e8",
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
              <span style={{ fontSize: 12, color: "#8a6d1a" }}>¿Seguro?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  background: "#fde8e8",
                  color: "#d64545",
                  border: "1px solid #e8b4b4",
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
                  color: "#6b7280",
                  border: "1px solid #dfe3e8",
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
          <div style={{ fontSize: 11, color: "#d64545", marginTop: 6 }}>
            {deleteError}
          </div>
        )}
        {impersonateError && (
          <div style={{ fontSize: 11, color: "#d64545", marginTop: 6 }}>
            {impersonateError}
          </div>
        )}

        {editing && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 10px",
              background: "#f0f2f5",
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
              <p style={{ fontSize: 12, color: "#d64545", marginTop: 6 }}>
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
      <summary style={{ cursor: "pointer", fontSize: 12, color: "#6b7280" }}>
        Ver historial
      </summary>
      {loading && !runs && (
        <p style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
          Cargando...
        </p>
      )}
      {runs && runs.length === 0 && (
        <p style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
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
                  background: "#f3f4f6",
                  border: "1px solid #dfe3e8",
                  borderRadius: 6,
                  padding: "6px 10px",
                }}
              >
                <summary
                  style={{ cursor: "pointer", fontSize: 12, color: "#374151" }}
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
                    <tr style={{ textAlign: "left", color: "#6b7280" }}>
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
                        style={{ borderTop: "1px solid #dfe3e8" }}
                      >
                        <td style={tdStyle} data-label="Título">
                          {title.text}
                          {title.finalTitle &&
                            title.finalTitle !== title.text && (
                              <div
                                style={{
                                  fontSize: 10,
                                  color: "#6b7280",
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
                              style={{ color: "#031537", fontWeight: 600 }}
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
