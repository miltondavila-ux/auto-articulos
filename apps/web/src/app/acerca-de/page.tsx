import type { Metadata } from "next";
import {
  PublicInfoPage,
  publicHeadingStyle,
  publicLinkStyle,
} from "@/components/public-info-page";

export const metadata: Metadata = {
  title: "Acerca de Auto Artículos",
  description:
    "Información oficial de Auto Artículos y su integración con Google Search Console.",
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

      <h2 style={publicHeadingStyle}>Acceso</h2>
      <p>
        El servicio es exclusivo para usuarios previamente invitados. Si ya
        tienes una cuenta, puedes{" "}
        <a href="/login" style={publicLinkStyle}>
          iniciar sesión aquí
        </a>
        . Para preguntas sobre la aplicación o sus permisos, escribe a{" "}
        <a href="mailto:10minuteswebsite@gmail.com" style={publicLinkStyle}>
          10minuteswebsite@gmail.com
        </a>
        .
      </p>
    </PublicInfoPage>
  );
}
