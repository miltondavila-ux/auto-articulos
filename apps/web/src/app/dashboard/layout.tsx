import type { ReactNode } from "react";
import DashboardNav from "@/components/DashboardNav";
import LogoutButton from "@/components/LogoutButton";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Auto Artículos</h1>
        <LogoutButton />
      </div>
      <DashboardNav />
      {children}
    </main>
  );
}
