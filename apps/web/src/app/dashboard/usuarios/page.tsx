"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  sectionStyle,
  h2Style,
  inputStyle,
  buttonStyle,
  thStyle,
  tdStyle,
  disabledStyle,
} from "@/components/dashboard-ui";

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

  async function handleSave() {
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

  return (
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
            onClick={handleSave}
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
    </tr>
  );
}
