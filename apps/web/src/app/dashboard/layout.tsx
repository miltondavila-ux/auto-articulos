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
  const blocked = !actingAdmin && user.role !== "admin" && !hasTrialAccess(user);

  return (
    <main
      className="dashboard-main shell"
      style={{
        maxWidth: 1120,
        margin: "0 auto",
        padding: "28px 22px 64px",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @media (max-width: 639px) {
          .dashboard-main {
            padding: 20px 16px 44px !important;
          }
          .topbar {
            align-items: stretch !important;
            gap: 14px !important;
          }
          .topbar-title h1 {
            font-size: 23px !important;
          }
          .session-actions {
            width: 100%;
            justify-content: space-between !important;
            gap: 8px !important;
          }
          .session-user {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .dashboard-main { padding-bottom: 48px !important; }
        }
        @media (min-width: 1024px) {
          .mobile-notice { display: none; }
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
            border: 1px solid rgba(0, 0, 0, 0.08) !important;
            background: #ffffff;
            border-radius: 12px;
            padding: 12px 14px;
            margin-bottom: 12px;
            box-sizing: border-box;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
          }
          table.responsive-table td {
            padding: 6px 0;
            border: none !important;
          }
          table.responsive-table td[data-label]::before {
            content: attr(data-label);
            display: block;
            font-size: 11px;
            font-weight: 600;
            color: #6e6e73;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            margin-bottom: 3px;
          }
        }
      `}</style>
      <div
        className="topbar"
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div className="topbar-title">
          <h1
            style={{
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              margin: 0,
              color: "#1d1d1f",
            }}
          >
            Auto Artículos
          </h1>
          <p className="eyebrow" style={{ margin: "4px 0 0" }}>
            Generación y Posicionamiento SEO
          </p>
        </div>
        <div
          className="session-actions"
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
                  fontSize: 12,
                  color: "#6e6e73",
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
                  color: "#8a4b08",
                  wordBreak: "break-word",
                  textAlign: "right",
                }}
              >
                Actuando como: {displayName(user)}
              </span>
            </div>
          ) : (
            <span
              className="session-user"
              style={{
                fontSize: 13,
                color: "#6e6e73",
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
        className="mobile-notice notice"
        style={{
          margin: "0 0 16px",
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
