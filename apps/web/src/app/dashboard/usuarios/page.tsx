"use client";

import { useEffect, useState, type FormEvent } from "react";
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
  createdAt: string;
  articlesPublished: number;
  currentPassword: string | null;
}

const PLATFORM_URL = "https://auto-articulos-web.vercel.app/login";

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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [maxTitlesPerBatch, setMaxTitlesPerBatch] = useState("20");
  const [creating, setCreating] = useState(false);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"crear" | "uso" | "accesos">("accesos");
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

  useEffect(() => {
    loadUsers();
    loadUsage();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          maxTitlesPerBatch: Number(maxTitlesPerBatch),
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
      setName("");
      setEmail("");
      setPassword("");
      setMaxTitlesPerBatch("20");
      setBanner({ type: "info", text: `Usuario ${data.user.email} creado.` });
      loadUsers();
    } finally {
      setCreating(false);
    }
  }

  if (forbidden) {
    return (
      <section style={sectionStyle}>
        <h2 style={h2Style}>Usuarios</h2>
        <p style={{ fontSize: 13, color: "#6b7280" }}>
          Esta sección es solo para administradores.
        </p>
      </section>
    );
  }

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "accesos", label: "Accesos a usuarios" },
    { id: "crear", label: "Creación de usuarios" },
    { id: "uso", label: "Uso de base de datos" },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={
              tab === t.id
                ? { ...buttonStyle, marginTop: 0 }
                : { ...secondaryButtonStyle, marginTop: 0 }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "crear" && (
        <section style={sectionStyle}>
          <h2 style={h2Style}>Agregar usuario</h2>
          <p style={{ fontSize: 13, color: "#6b7280" }}>
            Crea una cuenta para dar acceso a otra persona. Cada usuario tiene
            sus propias credenciales de 10minutesWebsite y su propio historial,
            completamente separados.
          </p>
          <form
            onSubmit={handleCreate}
            style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            <input
              type="text"
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
            <input
              type="email"
              placeholder="Correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Contraseña temporal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
            <label style={{ display: "grid", gap: 3, fontSize: 11 }}>
              Máximo de títulos por lote
              <input
                type="number"
                min={1}
                step={1}
                required
                value={maxTitlesPerBatch}
                onChange={(e) => setMaxTitlesPerBatch(e.target.value)}
                style={{ ...inputStyle, width: 190 }}
              />
            </label>
            <button
              type="submit"
              disabled={creating}
              style={disabledStyle(buttonStyle, creating)}
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
        <section style={sectionStyle}>
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
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    minWidth: 640,
                    borderCollapse: "collapse",
                    fontSize: 13,
                    marginTop: 14,
                  }}
                >
                  <thead>
                    <tr style={{ textAlign: "left", color: "#6b7280" }}>
                      <th style={thStyle}>Usuario</th>
                      <th style={thStyle}>Ejecuciones</th>
                      <th style={thStyle}>Títulos</th>
                      <th style={thStyle}>Eventos de log</th>
                      <th style={thStyle}>Peso estimado</th>
                      <th style={thStyle}>% del contenido total</th>
                      <th style={thStyle}>Riesgo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.perUser.map((row) => (
                      <tr
                        key={row.userId}
                        style={{
                          borderTop: "1px solid #dfe3e8",
                          background: row.active ? "#e6f4ff" : undefined,
                        }}
                      >
                        <td style={tdStyle}>
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
                        </td>
                        <td style={tdStyle}>{row.runs}</td>
                        <td style={tdStyle}>{row.titles}</td>
                        <td style={tdStyle}>{row.events}</td>
                        <td style={tdStyle}>
                          {formatBytes(row.estimatedBytes)}
                        </td>
                        <td style={tdStyle}>
                          {(row.shareOfContent * 100).toFixed(1)}%
                        </td>
                        <td style={tdStyle}>
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {tab === "accesos" && (
        <section style={sectionStyle}>
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
            vea y gestione las mismas secciones administrativas que tú.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: 1240,
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ textAlign: "left", color: "#6b7280" }}>
                  <th style={thStyle}>Nombre</th>
                  <th style={thStyle}>Apellido</th>
                  <th style={thStyle}>Correo</th>
                  <th style={thStyle}>Teléfono</th>
                  <th style={thStyle}>Rol</th>
                  <th style={thStyle}>Artículos publicados</th>
                  <th style={thStyle}>Límite mensual</th>
                  <th style={thStyle}>Límite diario</th>
                  <th style={thStyle}>Máximo por lote</th>
                  <th style={thStyle}>Creado</th>
                  <th style={thStyle}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users
                  .filter((u) => {
                    const q = search.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      u.email.toLowerCase().includes(q) ||
                      (u.firstName ?? "").toLowerCase().includes(q) ||
                      (u.lastName ?? "").toLowerCase().includes(q) ||
                      (u.name ?? "").toLowerCase().includes(q)
                    );
                  })
                  .map((u) => (
                    <UserRowItem
                      key={u.id}
                      user={u}
                      isCurrentUser={u.id === currentUserId}
                      onUpdated={loadUsers}
                    />
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function UserRowItem({
  user,
  isCurrentUser,
  onUpdated,
}: {
  user: UserRow;
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

  return (
    <>
      <tr style={{ borderTop: "1px solid #dfe3e8" }}>
        <td style={tdStyle}>{user.firstName ?? "—"}</td>
        <td style={tdStyle}>{user.lastName ?? "—"}</td>
        <td style={tdStyle}>{user.email}</td>
        <td style={tdStyle}>{user.phone ?? "—"}</td>
        <td style={tdStyle}>
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
            {isCurrentUser ? (
              <span style={{ fontSize: 11, color: "#6b7280" }}>Tu cuenta</span>
            ) : (
              <button
                onClick={handleSaveRole}
                disabled={savingRole || roleValue === user.role}
                style={disabledStyle(
                  { ...buttonStyle, padding: "4px 10px", fontSize: 12 },
                  savingRole || roleValue === user.role,
                )}
              >
                {savingRole ? "..." : "Guardar rol"}
              </button>
            )}
          </div>
          {roleError && (
            <div style={{ fontSize: 11, color: "#d64545", marginTop: 4 }}>
              {roleError}
            </div>
          )}
        </td>
        <td style={{ ...tdStyle, fontWeight: 600 }}>
          {user.articlesPublished}
        </td>
        <td style={tdStyle}>
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
        </td>
        <td style={tdStyle}>
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
        </td>
        <td style={tdStyle}>
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
        </td>
        <td style={tdStyle}>{new Date(user.createdAt).toLocaleDateString()}</td>
        <td style={tdStyle}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
            <div style={{ fontSize: 11, color: "#d64545", marginTop: 4 }}>
              {deleteError}
            </div>
          )}
        </td>
      </tr>
      {editing && (
        <tr style={{ background: "#f7f8fa", color: "#16181d" }}>
          <td colSpan={11} style={{ ...tdStyle, padding: "10px 8px" }}>
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
          </td>
        </tr>
      )}
      <tr>
        <td colSpan={11} style={{ padding: "0 8px 8px" }}>
          <UserHistorial email={user.email} />
        </td>
      </tr>
    </>
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
                        <td style={tdStyle}>
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
                        <td style={tdStyle}>
                          {statusLabel(title.status as TitleStatus)}
                        </td>
                        <td style={tdStyle}>{title.attempts}</td>
                        <td style={tdStyle}>
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
