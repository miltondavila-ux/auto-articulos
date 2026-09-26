"use client";

import { useEffect, useState } from "react";
import { ConnectionSuccess } from "@/components/dashboard-ui";

export type ReturnResult = "connected" | "error" | "forbidden";

/** Redes que se autorizan por su propia pantalla y vuelven a Conexiones con un resultado. */
export const LEGACY_RETURN_NETWORKS: Record<string, { label: string; choice: string | null; accountField: string | null }> = {
  threads: { label: "Threads", choice: null, accountField: "threadsUsername" },
  linkedin: { label: "LinkedIn", choice: null, accountField: "linkedinUsername" },
  pinterest: { label: "Pinterest", choice: "el tablero", accountField: null },
  tumblr: { label: "Tumblr", choice: "el blog", accountField: null },
  blogger: { label: "Blogger", choice: "el blog", accountField: null },
};

/**
 * Lee UNA vez el resultado de volver de autorizar (?resultado=...) y lo quita de la
 * dirección; así el aviso o la pantalla de éxito se quedan hasta que la persona actúe.
 */
export function useConnectionReturn(conexion: string | null): ReturnResult | null {
  const [resultado, setResultado] = useState<ReturnResult | null>(null);
  useEffect(() => {
    if (!conexion || !LEGACY_RETURN_NETWORKS[conexion]) return;
    const params = new URLSearchParams(window.location.search);
    const value = params.get("resultado");
    if (value !== "connected" && value !== "error" && value !== "forbidden") return;
    setResultado(value);
    params.delete("resultado");
    const rest = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""));
  }, [conexion]);
  return resultado;
}

/** Pantalla estática de éxito para redes sin paso de elección (Threads, LinkedIn). */
export function ConnectionReturnSuccess({ conexion }: { conexion: string }) {
  const network = LEGACY_RETURN_NETWORKS[conexion];
  const [account, setAccount] = useState<string | null>(null);
  useEffect(() => {
    if (!network?.accountField) return;
    fetch(`/api/search-integrations/${conexion}?_t=${Date.now()}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const value = data?.[network.accountField as string] ?? data?.connection?.[network.accountField as string];
        if (typeof value === "string" && value) setAccount(value.startsWith("@") ? value : `@${value}`);
      })
      .catch(() => {});
  }, [conexion, network]);
  if (!network) return null;
  return (
    <section style={{ marginTop: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#1a7f37" }}>Conexión exitosa</span>
      <ConnectionSuccess
        title={`${network.label} quedó conectado correctamente`}
        label="Cuenta conectada"
        value={account}
        description="La configuración terminó correctamente. SEO TOTAL usará esta conexión desde ahora."
      />
    </section>
  );
}

/** Aviso para volver de autorizar: siguiente paso si salió bien, o explicación clara si no. */
export function ConnectionReturnNotice({ conexion, resultado }: { conexion: string; resultado: ReturnResult }) {
  const network = LEGACY_RETURN_NETWORKS[conexion];
  if (!network) return null;
  const ok = resultado === "connected";
  const text =
    resultado === "connected"
      ? `Autorización completada. Ahora elige ${network.choice ?? "lo que usará SEO TOTAL"} y pulsa Guardar.`
      : resultado === "forbidden"
        ? `Tu cuenta no tiene ${network.label} habilitado. Pídele acceso al administrador.`
        : `No se pudo completar la conexión con ${network.label}. Inténtalo de nuevo con el botón de conexión; si se repite, avisa al administrador.`;
  return (
    <p
      role={ok ? "status" : "alert"}
      style={{
        margin: "0 0 16px",
        padding: "12px 14px",
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        border: ok ? "1px solid rgba(26,127,55,0.3)" : "1px solid rgba(215,0,21,0.3)",
        background: ok ? "#f0fff4" : "#fff1f1",
        color: ok ? "#1a7f37" : "#b00020",
      }}
    >
      {text}
    </p>
  );
}
