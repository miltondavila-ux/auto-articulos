"use client";

import { useEffect, useState } from "react";
import ModuleIntro, { IntroP } from "@/components/ModuleIntro";
import ConfiguracionSubNav from "@/components/ConfiguracionSubNav";
import BrowserTabsConnectionNotice from "@/components/BrowserTabsConnectionNotice";
import BusinessProfileSection from "@/components/BusinessProfileSection";
import ThreadsSection from "@/components/ThreadsSection";
import LinkedInSection from "@/components/LinkedInSection";
import PinterestSection from "@/components/PinterestSection";
import TumblrSection from "@/components/TumblrSection";
import BlueskySection from "@/components/BlueskySection";
import DevToSection from "@/components/DevToSection";
import BloggerSection from "@/components/BloggerSection";

/**
 * Página "Redes Sociales", parte del rediseño "RENEW CONFIGURACION"
 * (7/9/2026). Antes era la pestaña "social" de `ConfiguracionView.tsx`; su
 * contenido ya era autocontenido salvo por los permisos por red (que
 * decide el administrador por cuenta) — esta página los carga por su
 * cuenta desde `/api/me`, igual que antes.
 *
 * X (Twitter) sigue oculto a pedido de Milton (19/8/2026, ver nota
 * original): X cobra por publicar mediante su API. El componente y sus
 * datos guardados se conservan intactos, solo no se importa aquí.
 */
export default function ConfiguracionRedesSocialesPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [modulosDeshabilitados, setModulosDeshabilitados] = useState<string[]>([]);
  const [allowInstagramPublishing, setAllowInstagramPublishing] = useState(false);
  const [allowFacebookPublishing, setAllowFacebookPublishing] = useState(false);
  const [allowLinkedInPublishing, setAllowLinkedInPublishing] = useState(false);
  const [allowThreadsPublishing, setAllowThreadsPublishing] = useState(false);
  const [allowPinterestPublishing, setAllowPinterestPublishing] = useState(false);
  const [allowTumblrPublishing, setAllowTumblrPublishing] = useState(false);
  const [allowBlueskyPublishing, setAllowBlueskyPublishing] = useState(false);
  const [allowDevToPublishing, setAllowDevToPublishing] = useState(false);
  const [allowBloggerPublishing, setAllowBloggerPublishing] = useState(false);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setIsAdmin(data.role === "admin");
        if (Array.isArray(data.disabledModules)) {
          setModulosDeshabilitados(data.disabledModules);
        }
        setAllowInstagramPublishing(data.allowInstagramPublishing ?? false);
        setAllowFacebookPublishing(data.allowFacebookPublishing ?? false);
        setAllowLinkedInPublishing(data.allowLinkedInPublishing ?? false);
        setAllowThreadsPublishing(data.allowThreadsPublishing ?? false);
        setAllowPinterestPublishing(data.allowPinterestPublishing ?? false);
        setAllowTumblrPublishing(data.allowTumblrPublishing ?? false);
        setAllowBlueskyPublishing(data.allowBlueskyPublishing ?? false);
        setAllowDevToPublishing(data.allowDevToPublishing ?? false);
        setAllowBloggerPublishing(data.allowBloggerPublishing ?? false);
      })
      .catch(() => {});
  }, []);

  /*
   * Si el administrador le da a esta cuenta acceso al módulo de redes
   * —aunque esté apagado para todos los demás—, aquí debe poder
   * configurarlo. Misma regla que ya existía en ConfiguracionView.tsx.
   */
  const tieneModuloRedes = !modulosDeshabilitados.includes("oportunidades-redes");

  return (
    <div>
      <ModuleIntro titulo="Redes Sociales">
        <IntroP>
          Conecta tus redes sociales para que, además de publicar en tu web,
          el sistema también pueda crear y publicar contenido adaptado a
          cada red automáticamente.
        </IntroP>
        <ol style={{ margin: "12px 0 0", paddingLeft: 22, color: "#1d1d1f", fontSize: 14, lineHeight: 1.65 }}>
          <li><strong>Elige una red:</strong> cada tarjeta de abajo explica sus propios pasos antes de pedirte nada.</li>
          <li><strong>Inicia sesión en esa red:</strong> en una pestaña nueva, con la cuenta correcta ya abierta.</li>
          <li><strong>Autoriza la conexión:</strong> acepta los permisos que te pida esa red.</li>
          <li><strong>Listo:</strong> conectar una red no publica nada por sí solo, solo la deja disponible para cuando quieras usarla.</li>
        </ol>
        <IntroP>
          Solo aparecen aquí las redes que tu cuenta tiene habilitadas. Si
          falta alguna que necesitas, pídele al administrador que te dé
          acceso a ella.
        </IntroP>
      </ModuleIntro>
      <ConfiguracionSubNav />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <BrowserTabsConnectionNotice />
        <BusinessProfileSection />
        {(allowThreadsPublishing || allowInstagramPublishing || allowFacebookPublishing || isAdmin || tieneModuloRedes) && (
          <ThreadsSection allowThreads={isAdmin || tieneModuloRedes || allowThreadsPublishing} allowInstagram={isAdmin || tieneModuloRedes || allowInstagramPublishing} allowFacebook={isAdmin || tieneModuloRedes || allowFacebookPublishing} isAdmin={isAdmin} />
        )}
        {(allowLinkedInPublishing || isAdmin || tieneModuloRedes) && (
          <LinkedInSection allowed={allowLinkedInPublishing || isAdmin || tieneModuloRedes} />
        )}
        {(allowPinterestPublishing || isAdmin || tieneModuloRedes) && (
          <PinterestSection allowed={allowPinterestPublishing || isAdmin || tieneModuloRedes} />
        )}
        {(allowTumblrPublishing || isAdmin || tieneModuloRedes) && (
          <TumblrSection allowed={allowTumblrPublishing || isAdmin || tieneModuloRedes} />
        )}
        {(allowBlueskyPublishing || isAdmin || tieneModuloRedes) && (
          <BlueskySection allowed={allowBlueskyPublishing || isAdmin || tieneModuloRedes} />
        )}
        {(allowDevToPublishing || isAdmin || tieneModuloRedes) && (
          <DevToSection allowed={allowDevToPublishing || isAdmin || tieneModuloRedes} />
        )}
        {(allowBloggerPublishing || isAdmin || tieneModuloRedes) && (
          <BloggerSection allowed={allowBloggerPublishing || isAdmin || tieneModuloRedes} />
        )}
      </div>
    </div>
  );
}
