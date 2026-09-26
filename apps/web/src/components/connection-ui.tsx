"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { h2Style, secondaryButtonStyle, sectionStyle } from "@/components/dashboard-ui";
import { useConnectionNotice } from "@/components/connection-return-context";

/**
 * Piezas estándar de las pantallas de conexión de TODAS las redes (mismo patrón que
 * Search Console y Analytics): tarjeta, «Cómo hacerlo paso a paso», estado, caja de
 * «Conexión activa» y «Probar conexión». Cada red solo aporta sus datos y su lógica.
 */

export const CONNECTION_LABELS = {
  connect: "Nueva conexión",
  change: "Cambiar",
  disconnect: "Desconectar",
  test: "Probar conexión",
  disconnectConfirm: "¿Desconectar esta conexión? Tendrás que volver a conectarla para usarla.",
} as const;

const mutedStyle: CSSProperties = { color: "#6e6e73", fontSize: 14, lineHeight: 1.5 };

/** Dropdown de elegir destino: el mismo de Search Console y Analytics. */
export const CONNECTION_SELECT_STYLE: CSSProperties = {
  width: "100%",
  maxWidth: 520,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d2d2d7",
  fontSize: 14,
  background: "#fff",
  color: "#1d1d1f",
};

export type ConnectionState = "connected" | "disconnected" | "pending" | "expired" | "success";

const STATE_LABEL: Record<ConnectionState, { text: string; color: string }> = {
  connected: { text: "Conectada", color: "#1a7f37" },
  disconnected: { text: "No conectada", color: "#6e6e73" },
  pending: { text: "Falta elegir el destino", color: "#9a6700" },
  expired: { text: "Autorización vencida", color: "#c62828" },
  success: { text: "Conexión exitosa", color: "#1a7f37" },
};

/** Tarjeta: título + estado a la derecha + frase de apoyo + descripción de lo que hace. */
export function ConnectionCard({
  title,
  state,
  lead,
  note,
  badge,
  id,
  children,
}: {
  id?: string;
  title: string;
  state: ConnectionState;
  lead: string;
  note?: string;
  badge?: string;
  children: ReactNode;
}) {
  const status = STATE_LABEL[state];
  const notice = useConnectionNotice(id);
  return (
    <section style={sectionStyle}>
      {badge && (
        <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "#fff4e5", color: "#8a4b08", border: "1px solid rgba(255, 149, 0, 0.25)", marginBottom: 6 }}>
          {badge}
        </span>
      )}
      <h2 style={h2Style}>{title}</h2>
      <p className="lead-copy" style={{ margin: "0 0 16px 0" }}>{lead}</p>
      {notice && (
        <p role="status" style={{ fontSize: 14, margin: "8px 0 0", color: notice.ok ? "#1a7f37" : "#c62828" }}>
          {notice.text}
        </p>
      )}
      {/* Mismo bloque interior que Search Console y Analytics: línea separadora + estado + nota + contenido. */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #e5e5ea" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: state === "success" ? 700 : 600, color: status.color }}>{status.text}</span>
        </div>
        {note && state !== "success" && <p style={{ ...mutedStyle, margin: "4px 0 0" }}>{note}</p>}
        {children}
      </div>
    </section>
  );
}

