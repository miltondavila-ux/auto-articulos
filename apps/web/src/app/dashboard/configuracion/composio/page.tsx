import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { canUseComposioModule } from "@/lib/composio-connections";
import ConfiguracionSubNav from "@/components/ConfiguracionSubNav";
import ComposioConnect from "./ComposioConnect";

export const dynamic = "force-dynamic";

export default async function ConexionComposioPage() {
  const user = await getCurrentUser();
  // Módulo opt-in: solo administradores y quien tenga «Habilitado».
  if (!canUseComposioModule(user)) redirect("/dashboard/configuracion");

  return (
    <div>
      <ConfiguracionSubNav />
      <ComposioConnect />
    </div>
  );
}
