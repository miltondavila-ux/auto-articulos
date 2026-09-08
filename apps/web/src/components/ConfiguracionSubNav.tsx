"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

const SECCIONES = [
  { href: "/dashboard/configuracion", label: "Índice" },
  { href: "/dashboard/configuracion/inicial", label: "Configuración Inicial" },
  { href: "/dashboard/configuracion/cuenta", label: "Cuenta" },
  { href: "/dashboard/configuracion/contenido", label: "Contenido" },
  { href: "/dashboard/configuracion/indexacion", label: "Indexación y SEO" },
  { href: "/dashboard/configuracion/redes-sociales", label: "Redes Sociales" },
  { href: "/dashboard/configuracion/movil", label: "App Móvil" },
] as const;

/**
 * Barra de ida y vuelta entre las secciones de Configuración.
 *
 * Pedido explícito de Milton (7/9/2026): al entrar a una sección no había
 * forma de volver a las demás sin usar el botón "atrás" del navegador. Se
 * agrega esta barra en las 6 páginas dedicadas, con la sección actual
 * sombreada — mismo patrón visual (píldora rellena gris `#f5f5f7` para lo
 * activo) que ya usa el menú principal en `DashboardNav.tsx`, para no
 * introducir un segundo lenguaje de navegación.
 */
export default function ConfiguracionSubNav() {
  const pathname = usePathname();

  const linkStyle = (active: boolean): CSSProperties => ({
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    textDecoration: "none",
    color: active ? "#1d1d1f" : "#6e6e73",
    background: active ? "#f5f5f7" : "transparent",
    borderRadius: 10,
    whiteSpace: "nowrap",
  });

  return (
    <nav
      aria-label="Secciones de Configuración"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 4,
        marginTop: 16,
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: "1px solid #d2d2d7",
      }}
    >
      {SECCIONES.map((s) => (
        <Link key={s.href} href={s.href} style={linkStyle(pathname === s.href)}>
          {s.label}
        </Link>
      ))}
    </nav>
  );
}
