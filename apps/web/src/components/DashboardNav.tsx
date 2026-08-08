"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

const BASE_TABS = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/dashboard/publicar", label: "Publicar" },
  { href: "/dashboard/publicaciones-en-curso", label: "Publicaciones en Curso" },
  { href: "/dashboard/oportunidades", label: "Oportunidades" },
  { href: "/dashboard/oportunidades-redes", label: "Oportunidades Redes" },
  { href: "/dashboard/historial", label: "Historial" },
  { href: "/dashboard/configuracion", label: "Configuración" },
];

const ADMIN_TAB = { href: "/dashboard/usuarios", label: "Administración" };

export default function DashboardNav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setIsAdmin(data?.role === "admin"))
      .catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const tabs = isAdmin ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS;
  const activeTab = tabs.find((tab) => tab.href === pathname);

  const linkStyle = (active: boolean): CSSProperties => ({
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 600,
    textDecoration: "none",
    color: active ? "#e8ecf5" : "#a8b3c7",
    borderBottom: active ? "2px solid #4dd8e8" : "2px solid transparent",
    whiteSpace: "nowrap",
    flexShrink: 0,
  });

  return (
    <nav style={{ position: "relative", marginTop: 20 }}>
      <style>{`
        @media (min-width: 700px) {
          .nav-mobile-toggle { display: none !important; }
          .nav-mobile-menu { display: none !important; }
          .nav-desktop-row { display: flex !important; }
        }
      `}</style>

      <button
        type="button"
        className="nav-mobile-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          display: "flex",
          width: "100%",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 14px",
          fontSize: 14,
          fontWeight: 600,
          color: "#e8ecf5",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(232, 236, 245, 0.15)",
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        <span>{activeTab?.label ?? "Menú"}</span>
        <span aria-hidden="true">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          className="nav-mobile-menu"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 20,
            background: "#0b1a3a",
            border: "1px solid rgba(232, 236, 245, 0.15)",
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: "0 12px 28px rgba(0, 9, 35, 0.35)",
          }}
        >
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setOpen(false)}
                style={{
                  display: "block",
                  padding: "12px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  color: active ? "#4dd8e8" : "#e8ecf5",
                  background: active ? "rgba(77, 216, 232, 0.1)" : "transparent",
                  borderBottom: "1px solid rgba(232, 236, 245, 0.08)",
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      )}

      <div
        className="nav-desktop-row"
        style={{
          display: "none",
          gap: 4,
          borderBottom: "1px solid rgba(232, 236, 245, 0.15)",
        }}
      >
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            style={linkStyle(pathname === tab.href)}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
