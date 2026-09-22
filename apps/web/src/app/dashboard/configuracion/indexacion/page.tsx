import { redirect } from "next/navigation";

/**
 * Página "Indexación y SEO", parte del rediseño "RENEW CONFIGURACION"
 * (7/9/2026). Antes era una pestaña más de `ConfiguracionView.tsx`; su
 * contenido ya era autocontenido (los tres componentes no reciben props ni
 * comparten estado con nada más), así que la extracción es directa: sin
 * cambios de lógica.
 */
export default function ConfiguracionIndexacionPage() {
  redirect("/dashboard/configuracion/conexiones?vista=analiticas");
}
