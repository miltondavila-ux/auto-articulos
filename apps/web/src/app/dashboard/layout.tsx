import type { ReactNode } from "react";
import DashboardNav from "@/components/DashboardNav";
import FloatingAssistant from "@/components/FloatingAssistant";
import LogoutButton from "@/components/LogoutButton";
import ModuleGuard from "@/components/ModuleGuard";
import StopImpersonationButton from "@/components/StopImpersonationButton";
import TrialBlockedScreen from "@/components/TrialBlockedScreen";
import { displayName, getSessionContext } from "@/lib/current-user";
import { hasTrialAccess } from "@/lib/trial";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, actingAdmin } = await getSessionContext();
  // Fase 2 del sistema de prueba gratuita (13/8/2026): al vencer los 7 días
  // sin que el admin haya marcado `trialUnlocked`, la cuenta deja de poder
  // usar CUALQUIER parte del sistema — se reemplaza todo el contenido del
  // dashboard (incluida la navegación) por la pantalla de bloqueo. La
  // validación es server-side (layout.tsx corre en el servidor), así que no
  // se puede saltar apagando JavaScript. Un admin "actuando como" (ver
  // StopImpersonationButton) SIEMPRE puede seguir usando la cuenta con
  // normalidad para dar soporte, sin importar el estado de la prueba.
  const blocked = !actingAdmin && user.role !== "admin" && !hasTrialAccess(user);

  return (
    <main
      className="dashboard-main"
      style={{
        maxWidth: 1400,
        margin: "0 auto",
        padding: "24px 16px",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @media (min-width: 768px) and (max-width: 1023px) {
          .dashboard-main { padding-bottom: 48px !important; }
        }
        @media (min-width: 1024px) {
          .mobile-notice { display: none; }
          .dashboard-main { padding: 32px 40px !important; }
        }
        /*
         * Tablas anchas: vista apilada en tarjetas estilo Apple en pantallas pequeñas
         */
        @media (max-width: 1023px) {
          table.responsive-table {
            min-width: 0 !important;
            width: 100% !important;
          }
          table.responsive-table thead { display: none; }
          table.responsive-table,
          table.responsive-table tbody,
          table.responsive-table tr,
          table.responsive-table td {
            display: block;
            width: 100%;
          }
          table.responsive-table tr {
            border-top: none !important;
            border: 1px solid rgba(255, 255, 255, 0.12) !important;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 12px;
            padding: 12px 14px;
            margin-bottom: 12px;
            box-sizing: border-box;
          }
          table.responsive-table td {
            padding: 6px 0;
            border: none !important;
          }
          table.responsive-table td[data-label]::before {
            content: attr(data-label);
            display: block;
            font-size: 11px;
            font-weight: 700;
            color: #98a2b3;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            margin-bottom: 3px;
          }
        }
      `}</style>
      <div
        className="dashboard-header"
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          paddingBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #0071e3 0%, #004b99 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0, 113, 227, 0.4)",
              color: "#ffffff",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            A
          </div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: 0,
              color: "#f5f5f7",
            }}
          >
            Auto Artículos
          </h1>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          {actingAdmin ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 2,
                maxWidth: "100%",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "#98a2b3",
                  wordBreak: "break-word",
                  textAlign: "right",
                }}
              >
                {displayName(actingAdmin)}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#ff9f0a",
                  wordBreak: "break-word",
                  textAlign: "right",
                }}
              >
                Actuando como: {displayName(user)}
              </span>
            </div>
          ) : (
            <span
              style={{
                fontSize: 13,
                color: "#98a2b3",
                fontWeight: 500,
                wordBreak: "break-word",
              }}
            >
              {displayName(user)}
            </span>
          )}
          {actingAdmin && <StopImpersonationButton />}
          <LogoutButton />
        </div>
      </div>
      <p
        className="mobile-notice"
        style={{
          fontSize: 12,
          color: "#ff9f0a",
          background: "rgba(255, 159, 10, 0.12)",
          border: "1px solid rgba(255, 159, 10, 0.25)",
          borderRadius: 10,
          padding: "10px 14px",
          marginTop: 14,
          lineHeight: 1.4,
        }}
      >
        📱 Esta aplicación funciona en el celular, pero se recomienda usarla
        desde una computadora para una mejor experiencia.
      </p>
      {blocked ? (
        <TrialBlockedScreen />
      ) : (
        <>
          <DashboardNav />
          <ModuleGuard>{children}</ModuleGuard>
          <FloatingAssistant />
        </>
      )}
    </main>
  );
}
