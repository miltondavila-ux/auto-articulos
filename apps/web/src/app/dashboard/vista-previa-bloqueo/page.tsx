import { redirect } from "next/navigation";
import TrialBlockedScreen from "@/components/TrialBlockedScreen";
import { getCurrentUser } from "@/lib/current-user";

// Vista de previsualización, solo para admin (13/8/2026): la pantalla real
// de bloqueo (TrialBlockedScreen) vive detrás de la validación de 7 días de
// prueba, así que no hay forma de verla sin esperar a que una cuenta venza.
// Esta página la muestra directamente para poder revisar el diseño.
export default async function VistaPreviaBloqueoPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  return (
    <div>
      <p style={{ fontSize: 12, color: "#86868b", marginBottom: 8 }}>
        Vista previa (solo admin) — así se ve la pantalla real cuando vence
        el período de prueba de un usuario.
      </p>
      <TrialBlockedScreen />
    </div>
  );
}
