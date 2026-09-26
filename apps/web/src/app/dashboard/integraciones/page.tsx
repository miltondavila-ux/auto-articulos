import { redirect } from "next/navigation";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { McpPlatformSelector } from "./components/McpPlatformSelector";

export default async function IntegracionesPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const mcpConnections = await prisma.mcpConnection.findMany({
    where: { userId, revokedAt: null },
    select: { provider: true },
  });

  const connectedProviders = mcpConnections.map((c) => c.provider);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Integraciones</h1>
        <p className="text-gray-600 mt-2">Conecta tus plataformas y comienza a publicar automáticamente.</p>
      </div>

      <McpPlatformSelector connectedProviders={connectedProviders} />
    </div>
  );
}
