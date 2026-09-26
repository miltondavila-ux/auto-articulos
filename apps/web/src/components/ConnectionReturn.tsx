"use client";

import { useEffect, useState } from "react";
import { ConnectionSuccess } from "@/components/dashboard-ui";
import { ConnectionCard } from "@/components/connection-ui";

import type { ReturnResult } from "@/components/connection-return-context";
export type { ReturnResult } from "@/components/connection-return-context";

/** Redes que se autorizan por su propia pantalla y vuelven a Conexiones con un resultado. */
export const LEGACY_RETURN_NETWORKS: Record<string, { label: string; lead: string; choice: string | null; accountField: string | null }> = {
  threads: { label: "Threads", lead: "Conexión administrada desde esta tarjeta. Autoriza aquí la cuenta de Threads que usará SEO TOTAL.", choice: null, accountField: "threadsUsername" },
  linkedin: { label: "LinkedIn", lead: "Conexión administrada desde esta tarjeta. Autoriza aquí la cuenta de LinkedIn que usará SEO TOTAL.", choice: null, accountField: "linkedinUsername" },
  pinterest: { label: "Pinterest", lead: "", choice: "el tablero", accountField: null },
  tumblr: { label: "Tumblr", lead: "", choice: "el blog", accountField: null },
  blogger: { label: "Blogger", lead: "", choice: "el blog", accountField: null },
  "business-profile": { label: "Google Business Profile", lead: "Conexión administrada desde esta tarjeta. Conecta la cuenta de Google que administra tu Perfil de Negocio.", choice: null, accountField: null },
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
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function find(): Promise<string | null> {
      const get = async (url: string) => {
        const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}_t=${Date.now()}`, { cache: "no-store" }).catch(() => null);
        return res && res.ok ? await res.json().catch(() => null) : null;
      };
      if (conexion === "business-profile") {
        const postPeer = await get("/api/postpeer/status");
        if (postPeer?.accountName) return String(postPeer.accountName);
        const legacy = await get("/api/business-profile");
        return legacy?.locationTitle ? String(legacy.locationTitle) : null;
      }
      const field = network?.accountField;
      if (!field) return null;
      const data = await get(`/api/search-integrations/${conexion}`);
      const value = data?.[field] ?? data?.connection?.[field];
      if (typeof value !== "string" || !value) return null;
      return conexion === "threads" && !value.startsWith("@") ? `@${value}` : value;
    }
    find().then((value) => {
      if (cancelled) return;
      setAccount(value);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [conexion, network]);
  if (!network) return null;
  return (
    <ConnectionCard id={conexion} title={network.label} state="success" lead={network.lead}>
      {ready && (
        <ConnectionSuccess
          title={`${network.label} quedó conectado correctamente`}
          label="Cuenta conectada"
          value={account}
          description="La configuración terminó correctamente. SEO TOTAL usará esta conexión desde ahora."
        />
      )}
    </ConnectionCard>
  );
}
