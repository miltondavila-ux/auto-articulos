"use client";

import { useEffect, useState, type CSSProperties } from "react";
import ModuleIntro, { IntroP } from "@/components/ModuleIntro";
import ConfiguracionSubNav from "@/components/ConfiguracionSubNav";
import BrowserTabsConnectionNotice from "@/components/BrowserTabsConnectionNotice";
import GoogleSearchConsoleSection from "@/components/GoogleSearchConsoleSection";
import GoogleAnalyticsSection from "@/components/GoogleAnalyticsSection";
import BingWebmasterSection from "@/components/BingWebmasterSection";
import BusinessProfileSection from "@/components/BusinessProfileSection";
import ThreadsSection from "@/components/ThreadsSection";
import LinkedInSection from "@/components/LinkedInSection";
import PinterestSection from "@/components/PinterestSection";
import TumblrSection from "@/components/TumblrSection";
import BlueskySection from "@/components/BlueskySection";
import DevToSection from "@/components/DevToSection";
import BloggerSection from "@/components/BloggerSection";
import PasosAntesDeConectar from "@/components/PasosAntesDeConectar";

type Vista = "analiticas" | "difusion";

const VISTAS: { id: Vista; label: string; ayuda: string }[] = [
  { id: "analiticas", label: "ANALÍTICAS", ayuda: "Leen datos y ayudan a que aparezcas en los buscadores." },
  { id: "difusion", label: "DIFUSIÓN", ayuda: "Publican tu contenido en redes, microblogs y blogs." },
];

function botonVista(activo: boolean): CSSProperties {
  return {
    padding: "10px 22px",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.04em",
    borderRadius: 12,
    border: activo ? "1px solid #1d1d1f" : "1px solid #d2d2d7",
    background: activo ? "#1d1d1f" : "#ffffff",
    color: activo ? "#ffffff" : "#1d1d1f",
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

const columna: CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };

/**
 * Pantalla «Conexiones»: una tarjeta por red, en dos grupos. Cada red aparece SOLO si
 * la persona la tiene activada (mismas reglas que las pantallas actuales, copiadas de
 * Redes Sociales / Indexación). Las secciones existentes se reutilizan sin modificarlas;
 * las conexiones alternativas se resuelven por debajo, sin duplicar tarjetas en la interfaz.
 */
export default function ConexionesView() {
  const [vista, setVista] = useState<Vista>("analiticas");
  const [isAdmin, setIsAdmin] = useState(false);
  const [modulosDeshabilitados, setModulosDeshabilitados] = useState<string[]>([]);
  const [permisos, setPermisos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const pedida = new URLSearchParams(window.location.search).get("vista");
    if (pedida === "difusion" || pedida === "analiticas") setVista(pedida);
    fetch("/api/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setIsAdmin(data.role === "admin");
        if (Array.isArray(data.disabledModules)) setModulosDeshabilitados(data.disabledModules);
        setPermisos({
          instagram: data.allowInstagramPublishing ?? false,
          facebook: data.allowFacebookPublishing ?? false,
          linkedin: data.allowLinkedInPublishing ?? false,
          threads: data.allowThreadsPublishing ?? false,
          pinterest: data.allowPinterestPublishing ?? false,
          tumblr: data.allowTumblrPublishing ?? false,
          bluesky: data.allowBlueskyPublishing ?? false,
          devto: data.allowDevToPublishing ?? false,
          blogger: data.allowBloggerPublishing ?? false,
        });
      })
      .catch(() => {});
  }, []);

  function elegir(siguiente: Vista) {
    setVista(siguiente);
    const params = new URLSearchParams(window.location.search);
    params.set("vista", siguiente);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }

  // Misma regla que Redes Sociales: el módulo de redes abierto para esta cuenta da acceso.
  const tieneModuloRedes = !modulosDeshabilitados.includes("oportunidades-redes");
  const puede = (red: string) => isAdmin || tieneModuloRedes || Boolean(permisos[red]);

  return (
    <div>
      <ModuleIntro titulo="Conexiones">
        <IntroP>
          Aquí conectas todo lo que usa SEO TOTAL, en un solo lugar. <strong>ANALÍTICAS</strong> reúne lo que lee datos
          de tu sitio y ayuda a que aparezcas en Google y Bing. <strong>DIFUSIÓN</strong> reúne lo que publica tu contenido
          en redes sociales, microblogs y blogs.
        </IntroP>
        <IntroP>
          Solo aparecen las conexiones que tu cuenta tiene habilitadas. Si falta alguna que necesitas, pídele al
          administrador que te dé acceso.
        </IntroP>
      </ModuleIntro>
      <ConfiguracionSubNav />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "4px 0 6px" }} role="tablist" aria-label="Tipo de conexión">
        {VISTAS.map((v) => (
          <button key={v.id} type="button" role="tab" aria-selected={vista === v.id} onClick={() => elegir(v.id)} style={botonVista(vista === v.id)}>
            {v.label}
          </button>
        ))}
      </div>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6e6e73" }}>{VISTAS.find((v) => v.id === vista)?.ayuda}</p>

      {vista === "analiticas" && (
        <div style={columna}>
          <div id="google" style={columna}>
            <div>
              <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "#fff4e5", color: "#8a4b08", border: "1px solid rgba(255, 149, 0, 0.25)", marginBottom: 6 }}>
                Esencial
              </span>
              <GoogleSearchConsoleSection />
            </div>
            <GoogleAnalyticsSection />
          </div>
          <div id="bing">
            <BingWebmasterSection />
          </div>
        </div>
      )}

      {vista === "difusion" && (
        <div style={columna}>
          <BrowserTabsConnectionNotice />
          <BusinessProfileSection />
          {(permisos.threads || permisos.instagram || permisos.facebook || isAdmin || tieneModuloRedes) && (
            <ThreadsSection allowThreads={puede("threads")} allowInstagram={puede("instagram")} allowFacebook={puede("facebook")} isAdmin={isAdmin} />
          )}
          {puede("linkedin") && <LinkedInSection allowed={puede("linkedin")} />}
          {puede("pinterest") && <PinterestSection allowed={puede("pinterest")} />}
          {puede("bluesky") && <BlueskySection allowed={puede("bluesky")} />}
          {puede("tumblr") && <TumblrSection allowed={puede("tumblr")} />}
          {puede("blogger") && (
            <>
              <PasosAntesDeConectar red="Blogger" />
              <BloggerSection allowed={puede("blogger")} />
            </>
          )}
          {puede("devto") && <DevToSection allowed={puede("devto")} />}
        </div>
      )}
    </div>
  );
}
