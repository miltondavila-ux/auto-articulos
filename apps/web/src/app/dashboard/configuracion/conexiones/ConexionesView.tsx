"use client";

import { useEffect, useState, type CSSProperties } from "react";
import ModuleIntro, { IntroP } from "@/components/ModuleIntro";
import ConfiguracionSubNav from "@/components/ConfiguracionSubNav";
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
import ComposioConnect from "@/components/ComposioConnect";
import { h2Style, sectionStyle } from "@/components/dashboard-ui";

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
  const [vista, setVista] = useState<Vista | null>(null);
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

  if (vista === null) {
    const tarjetas = [
      { n: "01", title: "Google Search Console", text: "Conecta tu sitio para enviar el sitemap y revisar la indexación.", view: "analiticas" as Vista },
      { n: "02", title: "Google Analytics", text: "Consulta las visitas y el rendimiento real de tus contenidos.", view: "analiticas" as Vista },
      { n: "03", title: "Bing Webmaster Tools", text: "Ayuda a que tus artículos aparezcan también en Bing.", view: "analiticas" as Vista },
      { n: "04", title: "Instagram", text: "Publica imágenes, carruseles y Reels mediante Composio.", view: "difusion" as Vista },
      { n: "05", title: "Facebook", text: "Publica en la Página de Facebook seleccionada mediante Composio.", view: "difusion" as Vista },
      { n: "06", title: "Threads", text: "Conecta Threads con su integración propia.", view: "difusion" as Vista },
      { n: "07", title: "Otras redes", text: "LinkedIn, Pinterest, Tumblr, Bluesky, DEV.to y Blogger.", view: "difusion" as Vista },
    ];
    return <div>
      <ModuleIntro titulo="Conexiones"><IntroP>Elige qué quieres configurar. Cada opción abre su espacio dedicado, con instrucciones y acciones solo de ese segmento.</IntroP></ModuleIntro>
      <ConfiguracionSubNav />
      <div style={{ marginTop: 24, borderTop: "1px solid #d2d2d7" }}>
        {tarjetas.map((card) => (
          <button
            key={card.n}
            type="button"
            onClick={() => elegir(card.view)}
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
            <span aria-hidden="true" style={{ color: "#6e6e73", fontSize: 22, lineHeight: 1 }}>→</span>
          </button>
        ))}
      </div>
    </div>;
  }

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
          <section style={{ padding: 16, borderRadius: 14, background: "#f5f5f7", border: "1px solid #d2d2d7" }} aria-label="Migración guiada">
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
          </section>
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
          <BusinessProfileSection />
          {(permisos.threads || permisos.instagram || permisos.facebook || isAdmin || tieneModuloRedes) && (
            <>
            <ThreadsSection allowThreads={puede("threads")} allowInstagram={false} allowFacebook={false} isAdmin={isAdmin} showComposioSocial={false} />
            {puede("instagram") && <section style={sectionStyle}><h2 style={h2Style}>Instagram</h2><p className="lead-copy">Publica imágenes, carruseles y Reels en tu cuenta profesional mediante Composio.</p><ComposioConnect inline apps={["instagram"]} /></section>}
            {puede("facebook") && <section style={sectionStyle}><h2 style={h2Style}>Facebook</h2><p className="lead-copy">Publica contenido en la Página de Facebook seleccionada mediante Composio.</p><ComposioConnect inline apps={["facebook"]} /></section>}
            </>
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
