import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { canUseComposioModule } from "@/lib/composio-connections";
import ConexionesView from "./ConexionesView";

export const dynamic = "force-dynamic";

/**
 * Pantalla única de conexiones (UX-1, ver ESPECIFICACION_CONEXIONES_UNIFICADAS.md).
 * ETAPA 1: opt-in. Solo administradores y quien tenga «Habilitado» el módulo
 * «Conexión por Composio»; el resto sigue con las pantallas de siempre
 * (Indexación y SEO / Redes Sociales), que no se han tocado.
 */
export default async function ConexionesPage() {
  const user = await getCurrentUser();
  if (!canUseComposioModule(user)) redirect("/dashboard/configuracion");
  return <ConexionesView />;
}
