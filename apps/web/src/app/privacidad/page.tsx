import type { Metadata } from "next";
import {
  PublicInfoPage,
  publicHeadingStyle,
  publicLinkStyle,
} from "@/components/public-info-page";

export const metadata: Metadata = {
  title: "Política de Privacidad | Auto Artículos",
  description: "Política de privacidad de Auto Artículos.",
};

export default function PrivacyPage() {
  return (
    <PublicInfoPage
      eyebrow="Última actualización: 31 de julio de 2026"
      title="Política de Privacidad"
      intro="Esta política explica qué información usa Auto Artículos, para qué se utiliza y qué control conserva cada usuario."
    >
      <h2 style={publicHeadingStyle}>Información que tratamos</h2>
      <p>
        Guardamos los datos necesarios para operar la cuenta: correo de acceso,
        nombre, configuración, títulos, estado y URL de los artículos, además
        del historial técnico imprescindible para diagnosticar publicaciones.
        Las credenciales de 10minutesWebsite y los tokens de autorización de
        servicios externos se guardan cifrados.
      </p>

      <h2 style={publicHeadingStyle}>Datos de Google</h2>
      <p>
        Si el usuario conecta Google Search Console, Auto Artículos recibe un
        token OAuth revocable y acceso a la lista de propiedades que esa cuenta
        puede administrar. Usamos ese acceso exclusivamente para que el usuario
        seleccione su propiedad, gestione su sitemap y consulte el estado de
        indexación de sus propias URLs. No solicitamos ni almacenamos la
        contraseña de Google, ni accedemos a Gmail, Drive, contactos u otros
        productos de Google.
      </p>

      <h2 style={publicHeadingStyle}>Uso y divulgación</h2>
      <p>
        La información se utiliza únicamente para prestar, proteger y mejorar
        Auto Artículos. No vendemos datos personales, tokens ni información de
        Google. No compartimos esos datos con anunciantes. Solo intervienen los
        proveedores técnicos necesarios para operar el servicio, como el
        alojamiento y la base de datos, sujetos a sus medidas de seguridad.
      </p>

      <h2 style={publicHeadingStyle}>Conservación y eliminación</h2>
      <p>
        Conservamos la información mientras la cuenta esté activa o sea
        necesaria para ofrecer el servicio y cumplir obligaciones aplicables. El
        usuario puede desconectar Google desde la configuración, lo que elimina
        el token guardado, y también puede revocar el acceso desde su Cuenta de
        Google. Para solicitar la eliminación de la cuenta y sus datos, escribe
        a{" "}
        <a href="mailto:10minuteswebsite@gmail.com" style={publicLinkStyle}>
          10minuteswebsite@gmail.com
        </a>
        .
      </p>

      <h2 style={publicHeadingStyle}>Seguridad y separación de cuentas</h2>
      <p>
        Los secretos se cifran antes de almacenarse. Cada integración está
        asociada al identificador interno del usuario: ninguna cuenta puede
        consultar o utilizar tokens, propiedades o artículos pertenecientes a
        otra cuenta.
      </p>

      <h2 style={publicHeadingStyle}>Contacto y cambios</h2>
      <p>
        Podemos actualizar esta política cuando cambie el servicio o la
        normativa. La fecha vigente siempre aparecerá al inicio. Las preguntas
        de privacidad pueden enviarse a{" "}
        <a href="mailto:10minuteswebsite@gmail.com" style={publicLinkStyle}>
          10minuteswebsite@gmail.com
        </a>
        .
      </p>
    </PublicInfoPage>
  );
}
