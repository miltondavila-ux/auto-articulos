/**
 * Adónde vuelve la persona después de autorizar una red. Siempre a la pantalla
 * dedicada de esa conexión dentro de Conexiones, con un resultado que la pantalla
 * lee y muestra («connected», «error» o «forbidden»). Nunca se manda texto técnico.
 */
export type ReturnOutcome = "connected" | "error" | "forbidden";

const VISTA: Record<string, "analiticas" | "difusion"> = {
  "google-search-console": "analiticas",
  "google-analytics": "analiticas",
  "bing-webmaster": "analiticas",
};

export function connectionReturnPath(conexion: string, resultado: ReturnOutcome): string {
  const vista = VISTA[conexion] ?? "difusion";
  return `/dashboard/configuracion/conexiones?conexion=${conexion}&vista=${vista}&resultado=${resultado}`;
}
