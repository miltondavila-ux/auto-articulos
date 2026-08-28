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
        setIsAdmin(data?.role === "admin" || Boolean(data?.isActingAdmin));
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

  /*
   * Coincidencia por segmento de ruta, no por prefijo de texto.
   *
   * Con startsWith, "/dashboard/oportunidades-redes" empezaba por
   * "/dashboard/oportunidades", así que el guard resolvía la pantalla de redes
   * como si fuera el módulo de Oportunidades: apagar uno apagaba el otro, y
   * apagar redes no protegía nada. Se elige además la coincidencia más larga,
   * para que gane siempre el módulo más específico.
   */
  const matchingModule = SYSTEM_MODULES.filter(
    (m) => pathname === m.href || pathname?.startsWith(`${m.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
  if (matchingModule && disabledModules.includes(matchingModule.id)) {
    return (
      <div
        style={{
          marginTop: 24,
          padding: "36px 24px",
          background: "#ffffff",
          borderRadius: 22,
          border: "1px solid rgba(0, 0, 0, 0.07)",
          boxShadow: "none",
          textAlign: "center",
          maxWidth: 600,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}></div>
        <h2 style={{ fontSize: 22, color: "#1d1d1f", margin: "0 0 10px" }}>
          Módulo en mantenimiento
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "#6e6e73",
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
            background: "#1d1d1f",
            color: "#ffffff",
            borderRadius: 10,
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
