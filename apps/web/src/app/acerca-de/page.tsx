import type { Metadata } from "next";
import {
  PublicInfoPage,
  publicHeadingStyle,
  publicLinkStyle,
} from "@/components/public-info-page";
import {
  DEFAULT_PLATFORM_DOMAIN,
  platformContactEmail,
} from "@auto-articulos/shared";

/*
 * Contacto del servidor por defecto: estas páginas son públicas y quien las
 * lee todavía no tiene sesión, así que no se puede saber si viene de
 * 10minutesWebsite o de tagcrush. Dentro del panel sí se sabe y se usa
 * platformContactEmail(user.platformDomain).
 */
const CONTACTO = platformContactEmail(DEFAULT_PLATFORM_DOMAIN);

export const metadata: Metadata = {
  title: "Acerca de Auto Artículos",
  description:
    "Información oficial de Auto Artículos y sus integraciones con Google.",
};

export default function AboutPage() {
  return (
    <PublicInfoPage
      eyebrow="Información oficial"
      title="Auto Artículos"
      intro="Una herramienta privada para crear y administrar secuencias de artículos dentro de programas de posicionamiento web."
    >
      <h2 style={publicHeadingStyle}>Qué hace la aplicación</h2>
      <p>
        Auto Artículos ayuda a sus usuarios autorizados a preparar lotes de
        títulos, generar contenido y publicar artículos en sus propias cuentas
        de su plataforma de gestión de sitios web. Cada cuenta y su historial
        permanecen separados.
      </p>

      <h2 style={publicHeadingStyle}>Integración con Google Search Console</h2>
      <p>
        Cada usuario puede conectar voluntariamente su propia cuenta de Google
        mediante OAuth 2.0. La aplicación muestra únicamente las propiedades de
        Search Console que ese usuario administra y usa la propiedad que él
        mismo selecciona para gestionar el sitemap y consultar el estado de
        indexación. Auto Artículos nunca solicita la contraseña de Google.
      </p>

      <h2 style={publicHeadingStyle}>Integraciones con Google Analytics y Business Profile</h2>
      <p>
        Si el usuario lo autoriza, Auto Artículos consulta señales agregadas de
        Google Analytics 4 en modo de solo lectura para priorizar oportunidades
        de contenido. También permite seleccionar una ubicación de Google
        Business Profile y preparar publicaciones estándar que el usuario
        revisa y aprueba. Cada integración se limita a la cuenta conectada y
        puede revocarse desde Google o desde la configuración de la aplicación.
      </p>

      <h2 style={publicHeadingStyle}>Acceso</h2>
      <p>
        El servicio es exclusivo para usuarios previamente invitados. Si ya
        tienes una cuenta, puedes{" "}
        <a href="/login" style={publicLinkStyle}>
          iniciar sesión aquí
        </a>
        . Para preguntas sobre la aplicación o sus permisos, escribe a{" "}
        <a href={`mailto:${CONTACTO}`} style={publicLinkStyle}>
          {CONTACTO}
        </a>
        .
      </p>
    </PublicInfoPage>
  );
}
