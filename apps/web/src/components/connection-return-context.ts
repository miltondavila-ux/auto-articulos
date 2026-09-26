"use client";

import { createContext, useContext } from "react";

export type ReturnResult = "connected" | "error" | "forbidden";

/** Resultado de volver de autorizar una red; lo provee la pantalla de Conexiones y lo lee cada tarjeta. */
export const ConnectionReturnContext = createContext<{ conexion: string | null; resultado: ReturnResult | null }>({ conexion: null, resultado: null });

const CHOSEN_NOUN: Record<string, string> = {
  pinterest: "el tablero",
  tumblr: "el blog",
  blogger: "el blog",
};

/**
 * Aviso de la tarjeta al volver de autorizar. Mismo texto y mismo lugar que en Search Console
 * y Analytics: una línea bajo la frase de apoyo.
 */
export function useConnectionNotice(id?: string): { ok: boolean; text: string } | null {
  const { conexion, resultado } = useContext(ConnectionReturnContext);
  if (!id || !resultado || conexion !== id) return null;
  if (resultado === "connected") {
    const noun = CHOSEN_NOUN[id];
    return noun ? { ok: true, text: `Autorización completada. Ahora elige y aprueba ${noun} que usará SEO TOTAL.` } : null;
  }
  if (resultado === "forbidden") return { ok: false, text: "Tu cuenta no tiene esta red habilitada. Pídele acceso al administrador." };
  return { ok: false, text: "No se pudo completar la conexión. Inténtalo de nuevo." };
}
