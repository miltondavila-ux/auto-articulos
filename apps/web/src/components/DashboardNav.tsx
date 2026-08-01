"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

const BASE_TABS = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/dashboard/publicar", label: "Publicar" },
  { href: "/dashboard/oportunidades", label: "Oportunidades" },
  { href: "/dashboard/historial", label: "Historial" },
  { href: "/dashboard/configuracion", label: "Configuración" },
];

const ADMIN_TAB = { href: "/dashboard/usuarios", label: "Administración" };

export default function DashboardNav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setIsAdmin(data?.role === "admin"))
      .catch(() => setIsAdmin(false));
  }, []);

  const tabs = isAdmin ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS;

  return (
    <nav
      style={{
        display: "flex",
        gap: 4,
        marginTop: 20,
        borderBottom: "1px solid rgba(232, 236, 245, 0.15)",
      }}
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        const style: CSSProperties = {
          padding: "10px 16px",
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
          color: active ? "#e8ecf5" : "#a8b3c7",
          borderBottom: active ? "2px solid #4dd8e8" : "2px solid transparent",
        };
        return (
          <Link key={tab.href} href={tab.href} style={style}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
