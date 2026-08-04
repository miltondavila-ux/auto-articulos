import type { ReactNode } from "react";
import DashboardNav from "@/components/DashboardNav";
import LogoutButton from "@/components/LogoutButton";
import StopImpersonationButton from "@/components/StopImpersonationButton";
import { displayName, getSessionContext } from "@/lib/current-user";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, actingAdmin } = await getSessionContext();

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
        @media (min-width: 700px) {
          .mobile-notice { display: none; }
          .dashboard-main { padding: 32px 40px !important; }
        }
      `}</style>
      <div
        className="dashboard-header"
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <h1 style={{ fontSize: 20, margin: 0, color: "#e8ecf5" }}>
          Auto Artículos
        </h1>
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
                  color: "#a8b3c7",
                  wordBreak: "break-word",
                  textAlign: "right",
                }}
              >
                {displayName(actingAdmin)}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#ffd98a",
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
                fontSize: 12,
                color: "#a8b3c7",
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
          color: "#8a6d1a",
          background: "#fff8e6",
          border: "1px solid #f0deac",
          borderRadius: 8,
          padding: "8px 12px",
          marginTop: 12,
        }}
      >
        📱 Esta aplicación funciona en el celular, pero se recomienda usarla
        desde una computadora para una mejor experiencia.
      </p>
      <DashboardNav />
      {children}
    </main>
  );
}
