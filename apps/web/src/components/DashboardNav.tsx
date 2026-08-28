"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

interface TabItem {
  id?: string;
  href: string;
  label: string;
}

interface TabGroup {
  /** Identificador del grupo, no de un módulo: no se oculta por permisos. */
  group: string;
  label: string;
  items: TabItem[];
}

type NavEntry = TabItem | TabGroup;

function isGroup(entry: NavEntry): entry is TabGroup {
  return "group" in entry;
}

// Orden del menú definido por Milton (18/8/2026). Todo lo que tiene que ver
// con publicar vive dentro de PUBLICACIONES para que la barra principal quede
// corta; Historial queda justo debajo del grupo, como pidió.
const BASE_ENTRIES: NavEntry[] = [
  { href: "/dashboard", label: "Inicio" },
  { id: "como-funciona", href: "/dashboard/como-funciona", label: "Cómo Funciona" },
  {
    group: "publicaciones",
    label: "Publicaciones",
    items: [
      { id: "publicar", href: "/dashboard/publicar", label: "Publicaciones propias" },
      { id: "oportunidades", href: "/dashboard/oportunidades", label: "Oportunidades SEO/AEO" },
      {
        id: "oportunidades-redes",
        href: "/dashboard/oportunidades-redes",
        label: "Oportunidades para Redes Sociales",
      },
      {
        id: "publicaciones-en-curso",
        href: "/dashboard/publicaciones-en-curso",
        label: "Publicaciones en Curso",
      },
    ],
  },
  { id: "historial", href: "/dashboard/historial", label: "Historial" },
  { id: "actualizaciones", href: "/dashboard/actualizaciones", label: "Actualizaciones" },
  { id: "configuracion", href: "/dashboard/configuracion", label: "Configuración" },
];

const ADMIN_TAB: TabItem = { href: "/dashboard/usuarios", label: "Administración" };

