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
            <p style={{ fontSize: 13, color: "#9aa1ac", margin: 0 }}>
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
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Categorías</h2>
        <p style={{ fontSize: 13, color: "#9aa1ac" }}>
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
          <p style={{ fontSize: 13, color: "#9aa1ac", marginTop: 8 }}>
            Guarda primero tus credenciales para poder sincronizar categorías.
          </p>
        )}
        {syncInProgress && (
          <p
            style={{
              fontSize: 13,
              color: "#e8c777",
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
                border: "2px solid #4a4326",
                borderTopColor: "#e8c777",
                borderRadius: "50%",
                animation: "auto-articulos-spin 0.8s linear infinite",
                flexShrink: 0,
              }}
            />
            En cola para procesarse. El worker está arrancando — esta pantalla
            se actualiza sola cuando termine.
          </p>
        )}
        {lastSyncStatus === "error" && (
          <p style={{ fontSize: 13, color: "#ff8787", marginTop: 8 }}>
            La última sincronización falló. Intenta de nuevo.
          </p>
        )}
        {categories.length > 0 && (
          <ul
            style={{
              marginTop: 12,
              paddingLeft: 18,
              fontSize: 13,
              color: "#c7ccd1",
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
            background: banner.type === "error" ? "#3a1414" : "#142a1b",
            color: banner.type === "error" ? "#ff8787" : "#7fd99a",
            fontSize: 14,
          }}
        >
          {banner.text}
        </div>
      )}
    </div>
  );
}
