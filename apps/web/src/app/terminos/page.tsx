import type { Metadata } from "next";
import {
  PublicInfoPage,
  publicHeadingStyle,
  publicLinkStyle,
} from "@/components/public-info-page";

export const metadata: Metadata = {
  title: "Condiciones del Servicio | Auto Artículos",
  description: "Condiciones de uso de Auto Artículos.",
};

export default function TermsPage() {
  return (
    <PublicInfoPage
      eyebrow="Última actualización: 31 de julio de 2026"
      title="Condiciones del Servicio"
      intro="Al utilizar Auto Artículos, aceptas estas condiciones y confirmas que tienes autorización sobre las cuentas y sitios que conectas."
    >
      <h2 style={publicHeadingStyle}>Uso autorizado</h2>
      <p>
        Auto Artículos es una herramienta privada para usuarios invitados. El
        usuario es responsable de mantener segura su cuenta y de suministrar
        información correcta. No debe utilizar el servicio para publicar
        contenido ilícito, engañoso, abusivo o que infrinja derechos de
        terceros.
      </p>

      <h2 style={publicHeadingStyle}>Cuentas y sitios conectados</h2>
      <p>
        Solo puedes conectar cuentas de tu plataforma de gestión de sitios web,
        Google Search Console o Bing Webmaster que te pertenezcan o para las
        cuales tengas autorización suficiente. Debes conservar la propiedad
        verificada de los sitios y respetar las políticas de cada plataforma y
        buscador.
      </p>

      <h2 style={publicHeadingStyle}>Publicación e indexación</h2>
      <p>
        La aplicación automatiza tareas técnicas y puede enviar sitemaps o URLs
        a los buscadores cuando el usuario lo autoriza. Ese envío no garantiza
        rastreo, posicionamiento ni indexación: Google, Bing y otros buscadores
        deciden de forma independiente qué páginas incluyen en sus resultados.
      </p>

      <h2 style={publicHeadingStyle}>Disponibilidad y cambios</h2>
      <p>
        El servicio depende de plataformas externas que pueden cambiar sus
        interfaces, cuotas o disponibilidad. Podemos corregir, actualizar o
        suspender funciones para mantener la seguridad y el cumplimiento. No se
        promete funcionamiento ininterrumpido ni un resultado comercial o de
        posicionamiento específico.
      </p>

      <h2 style={publicHeadingStyle}>Terminación</h2>
      <p>
        Podemos suspender cuentas que comprometan la seguridad, incumplan estas
        condiciones o utilicen el servicio sin autorización. El usuario puede
        solicitar el cierre y eliminación de su cuenta escribiendo a{" "}
        <a href="mailto:10minuteswebsite@gmail.com" style={publicLinkStyle}>
          10minuteswebsite@gmail.com
        </a>
        .
      </p>

      <h2 style={publicHeadingStyle}>Contacto</h2>
      <p>
        Para preguntas sobre estas condiciones, contacta a{" "}
        <a href="mailto:10minuteswebsite@gmail.com" style={publicLinkStyle}>
          10minuteswebsite@gmail.com
        </a>
        .
      </p>
    </PublicInfoPage>
  );
}
