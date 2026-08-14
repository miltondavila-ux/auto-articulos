"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

interface TabItem {
  id?: string;
  href: string;
  label: string;
}

const BASE_TABS: TabItem[] = [
  { href: "/dashboard", label: "Inicio" },
  { id: "publicar", href: "/dashboard/publicar", label: "Publicar" },
  { id: "publicaciones-en-curso", href: "/dashboard/publicaciones-en-curso", label: "Publicaciones en Curso" },
  { id: "oportunidades", href: "/dashboard/oportunidades", label: "Oportunidades" },
  { id: "oportunidades-redes", href: "/dashboard/oportunidades-redes", label: "Oportunidades Redes" },
  { id: "historial", href: "/dashboard/historial", label: "Historial" },
  { id: "configuracion", href: "/dashboard/configuracion", label: "Configuración" },
  { id: "actualizaciones", href: "/dashboard/actualizaciones", label: "Actualizaciones" },
];

const ADMIN_TAB: TabItem = { href: "/dashboard/usuarios", label: "Administración" };

export default function DashboardNav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [disabledModules, setDisabledModules] = useState<string[]>([]);
  const [globalDisabledModules, setGlobalDisabledModules] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/me?_t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setIsAdmin(data?.role === "admin");
        if (Array.isArray(data?.disabledModules)) {
          setDisabledModules(data.disabledModules);
        }
        if (Array.isArray(data?.globalDisabledModules)) {
          setGlobalDisabledModules(data.globalDisabledModules);
        }
      })
      .catch(() => {
        setIsAdmin(false);
        setDisabledModules([]);
        setGlobalDisabledModules([]);
      });
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const rawTabs = isAdmin ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS;
  const tabs = isAdmin
    ? rawTabs
    : rawTabs.filter((tab) => !tab.id || !disabledModules.includes(tab.id));
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
    <nav style={{ position: "relative", marginTop: 20, marginBottom: 28 }}>
      <style>{`
        @media (min-width: 1024px) {
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
            const isGloballyDisabled =
              isAdmin && Boolean(tab.id && globalDisabledModules.includes(tab.id));
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setOpen(false)}
                title={
                  isGloballyDisabled
                    ? "Módulo en mantenimiento / oculto globalmente para usuarios"
                    : undefined
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  color: active ? "#4dd8e8" : "#e8ecf5",
                  background: active ? "rgba(77, 216, 232, 0.1)" : "transparent",
                  borderBottom: "1px solid rgba(232, 236, 245, 0.08)",
                }}
              >
                <span>{tab.label}</span>
                {isGloballyDisabled && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "rgba(255, 170, 0, 0.2)",
                      color: "#ffd98a",
                      border: "1px solid rgba(255, 170, 0, 0.4)",
                    }}
                  >
                    Oculto
                  </span>
                )}
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
        {tabs.map((tab) => {
          const isGloballyDisabled =
            isAdmin && Boolean(tab.id && globalDisabledModules.includes(tab.id));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              title={
                isGloballyDisabled
                  ? "Módulo en mantenimiento / oculto globalmente para usuarios"
                  : undefined
              }
              style={{
                ...linkStyle(pathname === tab.href),
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>{tab.label}</span>
              {isGloballyDisabled && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 4,
                    background: "rgba(255, 170, 0, 0.2)",
                    color: "#ffd98a",
                    border: "1px solid rgba(255, 170, 0, 0.4)",
                  }}
                >
                  Oculto
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
