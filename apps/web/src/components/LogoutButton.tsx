"use client";

import { secondaryButtonStyle } from "@/components/dashboard-ui";

export default function LogoutButton() {
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button onClick={handleLogout} style={secondaryButtonStyle}>
      Cerrar sesión
    </button>
  );
}
