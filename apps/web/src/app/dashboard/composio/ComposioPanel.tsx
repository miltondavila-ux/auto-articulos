"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  sectionStyle,
  h2Style,
  inputStyle,
  buttonStyle,
  secondaryButtonStyle,
  thStyle,
  tdStyle,
} from "@/components/dashboard-ui";

interface Status {
  configured: boolean;
  maskedKey?: string;
  mcpUrl: string;
  cliInstall: string;
  apps: { id: string; label: string }[];
  authConfigs: Record<string, string | null>;
  verification?: { valid: true } | { valid: false; reason: string };
}

interface ConnectedAccount {
  id: string;
  status: string;
  toolkit: string | null;
  userId: string | null;
  createdAt: string | null;
}

const mutedStyle = { color: "#6e6e73", fontSize: 14, lineHeight: 1.5 } as const;
const codeStyle = {
  display: "block",
  padding: "10px 12px",
  borderRadius: 10,
  background: "#f5f5f7",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 13,
  wordBreak: "break-all",
} as const;

export default function ComposioPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [accounts, setAccounts] = useState<ConnectedAccount[] | null>(null);
  const [authInputs, setAuthInputs] = useState<Record<string, string>>({});
  const [authMessage, setAuthMessage] = useState<Record<string, { ok: boolean; text: string }>>({});

  const loadStatus = useCallback(async (verify: boolean) => {
    const response = await fetch(`/api/admin/composio${verify ? "?verify=1" : ""}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      setMessage({ ok: false, text: "No se pudo leer el estado de Composio." });
      return;
    }
    setStatus((await response.json()) as Status);
  }, []);

  useEffect(() => {
    void loadStatus(false);
  }, [loadStatus]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/composio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const body = await response.json();
      if (!response.ok) {
        setMessage({ ok: false, text: body.error ?? "No se pudo guardar la clave." });
        return;
      }
      setApiKey("");
      setAccounts(null);
      setMessage({ ok: true, text: "Clave verificada con Composio y guardada de forma cifrada." });
      await loadStatus(false);
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMessage(null);
    try {
      await loadStatus(true);
    } finally {
      setBusy(false);
    }
  }

  async function loadAccounts() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/composio/accounts", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) {
        setMessage({ ok: false, text: body.error ?? "No se pudieron leer las cuentas." });
        return;
      }
      setAccounts(body.accounts as ConnectedAccount[]);
    } finally {
      setBusy(false);
    }
  }

  async function saveAuthConfig(appId: string) {
    setBusy(true);
    setAuthMessage((current) => ({ ...current, [appId]: { ok: true, text: "" } }));
    try {
      const response = await fetch("/api/admin/composio/auth-configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app: appId, authConfigId: authInputs[appId] ?? "" }),
      });
      const body = await response.json();
      if (!response.ok) {
        setAuthMessage((current) => ({
          ...current,
          [appId]: { ok: false, text: body.error ?? "No se pudo guardar." },
        }));
        return;
      }
      setAuthInputs((current) => {
        const { [appId]: _saved, ...rest } = current;
        return rest;
      });
      setAuthMessage((current) => ({
        ...current,
        [appId]: { ok: true, text: body.authConfigId ? "Verificado y guardado." : "Quitado." },
      }));
      await loadStatus(false);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("¿Eliminar la clave de API de Composio guardada?")) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/composio", { method: "DELETE" });
      if (!response.ok) {
        setMessage({ ok: false, text: "No se pudo eliminar la clave." });
        return;
      }
      setAccounts(null);
      setMessage({ ok: true, text: "Clave eliminada." });
      await loadStatus(false);
    } finally {
      setBusy(false);
    }
  }

  const verification = status?.verification;

  return (
    <div>
      <section style={sectionStyle}>
        <h2 style={h2Style}>Conexión con Composio</h2>
        <p style={mutedStyle}>
          Composio conecta la plataforma con más de mil apps (Gmail, GitHub, Google Sheets…)
          mediante su API. Crea una clave de proyecto en Composio (Platform → API Keys) con
          lectura general (Read All) y escritura solo en «Connected accounts» y «Session tool
          execution», y pégala aquí. Se comprueba con Composio antes de guardarse y se almacena
          cifrada; nunca se vuelve a mostrar completa.
        </p>

        {status === null ? (
          <p style={mutedStyle}>Cargando…</p>
        ) : (
          <>
            <p style={{ fontSize: 14, fontWeight: 600, margin: "16px 0 4px" }}>
              Estado:{" "}
              <span style={{ color: status.configured ? "#1a7f37" : "#6e6e73" }}>
                {status.configured ? `Clave guardada (${status.maskedKey})` : "Sin clave configurada"}
              </span>
            </p>
            {verification && (
              <p
                role="status"
                style={{ fontSize: 14, margin: "4px 0", color: verification.valid ? "#1a7f37" : "#c62828" }}
              >
                {verification.valid
                  ? "Composio aceptó la clave: la conexión funciona."
                  : verification.reason}
              </p>
            )}

            <form onSubmit={save} style={{ marginTop: 12 }}>
              <label htmlFor="composio-api-key" style={{ fontSize: 13, fontWeight: 600 }}>
                {status.configured ? "Reemplazar clave de API" : "Clave de API de Composio"}
              </label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                <input
                  id="composio-api-key"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="Pega aquí la clave"
                  style={{ ...inputStyle, flex: "1 1 280px" }}
                />
                <button
                  type="submit"
                  disabled={busy || apiKey.trim().length === 0}
                  style={{ ...buttonStyle, marginTop: 0, opacity: busy || !apiKey.trim() ? 0.5 : 1 }}
                >
                  Verificar y guardar
                </button>
              </div>
            </form>

            {status.configured && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                <button type="button" onClick={test} disabled={busy} style={secondaryButtonStyle}>
                  Probar conexión
                </button>
                <button type="button" onClick={loadAccounts} disabled={busy} style={secondaryButtonStyle}>
                  Ver cuentas conectadas
                </button>
                <button
                  type="button"
                  onClick={remove}
                  disabled={busy}
                  style={{ ...secondaryButtonStyle, color: "#c62828" }}
                >
                  Eliminar clave
                </button>
              </div>
            )}

            {message && (
              <p
                role="status"
                style={{ fontSize: 14, marginTop: 14, color: message.ok ? "#1a7f37" : "#c62828" }}
              >
                {message.text}
              </p>
            )}
          </>
        )}
      </section>

      {status?.configured && (
        <section style={sectionStyle}>
          <h2 style={h2Style}>Auth configs por app</h2>
          <p style={mutedStyle}>
            Cada app necesita un <strong>auth config</strong> con OAuth administrado por Composio.
            Se crea una sola vez en Composio (Platform → Auth Configs → Create) y se pega aquí su
            identificador, que empieza por <code>ac_</code>. Se comprueba con Composio antes de
            guardarse.
          </p>
          {status.apps.map((app) => {
            const stored = status.authConfigs[app.id];
            const value = authInputs[app.id] ?? stored ?? "";
            const changed = value.trim() !== (stored ?? "");
            const feedback = authMessage[app.id];
            return (
              <div key={app.id} style={{ marginTop: 16 }}>
                <label htmlFor={`auth-${app.id}`} style={{ fontSize: 13, fontWeight: 600 }}>
                  {app.label}{" "}
                  <span style={{ fontWeight: 500, color: stored ? "#1a7f37" : "#6e6e73" }}>
                    {stored ? "· configurado" : "· pendiente"}
                  </span>
                </label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                  <input
                    id={`auth-${app.id}`}
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    value={value}
                    onChange={(event) =>
                      setAuthInputs((current) => ({ ...current, [app.id]: event.target.value }))
                    }
                    placeholder="ac_…"
                    style={{ ...inputStyle, flex: "1 1 240px" }}
                  />
                  <button
                    type="button"
                    disabled={busy || !changed}
                    onClick={() => saveAuthConfig(app.id)}
                    style={{ ...secondaryButtonStyle, opacity: busy || !changed ? 0.5 : 1 }}
                  >
                    {value.trim() === "" && stored ? "Quitar" : "Verificar y guardar"}
                  </button>
                </div>
                {feedback?.text && (
                  <p
                    role="status"
                    style={{ fontSize: 13, margin: "6px 0 0", color: feedback.ok ? "#1a7f37" : "#c62828" }}
                  >
                    {feedback.text}
                  </p>
                )}
              </div>
            );
          })}
        </section>
      )}

      {accounts && (
        <section style={sectionStyle}>
          <h2 style={h2Style}>Cuentas conectadas en Composio</h2>
          {accounts.length === 0 ? (
            <p style={mutedStyle}>Este proyecto aún no tiene cuentas de apps conectadas.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>App</th>
                    <th style={thStyle}>Estado</th>
                    <th style={thStyle}>Usuario</th>
                    <th style={thStyle}>Conectada</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id}>
                      <td style={tdStyle}>{account.toolkit ?? "—"}</td>
                      <td style={tdStyle}>{account.status}</td>
                      <td style={tdStyle}>{account.userId ?? "—"}</td>
                      <td style={tdStyle}>
                        {account.createdAt ? new Date(account.createdAt).toLocaleDateString("es") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {status && (
        <section style={sectionStyle}>
          <h2 style={h2Style}>Otras vías de conexión (solo referencia)</h2>
          <p style={mutedStyle}>
            Este módulo usa la API. Estas dos vías son para conectar agentes o equipos de
            desarrollo con Composio; no las ejecuta la plataforma.
          </p>
          <p style={{ fontSize: 13, fontWeight: 600, margin: "14px 0 6px" }}>Servidor MCP</p>
          <code style={codeStyle}>{status.mcpUrl}</code>
          <p style={{ fontSize: 13, fontWeight: 600, margin: "14px 0 6px" }}>CLI (Linux y macOS)</p>
          <code style={codeStyle}>{status.cliInstall}</code>
        </section>
      )}
    </div>
  );
}
