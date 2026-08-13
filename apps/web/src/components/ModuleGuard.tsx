"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SYSTEM_MODULES } from "@/lib/modules";

export default function ModuleGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [disabledModules, setDisabledModules] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

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
        setChecked(true);
      })
      .catch(() => {
        setIsAdmin(false);
        setChecked(true);
      });
  }, []);

  if (!checked || isAdmin) {
    return <>{children}</>;
  }

  const matchingModule = SYSTEM_MODULES.find((m) => pathname.startsWith(m.href));
  if (matchingModule && disabledModules.includes(matchingModule.id)) {
    return (
      <div
        style={{
          marginTop: 24,
          padding: "36px 24px",
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #e4e9f1",
          boxShadow: "0 4px 18px rgba(12, 35, 75, 0.06)",
          textAlign: "center",
          maxWidth: 600,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>🛠️</div>
        <h2 style={{ fontSize: 22, color: "#16181d", margin: "0 0 10px" }}>
          Módulo en mantenimiento
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "#6b7280",
            lineHeight: 1.5,
            margin: "0 0 20px",
          }}
        >
          La sección <strong>{matchingModule.label}</strong> se encuentra
          temporalmente en desarrollo o mantenimiento para tu cuenta. Vuelve a
          intentarlo más tarde o contacta al administrador.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: "inline-block",
            padding: "10px 20px",
            background: "#2f5fdb",
            color: "#fff",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Volver a Inicio
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
