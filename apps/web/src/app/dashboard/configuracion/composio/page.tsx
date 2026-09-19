import { redirect } from "next/navigation";

/**
 * Dirección antigua de la pestaña temporal «Conexión Composio». Ahora todo vive en
 * «Conexiones» (ver ESPECIFICACION_CONEXIONES_UNIFICADAS.md); se conserva para no
 * romper enlaces guardados.
 */
export default function ConexionComposioAntigua() {
  redirect("/dashboard/configuracion/conexiones");
}
