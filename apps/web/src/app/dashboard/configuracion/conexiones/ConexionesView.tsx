"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import ModuleIntro, { IntroP } from "@/components/ModuleIntro";
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
import FacebookSection from "@/components/FacebookSection";
import InstagramSection from "@/components/InstagramSection";
import { ConnectionReturnNotice, ConnectionReturnSuccess, LEGACY_RETURN_NETWORKS, useConnectionReturn } from "@/components/ConnectionReturn";

type Vista = "analiticas" | "difusion";
type ConexionId = "google-search-console" | "google-analytics" | "bing-webmaster" | "instagram" | "facebook" | "threads" | "linkedin" | "pinterest" | "tumblr" | "bluesky" | "devto" | "blogger";

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
  const searchParams = useSearchParams();
  const [vista, setVista] = useState<Vista | null>(null);
  const [conexion, setConexion] = useState<ConexionId | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [modulosDeshabilitados, setModulosDeshabilitados] = useState<string[]>([]);
  const [permisos, setPermisos] = useState<Record<string, boolean>>({});
  const [configuradas, setConfiguradas] = useState<Record<string, boolean>>({});
  const retorno = useConnectionReturn(conexion);
  const soloExito = retorno === "connected" && conexion !== null && LEGACY_RETURN_NETWORKS[conexion]?.choice === null;

  useEffect(() => {
    const pedida = searchParams.get("vista");
    const conexionPedida = searchParams.get("conexion") as ConexionId | null;
    if (conexionPedida) {
      setConexion(conexionPedida);
      setVista(["google-search-console", "google-analytics", "bing-webmaster"].includes(conexionPedida) ? "analiticas" : "difusion");
    } else if (pedida === "difusion" || pedida === "analiticas") {
      setConexion(null);
      setVista(pedida);
    } else {
      setConexion(null);
      setVista(null);
    }
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
    Promise.all([
      fetch("/api/configuration-status", { cache: "no-store" }),
      fetch("/api/composio/status", { cache: "no-store" }),
    ])
      .then(async ([configurationResponse, composioResponse]) => {
        const next: Record<string, boolean> = {};
        if (configurationResponse.ok) {
          const body = (await configurationResponse.json()) as { checks?: Array<{ id: string; configured: boolean }> };
          for (const check of body.checks ?? []) next[check.id] = check.configured;
        }
        if (composioResponse.ok) {
          const body = (await composioResponse.json()) as { connections?: Array<{ app: string; status: string }> };
          const composioIds: Record<string, string> = {
            google_search_console: "google-search-console",
            google_analytics: "google-analytics",
            instagram: "instagram",
            facebook: "facebook",
          };
          for (const connection of body.connections ?? []) {
            const id = composioIds[connection.app];
            if (id) next[id] = connection.status === "ACTIVE";
          }
        }
        setConfiguradas(next);
      })
      .catch(() => {});
  }, [searchParams]);

  function elegir(siguiente: Vista) {
    setVista(siguiente);
    const params = new URLSearchParams(window.location.search);
    params.set("vista", siguiente);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }

  function elegirConexion(id: ConexionId, siguiente: Vista) {
    setConexion(id);
    setVista(siguiente);
    const params = new URLSearchParams();
    params.set("conexion", id);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }

  function volverAConexiones() {
    setConexion(null);
    setVista(null);
    window.history.replaceState(null, "", window.location.pathname);
  }

  // Misma regla que Redes Sociales: el módulo de redes abierto para esta cuenta da acceso.
  const tieneModuloRedes = !modulosDeshabilitados.includes("oportunidades-redes");
  const puede = (red: string) => isAdmin || tieneModuloRedes || Boolean(permisos[red]);

  if (vista === null) {
    const tarjetas = [
      { id: "google-search-console", n: "01", title: "Google Search Console", text: "Conecta tu sitio para enviar el sitemap y revisar la indexación.", view: "analiticas" as Vista },
      { id: "google-analytics", n: "02", title: "Google Analytics", text: "Consulta las visitas y el rendimiento real de tus contenidos.", view: "analiticas" as Vista },
      { id: "bing-webmaster", n: "03", title: "Bing Webmaster Tools", text: "Ayuda a que tus artículos aparezcan también en Bing.", view: "analiticas" as Vista },
      { id: "instagram", n: "04", title: "Instagram", text: "Publica imágenes y contenido en tu cuenta profesional de Instagram.", view: "difusion" as Vista },
      { id: "facebook", n: "05", title: "Facebook", text: "Publica en la Página de Facebook que elijas.", view: "difusion" as Vista },
      { id: "threads", n: "06", title: "Threads", text: "Conecta Threads con su integración propia.", view: "difusion" as Vista },
      { id: "linkedin", n: "07", title: "LinkedIn", text: "Publica artículos en tu perfil o página de LinkedIn.", view: "difusion" as Vista },
      { id: "pinterest", n: "08", title: "Pinterest", text: "Publica contenido visual en tus tableros de Pinterest.", view: "difusion" as Vista },
      { id: "tumblr", n: "09", title: "Tumblr", text: "Publica artículos y contenido en tu blog de Tumblr.", view: "difusion" as Vista },
      { id: "bluesky", n: "10", title: "Bluesky", text: "Comparte tus publicaciones en Bluesky.", view: "difusion" as Vista },
      { id: "devto", n: "11", title: "DEV.to", text: "Publica artículos técnicos en tu cuenta de DEV.to.", view: "difusion" as Vista },
      { id: "blogger", n: "12", title: "Blogger", text: "Publica artículos en tu blog de Blogger.", view: "difusion" as Vista },
    ];
    const grupos: { vista: Vista; titulo: string; descripcion: string }[] = [
      { vista: "analiticas", titulo: "Analíticas", descripcion: "Conexiones que leen datos y ayudan a posicionar tu sitio." },
      { vista: "difusion", titulo: "Difusión", descripcion: "Conexiones que publican tu contenido en redes, microblogs y blogs." },
    ];
    return <div>
      <ModuleIntro titulo="Conexiones"><IntroP>Elige qué quieres configurar. Cada opción abre su espacio dedicado, con instrucciones y acciones solo de ese segmento.</IntroP></ModuleIntro>
      <div style={{ marginTop: 24 }}>
        {grupos.map((grupo) => <section key={grupo.vista} style={{ marginBottom: 36 }} aria-labelledby={`grupo-${grupo.vista}`}>
          <div style={{ padding: "0 4px 12px", borderBottom: "1px solid #d2d2d7" }}>
            <h2 id={`grupo-${grupo.vista}`} style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#1d1d1f" }}>{grupo.titulo}</h2>
            <p style={{ margin: "5px 0 0", color: "#6e6e73", fontSize: 13, lineHeight: 1.45 }}>{grupo.descripcion}</p>
          </div>
          {tarjetas.filter((card) => card.view === grupo.vista).map((card) => (
          <button
            key={card.n}
            type="button"
            onClick={() => elegirConexion(card.id as ConexionId, card.view)}
            style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "42px minmax(0, 1fr) auto",
              alignItems: "center",
              gap: 16,
              padding: "20px 4px",
              textAlign: "left",
              background: "transparent",
              border: 0,
              borderBottom: "1px solid #e5e5ea",
              color: "#1d1d1f",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <span style={{ color: "#8e8e93", fontSize: 12, letterSpacing: "0.06em" }}>{card.n}</span>
            <span>
              <strong style={{ display: "block", fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>{card.title}</strong>
              <span style={{ display: "block", marginTop: 5, color: "#6e6e73", fontSize: 13, lineHeight: 1.45 }}>{card.text}</span>
            </span>
                <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {configuradas[card.id] && <span aria-label="Configurada" title="Configurada" style={{ color: "#1a7f37", fontSize: 19, fontWeight: 700 }}>✓</span>}
                  <span aria-hidden="true" style={{ color: "#6e6e73", fontSize: 22, lineHeight: 1 }}>→</span>
                </span>
          </button>
          ))}
        </section>)}
      </div>
    </div>;
  }

  const nombres: Record<ConexionId, string> = {
    "google-search-console": "Google Search Console", "google-analytics": "Google Analytics", "bing-webmaster": "Bing Webmaster Tools",
    instagram: "Instagram", facebook: "Facebook", threads: "Threads", linkedin: "LinkedIn", pinterest: "Pinterest", tumblr: "Tumblr", bluesky: "Bluesky", devto: "DEV.to", blogger: "Blogger",
  };
  const solo = (id: ConexionId) => conexion === null || conexion === id;

  return (
    <div>
      <ModuleIntro titulo={conexion ? nombres[conexion] : "Conexiones"}>
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
      {conexion && <button type="button" onClick={volverAConexiones} style={{ margin: "0 0 16px", padding: 0, border: 0, background: "transparent", color: "#1d1d1f", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>← Volver a Conexiones</button>}
      {!conexion && <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "4px 0 6px" }} role="tablist" aria-label="Tipo de conexión">
        {VISTAS.map((v) => (
          <button key={v.id} type="button" role="tab" aria-selected={vista === v.id} onClick={() => elegir(v.id)} style={botonVista(vista === v.id)}>{v.label}</button>
        ))}
      </div>}
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6e6e73" }}>{VISTAS.find((v) => v.id === vista)?.ayuda}</p>

      {conexion && retorno && !soloExito && <ConnectionReturnNotice conexion={conexion} resultado={retorno} />}
      {soloExito && conexion && <ConnectionReturnSuccess conexion={conexion} />}

      {!soloExito && vista === "analiticas" && (
        <div style={columna}>
          {conexion === null && <section style={{ padding: 16, borderRadius: 14, background: "#f5f5f7", border: "1px solid #d2d2d7" }} aria-label="Migración guiada">
            <strong style={{ fontSize: 15, color: "#1d1d1f" }}>Actualiza tu conexión de Google</strong>
            <p style={{ margin: "6px 0 10px", fontSize: 13, lineHeight: 1.5, color: "#1d1d1f" }}>
              Vamos a pasar tu Search Console y Analytics a la nueva conexión de forma segura. No desconectaremos la anterior hasta comprobar que todo funciona.
            </p>
            <ol style={{ margin: "0 0 12px", paddingLeft: 20, fontSize: 13, lineHeight: 1.55 }}>
              <li>Conecta tu cuenta de Google.</li>
              <li>Elige tu sitio o propiedad.</li>
              <li>Prueba la conexión.</li>
              <li>Finaliza la migración cuando veas el resultado correcto.</li>
            </ol>
            <a href="#google" style={{ display: "inline-block", padding: "8px 14px", borderRadius: 9, background: "#1d1d1f", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
              Comenzar configuración
            </a>
          </section>}
          <div id="google" style={columna}>
            {solo("google-search-console") && <div>
              <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "#fff4e5", color: "#8a4b08", border: "1px solid rgba(255, 149, 0, 0.25)", marginBottom: 6 }}>
                Esencial
              </span>
              <GoogleSearchConsoleSection />
            </div>}
            {solo("google-analytics") && <GoogleAnalyticsSection />}
          </div>
          {solo("bing-webmaster") && <div id="bing"><BingWebmasterSection /></div>}
        </div>
      )}

      {!soloExito && vista === "difusion" && (
        <div style={columna}>
          {conexion === null && <BusinessProfileSection />}
          {(permisos.threads || permisos.instagram || permisos.facebook || isAdmin || tieneModuloRedes) && (
            <>
            {solo("threads") && <ThreadsSection allowThreads={puede("threads")} allowInstagram={false} allowFacebook={false} isAdmin={isAdmin} showComposioSocial={false} />}
            {solo("instagram") && puede("instagram") && <InstagramSection />}
            {solo("facebook") && puede("facebook") && <FacebookSection />}
            </>
          )}
          {solo("linkedin") && puede("linkedin") && <LinkedInSection allowed={puede("linkedin")} />}
          {solo("pinterest") && puede("pinterest") && <PinterestSection allowed={puede("pinterest")} />}
          {solo("bluesky") && puede("bluesky") && <BlueskySection allowed={puede("bluesky")} />}
          {solo("tumblr") && puede("tumblr") && <TumblrSection allowed={puede("tumblr")} />}
          {solo("blogger") && puede("blogger") && <BloggerSection allowed={puede("blogger")} />}
          {solo("devto") && puede("devto") && <DevToSection allowed={puede("devto")} />}
        </div>
      )}

      {conexion && (
        <button
          type="button"
          onClick={volverAConexiones}
          style={{ marginTop: 20, padding: "10px 18px", borderRadius: 10, border: "1px solid #d2d2d7", background: "#fff", color: "#1d1d1f", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
        >
          Volver al menú de Conexiones
        </button>
      )}
    </div>
  );
}