export default function DashboardNav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [disabledModules, setDisabledModules] = useState<string[]>([]);
  const [globalDisabledModules, setGlobalDisabledModules] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const groupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch(`/api/me?_t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setIsAdmin(data?.role === "admin" || Boolean(data?.isActingAdmin));
        setUserEmail(typeof data?.email === "string" ? data.email.toLowerCase() : "");
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
    setOpenGroup(null);
  }, [pathname]);

  // Cerrar el desplegable al pulsar fuera o con Escape, como cualquier menú
  // del sistema.
  useEffect(() => {
    if (!openGroup) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (groupRef.current && !groupRef.current.contains(event.target as Node)) {
        setOpenGroup(null);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenGroup(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openGroup]);

  const canUseSocial = isAdmin || userEmail === "lorenalvarez30@gmail.com";

  // Misma regla de visibilidad que antes, aplicada ahora también dentro de los
  // grupos: Oportunidades Redes depende de su permiso propio y el resto de la
  // lista de módulos deshabilitados. Los administradores lo ven todo.
  function isVisible(tab: TabItem): boolean {
    if (isAdmin) return true;
    if (tab.id === "oportunidades-redes") return canUseSocial;
    return !tab.id || !disabledModules.includes(tab.id);
  }

  const rawEntries: NavEntry[] = isAdmin ? [...BASE_ENTRIES, ADMIN_TAB] : BASE_ENTRIES;

  // Un grupo cuyos módulos están todos ocultos desaparece entero, en vez de
  // quedar como un desplegable vacío.
  const entries = rawEntries
    .map((entry) => {
      if (!isGroup(entry)) return entry;
      const items = entry.items.filter(isVisible);
      return items.length ? { ...entry, items } : null;
    })
    .filter((entry): entry is NavEntry => entry !== null)
    .filter((entry) => (isGroup(entry) ? true : isVisible(entry)));

  const flatTabs: TabItem[] = entries.flatMap((entry) =>
    isGroup(entry) ? entry.items : [entry],
  );
  const activeTab = flatTabs.find((tab) => tab.href === pathname);
  const activeGroup = entries.find(
    (entry) => isGroup(entry) && entry.items.some((item) => item.href === pathname),
  );

  function hiddenGlobally(tab: TabItem): boolean {
    return isAdmin && Boolean(tab.id && globalDisabledModules.includes(tab.id));
  }

  const linkStyle = (active: boolean): CSSProperties => ({
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    textDecoration: "none",
    color: active ? "#1d1d1f" : "#6e6e73",
    background: active ? "#ffffff" : "transparent",
    borderRadius: 10,
    boxShadow: active ? "0 1px 3px rgba(0, 0, 0, 0.08)" : "none",
    whiteSpace: "nowrap",
    flexShrink: 0,
    transition: "all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)",
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
  });

  const hiddenBadge = (small: boolean) => (
    <span
      style={{
        fontSize: small ? 9 : 10,
        fontWeight: 700,
        padding: small ? "1px 6px" : "2px 8px",
        borderRadius: 9999,
        background: "rgba(255, 149, 0, 0.12)",
        color: "#ff9500",
        border: "1px solid rgba(255, 149, 0, 0.25)",
      }}
    >
      Oculto
    </span>
  );

  return (
    <nav style={{ position: "relative", marginTop: 18, marginBottom: 28 }}>
      <style>{`
        @media (min-width: 1180px) {
          .nav-mobile-toggle { display: none !important; }
          .nav-mobile-menu { display: none !important; }
          .nav-desktop-row { display: flex !important; }
        }
        @media (max-width: 420px) {
          .nav-mobile-toggle { padding: 11px 12px !important; }
          .nav-mobile-menu { border-radius: 12px !important; }
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
          color: "#1d1d1f",
          background: "#ffffff",
          border: "1px solid rgba(0, 0, 0, 0.08)",
          borderRadius: 12,
          cursor: "pointer",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
          transition: "all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)",
          fontFamily: "inherit",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1d1d1f" }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {activeTab?.label ?? "Menú de Módulos"}
          </span>
        </span>
        <span
          style={{ fontSize: 18, lineHeight: 1, opacity: 0.75, flexShrink: 0 }}
          aria-hidden="true"
        >
          {open ? "×" : "☰"}
        </span>
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
            background: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(0, 0, 0, 0.08)",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.12)",
            padding: 4,
            maxHeight: "min(70vh, 520px)",
            overflowY: "auto",
          }}
        >
          {entries.map((entry) => {
            // En móvil el grupo no se despliega: se muestra como encabezado con
            // sus opciones debajo. Un desplegable dentro de otro desplegable es
            // incómodo en un teléfono.
            if (isGroup(entry)) {
              return (
                <div key={entry.group}>
                  <p
                    style={{
                      margin: "10px 14px 4px",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#86868b",
                    }}
                  >
                    {entry.label}
                  </p>
                  {entry.items.map((tab) => (
                    <MobileLink
                      key={tab.href}
                      tab={tab}
                      active={pathname === tab.href}
                      hidden={hiddenGlobally(tab)}
                      onNavigate={() => setOpen(false)}
                      indented
                    />
                  ))}
                </div>
              );
            }
            return (
              <MobileLink
                key={entry.href}
                tab={entry}
                active={pathname === entry.href}
                hidden={hiddenGlobally(entry)}
                onNavigate={() => setOpen(false)}
              />
            );
          })}
        </div>
      )}

      <div
        className="nav-desktop-row"
        style={{
          display: "none",
          gap: 4,
          background: "#f5f5f7",
          border: "1px solid rgba(0, 0, 0, 0.06)",
          borderRadius: 14,
          padding: 4,
          flexWrap: "wrap",
          alignItems: "center",
          // Sin `overflow` aquí: por regla de CSS, poner overflow-x en hidden
          // convierte el eje vertical en auto, y eso recortaba el desplegable
          // de Publicaciones, que cae por debajo de la barra. La fila envuelve
          // con flexWrap, así que no necesita recorte horizontal.
        }}
      >
        {entries.map((entry) => {
          if (isGroup(entry)) {
            const groupActive = entry === activeGroup;
            const expanded = openGroup === entry.group;
            return (
              <div
                key={entry.group}
                ref={expanded ? groupRef : undefined}
                style={{ position: "relative" }}
              >
                <button
                  type="button"
                  onClick={() => setOpenGroup((prev) => (prev === entry.group ? null : entry.group))}
                  aria-expanded={expanded}
                  aria-haspopup="menu"
                  style={{
                    ...linkStyle(groupActive || expanded),
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>{entry.label}</span>
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: 9,
                      opacity: 0.55,
                      transform: expanded ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s ease",
                    }}
                  >
                    ▼
                  </span>
                </button>

                {expanded && (
                  <div
                    role="menu"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      left: 0,
                      zIndex: 40,
                      minWidth: 268,
                      background: "rgba(255, 255, 255, 0.98)",
                      backdropFilter: "blur(24px) saturate(180%)",
                      WebkitBackdropFilter: "blur(24px) saturate(180%)",
                      border: "1px solid rgba(0, 0, 0, 0.08)",
                      borderRadius: 14,
                      boxShadow: "0 12px 36px rgba(0, 0, 0, 0.14)",
                      padding: 5,
                    }}
                  >
                    {entry.items.map((tab) => {
                      const active = pathname === tab.href;
                      return (
                        <Link
                          key={tab.href}
                          href={tab.href}
                          role="menuitem"
                          onClick={() => setOpenGroup(null)}
                          title={
                            hiddenGlobally(tab)
                              ? "Módulo en mantenimiento / oculto globalmente para usuarios"
                              : undefined
                          }
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            padding: "10px 12px",
                            fontSize: 13,
                            fontWeight: active ? 600 : 500,
                            textDecoration: "none",
                            color: "#1d1d1f",
                            background: active ? "rgba(0, 0, 0, 0.05)" : "transparent",
                            borderRadius: 10,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span>{tab.label}</span>
                          {hiddenGlobally(tab) && hiddenBadge(true)}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active = pathname === entry.href;
          return (
            <Link
              key={entry.href}
              href={entry.href}
              title={
                hiddenGlobally(entry)
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
              <span>{entry.label}</span>
              {hiddenGlobally(entry) && hiddenBadge(true)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function MobileLink({
  tab,
  active,
  hidden,
  onNavigate,
  indented = false,
}: {
  tab: TabItem;
  active: boolean;
  hidden: boolean;
  onNavigate: () => void;
  indented?: boolean;
}) {
  return (
    <Link
      href={tab.href}
      onClick={onNavigate}
      title={hidden ? "Módulo en mantenimiento / oculto globalmente para usuarios" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: indented ? "11px 14px 11px 26px" : "12px 14px",
        fontSize: 14,
        fontWeight: active ? 600 : 500,
        textDecoration: "none",
        color: "#1d1d1f",
        background: active ? "rgba(0, 0, 0, 0.05)" : "transparent",
        borderRadius: 10,
        transition: "all 0.15s ease",
      }}
    >
      <span>{tab.label}</span>
      {hidden && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 9999,
            background: "rgba(255, 149, 0, 0.12)",
            color: "#ff9500",
            border: "1px solid rgba(255, 149, 0, 0.25)",
          }}
        >
          Oculto
        </span>
      )}
    </Link>
  );
}
