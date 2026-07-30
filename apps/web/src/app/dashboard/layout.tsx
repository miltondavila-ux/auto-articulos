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
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "32px 20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ fontSize: 22, margin: 0 }}>Auto Artículos</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#9aa1ac" }}>{user.email}</span>
          <LogoutButton />
        </div>
      </div>
      <DashboardNav />
      {children}
    </main>
  );
}
