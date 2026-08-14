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
        setIsAdmin(data?.role === "admin" || Boolean(data?.isActingAdmin));
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
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    textDecoration: "none",
    color: active ? "#ffffff" : "var(--apple-text-secondary, #98a2b3)",
    background: active ? "rgba(255, 255, 255, 0.12)" : "transparent",
    borderRadius: 10,
    boxShadow: active ? "0 2px 8px rgba(0, 0, 0, 0.25)" : "none",
    whiteSpace: "nowrap",
    flexShrink: 0,
    transition: "all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)",
  });

  return (
    <nav style={{ position: "relative", marginTop: 18, marginBottom: 28 }}>
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
          padding: "12px 16px",
          fontSize: 14,
          fontWeight: 600,
          color: "#f5f5f7",
          background: "rgba(13, 26, 51, 0.75)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 12,
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
          transition: "all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--apple-accent, #0071e3)" }} />
          {activeTab?.label ?? "Menú de Módulos"}
        </span>
        <span style={{ fontSize: 11, opacity: 0.7 }} aria-hidden="true">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          className="nav-mobile-menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 30,
            background: "rgba(11, 22, 44, 0.95)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(255, 255, 255, 0.14)",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5)",
            padding: 4,
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
                  padding: "12px 14px",
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  textDecoration: "none",
                  color: active ? "#ffffff" : "#c4cddb",
                  background: active ? "rgba(0, 113, 227, 0.25)" : "transparent",
                  borderRadius: 10,
                  transition: "all 0.15s ease",
                }}
              >
                <span>{tab.label}</span>
                {isGloballyDisabled && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 9999,
                      background: "rgba(255, 159, 10, 0.18)",
                      color: "#ff9f0a",
                      border: "1px solid rgba(255, 159, 10, 0.35)",
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
          background: "rgba(13, 26, 51, 0.6)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 14,
          padding: 4,
          overflowX: "auto",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.18)",
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
              title={
                isGloballyDisabled
                  ? "Módulo en mantenimiento / oculto globalmente para usuarios"
                  : undefined
              }
              style={{
                ...linkStyle(active),
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
                    padding: "1px 6px",
                    borderRadius: 9999,
                    background: "rgba(255, 159, 10, 0.18)",
                    color: "#ff9f0a",
                    border: "1px solid rgba(255, 159, 10, 0.35)",
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