/** «Cómo hacerlo paso a paso»: siempre la misma caja y el mismo título. */
export function ConnectionGuide({ steps, ifFails }: { steps: string[]; ifFails?: string }) {
  return (
    <div role="note" style={{ marginTop: 10, padding: "10px 0", borderTop: "1px solid #e5e5ea", color: "#1d1d1f", fontSize: 13, lineHeight: 1.5 }}>
      <strong>Cómo hacerlo paso a paso</strong>
      <ol style={{ margin: "6px 0 0", paddingLeft: 20 }}>
        {steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      {ifFails && <p style={{ margin: "8px 0 0" }}><strong>Si falla:</strong> {ifFails}</p>}
    </div>
  );
}

/** Caja verde «✓ Conexión activa» con lo conectado (cuenta, tablero, blog…). */
export function ConnectionActiveBox({ label, value, rows }: { label: string; value?: string | null; rows?: Array<{ label: string; value: string }> }) {
  const all = [...(value ? [{ label, value }] : []), ...(rows ?? [])];
  return (
    <div style={{ marginTop: 10, padding: 14, borderRadius: 12, border: "1px solid rgba(26, 127, 55, 0.25)", background: "#f7fff9" }}>
      <strong style={{ display: "block", color: "#1a7f37", fontSize: 15 }}>✓ Conexión activa</strong>
      {all.map((row) => (
        <p key={row.label} style={{ fontSize: 14, margin: "6px 0 0" }}>
          <strong>{row.label}:</strong> {row.value}
        </p>
      ))}
    </div>
  );
}

/** Mensaje suelto (resultado de una acción). Verde si salió bien, rojo si no. */
export function ConnectionMessage({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p role={ok ? "status" : "alert"} style={{ fontSize: 13, marginTop: 10, color: ok ? "#1a7f37" : "#c62828" }}>
      {children}
    </p>
  );
}

function useConnectionTest(network: string, endpoint?: string) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch(endpoint ?? `/api/search-integrations/${network}/test`, { method: "POST", cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (response.ok && body.ok) {
        setResult({ ok: true, text: `Conexión correcta${body.account ? ` con ${body.account}` : ""}.` });
      } else {
        setResult({ ok: false, text: typeof body.error === "string" && body.error ? body.error : "La prueba no funcionó. Inténtalo de nuevo." });
      }
    } catch {
      setResult({ ok: false, text: "No pudimos comunicarnos con el servicio. Inténtalo de nuevo en unos minutos." });
    } finally {
      setBusy(false);
    }
  }
  return { busy, result, run };
}

/** Resultado de «Probar conexión»: mismo párrafo que en Search Console y Analytics. */
function ProbeResult({ result }: { result: { ok: boolean; text: string } | null }) {
  if (!result) return null;
  return (
    <p role="status" style={{ fontSize: 13, marginTop: 10, color: result.ok ? "#1a7f37" : "#c62828" }}>
      {result.ok ? "✓" : "✗"} {result.text}
    </p>
  );
}

/**
 * Fila de acciones de una conexión activa, idéntica a la de Search Console y Analytics:
 * Cambiar · Probar conexión · Nueva conexión · Desconectar, y el resultado de la prueba debajo.
 */
export function ConnectionActions({
  network,
  endpoint,
  disabled,
  change,
  connect,
  disconnect,
}: {
  network: string;
  endpoint?: string;
  disabled?: boolean;
  change?: ReactNode;
  connect?: ReactNode;
  disconnect: ReactNode;
}) {
  const test = useConnectionTest(network, endpoint);
  return (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        {change}
        <button type="button" onClick={test.run} disabled={test.busy || disabled} style={secondaryButtonStyle}>
          {test.busy ? "Probando…" : CONNECTION_LABELS.test}
        </button>
        {connect}
        {disconnect}
      </div>
      <ProbeResult result={test.result} />
    </>
  );
}

/** Botón «Probar conexión» suelto (pantallas con su propia fila de botones, como Bing). */
export function ConnectionTestButton({ network, disabled, endpoint }: { network: string; disabled?: boolean; endpoint?: string }) {
  const test = useConnectionTest(network, endpoint);
  return (
    <>
      <button type="button" onClick={test.run} disabled={test.busy || disabled} style={secondaryButtonStyle}>
        {test.busy ? "Probando…" : CONNECTION_LABELS.test}
      </button>
      {test.result && (
        <p role="status" style={{ flexBasis: "100%", fontSize: 13, margin: "6px 0 0", color: test.result.ok ? "#1a7f37" : "#c62828" }}>
          {test.result.ok ? "✓" : "✗"} {test.result.text}
        </p>
      )}
    </>
  );
}
