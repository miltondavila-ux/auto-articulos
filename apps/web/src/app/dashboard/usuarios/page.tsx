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
  email: string;
  role: "admin" | "user";
  monthlyArticleLimit: number | null;
  createdAt: string;
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [forbidden, setForbidden] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
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
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({
          type: "error",
          text: data.error ?? "Error al crear el usuario",
        });
        return;
      }
      setEmail("");
      setPassword("");
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
        <p style={{ fontSize: 13, color: "#9aa1ac" }}>
          Esta sección es solo para administradores.
        </p>
      </section>
    );
  }

  return (
    <div>
      <section style={sectionStyle}>
        <h2 style={h2Style}>Agregar usuario</h2>
        <p style={{ fontSize: 13, color: "#9aa1ac" }}>
          Crea una cuenta para dar acceso a otra persona. Cada usuario tiene sus
          propias credenciales de 10minutesWebsite y su propio historial,
          completamente separados.
        </p>
        <form
          onSubmit={handleCreate}
          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
        >
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
              background: banner.type === "error" ? "#3a1414" : "#142a1b",
              color: banner.type === "error" ? "#ff8787" : "#7fd99a",
              fontSize: 14,
            }}
          >
            {banner.text}
          </div>
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Usuarios con acceso</h2>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead>
            <tr style={{ textAlign: "left", color: "#9aa1ac" }}>
              <th style={thStyle}>Correo</th>
              <th style={thStyle}>Rol</th>
              <th style={thStyle}>Límite mensual de artículos</th>
              <th style={thStyle}>Creado</th>
              <th style={thStyle}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRowItem key={u.id} user={u} onUpdated={loadUsers} />
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function UserRowItem({
  user,
  onUpdated,
}: {
  user: UserRow;
  onUpdated: () => void;
}) {
  const [value, setValue] = useState(
    user.monthlyArticleLimit === null ? "" : String(user.monthlyArticleLimit),
  );
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editEmail, setEditEmail] = useState(user.email);
  const [newPassword, setNewPassword] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  async function handleSaveEdit() {
    setSaving(true);
    setEditError(null);
    try {
      const body: Record<string, unknown> = { userId: user.id };
      if (editEmail.trim() !== user.email) body.email = editEmail.trim();
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
      <tr style={{ borderTop: "1px solid #2a2f3a" }}>
        <td style={tdStyle}>{user.email}</td>
        <td style={tdStyle}>
          {user.role === "admin" ? "Administrador" : "Usuario"}
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
        <td style={tdStyle}>{new Date(user.createdAt).toLocaleDateString()}</td>
        <td style={tdStyle}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
                  color: "#ff8787",
                  border: "1px solid #5c1f1f",
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
                <span style={{ fontSize: 12, color: "#e8c777" }}>¿Seguro?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    background: "#5c1f1f",
                    color: "#ff8787",
                    border: "1px solid #7a2b2b",
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
                    color: "#9aa1ac",
                    border: "1px solid #2a2f3a",
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
            <div style={{ fontSize: 11, color: "#ff8787", marginTop: 4 }}>
              {deleteError}
            </div>
          )}
        </td>
      </tr>
      {editing && (
        <tr style={{ background: "#0f1115" }}>
          <td colSpan={5} style={{ ...tdStyle, padding: "10px 8px" }}>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                style={{ ...inputStyle, width: 220 }}
                placeholder="Correo"
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
              <p style={{ fontSize: 12, color: "#ff8787", marginTop: 6 }}>
                {editError}
              </p>
            )}
          </td>
        </tr>
      )}
      <tr>
        <td colSpan={5} style={{ padding: "0 8px 8px" }}>
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
      <summary style={{ cursor: "pointer", fontSize: 12, color: "#9aa1ac" }}>
        Ver historial
      </summary>
      {loading && !runs && (
        <p style={{ fontSize: 12, color: "#9aa1ac", marginTop: 6 }}>
          Cargando...
        </p>
      )}
      {runs && runs.length === 0 && (
        <p style={{ fontSize: 12, color: "#9aa1ac", marginTop: 6 }}>
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
                  background: "#0a0c10",
                  border: "1px solid #2a2f3a",
                  borderRadius: 6,
                  padding: "6px 10px",
                }}
              >
                <summary
                  style={{ cursor: "pointer", fontSize: 12, color: "#c7ccd1" }}
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
                    <tr style={{ textAlign: "left", color: "#9aa1ac" }}>
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
                        style={{ borderTop: "1px solid #2a2f3a" }}
                      >
                        <td style={tdStyle}>
                          {title.text}
                          {title.finalTitle &&
                            title.finalTitle !== title.text && (
                              <div
                                style={{
                                  fontSize: 10,
                                  color: "#9aa1ac",
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
                              style={{ color: "#7fd99a", fontWeight: 600 }}
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
