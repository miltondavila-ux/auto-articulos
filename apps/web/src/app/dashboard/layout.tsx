import type { ReactNode } from "react";
import DashboardNav from "@/components/DashboardNav";
import LogoutButton from "@/components/LogoutButton";
import { getCurrentUser } from "@/lib/current-user";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <main style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 40px" }}>
      <style>{`
        @media (min-width: 700px) {
          .mobile-notice { display: none; }
        }
      `}</style>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ fontSize: 22, margin: 0, color: "#e8ecf5" }}>
          Auto Artículos
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#a8b3c7" }}>{user.email}</span>
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
