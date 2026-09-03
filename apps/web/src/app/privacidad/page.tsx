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
  title: "Política de Privacidad | Auto Artículos",
  description: "Política de privacidad de Auto Artículos.",
};

export default function PrivacyPage() {
  return (
    <PublicInfoPage
      eyebrow="Última actualización: 2 de septiembre de 2026"
      title="Política de Privacidad"
      intro="Esta política explica qué información usa Auto Artículos, para qué se utiliza y qué control conserva cada usuario."
    >
      <h2 style={publicHeadingStyle}>Información que tratamos</h2>
      <p>
        Guardamos los datos necesarios para operar la cuenta: correo de acceso,
        nombre, configuración, títulos, estado y URL de los artículos, además
        del historial técnico imprescindible para diagnosticar publicaciones.
        Las credenciales de tu plataforma de gestión de sitios web y los
        tokens de autorización de servicios externos se guardan cifrados.
      </p>

      <h2 style={publicHeadingStyle}>Datos de Google</h2>
      <p>
        Si el usuario conecta Google Search Console, Auto Artículos recibe un
        token OAuth revocable y acceso a la lista de propiedades que esa cuenta
        puede administrar. Usamos ese acceso exclusivamente para que el usuario
        seleccione su propiedad, gestione su sitemap y consulte el estado de
        indexación de sus propias URLs.
      </p>
      <p>
        Si el usuario conecta Google Analytics 4, recibimos un token de solo
        lectura y la lista de propiedades a las que esa cuenta tiene acceso.
        Consultamos informes agregados (por ejemplo, sesiones, usuarios activos,
        conversiones y páginas) para mostrar señales de rendimiento y priorizar
        oportunidades dentro de Auto Artículos. No modificamos datos de
        Analytics ni solicitamos permisos de escritura.
      </p>
      <p>
        Si el usuario conecta Google Business Profile, recibimos un token
        revocable para listar sus cuentas y ubicaciones autorizadas. El usuario
        elige la ubicación y puede aprobar expresamente la preparación y el
        envío de una publicación estándar; Auto Artículos no publica cada
        artículo automáticamente.
      </p>
      <p>
        No solicitamos ni almacenamos la contraseña de Google, ni accedemos a
        Gmail, Drive, contactos u otros productos de Google. Los datos de Google
        se usan únicamente para las funciones visibles que el usuario activa y
        no se venden.
      </p>

      <h2 style={publicHeadingStyle}>Uso y divulgación</h2>
      <p>
        La información se utiliza únicamente para prestar, proteger y mejorar
        Auto Artículos. No vendemos datos personales, tokens ni información de
        Google, ni los compartimos con anunciantes. Cuando el usuario solicita
        generar una propuesta, podemos enviar al proveedor de IA configurado
        únicamente el contexto mínimo y agregado necesario para producir el
        texto que se muestra en la aplicación; nunca enviamos tokens OAuth,
        contraseñas ni identificadores de cuenta. También intervienen los
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
        <a href={`mailto:${CONTACTO}`} style={publicLinkStyle}>
          {CONTACTO}
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
        <a href={`mailto:${CONTACTO}`} style={publicLinkStyle}>
          {CONTACTO}
        </a>
        .
      </p>
    </PublicInfoPage>
  );
}
