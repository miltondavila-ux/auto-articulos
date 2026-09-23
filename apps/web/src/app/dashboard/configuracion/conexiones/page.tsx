import ConexionesView from "./ConexionesView";

export const dynamic = "force-dynamic";

/**
 * Pantalla única de conexiones (UX-1, ver ESPECIFICACION_CONEXIONES_UNIFICADAS.md).
 * ETAPA MIGRACIÓN GSC: esta página debe estar disponible para todas las cuentas
 * activas. Es el camino para reconectar Google Search Console mediante
 * Conexiones; bloquearla por opt-in deja a usuarios existentes sin forma de
 * completar la actualización.
 */
export default async function ConexionesPage() {
  return <ConexionesView />;
}
