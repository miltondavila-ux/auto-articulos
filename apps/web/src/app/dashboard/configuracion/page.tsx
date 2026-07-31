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
import type { CategoryRow, SyncStatus } from "@/types/dashboard";

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
  const [banner, setBanner] = useState<{
    type: "error" | "info";
    text: string;
  } | null>(null);

  const syncInProgress =
    lastSyncStatus === "pending" || lastSyncStatus === "running";

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

  useEffect(() => {
    loadCredentialsStatus();
    loadCategories();
  }, [loadCredentialsStatus, loadCategories]);

  useEffect(() => {
    if (!syncInProgress) return;
    const interval = setInterval(loadCategories, 3000);
    return () => clearInterval(interval);
  }, [syncInProgress, loadCategories]);

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

  const showCredentialsForm = editingCredentials || !credentialsConfigured;

  return (
    <div>
      <section style={readySectionStyle(credentialsConfigured)}>
        <h2 style={h2Style}>
          Credenciales de 10minutesWebsite{" "}
          {credentialsConfigured && <ReadyBadge />}
        </h2>

        {!showCredentialsForm && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
              Ya tienes credenciales guardadas de forma cifrada.
            </p>
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
            style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            <input
              placeholder="Usuario de 10minutesWebsite"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
            <button
              type="submit"
              disabled={savingCreds}
              style={disabledStyle(secondaryButtonStyle, savingCreds)}
            >
              {savingCreds ? "Guardando..." : "Guardar"}
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
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 10 }}>
            Son tu usuario y contraseña de 10minutesWebsite, no los de Auto
            Artículos. Si no recuerdas tu contraseña de 10minutesWebsite,{" "}
            <a
              href="https://10minuteswebsite.net/dashboard/forgot-password.php"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#2f5fdb" }}
            >
              recupérala con tu correo aquí
            </a>
            . Si aun así no logras entrar, escribe al{" "}
            <a
              href="https://www.10minuteswebsite.com/ayuda"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#2f5fdb" }}
            >
              servicio al cliente de 10minutesWebsite
            </a>
            .
          </p>
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Categorías</h2>
        <p style={{ fontSize: 13, color: "#6b7280" }}>
          Sincroniza las categorías reales de tu cuenta de 10minutesWebsite.
          Solo hace falta repetirlo si agregas o cambias categorías allá.
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
            : "Sincronizar categorías"}
        </button>
        {!credentialsConfigured && (
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>
            Guarda primero tus credenciales para poder sincronizar categorías.
          </p>
        )}
        {syncInProgress && (
          <p
            style={{
              fontSize: 13,
              color: "#8a6d1a",
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
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
                border: "2px solid #f5e6c8",
                borderTopColor: "#8a6d1a",
                borderRadius: "50%",
                animation: "auto-articulos-spin 0.8s linear infinite",
                flexShrink: 0,
              }}
            />
            {lastSyncStatus === "running"
              ? "Conectando con 10minutesWebsite ahora mismo..."
              : "En cola para procesarse — puede haber otro trabajo en curso (tuyo o de otro usuario) antes de que le toque a este. Esta pantalla se actualiza sola cuando arranque."}
          </p>
        )}
        {lastSyncStatus === "error" && (
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 13, color: "#d64545", margin: 0 }}>
              La última sincronización falló
              {lastSyncError ? ":" : ". Intenta de nuevo."}
            </p>
            {lastSyncError && (
              <p
                style={{
                  fontSize: 12,
                  color: "#d64545",
                  marginTop: 4,
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  background: "#fdecec",
                  padding: "6px 10px",
                  borderRadius: 6,
                }}
              >
                {lastSyncError}
              </p>
            )}
          </div>
        )}
        {categories.length > 0 && (
          <ul
            style={{
              marginTop: 12,
              paddingLeft: 18,
              fontSize: 13,
              color: "#374151",
            }}
          >
            {categories.map((c) => (
              <li key={c.id}>{c.name}</li>
            ))}
          </ul>
        )}
      </section>

      {banner && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            marginTop: 20,
            background: banner.type === "error" ? "#fdecec" : "#eafaf0",
            color: banner.type === "error" ? "#d64545" : "#1e8a4b",
            fontSize: 14,
          }}
        >
          {banner.text}
        </div>
      )}
    </div>
  );
}
